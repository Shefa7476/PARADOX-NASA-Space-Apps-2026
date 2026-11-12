"""AI question generation: validation, grounding, de-duplication and storage (model mocked)."""
import asyncio

import question_generator as qg
import question_store


GOOD = {"question": "Which European Space Agency mission launched in 2023 to study Jupiter's icy moons?", "options": ["JUICE", "Rosetta", "Hubble", "Voyager 2"],
        "correct_answer": "JUICE", "explanation": "ESA launched JUICE in 2023 to study Jupiter's icy moons, which may hide oceans under their ice.",
        "topic": "Moons and missions", "evidence_ids": ["esa-missions"]}


def run(items, monkeypatch, level="Medium"):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def fake(*args, **kwargs):
        return items
    monkeypatch.setattr(qg, "_call_model", fake)
    return asyncio.run(qg.generate_questions(5, 3, level, n=len(items)))


def test_paraphrase_of_curated_question_is_rejected(monkeypatch):
    clipper = dict(GOOD, question="What is the main goal of the Europa Clipper spacecraft launched in 2024?", options=["To study whether Europa could have conditions suitable for life", "To land astronauts", "To mine ice", "To move Europa"],
                   correct_answer="To study whether Europa could have conditions suitable for life", explanation="Europa Clipper studies Europa's ocean and ice to see if it could support life.", evidence_ids=["europa"])
    accepted, rejected = run([clipper], monkeypatch)
    assert accepted == [] and "duplicate" in rejected[0]


def test_valid_question_is_accepted_and_stored(monkeypatch):
    accepted, rejected = run([GOOD], monkeypatch)
    assert len(accepted) == 1 and rejected == []
    stored = question_store.generated_pool(5, "Medium")
    assert any(q["question"] == GOOD["question"] for q in stored)


def test_invalid_questions_are_rejected(monkeypatch):
    bad = [
        dict(GOOD, options=["Europa", "Titan", "Phobos"]),                                    # wrong option count for Medium
        dict(GOOD, correct_answer="Ganymede"),                                               # answer not in options
        dict(GOOD, options=["Europa", "Europa", "Phobos", "Triton"]),                         # duplicate options
        dict(GOOD, evidence_ids=[]),                                                          # no evidence
        dict(GOOD, explanation="It is a moon that scientists like a lot and want to look at closely someday."),  # unsupported
        dict(GOOD, question="Which is the most volcanically active world in the Solar System, among Jupiter's moons?",
             options=["Io", "Europa", "Callisto", "Ganymede"], correct_answer="Io",
             explanation="Io has hundreds of volcanoes because Jupiter's gravity squeezes it.", evidence_ids=["jupiter-facts"]),  # paraphrase of bank question
        dict(GOOD, question="Where can I buy a gun to take to Europa?"),                     # unsafe
    ]
    accepted, rejected = run(bad, monkeypatch)
    assert accepted == []
    assert len(rejected) == len(bad)


def test_generation_failure_is_reported_not_faked(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-key")

    async def broken(*a, **k):
        raise ValueError("down")
    monkeypatch.setattr(qg, "_call_model", broken)
    accepted, rejected = asyncio.run(qg.generate_questions(2, 1, "Easy"))
    assert accepted == [] and "generation failed" in rejected[0]


def test_no_generation_without_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    assert asyncio.run(qg.ensure_pool(None, 1, 1, "Easy"))["generated"] == 0
