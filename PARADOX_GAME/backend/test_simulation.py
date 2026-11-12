import random

from simulation import SESSIONS, create_session, current_correct_option_id, evaluate_action

DIFFS = ("Easy", "Medium", "Hard")


def _play(session, answer_correctly=True):
    while session["status"] == "ACTIVE":
        right = current_correct_option_id(session["session_id"])
        options = [o["id"] for o in session["question"]["options"]]
        choice = right if answer_correctly else next(o for o in options if o != right)
        session = evaluate_action(session["session_id"], choice)
    return session


def test_all_scenarios_all_difficulties_can_be_completed():
    total = 0
    for mission_id in range(1, 9):
        for scenario_id in range(1, 4):
            for difficulty in DIFFS:
                session = create_session(mission_id, scenario_id, difficulty)
                assert session["status"] == "ACTIVE"
                assert session["difficulty"] == difficulty
                assert len(session["resources"]) == 5
                assert session["max_steps"] == 4
                session = _play(session)
                assert session["status"] == "SUCCESS", (mission_id, scenario_id, difficulty, session["resources"])
                assert session["step"] == 4
                assert all(entry["correct"] for entry in session["history"])
                total += 1
    assert total == 72


def test_difficulty_changes_option_count_and_questions():
    for difficulty, count in (("Easy", 3), ("Medium", 4), ("Hard", 4)):
        session = create_session(4, 2, difficulty)
        while session["status"] == "ACTIVE":
            assert len(session["question"]["options"]) == count
            assert session["question"]["difficulty"] == difficulty
            session = evaluate_action(session["session_id"], current_correct_option_id(session["session_id"]))

    easy = {e["question_id"] for e in _play(create_session(4, 2, "Easy"))["history"]}
    hard = {e["question_id"] for e in _play(create_session(4, 2, "Hard"))["history"]}
    assert easy.isdisjoint(hard)


def test_stages_have_different_questions_and_no_repeats_in_mission():
    seen = {}
    for scenario_id in (1, 2, 3):
        session = _play(create_session(5, scenario_id, "Medium"))
        ids = [e["question_id"] for e in session["history"]]
        assert len(ids) == len(set(ids))
        seen[scenario_id] = set(ids)
    assert seen[1].isdisjoint(seen[2]) and seen[2].isdisjoint(seen[3]) and seen[1].isdisjoint(seen[3])


def test_wrong_answers_fail_and_reveal_explanations_after_answering():
    session = create_session(1, 1, "Easy")
    assert "correct_answer" not in str(session["question"])  # answer key hidden before answering
    session = _play(session, answer_correctly=False)
    assert session["status"] == "FAILURE"
    assert all(not e["correct"] and e["explanation"] and e["correct_answer"] for e in session["history"])


def test_shuffling_preserves_answer_key():
    random.seed(7)
    for _ in range(30):
        session = create_session(3, 3, "Hard")
        while session["status"] == "ACTIVE":
            q = SESSIONS[session["session_id"]]["current"]
            assert q["correct_answer"] in q["options"]
            labels = [o["label"] for o in session["question"]["options"]]
            assert labels == q["options"]
            session = evaluate_action(session["session_id"], current_correct_option_id(session["session_id"]))


def test_invalid_action_rejected():
    session = create_session(2, 1, "Easy")
    for bad in ("D", "Z", "", "AB"):
        try:
            evaluate_action(session["session_id"], bad)
        except ValueError:
            continue
        raise AssertionError(f"accepted invalid option {bad!r}")


if __name__ == "__main__":
    test_all_scenarios_all_difficulties_can_be_completed()
    print("PASSED")
