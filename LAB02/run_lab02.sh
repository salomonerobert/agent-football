#!/bin/bash
# run_lab02.sh - Runs the Frontend, Captain Server, and Coach Server in parallel.

# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Resolve root directory
CWD="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$CWD"

# Default to running the reference solution. Pass "task" as an argument to run student templates instead.
MODE="solution"
if [ "$1" == "task" ]; then
    MODE="task"
fi

# Activate virtual environment if present
if [ -f "../venv/bin/activate" ]; then
    source ../venv/bin/activate
fi

# Track child PIDs for cleanup
PIDS=()

cleanup() {
    echo -e "\nStopping all services..."
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
        fi
    done
    # Restore agent.py if it was swapped
    if [ "$MODE" == "task" ] && [ -f "football_agents/agent.py.bak" ]; then
        echo "--> Restoring original agent.py..."
        mv football_agents/agent.py.bak football_agents/agent.py
    fi
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM to clean up all spawned processes
trap cleanup SIGINT SIGTERM


# Clean up any stale local ADK SQLite databases / session cache to prevent lock/corruption errors
if [ -d ".adk" ]; then
    echo "--> Cleaning up stale .adk session storage..."
    rm -rf .adk
fi

echo "Starting LAB02 services in MODE: $MODE..."

# 1. Start Captain Server
echo "--> Starting Team Captain A2A Server..."
python3 -m football_agents.captain_server &
PIDS+=($!)

# Wait a brief moment for A2A port registration
sleep 2

# 2. Start Coach Server (ADK Web)
# Running adk web on '.' (the LAB02 root folder) scans the subdirectory 'football_agents'
# and registers it as the agent application 'football_agents'.
echo "--> Starting Head Coach Server (adk web)..."
adk web . --allow_origins='*' &
PIDS+=($!)

# Wait a brief moment for Coach server port registration
sleep 2

# 3. Start Frontend
echo "--> Starting Frontend server (Vite)..."
cd frontend
npm install &
npm run dev &
PIDS+=($!)
cd ..

echo "=========================================================="
echo "All services running! Press Ctrl+C to stop all of them."
echo "=========================================================="

# Wait on all background processes
wait