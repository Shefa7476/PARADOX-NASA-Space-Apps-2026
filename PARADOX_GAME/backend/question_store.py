"""Persistent, per-student question history and stored generated questions.

Adds new tables to the existing PARADOX SQLite database (CREATE TABLE IF NOT
EXISTS, so existing accounts and progress are untouched).
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from account_store import _connect, init_db  # noqa: F401  (init_db already ran on import)

SCHEMA = """
CREATE TABLE IF NOT EXISTS question_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    concept_key TEXT NOT NULL,
    signature TEXT NOT NULL,
    planet_id INTEGER NOT NULL,
    stage_id INTEGER,
    difficulty TEXT NOT NULL,
    origin TEXT NOT NULL,
    topic TEXT,
    served_at TEXT NOT NULL,
    answered_at TEXT,
    correct INTEGER,
    review INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, session_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_qh_user_planet ON question_history(user_id, planet_id);
CREATE TABLE IF NOT EXISTS generated_questions (
    id TEXT PRIMARY KEY,
    planet_id INTEGER NOT NULL,
    stage_id INTEGER,
    difficulty TEXT NOT NULL,
    topic TEXT NOT NULL,
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    source TEXT,
    evidence TEXT,
    model TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_gq_pool ON generated_questions(planet_id, difficulty);
CREATE TABLE IF NOT EXISTS embedding_cache (
    text_hash TEXT PRIMARY KEY,
    model TEXT NOT NULL,
    vector TEXT NOT NULL
);
"""


def ensure_schema():
    with _connect() as db:
        db.executescript(SCHEMA)


ensure_schema()


def _now():
    return datetime.now(timezone.utc).isoformat()


def mark_served(user_id, session_id, q, review=False):
    if not user_id:
        return
    from semantic import question_signature
    with _connect() as db:
        db.execute(
            """INSERT OR IGNORE INTO question_history
               (user_id, session_id, question_id, concept_key, signature, planet_id, stage_id, difficulty, origin, topic, served_at, review)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (user_id, session_id, q["id"], q.get("concept_key") or q["id"], question_signature(q), q["planet_id"],
             q.get("stage_id"), q["difficulty"], q.get("origin", "verified"), q.get("topic"), _now(), int(review)),
        )


def mark_answered(user_id, session_id, question_id, correct):
    if not user_id:
        return
    with _connect() as db:
        db.execute("UPDATE question_history SET answered_at=?, correct=? WHERE user_id=? AND session_id=? AND question_id=?",
                   (_now(), int(bool(correct)), user_id, session_id, question_id))


def seen_for_planet(user_id, planet_id):
    if not user_id:
        return []
    with _connect() as db:
        rows = db.execute(
            "SELECT question_id, concept_key, signature, difficulty, stage_id, served_at FROM question_history WHERE user_id=? AND planet_id=? ORDER BY served_at",
            (user_id, planet_id),
        ).fetchall()
    return [dict(r) for r in rows]


def save_generated(q, model=None):
    with _connect() as db:
        db.execute(
            """INSERT OR IGNORE INTO generated_questions
               (id, planet_id, stage_id, difficulty, topic, question, options, correct_answer, explanation, source, evidence, model, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (q["id"], q["planet_id"], q.get("stage_id"), q["difficulty"], q["topic"], q["question"], json.dumps(q["options"]),
             q["correct_answer"], q["explanation"], q.get("source"), json.dumps(q.get("evidence") or []), model, _now()),
        )


def generated_pool(planet_id, difficulty):
    with _connect() as db:
        rows = db.execute("SELECT * FROM generated_questions WHERE planet_id=? AND difficulty=? ORDER BY created_at", (planet_id, difficulty)).fetchall()
    out = []
    for r in rows:
        q = dict(r)
        q["options"] = json.loads(q["options"])
        q["evidence"] = json.loads(q["evidence"] or "[]")
        q["origin"] = "ai-generated"
        q["concept_key"] = f"ai:{q['id']}"
        q["variant"] = ""
        from question_bank import PLANET_NAMES
        q["planet"] = PLANET_NAMES.get(q["planet_id"])
        out.append(q)
    return out


def learning_insights(user_id):
    """Accuracy by level, planet and topic plus a recommended level."""
    from question_bank import PLANET_NAMES
    with _connect() as db:
        rows = [dict(r) for r in db.execute(
            "SELECT planet_id, difficulty, topic, correct, answered_at FROM question_history WHERE user_id=? AND answered_at IS NOT NULL ORDER BY answered_at",
            (user_id,)).fetchall()]
    def stat(items):
        n = len(items)
        right = sum(1 for r in items if r["correct"])
        return {"answered": n, "correct": right, "accuracy": round(right / n * 100) if n else None}
    by_level = {lvl: stat([r for r in rows if r["difficulty"] == lvl]) for lvl in ("Easy", "Medium", "Hard")}
    by_planet = [{"planet_id": pid, "planet": name, **stat([r for r in rows if r["planet_id"] == pid])} for pid, name in PLANET_NAMES.items()]
    topics = {}
    for r in rows:
        topics.setdefault(r["topic"] or "General", []).append(r)
    topic_stats = sorted(({"topic": t, **stat(items)} for t, items in topics.items() if len(items) >= 2), key=lambda x: x["accuracy"])
    return {
        "total_answered": len(rows),
        "overall": stat(rows),
        "by_level": by_level,
        "by_planet": by_planet,
        "strong_topics": [t for t in reversed(topic_stats) if t["accuracy"] >= 75][:3],
        "practice_topics": [t for t in topic_stats if t["accuracy"] < 60][:3],
        "recommended_level": recommend_level(rows),
    }


def recommend_level(rows):
    """Adaptive difficulty: look at the last answers at each level."""
    def recent(level, n=8):
        items = [r for r in rows if r["difficulty"] == level][-n:]
        return (sum(1 for r in items if r["correct"]) / len(items), len(items)) if items else (None, 0)
    for level, up, down in (("Hard", None, "Medium"), ("Medium", "Hard", "Easy"), ("Easy", "Medium", None)):
        acc, n = recent(level)
        if n >= 6:
            if up and acc >= 0.8:
                return {"level": up, "reason": f"You got {round(acc * 100)}% right on {level}. Ready for {up}!"}
            if down and acc < 0.4:
                return {"level": down, "reason": f"{level} has been tricky ({round(acc * 100)}%). Build confidence on {down}, then come back."}
            return {"level": level, "reason": f"{level} is a good challenge for you right now ({round(acc * 100)}% right)."}
    return {"level": "Easy", "reason": "Start with Easy to warm up your space brain."}
