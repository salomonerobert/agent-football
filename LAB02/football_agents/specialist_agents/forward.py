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
# Task 4 & 5: Forward Specialist Agent (ForwardSpecialist) - TEMPLATE
# =====================================================================

from google.adk.agents.llm_agent import LlmAgent
from football_agents.constants import GeminiConstants
from .tools import update_profile

# TODO: Task 5a - Import MCP Utilities (Uncomment in Task 5)
# from .tools import make_condition_toolset, CONDITION_GUIDANCE


# TODO: Task 4a - Define the Forward Agent
# 1. Initialize `forward_agent` as an LlmAgent.
# 2. Set name="ForwardSpecialist" and model=GeminiConstants.GEMINI_FLASH_LITE.
# 3. Equip it with `update_profile` in the `tools` list.
# 4. Write the system instruction prompt.
#
# Available Forward Attributes (to modify via update_profile):
# - speed (0.0-1.0 multiplier on base pace)
# - aggression (0.0-1.0; chance to join the press when opponent has the ball)
# - pressingIntensity (0.0-1.0; how far and fast you press the ball)
# - attackPositioning (0.0-1.0; how far you push up to support attacks)
# - supportRunFrequency (0.0-1.0; frequency of forward off-ball runs)
# - widthPreference (0.0-1.0; 1.0 = hug the touchline, 0.0 = tuck central)
# - recoverySpeedMultiplier (0.8-1.5; speed when recovering into position)
# - counterAttackUrgency (0.0-1.0; extra speed when carrying/on the counter)
# - dribbleTendency (0.0-1.0; dribble vs. pass/shoot)
# - passProbability (0.0-1.0; pass vs. shoot when on the ball)
# - shotRange (0.0-1.0; distance from goal you will shoot from)
# - shotPower (0.0-1.0; power of shots)
# - decisionDelay (milliseconds, ~50-300; reaction delay before acting on the ball)
#

forward_agent = None  # 👈 REPLACE THIS WITH YOUR LlmAgent INITIALIZATION IN TASK 4


# TODO: Task 5b - Equip MCP Toolset & Prompt Guidance (in Task 5)
# - Add `make_condition_toolset()` to the tools list.
# - Append `+ CONDITION_GUIDANCE` to the end of your instruction prompt.

