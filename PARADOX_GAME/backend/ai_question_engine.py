
"""AI-assisted mission question generation for PARADOX."""

import json
import os
import random
import uuid
from datetime import datetime, timezone
from threading import RLock

import httpx
import logging

logger = logging.getLogger("paradox.ai")

from missions import MISSIONS
from nasa_data import get_solar_flare_events

DIFFICULTIES = {"Easy", "Medium", "Hard"}

# Answer keys are kept on the backend, never sent with generated questions.
QUESTION_SESSIONS = {}
_LOCK = RLock()

DOMAIN_TEMPLATES = {
    1: {
        "problem": "The spacecraft has lost its reliable Earth communication link.",
        "clues": [
            "The transmitter reports a power warning",
            "Antenna pointing telemetry is available",
            "The receiver reports intermittent signal loss",
        ],
        "question": "What should mission control verify first?",
        "options": [
            "Review transmitter health and pointing telemetry before recovery",
            "Assume the antenna is destroyed and discard it",
            "Disable all communications monitoring",
        ],
        "correct_index": 0,
        "rationale": "Reviewing telemetry helps narrow the fault without assuming an unverified cause.",
    },
    2: {
        "problem": "A habitat sensor reports falling cabin pressure.",
        "clues": [
            "Cabin pressure is trending downward",
            "A compartment leak sensor is active",
            "Backup life-support status is available",
        ],
        "question": "Which response best prioritizes crew safety?",
        "options": [
            "Follow the approved emergency checklist and isolate the suspected compartment if permitted",
            "Disable every pressure sensor to stop the alarm",
            "Increase unrelated electrical loads before diagnosing the leak",
        ],
        "correct_index": 0,
        "rationale": "Preserve monitoring and follow verified procedures while investigating the suspected leak.",
    },
    3: {
        "problem": "A historical solar flare event has been selected for a simulated mission.",
        "clues": [
            "NASA DONKI event metadata is available",
            "Flare classification does not directly determine spacecraft radiation dose",
            "Spacecraft telemetry in this exercise is simulated",
        ],
        "question": "What is the most defensible first step after a solar-weather alert?",
        "options": [
            "Review event metadata and spacecraft telemetry, then follow validated protective procedures",
            "Treat flare class alone as a precise measurement of crew radiation dose",
            "Assume critical spacecraft damage without checking telemetry",
        ],
        "correct_index": 0,
        "rationale": "DONKI event metadata alone does not establish spacecraft dose or damage.",
    },
    4: {
        "problem": "A rover reports abnormal wheel-motor load and reduced mobility.",
        "clues": [
            "Wheel-motor load is abnormal",
            "Mobility has decreased",
            "Terrain conditions may affect traction",
        ],
        "question": "What is the safest initial response?",
        "options": [
            "Assess telemetry and terrain, then use a validated reduced-mobility procedure",
            "Increase speed before identifying the fault",
            "Disable mobility and navigation monitoring",
        ],
        "correct_index": 0,
        "rationale": "Diagnose the fault before escalating the motor load.",
    },
    5: {
        "problem": "Navigation estimates disagree before a planned maneuver.",
        "clues": [
            "Position estimates are inconsistent",
            "Propulsion is nominal",
            "The planned maneuver has not begun",
        ],
        "question": "What should the mission team do before correcting the trajectory?",
        "options": [
            "Validate navigation sources and recompute the maneuver using approved procedures",
            "Fire thrusters immediately using the first estimate",
            "Disable telemetry to remove conflicting readings",
        ],
        "correct_index": 0,
        "rationale": "Maneuvers should rely on validated navigation data.",
    },
    6: {
        "problem": "A spacecraft compartment reports a possible electrical fire.",
        "clues": [
            "A smoke alarm is active",
            "An electrical fault is reported",
            "Temperature is trending upward",
        ],
        "question": "What is the best initial response?",
        "options": [
            "Follow the approved fire-response checklist and isolate affected equipment as directed",
            "Increase oxygen flow without assessment",
            "Ignore the alarm until more systems fail",
        ],
        "correct_index": 0,
        "rationale": "Follow validated emergency procedures and avoid worsening the hazard.",
    },
    7: {
        "problem": "A spacecraft power bus reports a fault while batteries are discharging.",
        "clues": [
            "A power-bus fault is active",
            "Battery charge is decreasing",
            "Some essential subsystems remain operational",
        ],
        "question": "Which action best supports safe recovery?",
        "options": [
            "Isolate the fault according to procedure and preserve essential loads",
            "Increase every subsystem's power consumption",
            "Disable battery protection and monitoring",
        ],
        "correct_index": 0,
        "rationale": "Fault isolation and essential-load prioritization support safer recovery.",
    },
    8: {
        "problem": "A lander receives inconsistent altitude estimates during descent.",
        "clues": [
            "Two altitude estimates disagree",
            "Guidance uncertainty is elevated",
            "A validated contingency procedure is available",
        ],
        "question": "What is the most defensible next step?",
        "options": [
            "Use the validated contingency and cross-check available navigation data",
            "Ignore the disagreement and disable guidance",
            "Change the landing plan without checking the state estimate",
        ],
        "correct_index": 0,
        "rationale": "Landing decisions should use validated state estimates and approved contingencies.",
    },
}

# Additional question variants for each difficulty.
# These are educational templates, not NASA-generated questions.

DIFFICULTY_VARIANTS = {
    "Easy": [
        {
            "problem": "A communication signal becomes weak.",
            "question": "What should the operator check first?",
            "clues": [
                "Signal strength is decreasing",
                "Antenna status is available",
            ],
        },
        {
            "problem": "A spacecraft battery warning appears.",
            "question": "What is the safest initial step?",
            "clues": [
                "Battery charge is decreasing",
                "Power telemetry is available",
            ],
        },
        {
            "problem": "A spacecraft temperature sensor reports an unusual reading.",
            "question": "What should mission control do first?",
            "clues": [
                "One temperature reading is unusual",
                "Other telemetry can be checked",
            ],
        },
    ],
    "Medium": [
        {
            "problem": "A weak communication link and a transmitter power warning appear together.",
            "question": "Which investigation best distinguishes a power fault from an antenna problem?",
            "clues": [
                "Signal strength is falling",
                "Transmitter power is below its expected range",
                "Antenna pointing telemetry is available",
            ],
        },
        {
            "problem": "Battery charge is falling while a non-essential subsystem draws excess power.",
            "question": "Which response best protects essential mission operations?",
            "clues": [
                "Battery charge is decreasing",
                "A non-essential load is elevated",
                "Essential systems remain operational",
            ],
        },
        {
            "problem": "Two temperature sensors disagree during a spacecraft equipment alert.",
            "question": "What should the operator verify before changing system configuration?",
            "clues": [
                "Two sensor readings disagree",
                "The equipment alert remains active",
                "Independent telemetry is available",
            ],
        },
    ],
    "Hard": [
        {
            "problem": "Communication quality is degrading while spacecraft power reserves are limited.",
            "question": "Which action best balances fault isolation, communication recovery, and power conservation?",
            "clues": [
                "Signal quality is decreasing",
                "Power reserves are limited",
                "Antenna and transmitter telemetry disagree",
                "Essential spacecraft systems must remain powered",
            ],
        },
        {
            "problem": "A battery anomaly occurs while the spacecraft is operating in a restricted power mode.",
            "question": "How should mission control prioritize diagnosis and essential loads under uncertainty?",
            "clues": [
                "Battery telemetry is abnormal",
                "Power mode restricts available loads",
                "Some subsystems are mission-critical",
                "The fault source is not yet confirmed",
            ],
        },
        {
            "problem": "Conflicting temperature telemetry appears during a time-critical spacecraft operation.",
            "question": "What is the most defensible way to assess the risk before taking corrective action?",
            "clues": [
                "Temperature sensors disagree",
                "The operation has a limited decision window",
                "Changing configuration has operational costs",
                "Independent system telemetry is available",
            ],
        },
    ],
}



def _difficulty_guidance(level):
    return {
        "Easy": "Use clear clues and one primary hazard.",
        "Medium": "Compare at least two clues and consider a resource trade-off.",
        "Hard": "Consider competing constraints and uncertainty; do not invent evidence.",
    }[level]


def _make_fallback(mission_id, difficulty, event=None):
    template = DOMAIN_TEMPLATES[mission_id]
    rng = random.Random(uuid.uuid4().hex)

    clues = list(template["clues"])
    if difficulty == "Easy":
        clues = clues[:2]
    elif difficulty == "Hard":
        clues.append(
            "Constraint: event metadata alone does not prove spacecraft damage."
        )

    # Shuffle options while preserving the correct answer's ID.
    indexed = list(enumerate(template["options"]))
    rng.shuffle(indexed)

    actions = [
        {"id": chr(65 + i), "label": label}
        for i, (_, label) in enumerate(indexed)
    ]
    correct_id = chr(
        65 + next(
            i for i, (original, _) in enumerate(indexed)
            if original == template["correct_index"]
        )
    )

    mission = next(m for m in MISSIONS if m["id"] == mission_id)

    question = {
        "question_id": str(uuid.uuid4()),
        "mission_id": mission_id,
        "mission_title": mission["title"],
        "difficulty": difficulty,
        "problem": template["problem"],
        "question": template["question"],
        "clues": clues,
        "actions": actions,
        "source": {
            "kind": (
                "NASA DONKI event metadata + educational rules"
                if event and mission_id == 3
                else "PARADOX educational template"
            ),
            "event": event,
            "retrieved_at": datetime.now(timezone.utc).isoformat(),
        },
        "generation_mode": "validated_fallback",
        "difficulty_guidance": _difficulty_guidance(difficulty),
        "scientific_note": (
            "Educational simulation. NASA event metadata is real when supplied; "
            "spacecraft telemetry and mission outcomes are simulated."
        ),
    }

    question["_correct_action_id"] = correct_id
    question["_rationale"] = template["rationale"]
    return question


async def _try_ai_generation(question):
    """Generate a NASA-event-grounded educational question using OpenAI."""

    import json
    import logging
    import os

    import httpx

    logger = logging.getLogger("paradox.ai")

    # --------------------------------------------------
    # 1. Configuration
    # --------------------------------------------------
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    provider = os.getenv(
        "QUESTION_GENERATOR_PROVIDER", "rules"
    ).strip().lower()

    model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini").strip()
    endpoint = os.getenv(
        "OPENAI_BASE_URL",
        "https://api.openai.com/v1/chat/completions",
    ).strip().rstrip("/")

    if not endpoint.endswith("/chat/completions"):
        endpoint = f"{endpoint}/chat/completions"

    logger.info(
        "AI config: provider=%s, api_key_present=%s, model=%s",
        provider,
        bool(api_key),
        model,
    )

    if provider != "openai":
        logger.warning(
            "AI generation skipped: provider is %r, not 'openai'",
            provider,
        )
        return None

    if not api_key:
        logger.error(
            "AI generation failed: OPENAI_API_KEY is missing"
        )
        return None

    # --------------------------------------------------
    # 2. Read the selected NASA event
    # --------------------------------------------------
    source = question.get("source") or {}
    event = source.get("event")

    if not isinstance(event, dict) or not event:
        logger.error(
            "AI generation failed: NASA event metadata is missing"
        )
        return None

    def first_value(*keys):
        """Return the first non-empty value found in the event."""
        for key in keys:
            value = event.get(key)
            if value is not None and str(value).strip():
                return value
        return None

    event_facts = {
        "event_id": first_value(
            "event_id",
            "flrID",
            "cmeID",
            "gstID",
            "sepID",
            "eventID",
        ),
        "begin_time": first_value("begin_time", "beginTime"),
        "peak_time": first_value("peak_time", "peakTime"),
        "end_time": first_value("end_time", "endTime"),
        "class_type": first_value("class_type", "classType"),
        "source_location": first_value(
            "source_location", "sourceLocation"
        ),
        "active_region": first_value(
            "active_region", "activeRegionNum"
        ),
    }

    event_facts = {
        key: value
        for key, value in event_facts.items()
        if value is not None
    }

    # Keep only real event facts. Do not generate a NASA-grounded
    # question if the selected record contains no useful evidence.
    useful_fields = {
        "event_id",
        "begin_time",
        "peak_time",
        "end_time",
        "class_type",
        "source_location",
        "active_region",
    }

    if not useful_fields.intersection(event_facts):
        logger.error(
            "AI generation failed: unsupported NASA event fields. "
            "Available keys: %s",
            list(event.keys()),
        )
        return None

    # --------------------------------------------------
    # 3. Build a data-grounded prompt
    # --------------------------------------------------
    difficulty = question.get("difficulty", "Easy")

    difficulty_instructions = {
        "Easy": (
            "Ask a direct question about one supplied event fact."
        ),
        "Medium": (
            "Ask the player to compare or interpret at least two "
            "supplied facts when possible."
        ),
        "Hard": (
            "Require careful interpretation of multiple supplied facts "
            "or their limitations. Do not invent missing measurements."
        ),
    }

    prompt = {
        "dataset": "NASA DONKI event metadata",
        "event_facts": event_facts,
        "difficulty": difficulty,
        "difficulty_instruction": difficulty_instructions.get(
            difficulty,
            difficulty_instructions["Easy"],
        ),
        "requirements": {
            "problem": "An event-specific educational mission problem",
            "question": "One clear question answerable from the supplied facts",
            "clues": "Two to four clues based on the supplied facts",
            "options": "Exactly three distinct answer options",
            "correct_index": (
                "Integer 0, 1, or 2 identifying the option supported "
                "by the supplied event facts"
            ),
            "rationale": (
                "Explain why the selected answer follows from the facts"
            ),
        },
        "scientific_restrictions": [
            "Do not invent event measurements or observations.",
            "Do not infer spacecraft damage from a solar flare class.",
            "Do not infer radiation dose from event classification alone.",
            "Do not claim NASA supplied the question or answer options.",
            "If the supplied facts cannot support a question, return "
            "an empty object: {}.",
        ],
    }

    payload = {
        "model": model,
        "temperature": 0.7,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a science education question generator. "
                    "Use only the supplied NASA event facts. Return valid "
                    "JSON with keys: problem, question, clues, options, "
                    "correct_index, rationale. There must be exactly three "
                    "distinct options. correct_index must be an integer "
                    "from 0 to 2. The correct option must be supported by "
                    "the provided data. Never fabricate scientific evidence. "
                    "If no defensible question can be created, return {}."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(prompt, ensure_ascii=False),
            },
        ],
    }

    # --------------------------------------------------
    # 4. Call the OpenAI API
    # --------------------------------------------------
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                endpoint,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

            logger.info(
                "AI provider returned HTTP %s",
                response.status_code,
            )

            if response.is_error:
                logger.error(
                    "AI provider HTTP error: status=%s, body=%s",
                    response.status_code,
                    response.text[:1000],
                )

            response.raise_for_status()
            body = response.json()

        content = body["choices"][0]["message"]["content"]
        generated = json.loads(content)

    except httpx.HTTPStatusError as exc:
        logger.error(
            "AI HTTP error: status=%s, body=%s",
            exc.response.status_code,
            exc.response.text[:1000],
        )
        return None

    except httpx.HTTPError:
        logger.exception("AI network request failed")
        return None

    except (KeyError, IndexError, TypeError, ValueError):
        logger.exception("AI response could not be parsed")
        return None

    # --------------------------------------------------
    # 5. Validate the generated content
    # --------------------------------------------------
    if not isinstance(generated, dict) or not generated:
        logger.error("AI response rejected: empty or invalid JSON object")
        return None

    problem = generated.get("problem")
    text_question = generated.get("question")
    clues = generated.get("clues")
    options = generated.get("options")
    correct_index = generated.get("correct_index")
    rationale = generated.get("rationale")

    if not isinstance(problem, str) or not problem.strip():
        logger.error("AI response rejected: missing problem")
        return None

    if not isinstance(text_question, str) or not text_question.strip():
        logger.error("AI response rejected: missing question")
        return None

    if (
        not isinstance(clues, list)
        or not 2 <= len(clues) <= 4
        or not all(isinstance(c, str) and c.strip() for c in clues)
    ):
        logger.error("AI response rejected: invalid clues")
        return None

    if (
        not isinstance(options, list)
        or len(options) != 3
        or not all(isinstance(o, str) and o.strip() for o in options)
        or len({o.strip().casefold() for o in options}) != 3
    ):
        logger.error("AI response rejected: invalid options")
        return None

    if (
        isinstance(correct_index, bool)
        or not isinstance(correct_index, int)
        or correct_index not in (0, 1, 2)
    ):
        logger.error("AI response rejected: invalid correct_index")
        return None

    if not isinstance(rationale, str) or not rationale.strip():
        logger.error("AI response rejected: missing rationale")
        return None

    # --------------------------------------------------
    # 6. Update the existing question without exposing the answer
    # --------------------------------------------------
    question["problem"] = problem.strip()
    question["question"] = text_question.strip()
    question["clues"] = [clue.strip() for clue in clues]
    question["actions"] = [
        {
            "id": chr(65 + index),
            "label": option.strip(),
        }
        for index, option in enumerate(options)
    ]

    # These private fields are used by the existing backend
    # answer-submission logic. Do not send them to the frontend.
    question["_correct_action_id"] = chr(65 + correct_index)
    question["_rationale"] = rationale.strip()[:1200]
    question["generation_mode"] = "ai_generated_nasa_grounded"

    logger.info(
        "AI question generated successfully: difficulty=%s, event_id=%s",
        difficulty,
        event_facts.get("event_id", "not-provided"),
    )

    return question

async def generate_question(mission_id, difficulty, event_id=None):
    if difficulty not in DIFFICULTIES:
        raise ValueError("Difficulty must be Easy, Medium, or Hard")

    mission = next((m for m in MISSIONS if m["id"] == mission_id), None)
    if mission is None:
        raise ValueError("Mission not found")

    event = None
    if mission_id == 3:
        events = await get_solar_flare_events(days=30)
        if not events:
            raise ValueError(
                "NASA DONKI returned no solar flare events; try again later"
            )

        event = (
            next(
                (e for e in events if e.get("event_id") == event_id),
                None,
            )
            if event_id
            else random.choice(events)
        )
        if event is None:
            raise ValueError(
                "Selected NASA DONKI event was not found in the current event list"
            )

  
    question = _make_fallback(mission_id, difficulty, event)
    generated = await _try_ai_generation(question)

    if generated is not None:
        question = generated
    elif mission_id == 3:
        raise ValueError(
            "NASA-grounded AI generation failed. "
            "Check the AI provider, API key, and NASA event data."
        )


    with _LOCK:
        QUESTION_SESSIONS[question["question_id"]] = {
            "correct_action_id": question.pop("_correct_action_id"),
            "rationale": question.pop("_rationale"),
            "answered": False,
            "source": question["source"],
        }

    return question


def submit_answer(question_id, action_id):
    with _LOCK:
        session = QUESTION_SESSIONS.get(question_id)

        if session is None:
            raise ValueError("Question session not found or expired")
        if session["answered"]:
            raise ValueError("This question has already been answered")
        if action_id not in {"A", "B", "C"}:
            raise ValueError("Invalid action; choose A, B, or C")

        session["answered"] = True
        correct = action_id == session["correct_action_id"]

        return {
            "question_id": question_id,
            "correct": correct,
            "status": "CORRECT" if correct else "INCORRECT",
            "correct_action_id": session["correct_action_id"],
            "rationale": session["rationale"],
            "source": session["source"],
            "educational_note": (
                "NASA event metadata provides scientific context; it does not "
                "directly determine spacecraft damage or mission outcomes."
            ),
        }
