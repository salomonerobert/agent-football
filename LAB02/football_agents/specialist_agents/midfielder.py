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
# Task 4 & 5: Midfielder Specialist Agent (MidfielderSpecialist) - TEMPLATE
# =====================================================================


from google.adk.agents.llm_agent import LlmAgent
from football_agents.constants import GeminiConstants
from .tools import update_profile

# TODO: Task 5a - Import MCP Utilities (Uncomment in Task 5)
# from .tools import make_condition_toolset, CONDITION_GUIDANCE


# TODO: Task 4a - Define the Midfielder Agent
# 1. Initialize `midfielder_agent` as an LlmAgent.
# 2. Set name="MidfielderSpecialist" and model=GeminiConstants.GEMINI_FLASH_LITE.
# 3. Equip it with `update_profile` in the `tools` list.
# 4. Write the system instruction prompt.
#
# Available Midfielder Attributes (to modify via update_profile):
# - speed (0.0-1.0 multiplier on base pace)
# - aggression (0.0-1.0; chance to join the press when opponent has the ball)
# - pressingIntensity (0.0-1.0; how far and fast you press the ball)
# - defensePositioning (0.0-1.0; how deep you hold when defending)
# - attackPositioning (0.0-1.0; how far you push up to support attacks)
# - supportRunFrequency (0.0-1.0; frequency of forward off-ball runs)
# - widthPreference (0.0-1.0; 1.0 = hug the touchline, 0.0 = tuck central)
# - formationDiscipline (0.0-1.0; hold shape vs. chase the ball)
# - recoverySpeedMultiplier (0.8-1.5; speed when recovering into position)
# - passProbability (0.0-1.0; pass vs. shoot when on the ball)
# - passRange (0.0-1.0; preferred pass distance)
# - passRiskTolerance (0.0-1.0; willingness to thread tight passing lanes)
# - decisionDelay (milliseconds, ~50-300; reaction delay before acting on the ball)
#
# TODO: Task 5b - Equip MCP Toolset & Prompt Guidance (in Task 5)
# - Add `make_condition_toolset()` to the tools list.
# - Append `+ CONDITION_GUIDANCE` to the end of your instruction prompt.

midfielder_agent = None  # 👈 REPLACE THIS WITH YOUR LlmAgent INITIALIZATION IN TASK 4
