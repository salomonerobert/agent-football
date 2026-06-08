# ⚽ LAB01 - Avatar & Team Onboarding Portal

Welcome to **LAB01** of the Multi-Agent Football Workshop! 

In this lab, you will act as the team owner and lead designer. You will build a web-based onboarding portal to customize your team's visual identity and starting tactics. 

You will learn how to use the new **Google GenAI SDK** to generate technical game assets (spritesheets) using Gemini, leverage **Chat Sessions** to maintain strict visual style consistency, and configure your team's default behaviors for the live simulation in **LAB02**.

---

## 🎯 Learning Objectives
*   Initialize and configure the new `google-genai` SDK.
*   Understand **Session-Based Image Generation** (using Chat history to keep styles consistent across multiple image generations).
*   Enforce technical constraints (like aspect ratios and modalities) at the API level.
*   Master **Structured Prompt Engineering** to generate assets compatible with game engines (grid alignment, frame counts, chroma-key backgrounds).

---

## 🛠️ Step-by-Step Walkthrough

### 📋 Task 0: Environment Setup
Before writing any code, you need to configure your Google Cloud credentials so the GenAI SDK can authenticate with Gemini (Vertex AI).

1.  Navigate to the football project root directory: `repo/agent-football/`
2.  Copy the `.env.example` file to a new file named `.env`:
    ```bash
    cp .env.example .env
    ```
3.  Open the newly created `.env` file and replace `your-google-cloud-project-id` with your actual Google Cloud Project ID:
    ```ini
    GOOGLE_CLOUD_PROJECT=my-awesome-football-project
    ```

---

### 🔌 Task 1: Initialize the Gemini Client
Open [`LAB01/app_task.py`](file:///usr/local/google/home/piyasharma/Documents/Sourcecode/code-the-coach/repo/agent-football/LAB01/app_task.py) and locate **`Task 1`** (around line 40).

Your task is to initialize the GenAI client. The client automatically reads the `GOOGLE_CLOUD_PROJECT` variable you set in Task 0 to authenticate.

```python
# TODO: Task 1 - Initialize the Gemini Client
# Use the google-genai SDK to create a Client instance.
client = None  # 👈 REPLACE THIS WITH YOUR INITIALIZATION CODE
```
*💡 Hint: Use the `genai.Client()` constructor.*

---

### 💬 Task 2: Establish a Style-Consistent Chat Session
In this workshop, you need to generate two assets per team: an **Outfield Player** spritesheet and a **Goalkeeper** spritesheet. If you generate them using independent API calls, they will look completely different!

To solve this, we use a **Chat Session**. By generating the player first, and then asking Gemini to generate the goalkeeper *in the same chat thread*, the model uses the history to keep the jersey color, logo, and art style identical.

Locate **`Task 2`** inside `generate_team_stream` (around line 62). Initialize a new asynchronous chat session:

```python
# TODO: Task 2 - Create a style-consistent chat session
# Create a brand new async chat session for this team using client.aio.chats.create.
# Model to use: "publishers/google/models/gemini-3.1-flash-image"
chat = None  # 👈 REPLACE THIS WITH YOUR CHAT CREATION CODE
```
*💡 Hint: Use `client.aio.chats.create(model=...)`.*

---

### 🎨 Task 3a: Generate the Outfield Player Spritesheet
Locate **`Task 3a`** (around line 70). You need to send the `player_prompt` to the active chat session and configure it to return an image.

```python
# TODO: Task 3a - Generate the Outfield Player Spritesheet
# Send the player_prompt to the active chat session (async call).
# Configure it to return an IMAGE modality and set the aspect_ratio to "16:9" in the image_config.
response = None  # 👈 REPLACE THIS WITH YOUR GENERATION CALL
```
*💡 Hint: Use `await chat.send_message(prompt, config=...)`. You must pass `types.GenerateContentConfig` containing `response_modalities=["IMAGE"]` and `image_config=types.ImageConfig(aspect_ratio="16:9")`.*

---

### 🧤 Task 3b: Generate the Goalkeeper (Style Consistent)
Locate **`Task 3b`** (around line 103). You need to send the `gk_prompt` to the **same** chat session. Because of the chat history, the goalkeeper will automatically match your player!

```python
# TODO: Task 3b - Generate the Goalkeeper Spritesheet (Style Consistent)
# Send the gk_prompt to the SAME active chat session (async call).
# Configure it to return an IMAGE modality and set the aspect_ratio to "16:9" in the image_config.
response = None  # 👈 REPLACE THIS WITH YOUR GENERATION CALL
```
*💡 Hint: This call is identical to Task 3a, but you pass `gk_prompt` instead of `player_prompt`!*

---

### 📝 Task 4: Prompt Engineering Sandbox
Once your API calls are working, run the server (see instructions below). You will notice that the default prompts might generate beautiful players, but they won't animate correctly in the game because they don't match the strict grid layout expected by the Phaser engine.

Open [`LAB01/prompts.py`](file:///usr/local/google/home/piyasharma/Documents/Sourcecode/code-the-coach/repo/agent-football/LAB01/prompts.py) and optimize the prompts to meet these strict technical requirements:

1.  **Outfield Player Spritesheet (`get_player_prompt`):**
    *   Must be a **single horizontal row** of exactly **4 frames** (idle, run 1, run 2, kick).
    *   No borders, frames, or text.
    *   A solid, uniform **neon green background** (hex `#00FF00`) for chroma-keying.
2.  **Goalkeeper Spritesheet (`get_goalkeeper_prompt`):**
    *   Must consist of **3 horizontal rows** (Row 1: Standing ready, Row 2: Diving left, Row 3: Diving right).
    *   Row 1 must have 6 frames; Row 2 and 3 must have 5 frames. Total = 16 frames.
    *   A solid, uniform **neon green background** (hex `#00FF00`).
    *   Strict instruction to match the visual style of the player generated in the first message.

---

## 🚀 Running the Lab

1.  Activate the python virtual environment:
    ```bash
    # Cwd: repo/agent-football
    source venv/bin/activate
    ```
2.  Start the FastAPI server using your task file:
    ```bash
    cd LAB01
    uvicorn app_task:app --host 127.0.0.1 --port 8001 --reload
    ```
3.  Open your browser and navigate to `http://127.0.0.1:8001`.
4.  Fill in the team configuration grid and click **"Generate Avatars"**. 
5.  Watch the real-time logs in the parallel terminal boxes. If you get errors, read the logs to debug your API calls!
6.  Once generated, proceed to **Step 2 (Tactical Tuning)**, adjust your team's sliders, click **"Save Player Profiles"**, and click **"Proceed to LAB02"** to see your customized players run on the pitch!
