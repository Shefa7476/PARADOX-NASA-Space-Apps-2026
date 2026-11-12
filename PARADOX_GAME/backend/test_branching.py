
import random

from branching_engine import (
    create_branching_session,
    execute_branching_action,
    get_branching_session,
    SESSIONS
)

TEST_EVENT = {
    "event_id": "TEST-FLR-BRANCHING",
    "begin_time": "2026-09-01T10:00Z",
    "peak_time": "2026-09-01T10:10Z",
    "end_time": "2026-09-01T10:20Z",
    "class_type": "M1.0",
    "source": "TEST FIXTURE"
}


def start_test_session(difficulty="Medium"):
    return create_branching_session(
        TEST_EVENT,
        difficulty
    )


def choose(session_id, action_key):
    private = SESSIONS[session_id]

    action = next(
        a for a in private["actions"]
        if a["key"] == action_key
    )

    return execute_branching_action(
        session_id,
        action["id"]
    )


def test_correct_path():
    state = start_test_session()
    sid = state["session_id"]

    assert state["node_id"] == "analyze"

    state = choose(sid, "review")
    assert state["node_id"] == "controlled_protection"

    state = choose(sid, "protect")
    assert state["node_id"] == "controlled_recovery"

    state = choose(sid, "verify")

    assert state["status"] == "SUCCESS"
    assert len(state["history"]) == 3

    print("PASS: Correct path leads to success")


def test_emergency_branch():
    state = start_test_session()
    sid = state["session_id"]

    state = choose(sid, "ignore")

    assert state["node_id"] == "emergency"
    assert state["stage"] == "Emergency Stabilization"

    state = choose(sid, "stabilize")

    assert state["node_id"] == "emergency_recovery"

    state = choose(sid, "diagnose")

    assert state["status"] == "SUCCESS"

    print("PASS: Emergency recovery path works")


def test_failure_path():
    state = start_test_session()
    sid = state["session_id"]

    choose(sid, "ignore")
    state = choose(sid, "force")

    assert state["status"] == "FAILURE"

    print("PASS: Unsafe action leads to failure")


def test_randomization():
    # Fixed seed makes this test reproducible.
    random.seed(42)
    positions = set()

    for _ in range(30):
        state = start_test_session("Easy")
        sid = state["session_id"]

        action = next(
            a for a in SESSIONS[sid]["actions"]
            if a["key"] == "review"
        )

        positions.add(action["id"])

    assert len(positions) > 1

    print("PASS: Actions are randomized")


def test_private_rules():
    state = start_test_session()

    for action in state["actions"]:
        assert "key" not in action
        assert "next_node" not in action
        assert "effects" not in action

    print("PASS: Private decision rules are hidden")


def test_invalid_action():
    state = start_test_session()
    sid = state["session_id"]

    try:
        execute_branching_action(sid, "INVALID")
    except ValueError:
        pass
    else:
        raise AssertionError("Invalid action was accepted")

    assert get_branching_session(sid)["decision_count"] == 0

    print("PASS: Invalid action is rejected")


def test_finished_session():
    state = start_test_session()
    sid = state["session_id"]

    choose(sid, "review")
    choose(sid, "protect")
    state = choose(sid, "verify")

    assert state["status"] == "SUCCESS"

    try:
        execute_branching_action(sid, "A")
    except ValueError:
        pass
    else:
        raise AssertionError("Finished session accepted an action")

    print("PASS: Finished session cannot be modified")


if __name__ == "__main__":
    test_correct_path()
    test_emergency_branch()
    test_failure_path()
    test_randomization()
    test_private_rules()
    test_invalid_action()
    test_finished_session()

    print("ALL BRANCHING TESTS PASSED")
