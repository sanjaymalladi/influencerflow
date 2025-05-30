#!/bin/bash

echo "🚀 Starting InfluencerFlow Development Servers..."
echo

echo "[1/2] Starting Backend Server (Port 3001)..."
cd backend && npm run dev &
BACKEND_PID=$!

echo "[2/2] Starting Frontend Server (Port 5173)..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo
echo "✅ Both servers are starting up!"
echo "📊 Backend API: http://localhost:5000"
echo "🌐 Frontend App: http://localhost:5173"
echo
echo "Press Ctrl+C to stop both servers"

# Function to cleanup processes on exit
cleanup() {
    echo
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped successfully"
    exit 0
}

# Set trap for cleanup on exit
trap cleanup SIGINT SIGTERM

# Wait for either process to exit
wait 