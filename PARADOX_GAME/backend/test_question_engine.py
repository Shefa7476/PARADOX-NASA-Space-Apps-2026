"""Non-repetition, persistence, branching and adaptivity of mission questions."""
import itertools
import uuid

import pytest

import account_store
import question_store
from question_bank import validate_question
from question_engine import PoolExhausted, candidate_pool
from semantic import LOCAL_DUPLICATE_THRESHOLD, local_similarity
from simulation import SESSIONS, create_session, current_correct_option_id, evaluate_action


def new_user():
    name = "t" + uuid.uuid4().hex[:10]
    _, user = account_store.register_user(name, f"{name}@example.test", "Test Kid", "rocket1234")
    return user["id"]


def play(user_id, planet, stage, level, correct=True, review=False):
    s = create_session(planet, stage, level, user_id=user_id, review=review)
    served = []
    while s["status"] == "ACTIVE":
        q = SESSIONS[s["session_id"]]["current"]
        assert validate_question(dict(q, stage_id=q.get("stage_id") or stage)) == [], q["id"]
        assert sum(1 for o in q["options"] if o == q["correct_answer"]) == 1
        served.append(q)
        right = current_correct_option_id(s["session_id"])
        choice = right if correct else next(o["id"] for o in s["question"]["options"] if o["id"] != right)
        s = evaluate_action(s["session_id"], choice)
    return s, served


def test_replays_never_repeat_until_exhausted_then_say_so():
    uid = new_user()
    all_ids, all_text, plays = [], [], 0
    while True:
        try:
            _, served = play(uid, 4, 1, "Medium")
        except PoolExhausted as e:
            assert e.info["code"] == "POOL_EXHAUSTED" and "review" in e.info["options"]
            break
        plays += 1
        all_ids += [q["id"] for q in served]
        all_text += [q for q in served]
        assert plays < 50
    assert plays >= 3, "should support several fresh replays"
    assert len(all_ids) == len(set(all_ids)), "a question id was repeated"
    # no semantic duplicates among non-variant questions
    base = [q for q in all_text if q.get("label") != "New numbers challenge"]
    for a, b in itertools.combinations(base, 2):
        sim = local_similarity(f"{a['question']} {a['correct_answer']}", f"{b['question']} {b['correct_answer']}")
        assert sim < 0.75, (a["question"], b["question"], sim)


def test_levels_use_separate_pools_for_same_student():
    uid = new_user()
    seen = {}
    for level in ("Easy", "Medium", "Hard"):
        _, served = play(uid, 2, 2, level)
        seen[level] = {q["id"] for q in served}
        assert all(q["difficulty"] == level for q in served)
    assert seen["Easy"].isdisjoint(seen["Medium"]) and seen["Medium"].isdisjoint(seen["Hard"])


def test_history_is_persisted_in_database_and_survives_restart():
    uid = new_user()
    _, served = play(uid, 1, 1, "Easy")
    SESSIONS.clear()  # simulate a backend restart / browser refresh / logout
    rows = question_store.seen_for_planet(uid, 1)
    assert {r["question_id"] for r in rows} >= {q["id"] for q in served}
    _, served2 = play(uid, 1, 1, "Easy")
    assert {q["id"] for q in served}.isdisjoint({q["id"] for q in served2})


def test_different_students_have_independent_history():
    a, b = new_user(), new_user()
    _, first_a = play(a, 3, 1, "Hard")
    _, second_a = play(a, 3, 1, "Hard")
    _, first_b = play(b, 3, 1, "Hard")
    assert {q["id"] for q in first_a}.isdisjoint({q["id"] for q in second_a})
    # Student B is not affected by A's history: B can be served questions A already saw.
    pool_ids = {q["id"] for q in candidate_pool(3, 1, "Hard")}
    assert {q["id"] for q in first_b} <= pool_ids | {q["id"] for q in first_b if "DECISION" in q["id"]}
    assert any("DECISION" in q["id"] for q in first_b), "B still gets the stage briefing decision"


def test_review_mode_is_explicit():
    uid = new_user()
    with pytest.raises(ValueError):
        create_session(5, 2, "Easy", user_id=uid, review=True)
    play(uid, 5, 2, "Easy")
    s, served = play(uid, 5, 2, "Easy", review=True)
    assert served and all(q.get("label") == "Review" or "DECISION" in q["id"] for q in served)


def test_branching_follow_up_after_mistake():
    uid = new_user()
    s, served = play(uid, 6, 1, "Medium", correct=False)
    branches = [h["branch"] for h in s["history"]]
    assert branches[0] == "core"
    assert "follow-up" in branches or len(served) < 3
    assert all(h["story"] for h in s["history"])


def test_learning_insights_and_adaptive_recommendation():
    uid = new_user()
    for stage in (1, 2, 3):
        play(uid, 1, stage, "Easy", correct=True)
    info = question_store.learning_insights(uid)
    assert info["by_level"]["Easy"]["answered"] >= 8
    assert info["recommended_level"]["level"] == "Medium"
    uid2 = new_user()
    for stage in (1, 2, 3):
        play(uid2, 1, stage, "Hard", correct=False)
    assert question_store.learning_insights(uid2)["recommended_level"]["level"] == "Medium"


def test_bank_has_no_semantic_duplicates_within_a_planet():
    from question_bank import QUESTION_BANK
    for planet in range(1, 9):
        items = [q for q in QUESTION_BANK if q["planet_id"] == planet]
        for a, b in itertools.combinations(items, 2):
            sim = local_similarity(f"{a['question']} {a['correct_answer']}", f"{b['question']} {b['correct_answer']}")
            assert sim < LOCAL_DUPLICATE_THRESHOLD, (a["id"], b["id"], sim)


def test_briefing_decision_is_not_reused_across_levels():
    uid = new_user()
    _, easy = play(uid, 1, 1, "Easy")
    _, hard = play(uid, 1, 1, "Hard")
    _, med = play(uid, 1, 1, "Medium")
    assert any("DECISION" in q["id"] for q in easy)
    assert not any("DECISION" in q["id"] for q in hard), "Hard repeated the Easy fix question"
    assert any("DECISION" in q["id"] for q in med), "Medium asks a different (diagnosis) question"
    texts = [q["question"] for q in easy + hard + med]
    assert len(texts) == len(set(texts))
