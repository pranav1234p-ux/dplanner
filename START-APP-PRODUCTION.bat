@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Drone Command Center (Production)

echo ================================================
echo    DRONE COMMAND CENTER - Production Launcher
echo    (optimized build - faster app, slower start)
echo ================================================
echo.

REM --- 1. Check Node.js -------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js is not installed on this computer.
  echo     Trying to install it automatically via winget...
  echo.
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  echo.
  echo [i] If Node installed, CLOSE this window and run this file again.
  echo     Otherwise install Node.js LTS from https://nodejs.org and retry.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo [i] Node.js %%v detected.
echo.

REM --- 2. Install dependencies (first run only) ------------------------
if not exist "node_modules" (
  echo [i] First run: installing dependencies. This can take a few minutes...
  echo.
  call npm install
  if errorlevel 1 ( echo. & echo [!] "npm install" failed. & pause & exit /b 1 )
  echo.
)

REM --- 3. Make sure .env exists ----------------------------------------
if not exist ".env" (
  echo [!] No ".env" file found ^(it holds your database connection^).
  if exist ".env.example" ( copy ".env.example" ".env" >nul & echo [i] Created ".env" from the template. )
  echo.
  echo [ACTION NEEDED] Enter your DATABASE_URL in the ".env" file opening now, then SAVE it.
  echo.
  notepad ".env"
  echo Press any key once you have saved ".env" ...
  pause >nul
  echo.
)

REM --- 4. Build the optimized production bundle ------------------------
echo [i] Building the app for production ^(this can take about a minute^)...
echo.
call npm run build
if errorlevel 1 ( echo. & echo [!] Build failed. See the messages above. & pause & exit /b 1 )
echo.

REM --- 5. Start the server and open the browser -----------------------
echo ================================================
echo    Starting the app...
echo    A browser will open at  http://localhost:3000
echo    Keep THIS window open while using the app.
echo    Close this window to stop the app.
echo ================================================
echo.
start "" cmd /c "timeout /t 6 >nul & start http://localhost:3000"
call npm run start

endlocal
