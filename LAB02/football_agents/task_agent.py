# =====================================================================
# Head Coach Agent (ManagerAgent) - TEMPLATE
# =====================================================================

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from google.adk.agents.llm_agent import LlmAgent
from football_agents.constants import GeminiConstants
from football_agents.specialist_agents.tools import backup_baseline_profiles, restore_baseline_profiles


# TODO: Task 3a - Define the Remote Captain Agent (for Task 3)
# (Leave this commented out or set to None during Task 1)
# Hint:
# team_captain_remote = RemoteA2aAgent(
#     name="team_captain",
#     description="The team captain...",
#     agent_card=os.environ.get("CAPTAIN_A2A_URL", f"http://localhost:8001{AGENT_CARD_WELL_KNOWN_PATH}")
# )
team_captain_remote = None


# The coach is the entrypoint the frontend talks to via `adk web` (/run_sse).
coach_agent = LlmAgent(
    name="ManagerAgent",
    model=GeminiConstants.GEMINI_FLASH_LITE,
    description="The head coach: handles baseline backups/resets and shouts.",
    
    # TODO: Task 1 - Write a simple direct response prompt for the Coach
    # Instruct the coach to respond directly to tactical shouts with a funny,
    # encouraging quote (e.g. "Alright lads, let's attack!").
    #
    # TODO: Task 3b - Update prompt to relay to the Captain (for Task 3)
    # Once you reach Task 3, rewrite this prompt to instruct the Coach to
    # IMMEDIATELY transfer control to the `team_captain` sub-agent.
    instruction="""You are the head coach on the touchline. 
    
    CRITICAL SYSTEM INSTRUCTIONS (Do not modify):
    1. If you receive the exact message 'BACKUP_BASELINE', you MUST immediately call the `backup_baseline_profiles` tool and return its response.
    2. If you receive the exact message 'RESTORE_BASELINE', you MUST immediately call the `restore_baseline_profiles` tool and return its response.
    
    TACTICAL SHOUTS (Task 1):
    For any other message (e.g. "everyone attack"), respond directly as a passionate coach with a funny, encouraging 1-sentence shout! Do NOT call any sub-agents yet.""",
    
    tools=[backup_baseline_profiles, restore_baseline_profiles],
    sub_agents=[], # 👈 Task 3: Add [team_captain_remote] here when you reach Task 3!
)

root_agent = coach_agent
