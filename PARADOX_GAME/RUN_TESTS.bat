@echo off
setlocal
cd /d "%~dp0backend"
if not exist ".venv\Scripts\python.exe" (echo Run paradox.bat once first. ^& pause ^& exit /b 1)
echo [PARADOX] Running backend tests...
".venv\Scripts\python.exe" -m pytest -q
if errorlevel 1 (echo Backend tests failed. ^& pause ^& exit /b 1)
cd /d "%~dp0frontend"
if not exist "node_modules\vite\dist\node\cli.js" (call npm ci)
if errorlevel 1 (echo Frontend dependency installation failed. ^& pause ^& exit /b 1)
call npm run build
if errorlevel 1 (echo Frontend build failed. ^& pause ^& exit /b 1)
echo.
echo To run HTTP smoke tests, keep PARADOX running and execute: npm run test:smoke
pause
