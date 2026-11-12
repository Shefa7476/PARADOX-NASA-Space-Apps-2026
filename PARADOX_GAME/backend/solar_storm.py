
import random
import uuid
from threading import Lock

from nasa_data import get_solar_flare_events

SESSIONS = {}
LOCK = Lock()

DIFFICULTIES = {
    "Easy": 90,
    "Medium": 75,
    "Hard": 60
}

STAGES = [
    {
        "name": "Analyze",
        "briefing": (
            "A solar flare has been reported. Review the "
            "event and assess spacecraft operating conditions."
        ),
        "telemetry": {
            "radiation_monitor": "REVIEW REQUIRED",
            "spacecraft_status": "NOMINAL",
            "communications": "AVAILABLE"
        },
        "actions": [
            {
                "key": "analyze",
                "label": "Review radiation monitoring and spacecraft telemetry",
                "effects": {"power": -3, "time": -5},
                "correct": True,
                "feedback": "You assessed the spacecraft before responding."
            },
            {
                "key": "ignore",
                "label": "Ignore the event and continue normal operations",
                "effects": {"integrity": -15, "time": -8},
                "correct": False,
                "feedback": "Potential space-weather hazards remain unassessed."
            },
            {
                "key": "shutdown",
                "label": "Permanently disable all spacecraft systems",
                "effects": {"power": -20, "time": -10},
                "correct": False,
                "feedback": "An irreversible shutdown is not justified by this alert."
            }
        ]
    },
    {
        "name": "Protect",
        "briefing": (
            "Mission control requests a precautionary response. "
            "Reduce unnecessary exposure of sensitive operations."
        ),
        "telemetry": {
            "sensitive_operations": "ACTIVE",
            "safe_mode": "AVAILABLE",
            "power_margin": "LIMITED"
        },
        "actions": [
            {
                "key": "protect",
                "label": "Pause sensitive operations and enter protective configuration",
                "effects": {"power": -7, "time": -8},
                "correct": True,
                "feedback": "Sensitive operations are placed in a protective configuration."
            },
            {
                "key": "continue",
                "label": "Continue all sensitive operations without assessment",
                "effects": {"integrity": -20, "time": -5},
                "correct": False,
                "feedback": "You continued operations without evaluating the hazard."
            },
            {
                "key": "boost",
                "label": "Increase unnecessary electrical loads",
                "effects": {"power": -22, "time": -7},
                "correct": False,
                "feedback": "Additional electrical load reduces the available margin."
            }
        ]
    },
    {
        "name": "Recover",
        "briefing": (
            "The precautionary operating period has ended in "
            "this simulation. Verify system health before resuming."
        ),
        "telemetry": {
            "system_diagnostics": "PENDING",
            "communications_check": "PENDING",
            "recovery_authorization": "AVAILABLE"
        },
        "actions": [
            {
                "key": "recover",
                "label": "Run diagnostics and restore operations gradually",
                "effects": {"power": -6, "time": -10},
                "correct": True,
                "feedback": "Diagnostics support a controlled return to operations."
            },
            {
                "key": "rush",
                "label": "Restore every subsystem without diagnostics",
                "effects": {"integrity": -18, "time": -5},
                "correct": False,
                "feedback": "Unverified systems were returned to service."
            },
            {
                "key": "disable",
                "label": "Disable health monitoring before recovery",
                "effects": {"integrity": -15, "power": -5},
                "correct": False,
                "feedback": "Recovery monitoring was unnecessarily disabled."
            }
        ]
    }
]


def prepare_actions(session):
    stage = STAGES[session["stage_index"]]
    actions = [action.copy() for action in stage["actions"]]
    random.shuffle(actions)

    for index, action in enumerate(actions):
        action["id"] = "ABC"[index]

    session["actions"] = actions


def public_state(session):
    finished = session["status"] != "ACTIVE"

    stage = (
        None if finished
        else STAGES[session["stage_index"]]
    )

    return {
        "session_id": session["session_id"],
        "mission_id": 3,
        "scenario_name": "NASA Solar Storm Investigation",
        "difficulty": session["difficulty"],
        "status": session["status"],
        "stage_index": session["stage_index"],
        "total_stages": len(STAGES),
        "stage_name": stage["name"] if stage else None,
        "briefing": stage["briefing"] if stage else None,
        "telemetry": stage["telemetry"].copy() if stage else {},
        "resources": session["resources"].copy(),
        "nasa_event": session["event"].copy(),
        "actions": [
            {"id": a["id"], "label": a["label"]}
            for a in session["actions"]
        ] if not finished else [],
        "history": [h.copy() for h in session["history"]],
        "scientific_note": (
            "NASA DONKI provides the historical solar flare record. "
            "Spacecraft conditions and resource changes are simulated."
        )
    }


def create_session_from_event(event, difficulty):
    if difficulty not in DIFFICULTIES:
        raise ValueError("Invalid difficulty")

    if not isinstance(event, dict) or not event.get("event_id"):
        raise ValueError("Invalid NASA event")

    base = DIFFICULTIES[difficulty]

    session = {
        "session_id": str(uuid.uuid4()),
        "difficulty": difficulty,
        "event": event.copy(),
        "stage_index": 0,
        "status": "ACTIVE",
        "correct_decisions": 0,
        "resources": {
            name: max(0, min(100, base + random.randint(-4, 4)))
            for name in ("power", "fuel", "oxygen", "integrity", "time")
        },
        "actions": [],
        "history": []
    }

    prepare_actions(session)

    with LOCK:
        SESSIONS[session["session_id"]] = session

    return public_state(session)


async def start_solar_storm(difficulty, event_id):
    if difficulty not in DIFFICULTIES:
        raise ValueError("Invalid difficulty")

    events = await get_solar_flare_events(days=30)

    if not events:
        raise ValueError("No NASA solar flare events available")

    event = next(
        (e for e in events if e["event_id"] == event_id),
        None
    )

    if event is None:
        raise ValueError("Selected NASA event was not found")

    return create_session_from_event(event, difficulty)


def execute_solar_action(session_id, action_id):
    with LOCK:
        session = SESSIONS.get(session_id)

        if not session:
            raise ValueError("Session not found")

        if session["status"] != "ACTIVE":
            raise ValueError("Mission already completed")

        action = next(
            (
                a for a in session["actions"]
                if a["id"] == action_id
            ),
            None
        )

        if not action:
            raise ValueError("Invalid action")

        before = session["resources"].copy()

        for resource, change in action["effects"].items():
            session["resources"][resource] = max(
                0,
                min(100, session["resources"][resource] + change)
            )

        if action["correct"]:
            session["correct_decisions"] += 1

        session["history"].append({
            "stage": STAGES[session["stage_index"]]["name"],
            "action": action["label"],
            "correct": action["correct"],
            "feedback": action["feedback"],
            "resources_before": before,
            "resources_after": session["resources"].copy()
        })

        session["stage_index"] += 1

        critical_failure = any(
            value <= 0 for value in session["resources"].values()
        )

        if critical_failure:
            session["status"] = "FAILURE"

        elif session["stage_index"] >= len(STAGES):
            session["status"] = (
                "SUCCESS"
                if session["correct_decisions"] == len(STAGES)
                else "FAILURE"
            )

        else:
            prepare_actions(session)

        return public_state(session)
