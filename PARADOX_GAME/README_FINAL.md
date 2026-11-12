# PARADOX Space Academy — Child-friendly upgrade

This version keeps the existing eight planet missions, 24 scenarios, authentication, account progress, AI Lab, branching missions, Solar Storm, sound, Zippy, planet map and avatar studio.

## New areas
- Space Academy: NASA APOD, Mars rover photos, near-Earth asteroid feed, ISS location, planetary gravity calculator, four mini-games, a local space pet, crew tips, weekly rotating learning events, narration and optional browser voice commands.
- Parent Zone: password re-check, mission progress summary and a device-local play-time reminder.
- Explorer settings: age mode, font size, reduced motion, light graphics, brighter theme, read-aloud preference and seasonal decoration.
- Printable Explorer Certificate (browser Print / Save as PDF).
- Privacy guide and guardian-email-first signup wording. Profile photo upload is disabled; the generated astronaut avatar remains available.
- PWA app shell, install icons, service worker and offline caching of previously visited static assets. API-backed gameplay and live NASA data still need the local backend; NASA data also needs internet.
- Code-split route bundles, lower-cost 3D background settings, SQLite data migration/backup and rotating backend logs.
- A dependency-free Node HTTP smoke test is available with `npm run test:smoke` after both servers are running.

## Run
Double-click `paradox.bat`. It starts the Python 3.13 backend, installs packages if required, installs frontend dependencies if required, creates an optimized Vite build and serves it on http://localhost:5173.

Requirements: Python 3.13 x64, Node.js 22.12+ (or a Vite-supported newer LTS), npm and internet access on first install. See `README_START_HERE.txt`.

## NASA data
The backend uses NASA APIs with `NASA_API_KEY` from `backend/.env`. Without a key it falls back to NASA `DEMO_KEY`, which has low request limits. ISS position uses the public Where the ISS at? endpoint. Live feeds can be temporarily unavailable and fail independently.

Official NASA 3D model resources are linked from Space Academy. The model files are not bundled in this ZIP.

## Child safety and limitations
- Use a parent/guardian email and an explorer nickname. Do not enter a child's personal email, legal name or home address.
- No public chat, public child leaderboard or personal profile-photo upload is provided. The mini-game record is a device-local personal best, not a public class leaderboard.
- Voice commands require an explicit microphone action and browser support.
- Parent Zone uses password re-verification, but the daily time reminder is local to this browser/device, not a remote lock.
- If an OpenAI API key is configured, mission context and the optional private Co-Pilot question are sent to the OpenAI API for hint generation; without a key, rule-based hints are used.
- This is an educational prototype, not a certified COPPA/GDPR-K compliance product. Real deployment requires guardian consent, privacy/legal review and testing with children and educators.
- NASA API data and browser speech support depend on internet, browser and service availability.
