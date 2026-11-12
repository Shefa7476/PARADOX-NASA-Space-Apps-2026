@echo off
start "PARADOX Backend" powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0RUN_BACKEND.ps1"
