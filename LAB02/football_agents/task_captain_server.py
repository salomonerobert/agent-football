"""
Task 2: Team Captain A2A Server - TEMPLATE
==========================================

In this file, you will write the code to expose your `task_captain` agent
as a standalone Agent-to-Agent (A2A) service running on port 8001.

Run it using:
    python -m football_agents.task_captain_server

Verify by visiting:
    http://localhost:8001/.well-known/agent-card.json
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# TODO: Task 2b - Import ADK A2A and Uvicorn utilities
# Make sure to import your `captain_agent` from `football_agents.task_captain`!
# Hint:
# from google.adk.a2a.utils.agent_to_a2a import to_a2a
# import uvicorn
# from football_agents.task_captain import captain_agent


# TODO: Task 2c - Build the A2A Starlette app and run the server
# 1. Retrieve HOST and PORT from environment (default to "localhost" and 8001).
# 2. Use `to_a2a` to convert the `captain_agent` into an app, passing host and port.
# 3. In the `__main__` block, use `uvicorn.run` to start the server.
#
# Your code here:
