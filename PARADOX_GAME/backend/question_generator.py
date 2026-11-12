"""AI question generation with retrieval grounding and strict validation.

Used only when OPENAI_API_KEY is configured. Generated questions must pass:
schema checks, option-count rules for the level, exactly one correct answer,
distinct options, child-safety screening, a grounding check against the
retrieved evidence, and semantic de-duplication against every curated,
calculated and previously generated question for that planet. Accepted
questions are stored in SQLite and reused for other students.
"""

from __future__ import annotations

import json
import os
import re
import uuid

import httpx

import question_store
from ai_tutor import UNSAFE_TOPICS, ai_configured
from question_bank import DIFFICULTY_OPTION_COUNT, PLANET_NAMES, PLANET_SOURCES, QUESTION_BANK, STAGE_TOPICS, validate_question
from question_templates import TEMPLATE_QUESTIONS
from semantic import find_duplicate, is_semantic_duplicate, local_similarity, question_signature, tokens

LEVEL_SPEC = {
    "Easy": "beginner (age 8-10): one simple fact, short sentences, everyday words, exactly 3 options",
    "Medium": "intermediate (age 10-12): reasoning or applying a concept, exactly 4 options",
    "Hard": "advanced (age 12-14): analysis, calculation or a real mission scenario, exactly 4 meaningful options",
}


def _existing_signatures(planet_id):
    sigs = [question_signature(q) for q in QUESTION_BANK if q["planet_id"] == planet_id]
    sigs += [question_signature(q) for q in TEMPLATE_QUESTIONS if q["planet_id"] == planet_id and not q["variant"]]
    for level in DIFFICULTY_OPTION_COUNT:
        sigs += [question_signature(q) for q in question_store.generated_pool(planet_id, level)]
    return sigs


def validate_generated(item, planet_id, stage_id, difficulty, evidence, existing):
    """Return (question, None) if valid, else (None, reason)."""
    if not isinstance(item, dict):
        return None, "not an object"
    options = [str(o).strip() for o in item.get("options") or []]
    correct = str(item.get("correct_answer", "")).strip()
    q = {
        "id": f"AI{planet_id}-{difficulty[0]}-{uuid.uuid4().hex[:8]}",
        "planet_id": planet_id, "planet": PLANET_NAMES[planet_id], "stage_id": stage_id, "difficulty": difficulty,
        "topic": str(item.get("topic") or STAGE_TOPICS[(planet_id, stage_id)])[:80],
        "question": str(item.get("question", "")).strip()[:300], "options": options, "correct_answer": correct,
        "explanation": str(item.get("explanation", "")).strip()[:600], "origin": "ai-generated",
        "source": PLANET_SOURCES[planet_id],
        "evidence": [e["id"] for e in evidence if e["id"] in set(item.get("evidence_ids") or [])],
    }
    problems = validate_question(q)
    if problems:
        return None, "; ".join(problems)
    if options.count(correct) != 1:
        return None, "must have exactly one correct answer"
    if any(local_similarity(a, b) > 0.85 for i, a in enumerate(options) for b in options[i + 1:]):
        return None, "options too similar"
    if any(len(o) > 140 for o in options) or len(q["question"]) < 15 or len(q["explanation"]) < 30:
        return None, "length limits"
    blob = " ".join([q["question"], *options, q["explanation"]])
    if UNSAFE_TOPICS.search(blob) or re.search(r"https?://", blob):
        return None, "safety"
    # Grounding: the answer + explanation must overlap the cited evidence.
    if not q["evidence"]:
        return None, "no evidence cited"
    ev_text = " ".join(e["text"] for e in evidence if e["id"] in q["evidence"])
    key_terms = set(tokens(f"{correct} {q['explanation']}"))
    if len(key_terms & set(tokens(ev_text))) < max(2, len(key_terms) // 4):
        return None, "not supported by evidence"
    dup, _ = find_duplicate(question_signature(q), existing)
    if dup:
        return None, "duplicate of an existing question"
    return q, None


async def _call_model(planet_id, stage_id, difficulty, n, evidence, avoid):
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    endpoint = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1/chat/completions").strip().rstrip("/")
    if not endpoint.endswith("/chat/completions"):
        endpoint = f"{endpoint}/chat/completions"
    planet = PLANET_NAMES[planet_id]
    ev = "\n".join(f"[{e['id']}] {e['title']}: {e['text']}" for e in evidence)
    prompt = (
        f"Write {n} NEW multiple-choice questions for a children's space game.\n"
        f"Planet: {planet}. Stage topic: {STAGE_TOPICS[(planet_id, stage_id)]}. Level: {LEVEL_SPEC[difficulty]}.\n"
        "Each question must test a DIFFERENT concept, not a paraphrase of another question.\n"
        "Use ONLY facts stated in the EVIDENCE below. Exactly one option must be correct; wrong options must be plausible but clearly wrong.\n"
        f"Do NOT ask about these already-used ideas:\n- " + "\n- ".join(a[:120] for a in avoid[:40]) + "\n"
        f"EVIDENCE:\n{ev}\n"
        'Return JSON: {"questions":[{"question":"...","options":["..."],"correct_answer":"...","explanation":"2-3 child-friendly sentences","topic":"...","evidence_ids":["..."]}]}'
    )
    payload = {"model": os.getenv("QUESTION_MODEL", os.getenv("OPENAI_MODEL", "gpt-4o-mini")), "temperature": 0.7, "max_tokens": 1800,
               "response_format": {"type": "json_object"},
               "messages": [{"role": "system", "content": "You write accurate, age-appropriate science quiz questions. Output JSON only."},
                            {"role": "user", "content": prompt}]}
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.post(endpoint, headers={"Authorization": f"Bearer {api_key}"}, json=payload)
        r.raise_for_status()
        content = r.json()["choices"][0]["message"]["content"]
    return json.loads(content).get("questions", [])


async def generate_questions(planet_id, stage_id, difficulty, n=4, avoid=()):
    """Generate, validate, de-duplicate and store questions. Returns (accepted, rejected_reasons)."""
    from retrieval import search

    planet = PLANET_NAMES[planet_id]
    # Ground on knowledge-base passages, not quiz explanations (avoids paraphrasing existing questions).
    from knowledge_base import DOCS, doc_record
    found, _ = await search(f"{planet} {STAGE_TOPICS[(planet_id, stage_id)]}", k=12, planet=planet)
    evidence = [e for e in found if not e["id"].startswith("qb:")]
    evidence += [doc_record(d) for d in DOCS if planet.lower() in d[3].lower() and d[0] not in {e["id"] for e in evidence}]
    evidence = evidence[:8]
    existing = _existing_signatures(planet_id) + list(avoid)
    try:
        items = await _call_model(planet_id, stage_id, difficulty, n, evidence, existing)
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as error:
        return [], [f"generation failed: {type(error).__name__}"]
    accepted, rejected = [], []
    for item in items[: n + 2]:
        q, why = validate_generated(item, planet_id, stage_id, difficulty, evidence, existing)
        if q:
            dup, _, _, _ = await is_semantic_duplicate(question_signature(q), existing)
            if dup:
                rejected.append("semantic duplicate (embeddings)")
                continue
            question_store.save_generated(q, model=os.getenv("QUESTION_MODEL", os.getenv("OPENAI_MODEL", "gpt-4o-mini")))
            existing.append(question_signature(q))
            accepted.append(q)
        else:
            rejected.append(why)
    return accepted, rejected


async def ensure_pool(user_id, planet_id, stage_id, difficulty, needed=4):
    """Top up the AI pool when this student is running low on new questions."""
    from question_engine import select_fresh
    if not ai_configured():
        return {"generated": 0, "available": None}
    have = len(select_fresh(user_id, planet_id, stage_id, difficulty, needed + 2))
    if have >= needed + 2:
        return {"generated": 0, "available": have}
    seen = [s["signature"] for s in question_store.seen_for_planet(user_id, planet_id)]
    accepted, rejected = await generate_questions(planet_id, stage_id, difficulty, n=needed, avoid=seen)
    return {"generated": len(accepted), "rejected": rejected, "available": have + len(accepted)}
