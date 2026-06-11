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

# Hint : 
# from football_agents.specialist_agents.defender import defender_agent



# TODO: Task 2a - Define the Captain Agent
captain_agent = None  


# TODO: Task 5b 
# 1. Add the four specialist player agents to the `tools` list wrapped in `AgentTool(<special_player_agent>)`. i.e one tool per player
# 2. Also rewrite the captain_agent instructions to have 2 step agenda : 
#    - Delegate shouts to relevant players using their tools (e.g. "everyone attack" applies to all).
#    - Gather their responses and output a valid JSON object matching the huddle schema:
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

