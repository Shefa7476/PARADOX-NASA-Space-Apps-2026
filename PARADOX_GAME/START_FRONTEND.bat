@echo off
start "PARADOX Frontend" powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -File "%~dp0RUN_FRONTEND.ps1"
