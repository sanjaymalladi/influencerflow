@echo off
echo.
echo ===============================================
echo   Starting InfluencerFlow Development Servers
echo ===============================================
echo.

echo Starting Backend Server (Port 5000)...
start "Backend Server" cmd /k "cd backend && npm start"

timeout /t 3 /nobreak > nul

echo Starting Frontend Server (Port 5173)...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ===============================================
echo   Both servers are starting in separate windows
echo ===============================================
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo   Health:   http://localhost:5000/health
echo ===============================================
echo.
echo Press any key to exit...
pause > nul 