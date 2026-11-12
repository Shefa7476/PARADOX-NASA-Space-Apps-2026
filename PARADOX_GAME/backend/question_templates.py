"""Verified-data question generators.

Questions here are computed from a small table of NASA planetary fact-sheet
values, so every answer is calculated, not guessed. Each generator tests a
different concept (orbital period, light travel time, gravity, inverse-square
sunlight, Kepler's third law...). Parameters (ages, masses, distances) create
extra "new numbers" variants of the same concept; the question engine only
uses those after every distinct concept has been used, and labels them.

Source for values: NASA Planetary Fact Sheet (nssdc.gsfc.nasa.gov/planetary/factsheet/)
and NASA Science planet pages. Values are rounded for children.
"""

from __future__ import annotations

from question_bank import PLANET_NAMES, PLANET_SOURCES, STAGE_TOPICS

FACT_SHEET = "https://nssdc.gsfc.nasa.gov/planetary/factsheet/"

# distance AU, orbital period (Earth years), surface gravity (x Earth), diameter km, type
PLANETS = {
    1: {"au": 0.39, "year": 0.24, "year_text": "about 88 Earth days", "g": 0.38, "diam": 4879, "type": "A rocky planet"},
    2: {"au": 0.72, "year": 0.62, "year_text": "about 225 Earth days", "g": 0.91, "diam": 12104, "type": "A rocky planet"},
    3: {"au": 1.0, "year": 1.0, "year_text": "about 365 days", "g": 1.0, "diam": 12756, "type": "A rocky planet"},
    4: {"au": 1.52, "year": 1.88, "year_text": "about 687 Earth days", "g": 0.38, "diam": 6792, "type": "A rocky planet"},
    5: {"au": 5.2, "year": 11.9, "year_text": "about 12 Earth years", "g": 2.36, "diam": 142984, "type": "A gas giant"},
    6: {"au": 9.5, "year": 29.4, "year_text": "about 29 Earth years", "g": 0.92, "diam": 120536, "type": "A gas giant"},
    7: {"au": 19.2, "year": 84.0, "year_text": "about 84 Earth years", "g": 0.89, "diam": 51118, "type": "An ice giant"},
    8: {"au": 30.1, "year": 164.8, "year_text": "about 165 Earth years", "g": 1.12, "diam": 49528, "type": "An ice giant"},
}
ORDINAL = {1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th", 8: "8th"}
LIGHT_MIN_PER_AU = 8.3


def _fmt_minutes(minutes):
    if minutes < 1.5:
        return "About 1 minute"
    if minutes < 90:
        return f"About {round(minutes)} minutes"
    hours = minutes / 60
    return f"About {hours:.1f} hours".replace(".0 hours", " hours")


def _fmt_num(x):
    if x >= 100:
        return f"{round(x):,}"
    if x >= 10:
        return f"{x:.0f}"
    return f"{x:.1f}".rstrip("0").rstrip(".")


def _uniq(correct, wrongs, n):
    out = []
    for w in wrongs:
        if w != correct and w not in out:
            out.append(w)
    return out[: n - 1] if len(out) >= n - 1 else None


def _make(pid, difficulty, concept, variant, question, correct, wrongs, explanation, topic=None):
    n = 3 if difficulty == "Easy" else 4
    wrong = _uniq(correct, wrongs, n)
    if wrong is None:
        return None
    return {
        "id": f"T{pid}-{difficulty[0]}-{concept}" + (f"-{variant}" if variant else ""),
        "concept_key": f"tpl:{concept}:{pid}:{difficulty}",
        "variant": variant or "",
        "planet_id": pid, "planet": PLANET_NAMES[pid], "stage_id": None, "difficulty": difficulty,
        "topic": topic or "Planet data challenge",
        "question": question, "options": [correct, *wrong], "correct_answer": correct,
        "explanation": explanation, "source": FACT_SHEET, "origin": "verified-data",
    }


def _others(pid):
    return [p for p in PLANETS if p != pid]


def easy_templates(pid):
    P, d, out = PLANET_NAMES[pid], PLANETS[pid], []
    # orbital period
    wrong = [PLANETS[o]["year_text"] for o in sorted(_others(pid), key=lambda o: abs(PLANETS[o]["year"] - d["year"]), reverse=True)]
    out.append(_make(pid, "Easy", "year", "", f"How long does {P} take to travel once around the Sun?", d["year_text"],
                     [wrong[0], wrong[len(wrong) // 2]],
                     f"One trip around the Sun is one 'year'. For {P} that takes {d['year_text']}. Planets farther from the Sun take longer.", "Orbits and years"))
    # order from the Sun
    out.append(_make(pid, "Easy", "order", "", f"Counting outward from the Sun, where is {P}?", f"The {ORDINAL[pid]} planet",
                     [f"The {ORDINAL[((pid + 2) % 8) + 1]} planet", f"The {ORDINAL[((pid + 4) % 8) + 1]} planet"],
                     f"The order is Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune. {P} is number {pid}.", "Planet order"))
    # size vs Earth
    if pid != 3:
        ratio = d["diam"] / 12756
        correct = "About the same size" if 0.9 <= ratio <= 1.1 else ("Bigger than Earth" if ratio > 1 else "Smaller than Earth")
        out.append(_make(pid, "Easy", "size", "", f"Is {P} bigger or smaller than Earth?", correct,
                         [x for x in ("Bigger than Earth", "Smaller than Earth", "About the same size") if x != correct],
                         f"{P} is about {d['diam']:,} km wide. Earth is about 12,756 km wide.", "Planet sizes"))
    # neighbour
    if pid < 8:
        nxt = PLANET_NAMES[pid + 1]
        wrongs = [PLANET_NAMES[o] for o in (((pid + 3) % 8) + 1, ((pid + 5) % 8) + 1) if o not in (pid, pid + 1)]
        out.append(_make(pid, "Easy", "neighbour", "", f"Which planet is the next one out from the Sun after {P}?", nxt,
                         wrongs + [PLANET_NAMES[o] for o in PLANETS if o not in (pid, pid + 1)],
                         f"Going outward from the Sun, {nxt} comes right after {P}.", "Planet order"))
    # gravity, simple comparison
    correct = "Stronger than Earth's" if d["g"] > 1.05 else ("Weaker than Earth's" if d["g"] < 0.95 else "Almost the same as Earth's")
    if pid != 3:
        out.append(_make(pid, "Easy", "gravity-compare", "", f"Would you feel heavier or lighter standing on {P} than on Earth?",
                         {"Stronger than Earth's": "Heavier", "Weaker than Earth's": "Lighter", "Almost the same as Earth's": "About the same"}[correct],
                         [x for x in ("Heavier", "Lighter", "About the same") if x != {"Stronger than Earth's": "Heavier", "Weaker than Earth's": "Lighter", "Almost the same as Earth's": "About the same"}[correct]],
                         f"Gravity on {P} is about {d['g']} times Earth's, so you would feel {'heavier' if d['g'] > 1.05 else 'lighter' if d['g'] < 0.95 else 'about the same'}."
                         + (" (Giant planets have no solid surface; this is gravity at the cloud tops.)" if pid >= 5 else ""), "Gravity"))
    return [q for q in out if q]


def medium_templates(pid):
    P, d, out = PLANET_NAMES[pid], PLANETS[pid], []
    # light travel time from the Sun
    t = d["au"] * LIGHT_MIN_PER_AU
    out.append(_make(pid, "Medium", "light-time", "",
                     f"Sunlight takes about 8.3 minutes to travel 1 AU. {P} is about {d['au']} AU from the Sun. About how long does sunlight take to reach {P}?",
                     _fmt_minutes(t), [_fmt_minutes(t * 3.2), _fmt_minutes(max(1, t / 4)), _fmt_minutes(t * 10 if t < 60 else t / 10), _fmt_minutes(8.3)],
                     f"Multiply the distance by the time per AU: {d['au']} × 8.3 ≈ {t:.0f} minutes ({_fmt_minutes(t).lower()}).", "Light and distance"))
    # scale weight (several masses = variants)
    for i, mass in enumerate((30, 40, 25, 35)):
        w = mass * d["g"]
        if pid == 3:
            break
        out.append(_make(pid, "Medium", "scale", "" if i == 0 else f"v{i}",
                         f"A bathroom scale shows {mass} kg for a student on Earth. Gravity on {P} is about {d['g']} times Earth's. What would the same scale show on {P}?",
                         f"About {_fmt_num(w)} kg", [f"About {_fmt_num(mass / d['g'])} kg", f"About {mass} kg", f"About {_fmt_num(w * 2.2)} kg", f"About {_fmt_num(mass + 10)} kg"],
                         f"A scale measures how hard gravity pulls you. Your mass stays {mass} kg, but the reading changes with gravity: {mass} × {d['g']} ≈ {_fmt_num(w)} kg.", "Gravity and weight"))
    # age in planet years
    for i, age in enumerate((12, 10, 11, 9)):
        if pid == 3:
            break
        a = age / d["year"]
        out.append(_make(pid, "Medium", "age", "" if i == 0 else f"v{i}",
                         f"You are {age} Earth years old. One year on {P} lasts about {d['year']} Earth years. About how many {P} years old would you be?",
                         f"About {_fmt_num(a)}", [f"About {_fmt_num(age * d['year'])}", f"About {_fmt_num(age + d['year'])}", f"About {age}", f"About {_fmt_num(a * 3 + 1)}"],
                         f"Divide your age by the length of a {P} year: {age} ÷ {d['year']} ≈ {_fmt_num(a)}. "
                         + ("Short years make you 'older'!" if d["year"] < 1 else "Long years make you 'younger'!"), "Orbits and years"))
    # closer to the Sun than P
    inner = [o for o in PLANETS if PLANETS[o]["au"] < d["au"]]
    outer = [o for o in PLANETS if PLANETS[o]["au"] > d["au"]]
    if inner and len(outer) >= 3:
        out.append(_make(pid, "Medium", "closer", "", f"Which of these planets orbits closer to the Sun than {P}?", PLANET_NAMES[inner[-1]],
                         [PLANET_NAMES[o] for o in outer[:3]],
                         f"Planets closer to the Sun than {P}: {', '.join(PLANET_NAMES[o] for o in inner)}.", "Planet order"))
    return [q for q in out if q]


def hard_templates(pid):
    P, d, out = PLANET_NAMES[pid], PLANETS[pid], []
    # inverse-square sunlight
    if pid != 3:
        f = 1 / d["au"] ** 2
        def lab(x):
            return f"About {_fmt_num(x)} times stronger" if x >= 1 else f"About 1/{_fmt_num(1 / x)} as strong"
        out.append(_make(pid, "Hard", "inverse-square", "",
                         f"{P} is about {d['au']} AU from the Sun. Using the inverse-square law, how bright is sunlight there compared with Earth?",
                         lab(f), [lab(1 / d["au"]), lab(d["au"] ** 2) if pid > 3 else lab(1 / d["au"] ** 3), lab(f * 3.5), lab(f / 3)],
                         f"Brightness falls with distance squared: 1 ÷ {d['au']}² = 1 ÷ {d['au'] ** 2:.2f} → {lab(f).lower()}.", "Light and distance"))
    # radio round trip at closest approach
    if pid != 3:
        gap = abs(d["au"] - 1)
        rt = 2 * gap * LIGHT_MIN_PER_AU
        out.append(_make(pid, "Hard", "round-trip", "",
                         f"When Earth and {P} are on the same side of the Sun, they are about {gap:.2f} AU apart. Light travels 1 AU in about 8.3 minutes. What is the shortest round-trip time for a radio message?",
                         _fmt_minutes(rt), [_fmt_minutes(rt / 2), _fmt_minutes(2 * (d['au'] + 1) * LIGHT_MIN_PER_AU), _fmt_minutes(2 * d['au'] * LIGHT_MIN_PER_AU * 1.6), _fmt_minutes(rt * 4)],
                         f"Distance {gap:.2f} AU × 8.3 min ≈ {gap * 8.3:.0f} min one way. A round trip is twice that: {_fmt_minutes(rt).lower()}.", "Space communication"))
    # width in Earths
    ratio = d["diam"] / 12756
    if pid != 3:
        def wl(x):
            return f"About {_fmt_num(x)} Earths across" if x >= 1.15 else f"About {round(x * 100)}% of Earth's width"
        out.append(_make(pid, "Hard", "width", "",
                         f"{P} is about {d['diam']:,} km wide and Earth is about 12,756 km wide. How does {P}'s width compare?",
                         wl(ratio), [wl(ratio * 2.5), wl(ratio / 2.2), wl(ratio ** 2) if ratio > 1.2 else wl(ratio * 1.6), wl(ratio * 4)],
                         f"Divide the widths: {d['diam']:,} ÷ 12,756 ≈ {ratio:.2f}.", "Planet sizes"))
    # Kepler's third law checked against this planet's real year
    T = d["au"] ** 1.5
    out.append(_make(pid, "Hard", "kepler", "",
                     f"Kepler's third law says T² = a³ (T in Earth years, a in AU). {P} orbits at about {d['au']} AU. What year length does the law predict?",
                     f"About {_fmt_num(T)} Earth years", [f"About {_fmt_num(d['au'])} Earth years", f"About {_fmt_num(d['au'] ** 2)} Earth years", f"About {_fmt_num(d['au'] ** 3)} Earth years", f"About {_fmt_num(T * 2.5)} Earth years"],
                     f"T² = {d['au']}³ ≈ {d['au'] ** 3:.2f}, so T ≈ {_fmt_num(T)} Earth years. That matches {P}'s real year ({d['year_text']}), which is why Kepler's law is so useful.", "Orbits and Kepler's laws"))
    # asteroid variants share one concept across all planets
    for i, a in enumerate((4, 9, 16, 25)):
        T = a ** 1.5
        q = _make(pid, "Hard", "kepler-asteroid", f"a{a}",
                  f"Using T² = a³ (T in Earth years, a in AU): an asteroid spotted during the {P} mission orbits the Sun at {a} AU. How long is its year?",
                  f"{_fmt_num(T)} Earth years", [f"{a} Earth years", f"{_fmt_num(a ** 2)} Earth years", f"{_fmt_num(a ** 0.5)} Earth years", f"{_fmt_num(T * 2)} Earth years"],
                  f"T² = {a}³ = {a ** 3}, so T = √{a ** 3} = {_fmt_num(T)} Earth years.", "Orbits and Kepler's laws")
        if q:
            q["concept_key"] = "tpl:kepler-asteroid:Hard"
            q["variant"] = f"a{a}-p{pid}"
            out.append(q)
    return [q for q in out if q]


TEMPLATE_DUPLICATE_THRESHOLD = 0.70


def template_questions():
    """All generated questions, minus any that duplicate a verified bank question
    for the same planet (semantic check), so pools never overlap."""
    from question_bank import QUESTION_BANK
    from semantic import local_similarity, question_signature

    out = []
    for pid in PLANETS:
        bank = [question_signature(b) for b in QUESTION_BANK if b["planet_id"] == pid]
        for q in easy_templates(pid) + medium_templates(pid) + hard_templates(pid):
            sig = question_signature(q)
            if any(local_similarity(sig, b) >= TEMPLATE_DUPLICATE_THRESHOLD for b in bank):
                continue
            out.append(q)
    return out


TEMPLATE_QUESTIONS = template_questions()
TEMPLATE_INDEX = {q["id"]: q for q in TEMPLATE_QUESTIONS}
