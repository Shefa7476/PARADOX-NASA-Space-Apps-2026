PARADOX SPACE ACADEMY - START HERE
=================================

ONE-CLICK START
1. Extract the ZIP completely (do not run it from inside the ZIP preview).
2. Install Python 3.13 x64 and Node.js 22 LTS (22.12 or newer).
3. Make sure you have an internet connection on the first run.
4. Close any older PARADOX backend/frontend terminal windows (ports 8000 and 5173).
5. Double-click: paradox.bat
6. Wait while the two PowerShell windows prepare the backend and optimized frontend.
7. Your browser should open http://localhost:5173 automatically.

WHAT THE LAUNCHER DOES
- Creates or repairs backend/.venv with Python 3.13 if needed.
- Sets one stable account database path in %LOCALAPPDATA%\PARADOX.
- Installs backend requirements when needed.
- Installs frontend dependencies with npm ci if needed.
- Builds the optimized Vite frontend (including PWA files).
- Checks for old servers on ports 8000/5173 before starting the updated build.
- Starts both services and opens the browser when both build markers are ready.

OPTIONAL NASA API KEY
- Copy backend/.env.example to backend/.env.
- Add your NASA_API_KEY to backend/.env.
- Without a key the app uses NASA DEMO_KEY, which has low request limits.
- The NASA/ISS dashboard needs internet access. Core missions and mini-games
  do not require NASA live data.

OPTIONAL OPENAI KEY
- Add OPENAI_API_KEY to backend/.env if you want AI-generated Copilot hints.
- Leave it blank to use the built-in rule-based hint system.

ACCOUNT & BACKUPS
- On Windows, account data is stored outside the extracted project at:
  %LOCALAPPDATA%\PARADOX\paradox_accounts.sqlite3
- A dated SQLite backup is created in the same folder's backups directory
  before database schema updates.
- If you have an older database in a previous PARADOX/NASA-Game extracted
  folder, the backend searches matching project folders in Downloads, Desktop
  and Documents and merges non-conflicting accounts/history into the persistent
  database. Existing persistent accounts are never overwritten.
- Do not delete the LocalAppData database if you want to keep player progress.

PWA / OFFLINE
- The optimized build registers a service worker and can be installed from a
  supported browser's Install App menu.
- After both servers are running, optional HTTP smoke checks are available from
  frontend with: npm run test:smoke
- The app shell and already-visited static files can load offline.
- Login, mission saves, NASA live data and other API features still need the
  local backend to be running. NASA data also needs internet access.

CHILD SAFETY NOTES
- Use a parent/guardian email and a child-friendly nickname.
- Do not enter a child's full legal name, home address or personal email.
- Profile photo upload is disabled; use the generated astronaut avatar.
- Parent Zone verifies the account password before showing progress.
- Daily play-time reminders are stored on this device and are not a remote lock.
- This is an educational prototype, not a certified COPPA/GDPR-K compliance
  product. Obtain appropriate consent and professional privacy review before
  public school or commercial deployment.

TROUBLESHOOTING
- If the browser does not open, check both terminal windows.
- Backend docs: http://127.0.0.1:8000/docs
- Frontend: http://localhost:5173
- If npm ci fails, check internet access and Node.js version.
- If NASA cards are blank, refresh later or add a valid NASA_API_KEY.


LOGIN TROUBLESHOOTING
- Use the same parent/guardian email or explorer username and the original password.
- Temporary backend/network failures no longer erase the saved login token.
- If an older PARADOX server is still running, close its old terminal window and
  double-click paradox.bat again. The launcher checks the build marker so it
  does not silently open an older copy.
- Account data is stored in %LOCALAPPDATA%\PARADOX\paradox_accounts.sqlite3.
- If the previous project used a project-local backend\paradox_accounts.sqlite3,
  the new backend searches old PARADOX/NASA-Game folders in Downloads/Desktop/Documents
  and merges non-conflicting accounts and mission history, even if a newer
  persistent database already contains another account.

CELEBRATION EFFECTS
- Mission success has one short confetti burst.
- Correct answers and new badges have a brief sparkle only.
- Falling star rain has been removed. The mission-result background is static.
