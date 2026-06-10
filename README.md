# ⚽ Agentic Football Workshop - Quick Start Guide

This guide provides quick instructions to get **LAB01** and **LAB02** up and running.

---

## 🛠️ Common Prerequisites & Environment Setup

Before running either lab, you need to set up your Python environment and credentials.

1.  **Navigate to the project root**:
    ```bash
    cd agent-football
    ```

2.  **Activate the Virtual Environment**:
    The repository comes with a pre-configured virtual environment. Activate it:
    ```bash
    source venv/bin/activate
    ```

3.  **Configure Environment Variables**:
    Copy the `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
    Open `.env` and configure it:
    *   **Option A (Vertex AI - Recommended)**: Set `GOOGLE_CLOUD_PROJECT` to your Google Cloud Project ID.
        ```ini
        GOOGLE_GENAI_USE_VERTEXAI=true
        GOOGLE_CLOUD_PROJECT=your-google-cloud-project-id
        GOOGLE_CLOUD_LOCATION=us-central1
        ```
    *   **Option B (Gemini Developer API)**: Comment out `GOOGLE_CLOUD_PROJECT` and set `GEMINI_API_KEY` to your Gemini API key.
        ```ini
        # GOOGLE_GENAI_USE_VERTEXAI=true
        GEMINI_API_KEY=your-gemini-api-key
        ```

---

## 🎨 LAB01: Avatar & Team Onboarding Portal

LAB01 is a web portal where you customize your team's visual identity (generating spritesheets with Gemini) and starting tactics.

### Running LAB01:
1.  Ensure you are in the `LAB01` directory and your venv is active:
    ```bash
    cd LAB01
    ```
2.  Start the FastAPI server:
    *   **To run your task template (for development)**:
        ```bash
        uvicorn task_app:app --host 127.0.0.1 --port 8002 --reload
        ```
    *   **To run the completed reference solution**:
        ```bash
        uvicorn app:app --host 127.0.0.1 --port 8002 --reload
        ```
3.  Open `http://127.0.0.1:8002` in your browser.
4.  Configure your team, click **"Generate Avatars"**, then **"Save Player Profiles"** to send the assets and tactics directly to LAB02.

---

## 🏆 LAB02: Multi-Agent Football Simulation

LAB02 is the live simulation where your customized players run on the pitch, coordinated by a Team Captain and Coach Agent, communicating via A2A and MCP.

Running LAB02 requires running three components simultaneously in separate terminals: the **Frontend**, the **Captain Server**, and the **Coach Server**.

### Running LAB02:

#### Step 1: Start the Frontend (Vite)
1.  Open a new terminal and navigate to the frontend directory:
    ```bash
    cd agent-football/frontend
    ```
2.  Start the development server (requires Node.js):
    ```bash
    npm run dev
    ```
    *The UI will run on `http://localhost:5173/`.*

#### Step 2: Start the Captain Server (A2A on Port 8001)
1.  Open a new terminal, navigate to `LAB02`, and activate the venv:
    ```bash
    cd agent-football/LAB02
    source ../venv/bin/activate
    ```
2.  Start the Captain server:
    *   **To run your task template (for development)**:
        ```bash
        python3 -m football_agents.task_captain_server
        ```
    *   **To run the completed reference solution**:
        ```bash
        python3 -m football_agents.captain_server
        ```

#### Step 3: Start the Coach Server (adk web on Port 8000)
1.  Open a new terminal, navigate to `LAB02`, and activate the venv:
    ```bash
    cd agent-football/LAB02
    source ../venv/bin/activate
    ```
2.  Start the Coach server:
    *   **To run your task template (for development)**:
        ```bash
        ../venv/bin/adk web football_agents/task_agent.py
        ```
    *   **To run the completed reference solution**:
        ```bash
        ../venv/bin/adk web football_agents/agent.py
        ```

---

### 🎮 Playing the Game
1.  Open `http://localhost:5173/` in your browser.
2.  Click **Kick Off!** to start the simulation.
3.  Use the **Coach Shout Bar** at the bottom to send tactical instructions (e.g., "everyone attack", "park the bus", "play defensive").
4.  Watch the agents coordinate and update player attributes in real-time!
