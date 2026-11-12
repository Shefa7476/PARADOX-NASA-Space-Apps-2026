
import asyncio

import pytest

import copilot
from branching_engine import (
    create_branching_session,
    execute_branching_action,
    SESSIONS
)

TEST_EVENT = {
    "event_id": "TEST-COPILOT-FLR",
    "begin_time": "2026-09-01T10:00Z",
    "peak_time": "2026-09-01T10:10Z",
    "end_time": "2026-09-01T10:20Z",
    "class_type": "M1.0",
    "source": "TEST FIXTURE"
}


def make_session():
    return create_branching_session(
        TEST_EVENT,
        "Medium"
    )


def run_hint(session_id, question=""):
    return asyncio.run(
        copilot.get_copilot_hint(
            session_id,
            question
        )
    )


def choose(session_id, action_key):
    action = next(
        a for a in SESSIONS[session_id]["actions"]
        if a["key"] == action_key
    )

    return execute_branching_action(
        session_id,
        action["id"]
    )


def test_rule_based_hint(monkeypatch):
    monkeypatch.setenv("COPILOT_PROVIDER", "rules")

    state = make_session()
    result = run_hint(state["session_id"])

    assert result["provider"] == "rules"
    assert result["node_id"] == "analyze"
    assert result["hint"]
    assert result["hints_remaining"] == 5
    assert len(result["references"]) > 0


def test_hint_changes_with_branch(monkeypatch):
    monkeypatch.setenv("COPILOT_PROVIDER", "rules")

    state = make_session()
    sid = state["session_id"]

    first = run_hint(sid)

    choose(sid, "ignore")

    second = run_hint(sid)

    assert second["node_id"] == "emergency"
    assert first["hint"] != second["hint"]


def test_hint_limit(monkeypatch):
    monkeypatch.setenv("COPILOT_PROVIDER", "rules")

    state = make_session()
    sid = state["session_id"]

    for _ in range(6):
        run_hint(sid)

    with pytest.raises(
        ValueError,
        match="Hint limit reached"
    ):
        run_hint(sid)


def test_invalid_session():
    with pytest.raises(ValueError):
        run_hint("invalid-session-id")


def test_finished_mission(monkeypatch):
    monkeypatch.setenv("COPILOT_PROVIDER", "rules")

    state = make_session()
    sid = state["session_id"]

    choose(sid, "review")
    choose(sid, "protect")
    choose(sid, "verify")

    with pytest.raises(
        ValueError,
        match="active missions"
    ):
        run_hint(sid)


def test_ai_fallback(monkeypatch):
    monkeypatch.setenv("COPILOT_PROVIDER", "openai")

    async def broken_ai(context, knowledge, question):
        raise RuntimeError("Simulated API outage")

    monkeypatch.setattr(
        copilot,
        "generate_ai_hint",
        broken_ai
    )

    state = make_session()
    result = run_hint(state["session_id"])

    assert result["provider"] == "rules"
    assert result["hint"]


def test_ai_success(monkeypatch):
    monkeypatch.setenv("COPILOT_PROVIDER", "openai")

    async def mock_ai(context, knowledge, question):
        return (
            "Consider how the available measurements "
            "could reduce uncertainty about the environment."
        )

    monkeypatch.setattr(
        copilot,
        "generate_ai_hint",
        mock_ai
    )

    state = make_session()
    result = run_hint(state["session_id"])

    assert result["provider"] == "ai"


def test_spoiler_filter():
    actions = [
        {
            "id": "A",
            "label": "Review radiation monitor and spacecraft telemetry"
        }
    ]

    assert not copilot.is_safe_hint(
        "Choose option A.",
        actions
    )

    assert not copilot.is_safe_hint(
        "Review radiation monitor and spacecraft telemetry",
        actions
    )

    assert copilot.is_safe_hint(
        "Consider which measurements could reduce uncertainty.",
        actions
    )


def test_long_question():
    state = make_session()

    with pytest.raises(
        ValueError,
        match="too long"
    ):
        run_hint(
            state["session_id"],
            "x" * 501
        )


def test_hint_does_not_modify_resources(monkeypatch):
    monkeypatch.setenv("COPILOT_PROVIDER", "rules")

    state = make_session()
    sid = state["session_id"]

    before = SESSIONS[sid]["resources"].copy()

    run_hint(sid)

    after = SESSIONS[sid]["resources"].copy()

    assert before == after


if __name__ == "__main__":
    raise SystemExit(
        pytest.main(["-v", __file__])
    )
