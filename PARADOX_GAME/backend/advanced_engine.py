import random
import uuid
from threading import Lock

from advanced_scenarios import ADVANCED_SCENARIOS

SESSIONS = {}
LOCK = Lock()

DIFFICULTY_RESOURCES = {
    "Easy": 90,
    "Medium": 75,
    "Hard": 60
}

RESOURCE_NAMES = [
    "power", "fuel", "oxygen", "integrity", "time"
]


def clamp(value):
    return max(0, min(100, value))


def public_state(session):
    stage_index = session["stage_index"]
    stages = session["scenario"]["stages"]
    finished = session["status"] != "ACTIVE"

    current = (
        None if finished else stages[stage_index]
    )

    return {
        "session_id": session["session_id"],
        "status": session["status"],
        "stage_index": stage_index,
        "total_stages": len(stages),
        "stage_name": current["name"] if current else None,
        "briefing": current["briefing"] if current else None,
        "telemetry": current["telemetry"] if current else {},
        "actions": (
            [
                {
                    "id": a["id"],
                    "label": a["label"]
                }
                for a in session["visible_actions"]
            ]
            if not finished else []
        ),
        "resources": session["resources"].copy(),
        "history": [h.copy() for h in session["history"]]
    }


def start_advanced_session(mission_id, scenario_id, difficulty):
    scenario = ADVANCED_SCENARIOS.get(
        (mission_id, scenario_id)
    )

    if not scenario:
        raise ValueError("Advanced scenario not implemented")

    if difficulty not in DIFFICULTY_RESOURCES:
        raise ValueError("Invalid difficulty")

    base = DIFFICULTY_RESOURCES[difficulty]

    session = {
        "session_id": str(uuid.uuid4()),
        "scenario": scenario,
        "stage_index": 0,
        "status": "ACTIVE",
        "score": 0,
        "resources": {
            name: clamp(base + random.randint(-4, 4))
            for name in RESOURCE_NAMES
        },
        "history": []
    }

    prepare_actions(session)

    with LOCK:
        SESSIONS[session["session_id"]] = session

    return public_state(session)


def prepare_actions(session):
    stage = session["scenario"]["stages"][
        session["stage_index"]
    ]

    actions = [a.copy() for a in stage["actions"]]
    random.shuffle(actions)

    for index, action in enumerate(actions):
        action["id"] = "ABC"[index]

    session["visible_actions"] = actions


def execute_advanced_action(session_id, action_id):
    with LOCK:
        session = SESSIONS.get(session_id)

        if not session:
            raise ValueError("Session not found")

        if session["status"] != "ACTIVE":
            raise ValueError("Mission already completed")

        action = next(
            (
                a for a in session["visible_actions"]
                if a["id"] == action_id
            ),
            None
        )

        if not action:
            raise ValueError("Invalid action")

        for resource, change in action["effects"].items():
            session["resources"][resource] = clamp(
                session["resources"][resource] + change
            )

        session["score"] += action["score"]

        session["history"].append({
            "stage": session["stage_index"] + 1,
            "action": action["label"],
            "feedback": action["feedback"],
            "resource_changes": action["effects"].copy()
        })

        critical = any(
            value <= 0
            for value in session["resources"].values()
        )

        session["stage_index"] += 1
        total = len(session["scenario"]["stages"])

        if critical:
            session["status"] = "FAILURE"
        elif session["stage_index"] >= total:
            session["status"] = (
                "SUCCESS"
                if session["score"] >= 5
                else "FAILURE"
            )
        else:
            prepare_actions(session)

        return public_state(session)