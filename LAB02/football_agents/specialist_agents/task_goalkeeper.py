# =====================================================================
# Task 4 & 5: Goalkeeper Specialist Agent (GoalkeeperSpecialist) - TEMPLATE
# =====================================================================

from google.adk.agents.llm_agent import LlmAgent
from football_agents.constants import GeminiConstants
from .tools import update_profile

# TODO: Task 5a - Import MCP Utilities (Uncomment in Task 5)
# from .tools import make_condition_toolset, CONDITION_GUIDANCE


# TODO: Task 4a - Define the Goalkeeper Agent
# 1. Initialize `goalkeeper_agent` as an LlmAgent.
# 2. Set name="GoalkeeperSpecialist" and model=GeminiConstants.GEMINI_FLASH_LITE.
# 3. Equip it with `update_profile` in the `tools` list.
# 4. Write the system instruction prompt.
#
# Available Goalkeeper Attributes (to modify via update_profile):
# - speed (0.0-1.0 multiplier on base pace)
# - attackPositioning (0.0-1.0; sweeper tendency — how far you rush off your line to clear long balls)
# - trackingSpeed (0.0-1.0; how quickly you slide across to track the ball)
# - diveChance (0.0-1.0; tendency to dive at shots)
#
# TODO: Task 5b - Equip MCP Toolset & Prompt Guidance (in Task 5)
# - Add `make_condition_toolset()` to the tools list.
# - Append `+ CONDITION_GUIDANCE` to the end of your instruction prompt.

goalkeeper_agent = None  # 👈 REPLACE THIS WITH YOUR LlmAgent INITIALIZATION IN TASK 4
