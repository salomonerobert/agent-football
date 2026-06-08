# =====================================================================
# Team Captain Agent (TeamCaptain) - TEMPLATE
# =====================================================================


from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools import AgentTool
from football_agents.constants import GeminiConstants

# TODO: Task 4a - Import the Specialist Task Agents (Uncomment in Task 4)
# Note that we import from the `task_` files so you are testing your own work!
# from football_agents.specialist_agents.task_defender import defender_agent
# from football_agents.specialist_agents.task_midfielder import midfielder_agent
# from football_agents.specialist_agents.task_forward import forward_agent
# from football_agents.specialist_agents.task_goalkeeper import goalkeeper_agent


# TODO: Task 2 - Define the Captain Agent
# 1. Initialize `captain_agent` as an LlmAgent.
# 2. Set name="TeamCaptain" and model=GeminiConstants.GEMINI_FLASH_LITE.
# 3. Write a simple starting instruction (e.g. "You are the captain. Respond to shouts with a player-style greeting.").
# 4. Leave `tools` and `sub_agents` empty for Task 2.
#
# TODO: Task 4b - Equip Specialists & Write Orchestration Prompt (in Task 4)
# 1. Add the four specialist task agents to the `tools` list wrapped in `AgentTool(agent)`.
# 2. Rewrite the prompt to:
#    - Delegate shouts to relevant players using their tools (e.g. "everyone attack" applies to all).
#    - Gather their quotes and output ONLY a valid JSON object matching the huddle schema:
#      {
#        "status": "Short status message",
#        "huddle": {
#          "defender": "Defender's quote",
#          "midfielder": "Midfielder's quote",
#          "forward": "Forward's quote",
#          "goalkeeper": "Goalkeeper's quote"
#        }
#      }
#    - Enforce STRICT JSON output (no markdown, no backticks).

captain_agent = None  # 👈 REPLACE THIS WITH YOUR LlmAgent INITIALIZATION IN TASK 2
