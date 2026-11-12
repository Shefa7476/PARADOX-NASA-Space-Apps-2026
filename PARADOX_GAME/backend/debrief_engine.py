
from datetime import datetime, timezone

from branching_engine import SESSIONS, LOCK

SAFE_ACTIONS = {
    "review",
    "protect",
    "verify",
    "stabilize",
    "diagnose"
}

REFERENCES = [
    {
        "title": "NASA DONKI Space Weather Database",
        "organization": "NASA CCMC",
        "url": "https://ccmc.gsfc.nasa.gov/DONKI/"
    },
    {
        "title": "NOAA Space Weather Prediction Center",
        "organization": "NOAA SWPC",
        "url": "https://www.swpc.noaa.gov/"
    },
    {
        "title": "NASA Systems Engineering Handbook",
        "organization": "NASA",
        "url": (
            "https://www.nasa.gov/reference/"
            "systems-engineering-handbook/"
        )
    }
]


def grade_from_score(score):
    if score >= 90:
        return "A"
    if score >= 80:
        return "B"
    if score >= 70:
        return "C"
    if score >= 60:
        return "D"
    return "F"


def get_completed_session(session_id):
    with LOCK:
        session = SESSIONS.get(session_id)

        if session is None:
            raise ValueError("Session not found")

        if session["status"] == "ACTIVE":
            raise ValueError(
                "Complete the mission before viewing the debrief"
            )

        # Snapshot prevents concurrent mutation while building.
        return {
            "session_id": session["session_id"],
            "difficulty": session["difficulty"],
            "status": session["status"],
            "event": session["event"].copy(),
            "initial_resources": session.get(
                "initial_resources",
                session["resources"]
            ).copy(),
            "final_resources": session["resources"].copy(),
            "history": [
                {
                    **entry,
                    "resource_changes": entry[
                        "resource_changes"
                    ].copy()
                }
                for entry in session["history"]
            ]
        }


def calculate_score(session):
    history = session["history"]

    outcome_score = (
        30 if session["status"] == "SUCCESS" else 0
    )

    # Three safe decisions earn the full 45 points.
    safe_count = sum(
        entry.get("action_key") in SAFE_ACTIONS
        for entry in history
    )

    decision_score = min(45, safe_count * 15)

    initial = session["initial_resources"]
    final = session["final_resources"]

    # Evaluate remaining operational margins relative
    # to starting resources, not absolute values.
    ratios = [
        min(1.0, final[name] / max(1, initial[name]))
        for name in initial
    ]

    resource_score = round(
        25 * sum(ratios) / len(ratios)
    )

    total = min(
        100,
        outcome_score + decision_score + resource_score
    )

    return {
        "total": total,
        "grade": grade_from_score(total),
        "outcome": outcome_score,
        "decisions": decision_score,
        "resources": resource_score,
        "maximum": 100
    }


def analyze_resources(session):
    initial = session["initial_resources"]
    final = session["final_resources"]

    analysis = []

    for name, starting_value in initial.items():
        ending_value = final[name]

        analysis.append({
            "name": name,
            "initial": starting_value,
            "final": ending_value,
            "change": ending_value - starting_value,
            "status": (
                "CRITICAL" if ending_value <= 25
                else "CAUTION" if ending_value <= 50
                else "STABLE"
            )
        })

    return analysis


def analyze_decisions(session):
    decisions = []

    for entry in session["history"]:
        action_key = entry.get("action_key")
        safe = action_key in SAFE_ACTIONS

        decisions.append({
            "step": entry["step"],
            "from_node": entry["from_node"],
            "to_node": entry["to_node"],
            "action": entry["action"],
            "assessment": (
                "RECOMMENDED"
                if safe else "RISKY"
            ),
            "feedback": entry["feedback"],
            "scientific_principle": entry["principle"],
            "resource_changes": entry[
                "resource_changes"
            ].copy()
        })

    return decisions


def generate_recommendations(session):
    recommendations = []

    if session["status"] == "FAILURE":
        recommendations.append(
            "Prioritize fault containment and verification "
            "before restoring affected systems."
        )

    if any(
        entry.get("action_key") not in SAFE_ACTIONS
        for entry in session["history"]
    ):
        recommendations.append(
            "Use spacecraft telemetry and diagnostics "
            "to support operational decisions."
        )

    if session["final_resources"]["integrity"] <= 50:
        recommendations.append(
            "Preserve system integrity by avoiding "
            "unverified subsystem restarts."
        )

    if not recommendations:
        recommendations.append(
            "Continue applying systematic hazard assessment, "
            "protective operations and verified recovery."
        )

    return recommendations


def generate_debrief(session_id):
    session = get_completed_session(session_id)

    return {
        "report_version": "1.0",
        "generated_at": datetime.now(
            timezone.utc
        ).isoformat(),
        "report_title": "PARADOX Scientific Mission Debrief",
        "session_id": session["session_id"],
        "mission_id": 3,
        "mission_title": "Solar Storm: Decision Cascade",
        "difficulty": session["difficulty"],
        "status": session["status"],
        "score": calculate_score(session),
        "nasa_event": session["event"],
        "resources": analyze_resources(session),
        "decisions": analyze_decisions(session),
        "recommendations": generate_recommendations(
            session
        ),
        "references": REFERENCES,
        "scientific_disclaimer": (
            "NASA DONKI supplies historical solar flare "
            "event metadata. Spacecraft telemetry, resource "
            "changes, decision outcomes and performance "
            "scores are PARADOX educational simulations. "
            "The score is not a NASA engineering metric."
        )
    }
