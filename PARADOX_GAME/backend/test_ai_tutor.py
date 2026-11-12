import asyncio

import pytest

import ai_tutor
from ai_tutor import RateLimited, TutorError, clean_reply, screen_message, tutor_reply


@pytest.fixture(autouse=True)
def offline(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    ai_tutor._RATE.clear()


def ask(text, context=None, mode="chat", player="t1", language="en"):
    return asyncio.run(tutor_reply(player, [{"role": "user", "content": text}], context or {}, mode, language))


def test_offline_mode_is_labelled_and_never_claims_ai():
    result = ask("Why is Mars red?", {"planet": "Mars"})
    assert result["provider"] == "offline"
    assert "not configured" in result["notice"]
    assert "rust" in result["reply"].lower()
    assert result["suggestions"]


def test_context_from_question_bank_is_used_after_answering():
    result = ask("Can you explain this?", {"question_id": "P4-S2-M1", "answered": True})
    assert "2.5 times" in result["reply"]


def test_answer_not_revealed_before_answering():
    result = ask("What is the answer?", {"question_id": "P4-S2-M1", "answered": False})
    assert "2.5 times" not in result["reply"]
    assert "hint" in result["reply"].lower()


def test_personal_information_is_blocked():
    assert screen_message("my email is kid@example.com")
    assert screen_message("I live at 12 Green Road")
    assert ask("call me on 01712 345 678")["provider"] == "safety"
    assert screen_message("What killed the dinosaurs?") is None


def test_unsafe_links_removed():
    assert "[link removed]" in clean_reply("see http://evil.example.com now")
    assert "https://science.nasa.gov/mars/" in clean_reply("see https://science.nasa.gov/mars/")


def test_rate_limit():
    for _ in range(ai_tutor.PER_MINUTE_LIMIT):
        ask("What is gravity?", player="busy")
    with pytest.raises(RateLimited):
        ask("What is gravity?", player="busy")


def test_empty_conversation_rejected():
    with pytest.raises(TutorError):
        asyncio.run(tutor_reply("p", [{"role": "assistant", "content": "hi"}], {}))


def test_ai_path_used_when_configured(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")
    captured = {}

    async def fake_ai(messages, context, mode, language, evidence=()):
        captured["system"] = ai_tutor._build_ai_messages(messages, context, mode, language, evidence)[0]["content"]
        return "Mars is red because of rust. Visit https://science.nasa.gov/mars/"

    monkeypatch.setattr(ai_tutor, "_ai_reply", fake_ai)
    result = ask("Why is Mars red?", {"question_id": "P4-S2-E1", "answered": True, "difficulty": "Easy"}, language="bn")
    assert result["provider"] == "ai"
    assert "Bangla" in captured["system"]
    assert "Correct answer" in captured["system"]
    assert "EVIDENCE (cite as [n])" in captured["system"] and "[1]" in captured["system"]
    assert result["sources"] and result["sources"][0]["url"].startswith("https://")


def test_ai_failure_falls_back_with_notice(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def broken(*args):
        raise ValueError("boom")

    monkeypatch.setattr(ai_tutor, "_ai_reply", broken)
    result = ask("Why is Mars red?", {"planet": "Mars"})
    assert result["provider"] == "offline"
    assert "could not be reached" in result["notice"]


def test_offline_answers_questions_outside_the_quiz_bank_with_sources():
    for q, word in (("How do black holes form?", "collapse"), ("Why do stars twinkle?", "air"),
                    ("What happens if astronauts remove their helmets?", "oxygen"), ("How does GPS work?", "satellites"),
                    ("Why do we have seasons?", "tilted")):
        result = ask(q, player="kb-" + q[:8])
        assert word in result["reply"].lower(), (q, result["reply"])
        assert "[1]" in result["reply"] and result["sources"], q
        assert all(s["url"].startswith("https://") for s in result["sources"])


def test_unknown_topics_are_not_invented():
    result = ask("What is the capital of France?", player="unk")
    assert "couldn't find" in result["reply"] and result["sources"] == []


def test_why_mode_explains_wrong_choice():
    result = ask("Why was I wrong?", {"question_id": "P4-S2-M1", "answered": True, "your_answer": "About the same height"}, mode="why", player="why")
    assert "About the same height" in result["reply"] and "2.5 times" in result["reply"]


def test_related_mode_lists_questions():
    result = ask("What should I explore next?", {"planet": "Jupiter", "topic": "Moons and gravity"}, mode="related", player="rel")
    assert "1." in result["reply"] and len(result["suggestions"]) >= 2


def test_followup_uses_conversation_context():
    msgs = [{"role": "user", "content": "Tell me about Europa"}, {"role": "assistant", "content": "Europa is an icy moon of Jupiter."},
            {"role": "user", "content": "Why could it have life?"}]
    result = asyncio.run(tutor_reply("ctx", msgs, {"planet": "Jupiter"}, "chat", "en"))
    assert "ocean" in result["reply"].lower() or "water" in result["reply"].lower()


def test_general_question_mid_mission_is_answered_not_hinted():
    result = ask("Why is Mars red?", {"question_id": "P1-S1-E1", "answered": False, "planet": "Mercury"}, player="mid")
    assert "rust" in result["reply"].lower() and "hint" not in result["reply"].lower()


def test_action_buttons_use_conversation_topic():
    msgs = [{"role": "user", "content": "How do black holes form?"}, {"role": "assistant", "content": "Massive stars collapse... [1]"},
            {"role": "user", "content": "What related questions could I explore?"}]
    result = asyncio.run(tutor_reply("act", msgs, {"question_id": "P1-S1-E1", "answered": True}, "related", "en"))
    assert "1." in result["reply"] and "black hole" in result["reply"].lower()
    result = asyncio.run(tutor_reply("act0", msgs, {"question_id": "P1-S1-E1", "answered": False}, "related", "en"))
    assert "1." in result["reply"] and "black hole" in result["reply"].lower()
    msgs[-1] = {"role": "user", "content": "Can you explain more?"}
    result = asyncio.run(tutor_reply("act2", msgs, {"question_id": "P1-S1-E1", "answered": True}, "more", "en"))
    assert "black hole" in result["reply"].lower() or "collapse" in result["reply"].lower()


def test_followup_pronoun_skips_button_prompts():
    msgs = [{"role": "user", "content": "How do black holes form?"}, {"role": "assistant", "content": "Massive stars collapse [1]"},
            {"role": "user", "content": "What related questions could I explore?"}, {"role": "assistant", "content": "1. Is there a black hole in our galaxy?"},
            {"role": "user", "content": "Can it eat the Earth?"}]
    result = asyncio.run(tutor_reply("pron", msgs, {}, "chat", "en"))
    assert "black hole" in result["reply"].lower()
