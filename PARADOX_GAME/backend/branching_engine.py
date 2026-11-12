
import random
import uuid
from threading import RLock

from branching_scenarios import SCENARIO, TERMINAL_NODES
from nasa_data import get_solar_flare_events

SESSIONS = {}
LOCK = RLock()

DIFFICULTIES = {
    "Easy": 90,
    "Medium": 75,
    "Hard": 60
}

RESOURCE_NAMES = (
    "power", "fuel", "oxygen", "integrity", "time"
)

MAX_DECISIONS = 8


def clamp(value):
    return max(0, min(100, value))



def prepare_actions(session):
    node = SCENARIO["nodes"][session["node_id"]]

    actions = [a.copy() for a in node["actions"]]
    random.shuffle(actions)

    for index, action in enumerate(actions):
        action["id"] = chr(65 + index)

    session["actions"] = actions


def public_state(session):
    active = session["status"] == "ACTIVE"

    node = (
        SCENARIO["nodes"][session["node_id"]]
        if active else None
    )

    return {
        "session_id": session["session_id"],
        "mission_id": 3,
        "scenario_title": SCENARIO["title"],
        "difficulty": session["difficulty"],
        "status": session["status"],
        "node_id": session["node_id"],
        "stage": node["stage"] if node else None,
        "briefing": node["briefing"] if node else None,
        "telemetry": (
            node["telemetry"].copy() if node else {}
        ),
        "resources": session["resources"].copy(),
        "nasa_event": session["event"].copy(),
        "decision_count": len(session["history"]),
        "max_decisions": MAX_DECISIONS,
        "actions": [
            {"id": a["id"], "label": a["label"]}
            for a in session["actions"]
        ] if active else [],
        "history": [
            {
                **entry,
                "resource_changes": entry["resource_changes"].copy()
            }
            for entry in session["history"]
        ],
        "scientific_note": (
            "NASA DONKI supplies the historical flare event. "
            "Spacecraft telemetry, damage and recovery outcomes "
            "are rule-based educational simulations."
        )
    }


def create_branching_session(event, difficulty):
    if difficulty not in DIFFICULTIES:
        raise ValueError("Invalid difficulty")

    if not isinstance(event, dict) or not event.get("event_id"):
        raise ValueError("Invalid event")

    base = DIFFICULTIES[difficulty]

    session = {
        "session_id": str(uuid.uuid4()),
        "difficulty": difficulty,
        "event": event.copy(),
        "node_id": SCENARIO["start_node"],
        "status": "ACTIVE",
        "resources": {
            name: clamp(base + random.randint(-4, 4))
            for name in RESOURCE_NAMES
        },
        "actions": [],
        "history": []
    }
    
    session["initial_resources"] = session["resources"].copy()
    prepare_actions(session)

    with LOCK:
        SESSIONS[session["session_id"]] = session

    return public_state(session)


async def start_branching_session(difficulty, event_id):
    if difficulty not in DIFFICULTIES:
        raise ValueError("Invalid difficulty")

    events = await get_solar_flare_events(days=30)

    event = next(
        (e for e in events if e.get("event_id") == event_id),
        None
    )

    if event is None:
        raise ValueError(
            "NASA event not found in the current event list"
        )

    return create_branching_session(event, difficulty)


def execute_branching_action(session_id, action_id):
    with LOCK:
        session = SESSIONS.get(session_id)

        if session is None:
            raise ValueError("Session not found")

        if session["status"] != "ACTIVE":
            raise ValueError("Mission already finished")

        action = next(
            (
                a for a in session["actions"]
                if a["id"] == action_id
            ),
            None
        )

        if action is None:
            raise ValueError("Invalid action")

        previous_node = session["node_id"]
        changes = action["effects"].copy()

        for resource, amount in changes.items():
            session["resources"][resource] = clamp(
                session["resources"][resource] + amount
            )

        next_node = action["next_node"]

        session["history"].append({
            "step": len(session["history"]) + 1,
            "from_node": previous_node,
            "to_node": next_node,
            "action_key": action["key"],
            "action": action["label"],
            "feedback": action["feedback"],
            "principle": action["principle"],
            "resource_changes": changes
        })

        session["node_id"] = next_node

        if any(
            value <= 0
            for value in session["resources"].values()
        ):
            session["status"] = "FAILURE"
            session["node_id"] = "failure"

        elif next_node in TERMINAL_NODES:
            session["status"] = TERMINAL_NODES[next_node]

        elif len(session["history"]) >= MAX_DECISIONS:
            session["status"] = "FAILURE"
            session["node_id"] = "failure"

        else:
            prepare_actions(session)

        return public_state(session)


def get_branching_session(session_id):
    with LOCK:
        session = SESSIONS.get(session_id)

        if session is None:
            raise ValueError("Session not found")

        return public_state(session)
