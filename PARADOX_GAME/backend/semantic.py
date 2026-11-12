"""Semantic similarity for duplicate detection and retrieval.

Two layers:
1. A local, dependency-free text vector (normalised words + word bigrams +
   a small science synonym map). It runs everywhere and catches reworded
   duplicates such as "How hot is Venus?" vs "What is the temperature on Venus?".
2. Optional neural embeddings (OpenAI-compatible /embeddings endpoint) when an
   API key is configured. Vectors are cached in SQLite so each text is only
   embedded once. If the service is unavailable, layer 1 is used.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import re
from collections import Counter

STOPWORDS = set("""
a an the of on in at to for from by with and or but is are was were be been being do does did
what which who whom whose why how when where this that these those it its it's as about into
than then there their they them you your we our i me my he she his her can could would should
will shall may might must not no yes if so very much many more most some any all each every
called call named name like also just only still even ever such one ones get gets got has have had
""".split())

# Words that mean the same thing for duplicate detection.
SYNONYMS = {
    "temperature": "hot", "hottest": "hot", "heat": "hot", "warm": "hot", "warmest": "hot",
    "coldest": "cold", "cool": "cold", "freezing": "cold",
    "biggest": "large", "largest": "large", "big": "large", "huge": "large", "giant": "large",
    "smallest": "small", "tiny": "small", "little": "small",
    "closest": "near", "nearest": "near", "close": "near", "closer": "near",
    "farthest": "far", "furthest": "far", "distant": "far",
    "orbit": "year", "orbits": "year", "revolve": "year", "trip": "year",
    "spin": "rotate", "spins": "rotate", "rotation": "rotate", "rotates": "rotate", "turn": "rotate",
    "air": "atmosphere", "gases": "gas", "satellites": "moon", "moons": "moon", "satellite": "moon",
    "explore": "explorer", "exploring": "explorer", "rovers": "rover", "wide": "diameter", "width": "diameter",
    "fast": "speed", "fastest": "speed", "quick": "speed", "speeds": "speed",
}


def _stem(word):
    for suffix in ("ing", "edly", "ed", "ies", "es", "s"):
        if len(word) > 4 and word.endswith(suffix):
            return word[: -len(suffix)] + ("y" if suffix == "ies" else "")
    return word


def tokens(text):
    words = re.findall(r"[a-z0-9]+", (text or "").lower())
    out = []
    for w in words:
        if w in STOPWORDS:
            continue
        w = SYNONYMS.get(w, w)
        out.append(_stem(w))
    return out


def local_vector(text):
    toks = tokens(text)
    vec = Counter(toks)
    for a, b in zip(toks, toks[1:]):
        vec[f"{a}_{b}"] += 0.5
    return vec


def cosine(a, b):
    if not a or not b:
        return 0.0
    if isinstance(a, dict):
        common = set(a) & set(b)
        num = sum(a[k] * b[k] for k in common)
        den = math.sqrt(sum(v * v for v in a.values())) * math.sqrt(sum(v * v for v in b.values()))
    else:
        num = sum(x * y for x, y in zip(a, b))
        den = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return num / den if den else 0.0


def question_signature(question):
    """Text used to compare questions: the stem plus the correct answer."""
    return f"{question.get('question', '')} {question.get('correct_answer', '')}"


def fingerprint(text):
    return hashlib.sha256(" ".join(sorted(set(tokens(text)))).encode()).hexdigest()[:24]


LOCAL_DUPLICATE_THRESHOLD = 0.62
EMBED_DUPLICATE_THRESHOLD = 0.90


def local_similarity(a, b):
    return cosine(local_vector(a), local_vector(b))


def find_duplicate(text, candidates, threshold=LOCAL_DUPLICATE_THRESHOLD):
    """Return (best_text, score) when `text` is a near-duplicate of any candidate."""
    vec = local_vector(text)
    best = (None, 0.0)
    for cand in candidates:
        score = cosine(vec, local_vector(cand))
        if score > best[1]:
            best = (cand, score)
    return best if best[1] >= threshold else (None, best[1])


# ------------------------------------------------------------ neural embeddings (optional)
def embeddings_enabled():
    return bool(os.getenv("OPENAI_API_KEY", "").strip()) and os.getenv("EMBEDDINGS_PROVIDER", "openai").lower() != "off"


def _cache_get(db, key):
    row = db.execute("SELECT vector FROM embedding_cache WHERE text_hash=?", (key,)).fetchone()
    return json.loads(row[0]) if row else None


async def embed_texts(texts):
    """Return a list of vectors, or None if embeddings are unavailable."""
    if not embeddings_enabled() or not texts:
        return None
    import httpx
    from account_store import _connect

    model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
    keys = [hashlib.sha256(f"{model}|{t}".encode()).hexdigest() for t in texts]
    out = [None] * len(texts)
    with _connect() as db:
        for i, k in enumerate(keys):
            out[i] = _cache_get(db, k)
    missing = [i for i, v in enumerate(out) if v is None]
    if missing:
        base = os.getenv("OPENAI_EMBEDDINGS_URL", "https://api.openai.com/v1/embeddings")
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                r = await client.post(base, headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY'].strip()}"},
                                      json={"model": model, "input": [texts[i] for i in missing]})
                r.raise_for_status()
                data = r.json()["data"]
        except Exception:
            return None
        with _connect() as db:
            for i, item in zip(missing, data):
                out[i] = item["embedding"]
                db.execute("INSERT OR REPLACE INTO embedding_cache(text_hash, model, vector) VALUES(?,?,?)",
                           (keys[i], model, json.dumps(item["embedding"])))
    return out


async def is_semantic_duplicate(text, candidates):
    """True if `text` duplicates a candidate (embeddings when available, else local)."""
    dup, score = find_duplicate(text, candidates)
    if dup:
        return True, dup, score, "local"
    vectors = await embed_texts([text, *candidates]) if candidates else None
    if vectors:
        target = vectors[0]
        for cand, vec in zip(candidates, vectors[1:]):
            s = cosine(target, vec)
            if s >= EMBED_DUPLICATE_THRESHOLD:
                return True, cand, s, "embedding"
    return False, None, score, "embedding" if vectors else "local"
