#!/bin/bash
# mask.sh - Overwrites app.py with task_app.py and removes task_app.py.

CWD="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$CWD"

if [ -f "task_app.py" ]; then
    mv "task_app.py" "app.py"
    echo "  -> Replaced app.py with task_app.py"
fi
