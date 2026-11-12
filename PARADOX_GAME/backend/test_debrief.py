
import json
from io import BytesIO

import pytest
from pypdf import PdfReader

from branching_engine import (
    create_branching_session,
    execute_branching_action,
    SESSIONS
)
from debrief_engine import generate_debrief
from report_generator import generate_pdf_report


TEST_EVENT = {
    "event_id": "TEST-DEBRIEF-FLR",
    "begin_time": "2026-09-01T10:00Z",
    "peak_time": "2026-09-01T10:10Z",
    "end_time": "2026-09-01T10:20Z",
    "class_type": "M1.0",
    "source": "SYNTHETIC TEST FIXTURE"
}


def start_session():
    return create_branching_session(
        TEST_EVENT,
        "Medium"
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


def complete_success():
    state = start_session()
    sid = state["session_id"]

    choose(sid, "review")
    choose(sid, "protect")
    choose(sid, "verify")

    return sid


def complete_emergency_recovery():
    state = start_session()
    sid = state["session_id"]

    choose(sid, "ignore")
    choose(sid, "stabilize")
    choose(sid, "diagnose")

    return sid


def complete_failure():
    state = start_session()
    sid = state["session_id"]

    choose(sid, "ignore")
    choose(sid, "force")

    return sid


def test_success_debrief():
    report = generate_debrief(complete_success())

    assert report["status"] == "SUCCESS"
    assert report["score"]["maximum"] == 100
    assert report["score"]["decisions"] == 45
    assert len(report["decisions"]) == 3


def test_emergency_recovery_debrief():
    report = generate_debrief(
        complete_emergency_recovery()
    )

    assert report["status"] == "SUCCESS"
    assert report["score"]["decisions"] == 30

    assert any(
        decision["assessment"] == "RISKY"
        for decision in report["decisions"]
    )


def test_failure_debrief():
    report = generate_debrief(complete_failure())

    assert report["status"] == "FAILURE"
    assert report["score"]["outcome"] == 0
    assert report["recommendations"]


def test_score_range():
    for make_session in (
        complete_success,
        complete_emergency_recovery,
        complete_failure
    ):
        report = generate_debrief(make_session())

        score = report["score"]

        assert 0 <= score["total"] <= 100
        assert score["grade"] in "ABCDF"

        assert score["total"] == (
            score["outcome"]
            + score["decisions"]
            + score["resources"]
        )


def test_resource_analysis():
    report = generate_debrief(complete_success())

    assert len(report["resources"]) == 5

    for item in report["resources"]:
        assert item["change"] == (
            item["final"] - item["initial"]
        )


def test_nasa_event_provenance():
    report = generate_debrief(complete_success())

    assert report["nasa_event"]["event_id"] == (
        TEST_EVENT["event_id"]
    )

    assert "simulations" in (
        report["scientific_disclaimer"].lower()
    )


def test_pdf_generation():
    report = generate_debrief(complete_success())

    pdf = generate_pdf_report(report)

    assert pdf.startswith(b"%PDF-")
    assert len(pdf) > 1000

    reader = PdfReader(BytesIO(pdf))
    assert len(reader.pages) >= 1

    extracted = "\n".join(
        page.extract_text() or ""
        for page in reader.pages
    )

    assert "PARADOX" in extracted
    assert "MISSION" in extracted


def test_json_serialization():
    report = generate_debrief(complete_success())

    encoded = json.dumps(report)
    decoded = json.loads(encoded)

    assert decoded["mission_id"] == 3
    assert decoded["status"] == "SUCCESS"


def test_active_mission_rejected():
    state = start_session()

    with pytest.raises(
        ValueError,
        match="Complete the mission"
    ):
        generate_debrief(state["session_id"])


def test_unknown_session_rejected():
    with pytest.raises(
        ValueError,
        match="Session not found"
    ):
        generate_debrief("unknown-session")


def test_debrief_does_not_change_game_state():
    sid = complete_success()

    before = SESSIONS[sid]["resources"].copy()
    history_count = len(SESSIONS[sid]["history"])

    generate_debrief(sid)

    assert SESSIONS[sid]["resources"] == before
    assert len(SESSIONS[sid]["history"]) == history_count
