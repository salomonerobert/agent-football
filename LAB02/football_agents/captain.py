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

from google.adk.agents.llm_agent import LlmAgent
from google.adk.tools import AgentTool
from football_agents.constants import GeminiConstants
from football_agents.specialist_agents import (
    defender_agent,
    midfielder_agent,
    forward_agent,
    goalkeeper_agent,
)

captain_agent = LlmAgent(
    name="TeamCaptain",
    model=GeminiConstants.GEMINI_FLASH_LITE,
    description="Team captain who relays the coach's tactics to the individual players and reports back the huddle.",
    instruction="""You are the on-pitch TEAM CAPTAIN. The head coach has shouted an instruction to you
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
    Every huddle key MUST be present. Use the players' actual returned quotes where you called them.""",
    tools=[
        AgentTool(defender_agent),
        AgentTool(midfielder_agent),
        AgentTool(forward_agent),
        AgentTool(goalkeeper_agent),
    ],
)
