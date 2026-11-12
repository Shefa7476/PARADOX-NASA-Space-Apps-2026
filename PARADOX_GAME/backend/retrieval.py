"""Hybrid retrieval over the PARADOX knowledge base.

* BM25 keyword search (always available, no dependencies) using the same
  normalisation and synonyms as duplicate detection.
* Optional embedding re-ranking (OpenAI-compatible embeddings) when an API
  key is configured; vectors are cached in SQLite.

The corpus = knowledge_base passages + every checked question explanation.
"""

from __future__ import annotations

import math
from collections import Counter

from knowledge_base import DOCS, doc_record
from question_bank import QUESTION_BANK, PLANET_SOURCES
from semantic import cosine, embed_texts, tokens


def _corpus():
    docs = [doc_record(d) for d in DOCS]
    for q in QUESTION_BANK:
        docs.append({
            "id": f"qb:{q['id']}", "topic": q["topic"].lower(), "title": q["question"],
            "text": f"{q['correct_answer']}. {q['explanation']}", "source": f"NASA Science: {q['planet']}",
            "url": PLANET_SOURCES[q["planet_id"]], "related": [], "planet": q["planet"],
        })
    return docs


CORPUS = _corpus()
_DOC_TOKENS = [tokens(f"{d['title']} {d['title']} {d['topic']} {d['text']}") for d in CORPUS]
_DF = Counter(t for toks in _DOC_TOKENS for t in set(toks))
_AVG = sum(len(t) for t in _DOC_TOKENS) / len(_DOC_TOKENS)
_N = len(CORPUS)


def bm25(query, k=6, k1=1.4, b=0.75, planet=None):
    q = tokens(query)
    if not q:
        return []
    scores = []
    for i, toks in enumerate(_DOC_TOKENS):
        tf = Counter(toks)
        s = 0.0
        for term in q:
            if term not in tf:
                continue
            idf = math.log(1 + (_N - _DF[term] + 0.5) / (_DF[term] + 0.5))
            s += idf * tf[term] * (k1 + 1) / (tf[term] + k1 * (1 - b + b * len(toks) / _AVG))
        if planet and planet.lower() in " ".join(toks):
            s *= 1.15  # gentle boost for the current mission planet
        elif CORPUS[i]["id"].startswith("qb:"):
            s *= 0.85  # prefer general passages over single quiz facts
        if s > 0:
            scores.append((s, i))
    scores.sort(reverse=True)
    return [dict(CORPUS[i], score=round(s, 3)) for s, i in scores[:k]]


async def search(query, k=4, planet=None):
    """Hybrid search: BM25 candidates, re-ranked by embeddings when available."""
    candidates = bm25(query, k=12, planet=planet)
    if not candidates:
        return [], "none"
    vectors = await embed_texts([query] + [f"{c['title']}. {c['text']}" for c in candidates])
    if vectors:
        top = max(c["score"] for c in candidates) or 1
        for c, v in zip(candidates, vectors[1:]):
            c["score"] = round(0.6 * cosine(vectors[0], v) + 0.4 * c["score"] / top, 3)
        candidates.sort(key=lambda c: c["score"], reverse=True)
        return candidates[:k], "hybrid"
    return candidates[:k], "bm25"


def coverage(results, query):
    """Rough measure of how well retrieved evidence matches the query (0-1)."""
    q = set(tokens(query))
    if not q or not results:
        return 0.0
    hit = set()
    for r in results[:3]:
        hit |= q & set(tokens(f"{r['title']} {r['text']}"))
    return len(hit) / len(q)
