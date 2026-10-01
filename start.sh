#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Ensure local library path is available for Node/npm
export LD_LIBRARY_PATH="/home/wildgoosechase42/.local/lib:${LD_LIBRARY_PATH:-}"

echo "=================================================="
echo "🚀 SomaiyaSat Mission Operations Suite"
echo "=================================================="

# Check and compile C Core if needed
if [ ! -f "backend/c_core/libmissionsuite.so" ]; then
    echo "⚡ Compiling C Core Shared Object..."
    gcc -shared -o backend/c_core/libmissionsuite.so -fPIC backend/c_core/mission_suite.c
    echo "✅ C Core compiled successfully."
fi

# Determine python runner
PYTHON_BIN="$PROJECT_ROOT/backend/.venv/bin/python"
if [ ! -f "$PYTHON_BIN" ]; then
    echo "⚠️  backend/.venv not found, using system python3..."
    PYTHON_BIN="python3"
fi

# Start FastAPI backend
echo "🛰️  Starting FastAPI Backend on http://127.0.0.1:8000..."
"$PYTHON_BIN" -m uvicorn main:app --app-dir backend --port 8000 --reload &
BACKEND_PID=$!

# Trap signals to terminate backend on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down backend (PID: $BACKEND_PID)..."
    kill "$BACKEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    echo "👋 Shutdown complete."
}
trap cleanup EXIT INT TERM

# Wait for backend to be ready
echo "⏳ Waiting for backend health check..."
for i in {1..10}; do
    if curl -s http://127.0.0.1:8000/docs >/dev/null 2>&1; then
        echo "✅ FastAPI Backend is UP and operational!"
        break
    fi
    sleep 0.5
done

# Start Next.js Frontend
echo "🌐 Starting Next.js Frontend on http://localhost:3000..."
npx next dev
