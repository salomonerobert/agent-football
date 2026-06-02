#!/bin/bash
# mask.sh - Masks the completed solution files by replacing them with the task templates, and deletes the task templates.

# Ensure we are in the script's directory
CWD="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$CWD"

echo "Applying masking for LAB01..."
if [ -f "LAB01/task_app.py" ]; then
    mv "LAB01/task_app.py" "LAB01/app.py"
    echo "  -> Replaced app.py with task_app.py"
fi

echo "Applying masking for LAB02/football_agents..."
if [ -f "LAB02/football_agents/task_agent.py" ]; then
    mv "LAB02/football_agents/task_agent.py" "LAB02/football_agents/agent.py"
    echo "  -> Replaced agent.py with task_agent.py"
fi

if [ -f "LAB02/football_agents/task_captain.py" ]; then
    mv "LAB02/football_agents/task_captain.py" "LAB02/football_agents/captain.py"
    echo "  -> Replaced captain.py with task_captain.py"
fi

if [ -f "LAB02/football_agents/task_captain_server.py" ]; then
    mv "LAB02/football_agents/task_captain_server.py" "LAB02/football_agents/captain_server.py"
    echo "  -> Replaced captain_server.py with task_captain_server.py"
fi

echo "Applying masking for LAB02 specialist agents..."
for role in defender midfielder forward goalkeeper; do
    if [ -f "LAB02/football_agents/specialist_agents/task_${role}.py" ]; then
        mv "LAB02/football_agents/specialist_agents/task_${role}.py" "LAB02/football_agents/specialist_agents/${role}.py"
        echo "  -> Replaced ${role}.py with task_${role}.py"
    fi
done

echo "Masking complete!"
