# PARADOX GAME — Space Academy Upgrade

A child-focused space exploration learning game built with React, Vite, Three.js and FastAPI. This ZIP keeps the original PARADOX mission gameplay and adds a Space Academy layer.

## Start with one double-click

1. Extract the ZIP to a normal folder.
2. Install Python 3.13 x64 and Node.js 22 LTS (22.12 or newer).
3. Double-click **`paradox.bat`**.
4. Wait for the backend and optimized frontend build; the browser opens at `http://localhost:5173`.

See `README_START_HERE.txt` for troubleshooting and optional API keys.

## Preserved game systems

- Eight planet missions and the existing 24 scenarios.
- Login / signup, protected routes, player dashboard, mission history and achievements.
- Planet progression, rocket launch cinematic, avatar studio, Zippy mascot, sound, XP HUD and celebration effects.
- Advanced missions, Solar Storm, Branching Mission, AI Mission Lab and the timed Cosmic Quiz.

## New Space Academy features

- NASA Picture of the Day, Mars rover images and near-Earth asteroid feed.
- ISS location and speed tracker, refreshed every 30 seconds while the Space Academy is open.
- NASA-hosted interactive ISS 3D model viewer and links to NASA's 3D model collection.
- Planet gravity / weight comparison lab.
- Four mini-games: ISS docking, asteroid dodge, soft landing and rocket building.
- Zippy Jr. space pet, three crew guides, a chapter story, rotating weekly learning event and school-topic labels.
- Browser read-aloud and optional voice commands (supported browsers only).
- Printable Junior Space Explorer certificate.
- Parent Zone with password re-check, mission progress and a device-local play-time reminder.
- Age mode, larger text, calm motion, light graphics, brighter theme and seasonal decoration settings.
- Privacy guide; signup asks for a parent/guardian email and explorer nickname. Profile-photo uploads and public child chat/leaderboards are not offered.
- PWA manifest, icons, service worker and offline caching for the app shell and previously visited static files.
- Code-split page bundles, SQLite migration to a persistent user-data folder, daily DB backups and rotating backend logs.

## Optional APIs

- NASA live data uses `NASA_API_KEY` from `backend/.env`; without it the backend uses NASA `DEMO_KEY` (low request limits).
- OpenAI Copilot hints use `OPENAI_API_KEY`; without it the existing rule-based fallback is used.
- Copy `backend/.env.example` to `backend/.env` to configure either key. Never share `.env` publicly.

## Data and safety

- Windows account database: `%LOCALAPPDATA%\PARADOX\paradox_accounts.sqlite3`.
- Existing project-local `backend\paradox_accounts.sqlite3` is copied on first launch if the persistent database does not exist.
- Backups are stored under `%LOCALAPPDATA%\PARADOX\backups`.
- Play time, preferences, pet care and mini-game personal bests are stored in this browser/device. Mission progress is stored in the local account database.
- Parent Zone is a local prototype: the daily reminder is not a remote device lock. Public class leaderboards are intentionally omitted to avoid exposing children's identities; the Space Academy shows a device-local personal best instead.
- NASA data and the ISS model require internet. Offline mode caches static app resources; backend/API features still require the local backend.
- This is an educational prototype, not a certified COPPA/GDPR-K compliance product. Public or school deployment needs guardian consent, professional privacy review and real testing with children and educators.

## Checks

- Backend tests: run `RUN_TESTS.bat` after the first setup.
- HTTP smoke test: while PARADOX is running, open `frontend` in a terminal and run `npm run test:smoke`.
- `QA_REPORT.txt` lists what was and was not tested in the build environment.
