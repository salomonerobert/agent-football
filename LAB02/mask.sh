#!/bin/bash
# mask.sh - Overwrites solved agent files with task templates and removes templates.

CWD="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$CWD"

echo "Applying masking for LAB02/football_agents..."
if [ -f "football_agents/task_agent.py" ]; then
    mv "football_agents/task_agent.py" "football_agents/agent.py"
    echo "  -> Replaced agent.py with task_agent.py"
fi

if [ -f "football_agents/task_captain.py" ]; then
    mv "football_agents/task_captain.py" "football_agents/captain.py"
    echo "  -> Replaced captain.py with task_captain.py"
fi

if [ -f "football_agents/task_captain_server.py" ]; then
    mv "football_agents/task_captain_server.py" "football_agents/captain_server.py"
    echo "  -> Replaced captain_server.py with task_captain_server.py"
fi

echo "Applying masking for LAB02 specialist agents..."
for role in defender midfielder forward goalkeeper; do
    if [ -f "football_agents/specialist_agents/task_${role}.py" ]; then
        mv "football_agents/specialist_agents/task_${role}.py" "football_agents/specialist_agents/${role}.py"
        echo "  -> Replaced ${role}.py with task_${role}.py"
    fi
done
