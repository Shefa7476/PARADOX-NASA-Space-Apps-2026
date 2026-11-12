
from solar_storm import (
    create_session_from_event,
    execute_solar_action,
    SESSIONS
)

TEST_EVENT = {
    "event_id": "TEST-FLR-001",
    "begin_time": "2026-09-01T10:00Z",
    "peak_time": "2026-09-01T10:10Z",
    "end_time": "2026-09-01T10:20Z",
    "class_type": "M1.0",
    "source": "NASA DONKI - TEST FIXTURE"
}


def test_success():
    state = create_session_from_event(
        TEST_EVENT, "Medium"
    )

    assert state["status"] == "ACTIVE"
    assert state["mission_id"] == 3
    assert len(state["actions"]) == 3

    session_id = state["session_id"]

    for expected_stage in ("Analyze", "Protect", "Recover"):
        assert state["stage_name"] == expected_stage

        private = SESSIONS[session_id]
        correct = next(
            action for action in private["actions"]
            if action["correct"]
        )

        state = execute_solar_action(
            session_id,
            correct["id"]
        )

    assert state["status"] == "SUCCESS"
    assert len(state["history"]) == 3
    print("PASS: Correct decisions lead to success")


def test_failure():
    state = create_session_from_event(
        TEST_EVENT, "Medium"
    )

    session_id = state["session_id"]

    for _ in range(3):
        private = SESSIONS[session_id]
        wrong = next(
            action for action in private["actions"]
            if not action["correct"]
        )

        state = execute_solar_action(
            session_id,
            wrong["id"]
        )

        if state["status"] != "ACTIVE":
            break

    assert state["status"] == "FAILURE"
    print("PASS: Incorrect decisions lead to failure")


def test_randomized_actions():
    positions = set()

    for _ in range(30):
        state = create_session_from_event(
            TEST_EVENT, "Easy"
        )

        private = SESSIONS[state["session_id"]]
        correct = next(
            action for action in private["actions"]
            if action["correct"]
        )

        positions.add(correct["id"])

    assert len(positions) > 1
    print("PASS: Correct action position is randomized")


def test_private_answers():
    state = create_session_from_event(
        TEST_EVENT, "Easy"
    )

    assert all(
        "correct" not in action
        for action in state["actions"]
    )

    print("PASS: Correct answers are not exposed")


if __name__ == "__main__":
    test_success()
    test_failure()
    test_randomized_actions()
    test_private_answers()

    print("ALL SOLAR STORM TESTS PASSED")
