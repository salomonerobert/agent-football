"""
Team Captain A2A server
=======================

Exposes the `captain_agent` (defined in agent.py) as a standalone Agent-to-Agent
(A2A) service. The coach agent (root_agent, served by `adk web`) reaches this
service via RemoteA2aAgent, so the coach -> captain hop is a real A2A call.

Run it alongside `adk web`:

    python football_agents/captain_server.py            # serves on :8001

Override host/port with CAPTAIN_HOST / CAPTAIN_PORT. The agent card is published
at  http://<host>:<port>/.well-known/agent-card.json
"""

import os

import uvicorn
from google.adk.a2a.utils.agent_to_a2a import to_a2a

# Import as a package so the relative profile/MCP paths in agent.py resolve.
try:
    from football_agents.agent import captain_agent
except ImportError:  # allow `python football_agents/captain_server.py` from repo root
    import sys

    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from football_agents.agent import captain_agent

HOST = os.environ.get("CAPTAIN_HOST", "localhost")
PORT = int(os.environ.get("CAPTAIN_PORT", "8001"))

# Build the A2A Starlette app. `host`/`port` are baked into the published agent card.
app = to_a2a(captain_agent, host=HOST, port=PORT)

if __name__ == "__main__":
    print(f"Serving Team Captain over A2A at http://{HOST}:{PORT}")
    print(f"Agent card: http://{HOST}:{PORT}/.well-known/agent-card.json")
    uvicorn.run(app, host=HOST, port=PORT)
