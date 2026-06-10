# 📝 Changelog

All notable changes to the **Agentic Football Workshop** project are documented in this file.

---

## Release Prep Updates (2026-06-10)

### 🔧 Changed & Simplified
- **Simplified Instructions & Architecture Docs**: Renamed all `task_*.py` references and code snippet imports in `LAB_INSTRUCTIONS.md` to point directly to final filenames (`app.py`, `agent.py`, `captain.py`, etc.), matching the masked student workspace.
- **Improved Architecture Visuals**: Replaced system Mermaid diagrams with high-fidelity diagrams (`diagram_a.png`, `diagram_b.png`, `diagram_c.png`), simplified headings, and added non-technical flow descriptions.
- **Enhanced Asset Onboarding Visuals**: Incorporated LAB01 portal screenshots (`lab01_a.png`, `lab01_b.png`) and root banner headers to enrich Qwiklabs visual documentation.
- **Removed Line Numbers**: Removed specific line number references from all instructions to prevent documentation rot as files evolve.

### ⚡ Optimized & Fixed
- **Fixed Prompt Parameter Mismatch**: Resolved a parameter naming mismatch in `get_player_prompt` which caused generation errors or mismatched visual properties.
- **Fixed AgentTool Import Path**: Fixed `AgentTool` import path from `google.adk.agents.llm_agent` to `google.adk.tools`.
- **Synchronized Mock MCP tools**: Updated `tools.py` mock functions to write to `substitutions.json` so the game's UI and player state react correctly even in mock MCP mode (`USE_REAL_MCP_SERVER = False`).
- **Added MCP Activation Guidance**: Added Task 5c to Step 10 instructing students to toggle `USE_REAL_MCP_SERVER = True` to run the real stdio FastMCP server.

---

## Commits: ef474c3, 33e19db, 788ec81, 6aca267, 2c3fab0, 28c9b1f, c231754 (2026-06-10)

### 🚀 Added
- **Consolidated LAB02 Runner Script**: Added `LAB02/run_lab02.sh` to launch Vite (Frontend), Captain Server (A2A), and Coach Server (ADK Web) concurrently in a single terminal with automatic stale `.adk` directory cache cleaning and graceful process termination.
- **Repository Masking**: Added a master `mask.sh` script to the root directory to automate overwriting reference solution files with task templates and deleting templates to prepare student workspaces.
- **Overhauled Maintainer Docs**: Completely rewrote `README.md` as a comprehensive Developer & Maintainer Guide containing detailed project architecture, local environment verification steps, Vertex AI API enablement instructions, and branching/masking SOP guidelines.

### 🔧 Changed
- **Port Standardization**: Changed LAB01 port to `8002` across all FastAPI server definitions, frontend shout handlers, and documentation to avoid port collisions with other default services.
- **Documentation Portability**: Converted all local absolute machine paths (e.g. `/usr/local/google/...` or `/Users/...`) in `README.md`, `LAB01/README.md`, `LAB02/README.md`, and `LAB_INSTRUCTIONS.md` to relative links.
- **Legal Compliance**: Prepended Apache 2.0 license comment headers to all 32 python, javascript, and shell code files.

### 🧹 Removed
- **Redundant Masking Scripts**: Deleted local `LAB01/mask.sh` and `LAB02/mask.sh` to centralize masking logic in the root folder.

---

## Commits: 77a912a, 26efa4f, 93f5cd9, 4b7b85f, ef8a53c, 235033f (2026-06-09)

### 🚀 Added
- **A2A & MCP Integration**: Implemented network A2A transfer capabilities from the Head Coach to the Team Captain A2A server. Integrated Model Context Protocol (MCP) enabling players to autonomously self-report injuries/substitutions.
- **Live Debug UI Logs**: Added a real-time debug log streaming console directly in the Phaser game UI to visualize agent-to-agent reasoning traces.
- **Premium UI Overhaul**: Redesigned the in-game scoreboard with modern vector graphics, upgraded goalposts and netting with 3D drop-shadows/team-colored tension bars, and overhauled pitch assets.

### ⚡ Optimized & Fixed
- **Session Synchronicity Fix**: Resolved a critical session write conflict where periodic background status checks clashed with user shouts.
- **Model Efficiency**: Switched all default LLM configurations to `gemini-3.1-flash-lite` for lower latency and better response predictability.
- **AI Gameplay Enhancements**: Improved ball-carrier decision-making to cut inside and allow backward/sideways passing under press, and made player speed scaling robust against float/normalized agent updates.
- **Balance Tuning**: Adjusted goalkeeper proportions and weakened the Red Team AI to balance gameplay difficulty.

---

## Commit: fbbecf0 (2026-05-23)

### 🎉 Initial Release
- **LAB01 (Avatar Creator & Tactics Onboarding)**: Initial FastAPI portal using Gemini Image Chat to generate style-consistent player spritesheets and customize initial team attributes.
- **LAB02 (Interactive Soccer Simulation)**: Initial 5v5 2D interactive Phaser soccer engine featuring Gemini-powered player state updates.
