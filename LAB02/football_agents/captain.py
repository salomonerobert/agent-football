# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# =====================================================================
# Team Captain Agent (TeamCaptain) - TEMPLATE
# =====================================================================


from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools import AgentTool
from football_agents.constants import GeminiConstants

# TODO: Task 5a - Import all the Specialist Agents (Defender, Forward, Goalkeeper, Midfielder)
# Uncomment the following import block when you reach Task 5:
# from football_agents.specialist_agents import (
#     defender_agent,
#     midfielder_agent,
#     forward_agent,
#     goalkeeper_agent,
# )


# Prompts set aside as uncommented variables:
CAPTAIN_INITIAL_INSTRUCTION = """You are the team captain. Respond to the Coach's instruction with a simple players style greeting (e.g. 'Captain here, ready to lead!')."""



# TODO: Task 2a - Define the Captain Agent
# When you start Task 2a, initialize captain_agent. Here is a starter definition:
# captain_agent = LlmAgent(
#     name="TeamCaptain",
#     model=GeminiConstants.GEMINI_FLASH_LITE,
#     description="The team captain who relays coach shouts to the outfield players.",
#     instruction=CAPTAIN_INITIAL_INSTRUCTION
# )
captain_agent = None


# TODO: Task 5b - Orchestrate Captain and Specialist Agents
# When you reach Task 5b, comment out or replace the captain_agent defined above with this enhanced orchestrator version:
#
CAPTAIN_ORCHESTRATOR_INSTRUCTION = """You are the on-pitch TEAM CAPTAIN. The head coach has shouted an instruction to you
(and may have attached a short fitness/tiredness report for some players).

Your job is to relay tactics DOWN to your teammates. You have one tool per player:
`DefenderSpecialist`, `MidfielderSpecialist`, `ForwardSpecialist`, `GoalkeeperSpecialist`.

STEP 1 — DELEGATE: Call the tool for EVERY player the instruction is relevant to (a general
instruction like "everyone attack" applies to all four). Pass each player a clear instruction in
their own words. If the coach's message includes a fitness/tiredness/injury note about a specific
player, include that player's note when you call their tool so they can decide whether to ask for
a substitution or report an injury. Players who are clearly NOT addressed do not need a call.

STEP 2 — REPORT BACK: After gathering the players' short verbal responses, output ONLY a valid
JSON object with EXACTLY this structure (no markdown, no extra text):
{
  "status": "Short confirmation that tactics were executed",
  "huddle": {
    "defender": "The defender's exact quote (or a brief stand-in if not addressed)",
    "midfielder": "The midfielder's exact quote",
    "forward": "The forward's exact quote",
    "goalkeeper": "The goalkeeper's exact quote"
  }
}
Every huddle key MUST be present. Use the players' actual returned quotes where you called them."""

# captain_agent = LlmAgent(
#     name="TeamCaptain",
#     model=GeminiConstants.GEMINI_FLASH_LITE,
#     description="Team captain who relays the coach's tactics to the individual players and reports back the huddle.",
#     instruction=CAPTAIN_ORCHESTRATOR_INSTRUCTION,
#     tools=[
#         AgentTool(defender_agent),
#         AgentTool(midfielder_agent),
#         AgentTool(forward_agent),
#         AgentTool(goalkeeper_agent),
#     ],
# )


# =====================================================================
# 🎁 BONUS TASK: Parallel & Sequential Orchestration (Advanced)
# =====================================================================
# Instead of having the Captain call player tools (which relies on LLM routing logic),
# you can use ADK's native `ParallelAgent` and `SequentialAgent` for faster, concurrent execution.
#
# Hint:
# # Uncomment the imports below for the Bonus task:
# # from google.adk.agents.parallel_agent import ParallelAgent
# # from google.adk.agents.sequential_agent import SequentialAgent
#
# # CAPTAIN_SYNTHESIS_INSTRUCTION = """You are the TEAM CAPTAIN on the pitch. Your teammates have executed the tactics and reported back.

# # Your job is to gather their responses from the session state and output ONLY a valid JSON object matching the huddle schema:
# # {
# #   "status": "Short confirmation that tactics were executed",
# #   "huddle": {
# #     "defender": "{defender_response}",
# #     "midfielder": "{midfielder_response}",
# #     "forward": "{forward_response}",
# #     "goalkeeper": "{goalkeeper_response}"
# #   }
# # }
# # Do NOT add any markdown formatting, backticks, or extra text."""
# # 1. Create a ParallelAgent to broadcast the tactics to all specialist agents in parallel:
# # parallel_players = ParallelAgent(
# #     name="ParallelPlayers",
# #     sub_agents=[defender_agent, midfielder_agent, forward_agent, goalkeeper_agent],
# #     description="Runs all specialist player agents in parallel."
# # )
#
# # 2. Modify the Captain LlmAgent to act as a Synthesis/Merger Agent. It no longer needs the player tools!
# #    Its only job is to format the final JSON response using the outputs stored in the state keys:
# #    defender_response, midfielder_response, forward_response, goalkeeper_response.
# #
# #    synthesis_captain = LlmAgent(
# #        name="SynthesisCaptain",
# #        model=GeminiConstants.GEMINI_FLASH_LITE,
# #        instruction=CAPTAIN_SYNTHESIS_INSTRUCTION,
# #    )
#
# # 3. Combine them using a SequentialAgent pipeline to define the final captain_agent:
# # captain_agent = SequentialAgent(
# #     name="TeamCaptainPipeline",
# #     sub_agents=[parallel_players, synthesis_captain],
# #     description="Delegates to players in parallel and synthesizes the final huddle report."
# # )
