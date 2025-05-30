@echo off
echo Starting InfluencerFlow Development Servers...
echo.

echo [1/2] Starting Backend Server (Port 3001)...
start "Backend Server" cmd /k "cd backend && npm run dev"

echo [2/2] Starting Frontend Server (Port 5173)...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ Both servers are starting up!
echo 📊 Backend API: http://localhost:5000
echo 🌐 Frontend App: http://localhost:5173
echo.
echo Press any key to close this window...
pause > nul 