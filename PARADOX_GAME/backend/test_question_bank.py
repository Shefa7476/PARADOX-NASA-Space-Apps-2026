from collections import Counter

from question_bank import (
    DIFFICULTY_OPTION_COUNT,
    QUESTION_BANK,
    questions_for,
    shuffled_copy,
    validate_question,
)


def test_bank_covers_every_planet_stage_and_difficulty():
    for planet in range(1, 9):
        for stage in (1, 2, 3):
            for difficulty in DIFFICULTY_OPTION_COUNT:
                assert len(questions_for(planet, stage, difficulty)) >= 3, (planet, stage, difficulty)


def test_every_question_is_valid():
    problems = {q["id"]: validate_question(q) for q in QUESTION_BANK}
    assert {k: v for k, v in problems.items() if v} == {}


def test_no_duplicate_questions_or_ids():
    assert len({q["id"] for q in QUESTION_BANK}) == len(QUESTION_BANK)
    texts = Counter(q["question"].strip().lower() for q in QUESTION_BANK)
    assert [t for t, n in texts.items() if n > 1] == []


def test_option_counts_match_difficulty():
    for q in QUESTION_BANK:
        assert len(q["options"]) == DIFFICULTY_OPTION_COUNT[q["difficulty"]]


def test_shuffle_keeps_correct_answer():
    q = QUESTION_BANK[0]
    for _ in range(20):
        s = shuffled_copy(q)
        assert sorted(s["options"]) == sorted(q["options"])
        assert s["correct_answer"] in s["options"]
