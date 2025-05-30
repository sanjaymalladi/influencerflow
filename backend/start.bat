@echo off
echo 🚀 Starting InfluencerFlow Backend Server...
echo.

:: Kill any existing Node processes
echo 🧹 Cleaning up existing processes...
taskkill /F /IM node.exe 2>nul

:: Wait a moment
timeout /t 2 /nobreak >nul

:: Start the server
echo 🎯 Starting server on port 3001...
node src/index.js

pause 