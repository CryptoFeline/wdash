#!/bin/bash

# GMGN Dashboard Startup Script

echo "🚀 Starting Dashboard..."
echo ""

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# Check if frontend dependencies are installed
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "✅ Starting servers..."
echo ""
echo "Backend will run on: http://localhost:3001"
echo "Frontend will run on: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Start backend in background
cd backend
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
