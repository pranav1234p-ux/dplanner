@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Drone Command Center - OFFLINE

echo ================================================
echo    DRONE COMMAND CENTER - OFFLINE MODE
echo ================================================
echo.
echo Runs against the local SQLite database (prisma\offline.db).
echo No internet / Supabase needed. Log in with the master admin,
echo or the seeded admin / operator1 / viewer1 accounts.
echo.

REM --- Node check ------------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js is not installed. Install it, then re-run this.
  pause
  exit /b 1
)

REM --- First run: install deps + build the offline database ------------
if not exist "node_modules" (
  echo [i] First run: installing dependencies...
  call npm install || (echo [!] npm install failed & pause & exit /b 1)
)
if not exist "prisma\offline.db" (
  echo [i] Building the local offline database with sample data...
  call npm run offline:setup || (echo [!] offline setup failed & pause & exit /b 1)
)

REM --- Launch in offline mode -----------------------------------------
set OFFLINE_MODE=1
echo [i] Starting in OFFLINE mode at http://localhost:3000
echo     Close this window to stop.
echo.
call npm run dev
pause
