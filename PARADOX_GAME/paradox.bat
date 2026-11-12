@echo off
setlocal
cd /d "%~dp0"
title PARADOX Space Academy Launcher

echo.
echo  ==============================================
echo       PARADOX SPACE ACADEMY - ONE CLICK START
echo  ==============================================
echo.
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Windows PowerShell was not found.
  pause
  exit /b 1
)

start "PARADOX Backend" powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0RUN_BACKEND.ps1"
start "PARADOX Frontend" powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0RUN_FRONTEND.ps1"

echo [PARADOX] Waiting for both services...
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0WAIT_FOR_PARADOX.ps1"
if errorlevel 1 (
  echo.
  echo [PARADOX] A service did not become ready.
  echo Check the Backend and Frontend PowerShell windows for the exact error.
  pause
  exit /b 1
)

echo.
echo [PARADOX] Game opened. Keep the two service windows open while playing.
echo.
endlocal
