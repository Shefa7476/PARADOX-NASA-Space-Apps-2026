"""Chooses mission questions so students don't see repeats.

Pools (separate for every planet, stage and difficulty level):
  1. Curated, hand-checked questions for this exact stage + level.
  2. Calculated questions from verified NASA planet data (per planet + level).
  3. AI-generated questions that passed validation (stored for reuse).
  4. "New numbers" variants of calculated concepts (labelled for the student).

A candidate is skipped when the student has already been served it (stored in
the database), when its concept was already used, or when it is semantically
too similar to anything the student has seen on this planet (any level). If
nothing new is left, the engine says so explicitly; it never silently repeats.
"""

from __future__ import annotations

import random

from question_bank import QUESTION_BANK
from question_templates import TEMPLATE_QUESTIONS
from semantic import LOCAL_DUPLICATE_THRESHOLD, local_vector, cosine, question_signature  # noqa: F401
import question_store

TEMPLATE_HISTORY_THRESHOLD = 0.70
MISSION_LENGTH = 4


class PoolExhausted(ValueError):
    def __init__(self, planet, stage, difficulty, ai_enabled):
        self.info = {
            "code": "POOL_EXHAUSTED",
            "message": (f"You've answered every new {difficulty} question we have for this {planet} adventure. Amazing work! "
                        + ("Zippy couldn't create new checked questions right now. " if ai_enabled else
                           "New AI-generated questions need an AI key on the server. ")
                        + "Try a different level or adventure, or play a Review mission with questions you've seen before."),
            "options": ["other_level", "other_stage", "review"],
        }
        super().__init__(self.info["message"])


def _threshold(q):
    return TEMPLATE_HISTORY_THRESHOLD if q.get("origin") == "verified-data" else LOCAL_DUPLICATE_THRESHOLD


def candidate_pool(planet_id, stage_id, difficulty):
    """All questions for this planet/stage/level, in priority order (tier, question)."""
    curated = [dict(q, origin="verified", concept_key=q["id"], variant="", tier=1)
               for q in QUESTION_BANK if q["planet_id"] == planet_id and q["stage_id"] == stage_id and q["difficulty"] == difficulty]
    templates = [dict(q, tier=2 if not q["variant"] or q["concept_key"].startswith("tpl:kepler-asteroid") else 4)
                 for q in TEMPLATE_QUESTIONS if q["planet_id"] == planet_id and q["difficulty"] == difficulty]
    generated = [dict(q, tier=3) for q in question_store.generated_pool(planet_id, difficulty)
                 if q.get("stage_id") in (None, stage_id)]
    return curated + templates + generated


def select_fresh(user_id, planet_id, stage_id, difficulty, count, exclude_ids=(), extra_seen=(), rng=None):
    """Greedy, diverse selection of up to `count` unseen questions."""
    rng = rng or random
    seen = question_store.seen_for_planet(user_id, planet_id)
    seen_ids = {s["question_id"] for s in seen} | set(exclude_ids)
    seen_concepts = {s["concept_key"] for s in seen}
    seen_vectors = [local_vector(s["signature"]) for s in seen] + [local_vector(t) for t in extra_seen]

    picked, picked_vectors, picked_concepts = [], [], set()
    pool = candidate_pool(planet_id, stage_id, difficulty)
    by_tier = {}
    for q in pool:
        by_tier.setdefault(q["tier"], []).append(q)
    for tier in sorted(by_tier):
        items = by_tier[tier][:]
        rng.shuffle(items)
        for q in items:
            if len(picked) >= count:
                return picked
            if q["id"] in seen_ids:
                continue
            new_concept = q["concept_key"] not in seen_concepts and q["concept_key"] not in picked_concepts
            if tier != 4 and not new_concept:
                continue
            if tier == 4 and q["concept_key"] in picked_concepts:
                continue  # at most one "new numbers" variant per concept per mission
            vec = local_vector(question_signature(q))
            limit = _threshold(q)
            if tier != 4 and any(cosine(vec, v) >= limit for v in seen_vectors):
                continue
            if any(cosine(vec, v) >= limit for v in picked_vectors):
                continue
            q = dict(q)
            if tier == 4:
                q["label"] = "New numbers challenge"
            picked.append(q)
            picked_vectors.append(vec)
            picked_concepts.add(q["concept_key"])
    return picked


def select_review(user_id, planet_id, stage_id, difficulty, count, rng=None):
    """Explicit review mode: questions the student has seen before, oldest first."""
    rng = rng or random
    seen = [s for s in question_store.seen_for_planet(user_id, planet_id) if s["difficulty"] == difficulty]
    pool = {q["id"]: q for q in candidate_pool(planet_id, stage_id, difficulty)}
    out = []
    for s in seen:
        q = pool.get(s["question_id"])
        if q and q["id"] not in {o["id"] for o in out}:
            out.append(dict(q, label="Review"))
        if len(out) >= count:
            break
    return out


def count_fresh(user_id, planet_id, stage_id, difficulty, limit=40):
    return len(select_fresh(user_id, planet_id, stage_id, difficulty, limit, rng=random.Random(0)))


def order_next(reserve, last_entry, streak):
    """Branching: after a mistake, follow up on the same topic; after a streak, a data challenge."""
    if not reserve:
        return None, "core"
    if last_entry and not last_entry["correct"]:
        topic_words = set(local_vector(last_entry.get("topic", "") + " " + last_entry.get("question", "")))
        def related(q):
            return len(topic_words & set(local_vector(q["topic"] + " " + q["question"])))
        best = max(reserve, key=related)
        if related(best) > 0:
            return best, "follow-up"
    if streak >= 2:
        challenge = next((q for q in reserve if q.get("origin") == "verified-data"), None)
        if challenge:
            return challenge, "challenge"
    return reserve[0], "core"
