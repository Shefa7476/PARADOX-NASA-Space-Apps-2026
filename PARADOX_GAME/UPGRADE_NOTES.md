# PARADOX Space Academy: Upgrade Notes (Nov 2026)

## Windows setup (first time)

1. Install **Python 3.13 (64-bit)** from python.org. Tick "Add python.exe to PATH" and keep "py launcher" checked.
2. Install **Node.js 22 LTS** (22.12 or newer) from nodejs.org.
3. Close every terminal window, then double-click **`paradox.bat`**.
   It creates the Python environment, installs packages, builds the frontend and opens the game at http://localhost:5173.

### Manual commands (two PowerShell windows)

```powershell
# Backend
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env        # first time only, then edit if you have keys
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000

# Frontend
cd frontend
npm.cmd ci
npm.cmd run dev               # or: npm.cmd run build ; npm.cmd run preview
```

Use `npm.cmd` in PowerShell if you see "running scripts is disabled on this system".

### Turning on real AI answers (optional)

Edit `backend/.env`:

```
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-4o-mini
TUTOR_PROVIDER=openai
```

The key stays on the backend; the browser never sees it. Without a key, the Ask AI chat still works in **Offline study guide** mode, and every message is clearly labelled as "Offline guide", not as AI.
Any OpenAI-compatible endpoint works via `OPENAI_BASE_URL`.

## Bugs fixed

| Bug | Root cause | Fix |
|---|---|---|
| Easy / Medium / Hard buttons not clickable inside a mission | The planet pop-up launches with `autostart=1`, so a session already existed when the mission page loaded, and every difficulty button had `disabled={!!session}` | Difficulty and stage are always clickable (mouse, touch and keyboard arrows). At question 1 a change restarts instantly; mid-mission it asks "Restart now / Keep playing" first. The URL stays in sync. |
| Difficulty didn't change the questions | Backend used difficulty only for resource numbers | Each difficulty now has its own questions: Easy has 3 options with simple explanations, Medium and Hard have 4 options with deeper reasoning and more detail. |
| Same three options repeated for all 3 steps of every mission | `simulation.py` re-asked one action list three times | A mission is now 1 engineering decision + 3 planet-science questions, all unique to that planet × stage × difficulty. |
| Mission page showed "AI assistance is planned for Phase 6" | Placeholder | Replaced with a working AI Co-Pilot (Ask AI, Hint from AI, Learn more). |
| Deprecated icon names (`CheckCircle2`, `Loader2`, `XCircle`, `AlertTriangle`, `UserCircle`, `PlayCircle`) | Not present in current Lucide icon sets, so the build can fail | Renamed to the canonical names everywhere. |
| Floating XP bar covered the dashboard's level card and mission side panel | Fixed-position HUD | HUD now scrolls with the page and is hidden where the same info is already shown (dashboard, mission screen). |
| Home page: two sibling links in a ternary | Invalid JSX after adding a second CTA | Wrapped in a fragment (caught by the test build). |

## What's new

- **Question bank** (`backend/question_bank.py`): 216 curated questions (8 planets × 3 stages × 3 difficulties × 3). Every question has an ID, planet, stage, difficulty, topic, options, correct answer, explanation and a NASA source link. Options are shuffled per mission while the answer key is tracked by text, so shuffling cannot break it. Answer keys are only revealed after the student answers.
- **Mission screen** (`pages/Dashboard.jsx`): large readable questions, A–D answer cards (keys 1–4 / A–D, Enter to check), progress dots, animated correct/incorrect feedback, 1–3 star results, a full answer review, "Practise missed questions", Retry, and Ask AI on every question.
- **AI Co-Pilot chat** (`components/AskAIChat.jsx`, `backend/ai_tutor.py`, `POST /api/tutor/chat`): knows the planet, mission, stage, difficulty, question and topic; keeps conversation context; won't reveal an answer before the student answers; suggested follow-ups; Explain again; Give an example; Read aloud (music ducks while speaking); loading indicator; Clear chat; English or বাংলা answers. Safety: login required, 10 messages a minute and 150 a day per player, personal-info and unsafe-topic filters, only NASA/ESA/JAXA/NOAA links kept, and chats are not stored on the server.
- **Music Control Center** (`components/MusicCenter.jsx`, `audio/sfx.js`): six original themes generated live with Web Audio (Cosmic Adventure, Galactic Mystery, Happy Space Kids, Deep Space Relaxation, Epic Mission, Focus Mode), so there are no audio files, licences or broken URLs. It has Play/Pause, Previous/Next, a 9-second Preview, separate music and sound-effect volumes, Mute all, crossfades, and remembered settings. Music pauses when the tab is hidden, starts only after the first click (autoplay rules), and keeps playing across page changes.
- **Navigation**: 13 px text, 4 main links plus a "More" menu, an Ask AI button, a profile menu and a mobile drawer.
- **Dashboard**: level and XP bar, one "Your next mission" card, 3 stats instead of 6, a compact planet strip, collapsible badges and a shorter flight log. The repeated row of action buttons is gone.
- **Visuals**: shooting stars, twinkling constellations, drifting glow, question slide-in transitions, star pop-ins and Fredoka/Nunito fonts. All decoration has `pointer-events: none` and respects reduced motion and the in-game "calm" motion setting.

All existing features are unchanged: login, accounts, Parent Zone, AI Mission Lab, Space Academy, NASA data, avatars, Solar Storm, branching missions, certificates, the time-attack quiz and accessibility settings. Progress saving still uses `/api/account/record`.

## Tests

```powershell
cd backend ; .\.venv\Scripts\python.exe -m pytest -q
cd frontend ; npm.cmd i -D playwright ; npx playwright install chromium ; node scripts\e2e-academy.cjs
```

See `QA_REPORT.txt` for results and the limits of what could be run.
