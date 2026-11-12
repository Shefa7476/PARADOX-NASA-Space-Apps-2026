# PARADOX Space Academy: Round 2 (question engine, AI knowledge, design system)

Read `UPGRADE_NOTES.md` first for Windows setup. Nothing new to install: no new
Python or npm packages were added. The database upgrades itself on first start
(new tables only; existing accounts and progress are kept).

## 1. Question repetition: root causes and fix

**Root causes found**
- Each planet/stage/level had a fixed set of 3 questions, so every replay showed the same ones.
- Nothing recorded which questions a student had seen.
- The opening engineering question used the same wording on Easy, Medium and Hard.
- A few curated questions tested the same idea at two levels (e.g. "Is Uranus hot or cold?" vs "How cold is Uranus?").

**How it works now** (`backend/question_engine.py`)
- **Separate pools** for every planet × stage × level:
  1. Curated, hand-checked questions (216).
  2. **Calculated questions from NASA planetary fact-sheet data** (157, `question_templates.py`): light travel time, weight on other worlds, age in planet years, the inverse-square law, Kepler's third law, radio round-trips, sizes. Answers are computed, never guessed.
  3. **AI-generated questions** (only with an API key; `question_generator.py`). They are grounded on retrieved knowledge-base passages, then must pass the validation checks below before being stored for reuse.
  4. "New numbers" variants of calculated concepts. These are used last and labelled.
- **Persistent per-student history** in SQLite (`question_history` table). It survives refresh, logout and backend restarts, and each account has its own.
- **Semantic duplicate detection** (`semantic.py`): a local similarity model (normalised words, bigrams and science synonyms), plus optional neural embeddings when a key is set. A question is skipped if the student has seen anything similar on that planet at any level.
- **Level-specific engineering questions**: Easy asks for the fix, Medium asks for a diagnosis, and Hard asks a root-cause telemetry question. Easy and Hard share a concept key, so a student never gets both.
- **Branching**: after a mistake, the next question follows up on the same topic; after two right answers in a row, a data challenge comes next. Each answer also adds a short story beat.
- **Adaptive level**: the game recommends a level from the student's recent accuracy, shown as a "Recommended" badge and on the dashboard.
- **No silent repeats**: when a student has used every new question for a stage and level, the game says so and offers another level, another stage, or a clearly labelled **Review mission**. The level picker shows how many new questions remain.

Without an AI key, each student gets roughly 15–22 fresh questions per planet per level (about 400 in total) before reaching that message. With a key, validated AI questions extend the pool.

**AI question validation**: a generated question is only stored if it has the right option count for the level, exactly one correct answer, distinct options, child-safe text, cited evidence that supports the answer, and is not a semantic duplicate of any existing question.

## 2. AI Co-Pilot: retrieval-augmented answers

- **Knowledge base** (`knowledge_base.py`): 78 referenced passages covering the Solar System, moons, stars, galaxies, black holes, the universe, telescopes, rockets, orbits, satellites and GPS, NASA/ESA missions, astronaut life, physics, maths, Earth science and the environment. Each is linked to a real NASA, ESA or NOAA page. The 216 quiz explanations are also searchable.
- **Retrieval** (`retrieval.py`): BM25 search, plus embedding re-ranking when a key is set.
- **With an AI key**: the model receives the numbered evidence and must cite it as [1], [2]…, mark general knowledge, and say when something is uncertain.
- **Without an AI key**: answers are built from the retrieved passages, with the same citations. If nothing relevant is found, Zippy says it can't give a checked answer instead of guessing.
- **New actions**: Explain more, Give example, Explain in Bangla, Explain simply, Related questions, and Why was I wrong? (which explains the student's own choice).
- Follow-up questions with "it" or "that" keep the topic. Answers render as safe Markdown (lists, bold, powers like 10⁸, chemical subscripts, citation chips) without using `innerHTML`.

## 3–4. Design system, typography, spacing

- `frontend/src/styles/theme.css` is the single source for colours, type scale, spacing, radii and motion.
- Difficulty colours: **Easy = emerald 🌱, Medium = amber 🚀, Hard = coral 🧠**. They are always paired with an icon and a label.
- Correct and incorrect answers use ✓/✕, words and colour together.
- One heading scale applies on every page. Small labels are compact; shouting headings are now sentence case. Bangla gets suitable fonts and line height.
- Long words and AI text wrap instead of overflowing.
- The XP bar now sits in the page flow, so it never covers content.

## 5. Characters and animation

- **Nova** the floating astronaut appears on loading screens, the "you've seen everything" screen and the mission results.
- **Planet buddies** have faces that react to answers.
- Zippy now reacts to mission start, follow-ups and challenges.
- New animations: a space-portal landing transition, comets, animated answer selection and star pop-ins.
- Everything is CSS/SVG (no new libraries), uses `pointer-events: none` where decorative, and respects reduced motion.

## Main files

- **New backend:** `question_engine.py`, `question_store.py`, `question_templates.py`, `question_generator.py`, `semantic.py`, `knowledge_base.py`, `retrieval.py`, plus tests `test_question_engine.py` and `test_question_generator.py`.
- **Changed backend:** `simulation.py`, `ai_tutor.py`, `main.py` (`/api/session/start` now supports `review`, returns 409 `POOL_EXHAUSTED`, and adds `/api/questions/availability` and `/api/learning/insights`), `question_bank.py`, and `.env.example`.
- **New frontend:** `styles/theme.css`, `styles/cartoons.css`, `components/Cartoons.jsx`, `components/MarkdownText.jsx`, `scripts/e2e-questions.cjs`.
- **Changed frontend:** `pages/Dashboard.jsx` (the mission screen), `pages/AccountDashboard.jsx`, `components/AskAIChat.jsx`, `components/DifficultyPicker.jsx`, `components/Mascot.jsx`, `components/CosmicBackdrop.jsx`, `App.jsx`, `styles/academy.css`, `styles/mission-play.css`, and a few caps-to-sentence-case text fixes.

## Not changed

The separate "Branching AI" page (`BranchingMission.jsx` / `branching_engine.py`) is unchanged. The new branching lives inside the planet missions.
