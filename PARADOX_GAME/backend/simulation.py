"""Planet mission engine.

A mission (planet + stage + difficulty) is a short sequence of questions:

  Step 1  - the existing engineering decision for the scenario (uses the
            scenario's clues; Medium/Hard add a fourth answer option).
  Steps 2+ - science questions from the curated question bank for this exact
            planet, stage and difficulty (no repeats inside a mission).

Difficulty now changes the questions themselves (vocabulary, reasoning depth,
number of answer options and explanation detail) as well as the simulated
spacecraft resources.  Answer keys never leave the backend until the player
has answered, and they are tracked by answer text so shuffling is safe.
"""

import math
import random
import uuid
from threading import Lock

from missions import MISSIONS
from question_bank import DIFFICULTY_OPTION_COUNT, PLANET_NAMES, STAGE_TOPICS, shuffled_copy
from semantic import question_signature
import question_engine
import question_store

SESSIONS = {}
SESSION_LOCK = Lock()

DIFFICULTIES = {
    "Easy": {"resources": 90, "action_cost": 4, "event_chance": 0.10, "pass_ratio": 0.5},
    "Medium": {"resources": 75, "action_cost": 6, "event_chance": 0.20, "pass_ratio": 0.75},
    "Hard": {"resources": 65, "action_cost": 8, "event_chance": 0.30, "pass_ratio": 0.75},
}

RESOURCE_NAMES = ("power", "fuel", "oxygen", "integrity", "time")

# Each mission has a primary resource that is more affected by mistakes.
PRIMARY_RESOURCES = {1: "power", 2: "oxygen", 3: "integrity", 4: "power",
                     5: "fuel", 6: "oxygen", 7: "power", 8: "fuel"}

# A fourth, clearly unsafe option used for the engineering decision on
# Medium/Hard so those levels always offer four answers.
EXTRA_DECISION_DISTRACTORS = {
    1: "Shut down the receiver and wait a week",
    2: "Open the airlock to let fresh air in",
    3: "Point the instruments straight at the flare",
    4: "Drive at full speed to escape the problem",
    5: "Fire every thruster at full power immediately",
    6: "Turn up the oxygen flow into the cabin",
    7: "Switch on every heater and instrument at once",
    8: "Skip the landing checklist to save time",
}

OPTION_IDS = "ABCD"


def find_scenario(mission_id, scenario_id):
    mission = next((m for m in MISSIONS if m["id"] == mission_id), None)
    if not mission:
        raise ValueError("Mission not found")
    scenario = next((s for s in mission["scenarios"] if s["id"] == scenario_id), None)
    if not scenario:
        raise ValueError("Scenario not found")
    return mission, scenario


def clamp(value):
    return max(0, min(100, value))


def _decision_question(mission, scenario, difficulty):
    """Each level asks a different kind of engineering question about the scenario."""
    base = {"id": f"P{mission['id']}-S{scenario['id']}-{difficulty[0]}-DECISION", "kind": "decision", "planet_id": mission["id"],
            "stage_id": scenario["id"], "difficulty": difficulty, "source": None}
    correct_action = next(a["label"] for a in scenario["actions"] if a["id"] == scenario["correct_action"])
    clues = scenario["clues"]
    if difficulty == "Easy":
        return dict(base, topic=f"Mission engineering: {scenario['name']}",
                    question=f"{scenario['problem']} What should the crew do?",
                    options=[a["label"] for a in scenario["actions"]], correct_answer=correct_action,
                    explanation=f"The problem is that {scenario['problem'][0].lower() + scenario['problem'][1:]} '{correct_action}' fixes that problem directly. The other choices work on the wrong system.")
    if difficulty == "Medium":
        others = [s["name"] for s in mission["scenarios"] if s["id"] != scenario["id"]]
        outsider = next(s["name"] for m in MISSIONS if m["id"] == (mission["id"] % len(MISSIONS)) + 1 for s in m["scenarios"] if s["name"] not in others)
        return dict(base, topic=f"Fault diagnosis: {mission['category']}",
                    question=f"Mission control sees these clues: {'; '.join(clues)}. Which failure explains all of them?",
                    options=[scenario["name"], *others, outsider], correct_answer=scenario["name"],
                    explanation=f"Engineers diagnose before they act. Together, the clues ({'; '.join(clues).lower()}) point to {scenario['name'].lower()}. The other failures would show different warning signs.")
    return dict(base, topic=f"Root-cause engineering: {scenario['name']}",
                question=f"Telemetry check: {'; '.join(clues)}. Which response fixes the root cause without creating new risk?",
                options=[*(a["label"] for a in scenario["actions"]), EXTRA_DECISION_DISTRACTORS[mission["id"]]], correct_answer=correct_action,
                explanation=(f"The telemetry isolates the fault, so the safe response is '{correct_action}'. "
                             "The other options either target systems the clues show are fine, or add new danger to the crew."))


def _prepare(q, rng, branch="core"):
    q = shuffled_copy(q, rng)
    q.setdefault("kind", "science")
    q["branch"] = branch
    return q


def _public_question(session):
    if session["status"] != "ACTIVE" or not session.get("current"):
        return None
    q = session["current"]
    return {
        "id": q["id"],
        "kind": q["kind"],
        "number": session["step"] + 1,
        "total": session["max_steps"],
        "text": q["question"],
        "topic": q["topic"],
        "difficulty": q["difficulty"],
        "origin": q.get("origin", "verified"),
        "label": q.get("label"),
        "branch": q.get("branch", "core"),
        "options": [{"id": OPTION_IDS[i], "label": label} for i, label in enumerate(q["options"])],
    }


def public_session(session):
    question = _public_question(session)
    return {
        "session_id": session["session_id"],
        "mission_id": session["mission_id"],
        "scenario_id": session["scenario_id"],
        "planet": PLANET_NAMES.get(session["mission_id"]),
        "stage_topic": STAGE_TOPICS.get((session["mission_id"], session["scenario_id"])),
        "mission_title": session["mission_title"],
        "scenario_name": session["scenario_name"],
        "problem": session["problem"],
        "difficulty": session["difficulty"],
        "review": session.get("review", False),
        "resources": session["resources"].copy(),
        "step": session["step"],
        "max_steps": session["max_steps"],
        "pass_mark": session["pass_mark"],
        "status": session["status"],
        "clues": session["clues"][:session["step"] + 1],
        "question": question,
        # "actions" kept for backwards compatibility with older UI code.
        "actions": [{"id": o["id"], "label": o["label"]} for o in question["options"]] if question else [],
        "correct_decisions": session["correct_decisions"],
        "history": [entry.copy() for entry in session["history"]],
        "notice": session.get("notice"),
    }


def _serve(session, q):
    session["current"] = q
    question_store.mark_served(session.get("user_id"), session["session_id"], q, session.get("review", False))


def create_session(mission_id, scenario_id, difficulty, rng=None, user_id=None, review=False):
    if difficulty not in DIFFICULTIES:
        raise ValueError("Invalid difficulty")
    rng = rng or random
    mission, scenario = find_scenario(mission_id, scenario_id)
    config = DIFFICULTIES[difficulty]
    resources = {name: clamp(config["resources"] + rng.randint(-5, 5)) for name in RESOURCE_NAMES}

    decision = dict(_decision_question(mission, scenario, difficulty), origin="verified", concept_key=None, variant="")
    # Easy and Hard decisions test the same fix (same concept); Medium is a diagnosis.
    decision["concept_key"] = f"decision-{'diagnosis' if difficulty == 'Medium' else 'action'}:P{mission_id}-S{scenario_id}"
    seen_rows = question_store.seen_for_planet(user_id, mission_id)
    seen_ids = {s["question_id"] for s in seen_rows}
    # Skip the briefing decision if this student already met the same idea on another level.
    from semantic import local_similarity
    decision_sig = question_signature(decision)
    if any(r["concept_key"] == decision["concept_key"] or local_similarity(decision_sig, r["signature"]) >= question_engine.LOCAL_DUPLICATE_THRESHOLD for r in seen_rows):
        seen_ids.add(decision["id"])
    notice = None
    if review:
        reserve = question_engine.select_review(user_id, mission_id, scenario_id, difficulty, question_engine.MISSION_LENGTH, rng)
        first = decision if decision["id"] in seen_ids else None
        if first:
            reserve = reserve[: question_engine.MISSION_LENGTH - 1]
        if not reserve and not first:
            raise ValueError("Nothing to review yet. Play this adventure first!")
        notice = "Review mission: these are questions you've answered before."
    else:
        first = decision if decision["id"] not in seen_ids else None
        need = question_engine.MISSION_LENGTH - (1 if first else 0)
        reserve = question_engine.select_fresh(user_id, mission_id, scenario_id, difficulty, need,
                                               extra_seen=[question_signature(decision)] if first else (), rng=rng)
        if not reserve and not first:
            raise question_engine.PoolExhausted(PLANET_NAMES[mission_id], scenario_id, difficulty, ai_tutor_enabled())
        if len(reserve) + (1 if first else 0) < question_engine.MISSION_LENGTH:
            notice = "You're nearly out of new questions for this level here, so this mission is a little shorter."

    total = len(reserve) + (1 if first else 0)
    session = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "review": review,
        "mission_id": mission_id,
        "scenario_id": scenario_id,
        "mission_title": mission["title"],
        "scenario_name": scenario["name"],
        "problem": scenario["problem"],
        "difficulty": difficulty,
        "resources": resources,
        "step": 0,
        "max_steps": total,
        "pass_mark": max(1, math.ceil(total * config["pass_ratio"])),
        "status": "ACTIVE",
        "clues": scenario["clues"].copy(),
        "reserve": [dict(q, kind="science") for q in reserve],
        "rng": rng,
        "current": None,
        "streak": 0,
        "correct_decisions": 0,
        "history": [],
        "notice": notice,
    }
    if first:
        _serve(session, _prepare(dict(first, kind="decision"), rng))
    else:
        nxt, branch = question_engine.order_next(session["reserve"], None, 0)
        session["reserve"].remove(nxt)
        _serve(session, _prepare(nxt, rng, branch))
    with SESSION_LOCK:
        SESSIONS[session["session_id"]] = session
    return public_session(session)


def ai_tutor_enabled():
    import os
    return bool(os.getenv("OPENAI_API_KEY", "").strip())


def current_correct_option_id(session_id):
    """Test/debug helper: the option id of the right answer for the current step."""
    q = SESSIONS[session_id]["current"]
    return OPTION_IDS[q["options"].index(q["correct_answer"])]


def evaluate_action(session_id, action_id):
    with SESSION_LOCK:
        session = SESSIONS.get(session_id)
        if not session:
            raise ValueError("Session not found")
        if session["status"] != "ACTIVE":
            raise ValueError("Mission already finished")

        q = session["current"]
        action_id = str(action_id).strip().upper()
        if len(action_id) != 1 or action_id not in OPTION_IDS[:len(q["options"])]:
            raise ValueError("Invalid action")
        chosen = q["options"][OPTION_IDS.index(action_id)]
        correct = chosen == q["correct_answer"]

        config = DIFFICULTIES[session["difficulty"]]
        cost = config["action_cost"]
        resources = session["resources"]
        primary = PRIMARY_RESOURCES[session["mission_id"]]

        resources["time"] = clamp(resources["time"] - cost)
        resources["power"] = clamp(resources["power"] - max(1, cost // 2))
        if correct:
            session["correct_decisions"] += 1
            resources["integrity"] = clamp(resources["integrity"] + 3)
            resources[primary] = clamp(resources[primary] - 2)
        else:
            resources["integrity"] = clamp(resources["integrity"] - cost * 2)
            resources[primary] = clamp(resources[primary] - cost)

        event = None
        if random.random() < config["event_chance"]:
            affected = random.choice(["power", "fuel", "oxygen", "integrity"])
            loss = random.randint(3, 8)
            resources[affected] = clamp(resources[affected] - loss)
            event = f"Unexpected subsystem stress: {affected} decreased by {loss}."

        session["step"] += 1
        remaining = session["max_steps"] - session["step"]
        if any(value <= 0 for value in resources.values()):
            session["status"] = "FAILURE"
        elif session["step"] >= session["max_steps"]:
            session["status"] = "SUCCESS" if session["correct_decisions"] >= session["pass_mark"] else "FAILURE"
        # Note: even when a pass is no longer possible we keep asking the
        # remaining questions, so the student still learns from them.
        del remaining

        feedback = ("Correct! " if correct else "Not quite. ") + q["explanation"]
        entry = {
            "step": session["step"],
            "question_id": q["id"],
            "kind": q["kind"],
            "question": q["question"],
            "topic": q["topic"],
            "action": chosen,
            "options": list(q["options"]),
            "selected_option": action_id,
            "correct": correct,
            "correct_answer": q["correct_answer"],
            "explanation": q["explanation"],
            "source": q.get("source"),
            "origin": q.get("origin", "verified"),
            "branch": q.get("branch", "core"),
            "label": q.get("label"),
            "feedback": feedback,
            "event": event,
            "story": _story_beat(session, correct),
        }
        session["history"].append(entry)
        question_store.mark_answered(session.get("user_id"), session_id, q["id"], correct)
        session["streak"] = session["streak"] + 1 if correct else 0
        if session["status"] == "ACTIVE" and session["reserve"]:
            nxt, branch = question_engine.order_next(session["reserve"], entry, session["streak"])
            session["reserve"].remove(nxt)
            _serve(session, _prepare(nxt, session["rng"], branch))
        elif session["status"] == "ACTIVE":
            session["status"] = "SUCCESS" if session["correct_decisions"] >= session["pass_mark"] else "FAILURE"

        result = public_session(session)
        result["last_feedback"] = feedback
        result["last_result"] = entry.copy()
        result["random_event"] = event
        return result


STORY = {
    "power": ("Power levels climb as systems hum back to life.", "Lights flicker: the batteries drain a little faster."),
    "oxygen": ("Fresh air flows. The crew breathes easier.", "The oxygen alarm chirps. Stay calm and think it through."),
    "integrity": ("The shields hold strong against the storm.", "The hull creaks as space weather hits the ship."),
    "fuel": ("Thrusters fire perfectly. The course is back on track.", "A wobble in the thrusters burns extra fuel."),
}


def _story_beat(session, correct):
    good, bad = STORY[PRIMARY_RESOURCES[session["mission_id"]]]
    return good if correct else bad


def get_session(session_id):
    with SESSION_LOCK:
        session = SESSIONS.get(session_id)
        if not session:
            raise ValueError("Session not found")
        return public_session(session)
