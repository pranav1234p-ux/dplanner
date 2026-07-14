@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Drone Command Center

echo ================================================
echo    DRONE COMMAND CENTER - Launcher
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
  echo [i] If Node installed successfully, CLOSE this window and
  echo     double-click START-APP.bat again.
  echo     Otherwise install Node.js LTS from https://nodejs.org and retry.
  echo.
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
  if errorlevel 1 (
    echo.
    echo [!] "npm install" failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
  echo.
)

REM --- 3. Make sure .env exists ----------------------------------------
if not exist ".env" (
  echo [!] No ".env" file found ^(it holds your database connection^).
  if exist ".env.example" (
    copy ".env.example" ".env" >nul
    echo [i] Created ".env" from the template.
  )
  echo.
  echo [ACTION NEEDED] Enter your DATABASE_URL in the ".env" file that is opening now,
  echo                 then SAVE it and come back here.
  echo.
  notepad ".env"
  echo Press any key once you have saved ".env" ...
  pause >nul
  echo.
)

REM --- 4. Start the app and open the browser ---------------------------
echo ================================================
echo    Starting the app...
echo    A browser will open at  http://localhost:3000
echo    Keep THIS window open while using the app.
echo    Close this window to stop the app.
echo ================================================
echo.
start "" cmd /c "timeout /t 12 >nul & start http://localhost:3000"
call npm run dev

endlocal
