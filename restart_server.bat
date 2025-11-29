@echo off
echo ========================================
echo   D&D Card Generator - Restart Server
echo ========================================
echo.

REM Navigate to the script directory
cd /d "%~dp0"

REM Kill all existing Vite/Node processes
echo Stopping all running servers...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo All Node.js processes stopped.
) else (
    echo No running servers found.
)
echo.

REM Wait a moment to ensure ports are freed
timeout /t 2 /nobreak >nul

REM Clear npm cache (optional but helps with refresh issues)
echo Clearing cache...
call npm cache clean --force 2>nul
echo.

REM Start the development server
echo Starting fresh server...
echo The browser will open automatically.
echo Press Ctrl+C to stop the server.
echo.
call npx vite --open --force

pause
