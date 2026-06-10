# Multi-Agent Football Worldcup Mania
![Multi-Agent Football Worldcup Mania](img/banner.png)

## 1. Overview & Core Concepts

In this hands-on lab, you will learn to build and orchestrate a Gemini-powered multi-agent system using the Google Agent Development Kit (ADK) through a 5v5 football simulation. The core objective is to explore single-agent configuration (Lab 1) and master multi-agent orchestration patterns (Lab 2) using Agent-to-Agent (A2A) network delegation and the Model Context Protocol (MCP).

### 🎯 Learning Outcomes
By the end of this lab, you will learn how to:
1. **Develop Agents** using the Google Agent Development Kit (ADK) to build autonomous software entities with system instructions and tools.
2. **Generate multimodal content** dynamically, using the `Nanobanana` image generator and `Gemini` reasoning models to create style-consistent game assets and agentic interactions.
3. **Design and apply multi-agent orchestration patterns**, including hierarchical control delegation and parallel routing workflows.
4. **Implement protocols for agent-to-agent and agent-tool interactions** using the network-based Agent-to-Agent (A2A) protocol and Model Context Protocol (MCP).

---

### 🧠 Core Concepts

#### What is an Agent?
An **Agent** is an autonomous software component powered by a Large Language Model (LLM) that can reason, take actions, and interact with its environment. In Google's Agent Development Kit (ADK), this is represented by the **`LlmAgent`** class. An agent combines:
1.  **Model Brain**: The underlying Large Language Model (`gemini-3.5-flash` or `gemini-3.1-flash-image`).
2.  **System Instructions**: A defined role or persona (e.g. *"You are a gritty defender"*).
3.  **Tools**: Programmatic actions (Python functions like `update_profile` or health connectors).
*   **Analogy**: Think of an agent as a **smart virtual player** on the field with a specific assignment and a set of skills on their card.

#### What is A2A (Agent-to-Agent)?
The **Agent-to-Agent (A2A)** protocol is an HTTP/JSON-RPC communication interface that allows independent agents hosted on different servers to delegate tasks and collaborate across network boundaries. In the ADK, this is facilitated by:
*   **`RemoteA2aAgent`**: A class representing a network-connected remote agent.
*   **`to_a2a`**: A utility function wrapping local agents to serve them as HTTP endpoints.
*   **Analogy**: Think of A2A as **Slack or email** for AI. The Coach Agent (on Server A) sends an HTTP message to a `RemoteA2aAgent` representing the Captain (on Server B) to delegate leadership tasks.

#### What is MCP (Model Context Protocol)?
The **Model Context Protocol (MCP)** is an open standard that allows LLM agents to connect to external data sources and tool servers via standard JSON-RPC over stdio or network channels.
*   **Analogy**: Think of MCP as a **smart wearable watch** worn by the players. If a player gets injured or runs out of stamina, the player agent reads the watch sensor data (connecting to a background tool server via a stdio interface) and uses this data to request a substitution.

#### What is Agent Orchestration?
**Agent Orchestration** is the design pattern and workflow architecture used to coordinate multiple specialized agents to solve complex tasks. In this lab, we implement a **Parallel/Routing Workflow** nested inside a **Hierarchical Orchestrator-Workers** structure:

1.  **Hierarchical (Coach ➔ Captain)**: The Coach Agent acts as the high-level touchline Manager. It receives yells from the user interface and immediately delegates them to the Team Captain over the network using A2A.
2.  **Parallel Routing (Captain ➔ Specialists)**: The Captain Agent receives the strategy and delegates role adjustments to all 4 specialists (Defender, Midfielder, Forward, Goalkeeper) **simultaneously in parallel** using the **`AgentTool`** wrapper.

*   **Why it makes sense**:
    *   **Real-world Consistency**: On a real football pitch, when a coach yells "everyone defend!", the players react **concurrently and independently** as a unit rather than waiting for one another.
    *   **Latency Mitigation**: If the Captain queried the 4 player specialist agents sequentially, it would take 8–10 seconds. By routing requests in **parallel**, all players update their profiles at the same time, keeping the simulation fast and responsive.

Here is an overview of the primary workflow patterns supported by ADK:

![workflows_overview.png](https://adk.dev/assets/workflows_overview.svg "workflows overview")

*   **Sequential Workflow**: A linear chain of steps (e.g. *Writer Agent ➔ Editor Agent*).
*   **Parallel/Routing Workflow**: Fan-out execution of specialized sub-tasks followed by result merging.
*   **Loop Workflow**: A feedback loop for iterative validation and refinement.
*   **Graph Workflow**: A state-machine-style network graph with conditional routing.

---

### 🗺️ How the Game Systems Connect

To help you visualize how the system communicates, here is how the servers, shouts, and substitutions flow:

#### Diagram A: How the Servers Talk
![Network and Process Topology](img/diagram_a.png)
*   **Description**: This topology details the communication chain across the distributed services. The browser UI sends tactical yells to the Coach Agent (running on Port 8000), which forwards the tactical strategy over the network (via HTTP/A2A) to the Team Captain Server (running on Port 8001). The Captain then invokes tool interfaces for the individual Specialist Player Agents.

#### Diagram B: How a Shout Command Flows
![Tactical Command Execution Flow](img/diagram_b.png)
*   **Description**: This flow illustrates the life cycle of a tactical shout (e.g., *"play defensive"*). The coach's shout is captured by the web client, sent to the Coach Agent, relayed to the Captain Agent, and delegated to player specialists in parallel. Each specialist updates their game settings in their JSON profile on disk, which is dynamically parsed by the Phaser game client to alter player behavior.

#### Diagram C: How Substitution Requests Work
![Autonomous Substitution Flow](img/diagram_c.png)
*   **Description**: This flow shows the autonomous loop for game checkups. When a player's stamina falls below a threshold on the pitch, the game client prompts the player agent. The agent reasons about the player's fatigue/injury level and makes a tool call to the background FastMCP server, which writes substitution requests directly to disk. The game client reads these files and performs sprite swaps in real-time.

---

### 🛡️ Technology Stack & Protocols

To build this real-time agentic game, you will work with the following technologies and networking layers:

#### The Frontend & Client Layer
*   **Phaser 3**: An open-source 2D HTML5 game engine used to manage physics, handle keyboard/touch events, and render the player spritesheets in the browser.
*   **Vite**: A fast local development server proxying frontend requests to our backend python APIs.
*   **SSE (Server-Sent Events)**: An HTTP standard allowing the backend Coach server to stream text and structured huddle status responses to the frontend terminal panel in real-time as the agent "thinks".

#### The Backend & Agent Layer
*   **FastAPI & Uvicorn**: Async Python web framework used to host:
    *   The onboarding/avatar generation portal (Port `8002`).
    *   The Coach Agent (Port `8000`).
    *   The Captain Agent (Port `8001`).
*   **A2A (Agent-to-Agent) Protocol**: The HTTP communication interface standard defined by ADK to delegate prompts between independent network-separated agents.
*   **FastMCP (Model Context Protocol)**: A Python MCP implementation running over local stdio pipes that handles injury logging and substitutions.

#### The Storage & Session Layer
*   **SQLite**: A lightweight relational database automatically managed by the ADK library under the `.adk/` folder to persist agent conversations, logs, and context sessions.

---

## 2. Workspace & Environment Setup

Before starting the implementation, you must set up your Python virtual environment and Google Cloud permissions.

### Task 1: Clone the Git Repository & Activate Virtual Environment

1. Open your terminal, navigate to your workspace directory, and run the following command to clone the code:
    ```bash
    git clone https://github.com/salomonerobert/agent-football.git
    ```

2. Change directory into the cloned repository:
    ```bash
    cd agent-football
    ```
3. Create python virtual environment:
    ```bash
    python3 -m venv venv
    ```

4. Activate the pre-configured virtual environment:
    ```bash
    source venv/bin/activate
    ```

5. Install required python dependencies:
    ```bash
    pip install -r requirements.txt
    ```

6. Copy the environment template to create your `.env` configuration:
    ```bash
    cp .env.example .env
    ```

7. Open the `.env` file and verify or fill in your Google Cloud project details:
    ```ini
    GOOGLE_GENAI_USE_VERTEXAI=true
    GOOGLE_CLOUD_PROJECT=your-google-cloud-project-id
    GOOGLE_CLOUD_LOCATION=global
    ```


### Task 2: Enable the Vertex AI API in Google Cloud

To generate avatars using Google Cloud's Vertex AI, you must enable the Vertex AI API for your project and establish credentials.

1. Authenticate your Cloud Shell session:
    ```bash
    gcloud auth application-default login
    ```
    *(Follow the prompts to click the link and authenticate with your Qwiklabs Google Account.)*

2. Authenticate your Cloud Shell session:
    ```bash
    gcloud auth application-default set-quota-project PROJECT_ID && gcloud config set project PROJECT_ID
    ```

3. Run the following command to enable the Vertex AI service:
    ```bash
    gcloud services enable aiplatform.googleapis.com
    ```

---

## 3. LAB01: Avatar Creation & Style Consistent Chat Sessions

In this section, you will write the backend code to communicate with Gemini for spritesheet generation.

![LAB01 Avatar Generation Portal](img/lab01_a.png)
*   **Description**: In the first phase of Lab 1, you will build the visual onboarding portal where you input a jersey style and colors, generating matching outfield player and goalkeeper sprites.

![LAB01 Tactical Configuration](img/lab01_b.png)
*   **Description**: In the second phase, you will tune starting tactical attributes (such as speed, aggression, and defensive positioning) for each player role and save them to disk as baseline files.

### 💡 The Analogy: The "Style-Consistent" Designer
If you hire two different designers to draw a player and a goalkeeper separately, they will look completely different. But if you have one designer draw the player first, and then say: *"Great, now draw the goalkeeper in the same style and color matching this player,"* the result will be consistent.
In Gemini, we achieve this by starting a **Chat Session** (a single continuous conversational thread) instead of making independent API requests.

---

## Step 1: Initialize the Gemini Client
*   **File to edit**: `LAB01/app.py`
*   **ToDo to look for**: Locate the comment `# TODO: Task 1 - Initialize the Gemini Client`.
*   **Code to fill in**:
    ```python
    client = genai.Client()
    ```
*   **What this code does**: This initializes the official Google GenAI SDK client. By default, the client constructor reads your environment credentials (such as the `GOOGLE_CLOUD_PROJECT` you configured in your `.env` file) to authenticate your connection to Gemini.

---

## Step 2: Create a Style-Consistent Chat Session
*   **File to edit**: `LAB01/app.py`
*   **ToDo to look for**: Locate the comment `# TODO: Task 2 - Create a style-consistent chat session`.
*   **Code to fill in**:
    ```python
    chat = client.aio.chats.create(model="publishers/google/models/gemini-3.1-flash-image")
    ```
*   **What this code does**: This creates a new asynchronous chat session using the image generation model (code-named **Nanobanana**). Creating a chat session preserves the context and history of generated assets, which ensures the player and goalkeeper models align in jersey styling and color values.

---

## Step 3: Request the Image Modality in Chat
*   **File to edit**: `LAB01/app.py`
*   **ToDo to look for**: Locate the comments `# TODO: Task 3a - Generate the Outfield Player Spritesheet` and `# TODO: Task 3b - Generate the Goalkeeper Spritesheet (Style Consistent)`.
*   **Code to fill in**:
    Fill in these blocks using tabbed components:

<ql-code>

  <ql-code-block language="python" tabTitle="Outfield Player generation (Task 3a)">
  response = await chat.send_message(
      player_prompt,
      config=types.GenerateContentConfig(
          response_modalities=["IMAGE"],
          image_config=types.ImageConfig(aspect_ratio="16:9")
      )
  )
  </ql-code-block>

  <ql-code-block language="python" tabTitle="Goalkeeper generation (Task 3b)">
  response = await chat.send_message(
      gk_prompt,
      config=types.GenerateContentConfig(
          response_modalities=["IMAGE"],
          image_config=types.ImageConfig(aspect_ratio="16:9")
      )
  )
  </ql-code-block>

</ql-code>

*   **What this code does**: Sends the player and goalkeeper prompts to the active chat session. The configuration parameters instruct the SDK to return an `IMAGE` response format in a `16:9` aspect ratio. Because both run sequentially in the same chat session, the Goalkeeper inherits the outfield player's style.

---

## Step 4: Prompt Engineering Sandbox
*   **File to edit**: `LAB01/prompts.py`
*   **ToDo to look for**: Locate the functions `get_player_prompt` and `get_goalkeeper_prompt`.
*   **Code to fill in**:
    Update the prompt functions to specify the exact grid format required by the Phaser engine:
    ```python
    def get_player_prompt(color: str, logo: str, style: str) -> str:
        return f"A pixel art spritesheet of a football player wearing a {color} jersey with a {logo} logo, in style: {style}. The spritesheet must consist of a single horizontal row containing exactly 4 frames showing running and kicking actions. The background must be solid, uniform neon green (#00FF00) with no details."
    ```
*   **What this code does**: Standardizes your prompt generation to ensure that the image returned by Gemini is laid out on a clean horizontal grid with a solid neon green background (`#00FF00`) so the frontend engine can easily key out (remove) the background.

---

## Step 4.5: Run the Onboarding Server & Save Starting Profiles
Before proceeding to the checkpoint questions, launch the local onboarding server to test your spritesheet generator and prompt configurations:

1. In your terminal, make sure your virtual environment is active, then navigate to the `LAB01` directory:
    ```bash
    cd LAB01
    ```
2. Start the FastAPI development server:
    ```bash
    uvicorn app:app --host 127.0.0.1 --port 8002 --reload
    ```
3. Open your browser and navigate to `http://127.0.0.1:8002`.
4. Click **⚡ Generate Avatars** to trigger Gemini image generation. Watch the terminals to verify style consistency.
5. Once your player spritesheets generate successfully, click **Configure Player Profiles ➡️**.
6. Tweak the default behavior sliders (e.g. speed, positioning) for each player, then click **💾 Save Player Profiles** to write your starting configurations to disk.

---

### 🧩 LAB01 Checkpoint Questions

<ql-multiple-choice-probe stem="When initializing a style-consistent image generation workflow in Task 2, which method must be used to create the chat session?"
                          optionTitles='[
                            "client.aio.chats.create()",
                            "client.chats.create_session()",
                            "genai.chats.initialize()",
                            "client.images.chat_flow()"
                          ]'
                          answerIndex="0"
                          shuffle>
</ql-multiple-choice-probe>

<ql-multiple-choice-probe stem="Why do we generate the Goalkeeper inside the same chat session as the Outfield Player instead of calling the image generation API separately?"
                          optionTitles='[
                            "To leverage chat history so the model matches colors, style, and logo across assets",
                            "Because calling the API separately takes twice as long",
                            "To reduce token costs by compressing the generated images",
                            "It is a strict requirement of the FastAPI web server"
                          ]'
                          answerIndex="0"
                          shuffle>
</ql-multiple-choice-probe>

<ql-multiple-choice-probe stem="What is the purpose of specifying `#00FF00` (neon green) as the solid background color in your spritesheet prompts?"
                          optionTitles='[
                            "To make the players run faster on the green pitch",
                            "To allow the frontend to automatically chroma-key (remove) the background, leaving the player transparent",
                            "To comply with Gemini Image Generation branding guidelines",
                            "It is required by the SQLite session database"
                          ]'
                          answerIndex="1"
                          shuffle>
</ql-multiple-choice-probe>

---

## 4. LAB02: Creating the A2A (Agent-to-Agent) Servers

![Agentic Football Simulation Pitch](img/banner.png)

In `LAB02`, we will split our monolithic Coach setup into a distributed network of agents communicating over standard A2A (Agent-to-Agent) and MCP protocols.

---

## Step 5: Write a Simple Direct Response Prompt for the Coach
*   **File to edit**: `LAB02/football_agents/agent.py`
*   **ToDo to look for**: Locate the comment `# TODO: Task 1 - Write a simple direct response prompt for the Coach`.
*   **Code to fill in**:
    Inside the `coach_agent` definition, locate the `instruction` prompt block:
    ```python
    instruction="""You are the head coach on the touchline. 
    
    CRITICAL SYSTEM INSTRUCTIONS (Do not modify):
    1. If you receive the exact message 'BACKUP_BASELINE', you MUST immediately call the `backup_baseline_profiles` tool and return its response.
    2. If you receive the exact message 'RESTORE_BASELINE', you MUST immediately call the `restore_baseline_profiles` tool and return its response.
    
    TACTICAL SHOUTS (Task 1):
    For any other message (e.g. "everyone attack"), respond directly as a passionate coach with a funny, encouraging 1-sentence shout! Do NOT call any sub-agents yet."""
    ```
*   **What this code does**: Sets up the initial Coach Agent system instruction prompt. At this stage, the Coach is a "monolith" that responds to user shouts directly using a humorous response format.

---

## Step 6: Define and Expose the Captain Agent (A2A Server)
In this step, you will wrap the captain agent as a standalone HTTP microservice listening on port `8001`.

#### Task 2a: Define the Captain Agent
*   **File to edit**: `LAB02/football_agents/captain.py`
*   **ToDo to look for**: Locate the comment `# TODO: Task 2 - Define the Captain Agent`.
*   **Code to fill in**:
    ```python
    captain_agent = LlmAgent(
        name="TeamCaptain",
        model=GeminiConstants.GEMINI_FLASH_LITE,
        description="The team captain who relays coach shouts to the outfield players.",
        instruction="""You are the team captain. Respond to the Coach's instruction with a simple players-style greeting (e.g. 'Captain here, ready to lead!'). Leave tools empty for now."""
    )
    ```

#### Task 2b: Import ADK A2A and Uvicorn Utilities
*   **File to edit**: `LAB02/football_agents/captain_server.py`
*   **ToDo to look for**: Locate the comment `# TODO: Task 2b - Import ADK A2A and Uvicorn utilities`.
*   **Code to fill in**:
    ```python
    from google.adk.a2a.utils.agent_to_a2a import to_a2a
    import uvicorn
    from football_agents.captain import captain_agent
    ```

#### Task 2c: Build the A2A Starlette App and Run the Server
*   **File to edit**: `LAB02/football_agents/captain_server.py`
*   **ToDo to look for**: Locate the comment `# TODO: Task 2c - Build the A2A Starlette app and run the server`.
*   **Code to fill in**:
    ```python
    HOST = os.environ.get("CAPTAIN_HOST", "localhost")
    PORT = int(os.environ.get("CAPTAIN_PORT", "8001"))

    app = to_a2a(captain_agent, host=HOST, port=PORT)

    if __name__ == "__main__":
        uvicorn.run(app, host=HOST, port=PORT)
    ```
*   **What this code does**: Converts your `captain_agent` into a network-reachable Starlette application using the ADK A2A library. It serves the agent card and endpoints over port `8001`.

---

## Step 7: Connect the Coach Agent to the Remote Captain (A2A)
Now, you will configure the Coach agent to stop responding directly and instead delegate to the Captain over the network.

#### Task 3a: Define the Remote Captain Agent (A2A)
*   **File to edit**: `LAB02/football_agents/agent.py`
*   **ToDo to look for**: Locate the comment `# TODO: Task 3a - Define the Remote Captain Agent (for Task 3)`.
*   **Code to fill in**:
    ```python
    from google.adk.agents.remote_a2a_agent import RemoteA2aAgent, AGENT_CARD_WELL_KNOWN_PATH

    CAPTAIN_A2A_URL = os.environ.get("CAPTAIN_A2A_URL", f"http://localhost:8001{AGENT_CARD_WELL_KNOWN_PATH}")

    team_captain_remote = RemoteA2aAgent(
        name="team_captain",
        description="The team captain, reachable over the A2A protocol.",
        agent_card=CAPTAIN_A2A_URL,
    )
    ```

#### Task 3b: Update Coach Prompt to Relay to the Captain
*   **File to edit**: `LAB02/football_agents/agent.py`
*   **ToDo to look for**: Locate the comment `# TODO: Task 3b - Update prompt to relay to the Captain (for Task 3)`.
*   **Code to fill in**:
    Update the Coach Agent instructions and add the Captain to the `sub_agents` list:
    ```python
    coach_agent = LlmAgent(
        name="ManagerAgent",
        model=GeminiConstants.GEMINI_FLASH_LITE,
        description="The head coach: handles baseline backups/resets and shouts.",
        instruction="""You are the Head Coach of the football team.
        When you receive a tactical shout from the user, you MUST immediately transfer control
        to your `team_captain` sub-agent. Do NOT attempt to answer the shout yourself!""",
        tools=[backup_baseline_profiles, restore_baseline_profiles],
        sub_agents=[team_captain_remote]
    )
    ```
*   **What this code does**: Connects the Coach and Captain over the A2A network layer. The prompt tells the Coach to act as a pure relay, immediately routing strategy commands to the Captain.

---

## Step 8: Define Player Specialists & Attribute Mapping
In this step, we will define specialist player agents and equip them with the `update_profile` tool.

#### Task 4a: Define the Specialist Agents
*   **Files to edit**:
    *   `LAB02/football_agents/specialist_agents/defender.py`
    *   `LAB02/football_agents/specialist_agents/midfielder.py`
    *   `LAB02/football_agents/specialist_agents/forward.py`
    *   `LAB02/football_agents/specialist_agents/goalkeeper.py`
*   **ToDo to look for**: Locate the comment `# TODO: Task 4a - Define the Defender Agent` (in defender.py, midfielder.py, forward.py, and goalkeeper.py).
*   **Code to fill in**:
    Here is the template for `defender.py`:
    ```python
    defender_agent = LlmAgent(
        name="DefenderSpecialist",
        model=GeminiConstants.GEMINI_FLASH_LITE,
        description="Handles tactical instructions and attribute updates for the DEFENDER role.",
        instruction="""You are a gritty Defender. When the captain relays an instruction,
        if it is general or defender-related, use the `update_profile` tool to adjust:
        - defensePositioning (0.0-1.0; set to 0.9 if defending)
        - aggression (0.0-1.0)
        - speed (0.0-1.0)
        Output a quirky 3-5 word player affirmative reaction.""",
        tools=[update_profile],
        output_key="defender_response"
    )
    ```
    *(Implement similar definitions in `midfielder.py`, `forward.py`, and `goalkeeper.py` using their specific role attributes noted in the files).*
*   **What this code does**: Creates LlmAgent instances for all 4 player roles. The player instructions teach Gemini how to parse qualitative strategies and map them to physical game parameters using the `update_profile` tool.

---

## Step 9: Connect Specialists to the Captain Agent
Here, you will import the specialists and register them as tools under the Captain agent.

#### Task 4b: Register Specialist Agents and Orchestrate Captain
*   **File to edit**: `LAB02/football_agents/captain.py`
*   **ToDo to look for**: Locate the comments `# TODO: Task 4a - Import the Specialist Task Agents` and `# TODO: Task 4b - Equip Specialists & Write Orchestration Prompt`.
*   **Code to fill in**:
    ```python
    # Task 4a
    from google.adk.tools import AgentTool
    from football_agents.specialist_agents.defender import defender_agent
    from football_agents.specialist_agents.midfielder import midfielder_agent
    from football_agents.specialist_agents.forward import forward_agent
    from football_agents.specialist_agents.goalkeeper import goalkeeper_agent

    # Task 4b
    captain_agent = LlmAgent(
        name="TeamCaptain",
        model=GeminiConstants.GEMINI_FLASH_LITE,
        instruction="""Relay coach shouts to the relevant players by calling their tools.
        Gather their verbal responses and output ONLY a valid JSON:
        { "status": "...", "huddle": { "defender": "...", "midfielder": "...", ... } }""",
        tools=[
            AgentTool(defender_agent),
            AgentTool(midfielder_agent),
            AgentTool(forward_agent),
            AgentTool(goalkeeper_agent)
        ]
    )
    ```
*   **What this code does**: Registers the specialist players as tools (`AgentTool`) under the Captain's namespace. The system prompt instructs Gemini to delegate shouts to specialists and compile their responses into a strict JSON payload.

---

## Step 10: Autonomous Condition Reporting (FastMCP Integration) (Optional)
This bonus step connects the player agents to an external Model Context Protocol (MCP) server so they can autonomously report injury and fatigue. **This step is optional and can be skipped if you want to focus purely on core agent orchestration.**

#### Task 5a: Import MCP Utilities (Optional)
*   **Files to edit**: `LAB02/football_agents/specialist_agents/defender.py` (and Midfielder/Forward/Goalkeeper).
*   **ToDo to look for**: Locate the comment `# TODO: Task 5a - Import MCP Utilities`.
*   **Code to fill in**:
    ```python
    from .tools import make_condition_toolset, CONDITION_GUIDANCE
    ```

#### Task 5b: Equip MCP Toolset & Prompt Guidance (Optional)
*   **Files to edit**: `LAB02/football_agents/specialist_agents/defender.py` (and Midfielder/Forward/Goalkeeper).
*   **ToDo to look for**: Locate the comment `# TODO: Task 5b - Equip MCP Toolset & Prompt Guidance`.
*   **Code to fill in**:
    ```python
    defender_agent = LlmAgent(
        name="DefenderSpecialist",
        model=GeminiConstants.GEMINI_FLASH_LITE,
        instruction="""Your prompt instructions...""" + CONDITION_GUIDANCE,
        tools=[update_profile, make_condition_toolset()],
        output_key="defender_response"
    )
    ```
*   **What this code does**: Appends the MCP reporting guidelines to your player's instructions and equips the agent's toolbelt with `make_condition_toolset()`. This establishes a stdio-based JSON-RPC connection to the FastMCP server when running checkups.
#### Task 5c: Enable the Real MCP Server (Optional)
*   **File to edit**: `LAB02/football_agents/specialist_agents/tools.py`
*   **Code to change**:
    Locate the `USE_REAL_MCP_SERVER` flag and toggle it to `True` to instruct the toolset builder to spawn the real stdio-based FastMCP server subprocess:
    ```python
    USE_REAL_MCP_SERVER = True
    ```
*   **What this code does**: Activates the real Model Context Protocol (MCP) server so player agents can interact with the background FastMCP subprocess via JSON-RPC, enabling real-time injury and substitution reporting.

---


## Step 11: Launch and Test the Simulation

To launch the multi-agent simulation workspace:

1.  Navigate to the `LAB02` directory:
    ```bash
    cd LAB02
    ```
2.  Start the consolidated startup script:
    ```bash
    bash run_lab02.sh
    ```
    *(This script automatically cleans up local SQLite DB locks, swaps your task file templates, and spawns the Frontend Vite dev server on `http://localhost:5173`, the Captain Server on `8001`, and the Coach Server on `8000`).*
3.  Open `http://localhost:5173` in your browser.
4.  Click **Kick Off!** to start the match!
5.  Type screams in the shout bar (e.g., "everyone attack", "play defensive") and observe the huddle bubble reactions and attributes shifting in real-time.

---

### 🧩 LAB02 Checkpoint Questions

<ql-multiple-choice-probe stem="In Task 2c, which ADK utility is used to convert the Captain LlmAgent into an HTTP-based A2A server application?"
                          optionTitles='[
                            "to_a2a(captain_agent, host, port)",
                            "serve_agent(captain_agent, port)",
                            "A2aAgentExecutor(runner=captain_agent)",
                            "Uvicorn.run(captain_agent)"
                          ]'
                          answerIndex="0"
                          shuffle>
</ql-multiple-choice-probe>

<ql-multiple-choice-probe stem="In Task 4b, how must you register the specialized player agents (like defender_agent) inside the Captain’s tools list?"
                          optionTitles='[
                            "By wrapping each agent inside the AgentTool(agent) constructor",
                            "By adding the raw agent object directly to the tools list",
                            "By defining them inside the sub_agents parameter of LlmAgent",
                            "By registering them as local python functions"
                          ]'
                          answerIndex="0"
                          shuffle>
</ql-multiple-choice-probe>

<ql-multiple-choice-probe stem="When integrating the optional Model Context Protocol (MCP) in Task 5b, what is the role of the make_condition_toolset() helper?"
                          optionTitles='[
                            "It establishes a local stdio-based JSON-RPC connection to the background FastMCP server to provide health/injury tools",
                            "It converts player attributes to JSON and writes them directly to the static folder",
                            "It communicates with the Captain Agent over port 8001 using HTTP A2A",
                            "It restarts the Vite development server whenever a player is substituted"
                          ]'
                          answerIndex="0"
                          shuffle>
</ql-multiple-choice-probe>

---

Congratulations! You have completed the Multi-Agent Football Worldcup Mania lab.
