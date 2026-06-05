import json
import os
import sys

from google.adk.agents.llm_agent import LlmAgent
from google.adk.agents.remote_a2a_agent import (
    RemoteA2aAgent,
    AGENT_CARD_WELL_KNOWN_PATH,
)
from google.adk.tools import AgentTool
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams
from mcp import StdioServerParameters
from dotenv import load_dotenv
from .constants import GeminiConstants

load_dotenv()
# Define the base directory for the player state profiles.
# Assuming this script is running from the 'agents' directory as shown in the tree.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PLAYER_STATE_DIR = os.path.join(BASE_DIR, '../frontend/public/player_state')
MCP_SERVER_PATH = os.path.join(BASE_DIR, 'football_mcp_server.py')

# The captain runs as a standalone A2A service (see captain_server.py). The coach
# agent (root) reaches it over A2A. Override the host/port via CAPTAIN_A2A_URL.
CAPTAIN_A2A_URL = os.environ.get(
    "CAPTAIN_A2A_URL", f"http://localhost:8001{AGENT_CARD_WELL_KNOWN_PATH}"
)

def initialize_profiles():
    """Bootstraps the individual JSON files if they don't exist."""
    os.makedirs(PLAYER_STATE_DIR, exist_ok=True)

    default_profiles = {
        "defender": {"speed": 210, "defensePositioning": 0.8, "attackPositioning": 0.3, "aggression": 0.6, "passProbability": 0.75, "widthPreference": 0.3, "pressingIntensity": 0.3},
        "midfielder": {"speed": 235, "defensePositioning": 0.5, "attackPositioning": 0.6, "aggression": 0.75, "passProbability": 0.85, "widthPreference": 0.5, "pressingIntensity": 0.6},
        "forward": {"speed": 260, "defensePositioning": 0.2, "attackPositioning": 0.9, "aggression": 0.9, "passProbability": 0.3, "widthPreference": 0.8, "pressingIntensity": 0.8},
        "goalkeeper": {"speed": 180, "defensePositioning": 1.0, "attackPositioning": 0.0, "aggression": 0.1, "passProbability": 0.9, "diveChance": 0.08, "trackingSpeed": 0.05}
    }

    for role, data in default_profiles.items():
        file_path = os.path.join(PLAYER_STATE_DIR, f"{role}.json")
        if not os.path.exists(file_path):
            print(f"Creating default {file_path}...")
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)

# Ensure the profiles exist as soon as the ADK server mounts the agent
initialize_profiles()

def update_profile(role: str, changes: dict) -> str:
    """
    Tool for agents to update the JSON profile for a specific role.

    Args:
        role: The player role ('defender', 'midfielder', 'forward', 'goalkeeper').
        changes: A dictionary of attributes to update (e.g. {"attackPositioning": 0.9, "aggression": 0.8}).
    """
    file_path = os.path.join(PLAYER_STATE_DIR, f"{role}.json")
    try:
        if not os.path.exists(file_path):
            return f"Error: Profile file for role '{role}' not found."

        with open(file_path, 'r') as f:
            profile = json.load(f)

        profile.update(changes)

        with open(file_path, 'w') as f:
            json.dump(profile, f, indent=2)

        print(f"--> [SYSTEM] Updated {role.upper()} profile with: {changes}")
        return f"Success: {role} tactics updated."

    except Exception as e:
        return f"File error: {str(e)}"


def make_condition_toolset() -> McpToolset:
    """Build an MCP toolset (stdio) exposing the injury/substitution tools.

    A fresh toolset per player keeps each agent's MCP session isolated. The
    server is spawned on demand with the same Python interpreter running ADK.
    """
    return McpToolset(
        connection_params=StdioConnectionParams(
            server_params=StdioServerParameters(
                command=sys.executable,
                args=[MCP_SERVER_PATH],
            ),
        ),
        tool_filter=["report_injury", "request_substitution"],
    )


# Shared guidance appended to every outfield player about self-reporting condition.
CONDITION_GUIDANCE = """

    CONDITION SELF-CHECK:
    The captain may relay a fitness/tiredness note about you. If it says you are
    badly tired/exhausted, call the `request_substitution` MCP tool with your role
    and reason 'tired'. If it says you are injured/hurt, call the `report_injury`
    MCP tool with your role and a short severity. Only call these when clearly
    warranted -- a small knock or mild tiredness does NOT need a tool call.
"""

# ==========================================
# 1. SPECIALIST SUB-AGENTS (invoked by the Captain via AgentTool)
# ==========================================

defender_agent = LlmAgent(
    name="DefenderSpecialist",
    model=GeminiConstants.GEMINI_FLASH_LITE,
    description="Handles tactical instructions and attribute updates for the DEFENDER role.",
    instruction="""You are a gritty, no-nonsense Defender on the football pitch.
    The team captain is relaying an instruction to you. If the instruction is general (e.g., 'everyone attack', 'play aggressively') or specifically for defenders, use the `update_profile` tool to update the 'defender' role attributes.
    If the instruction is explicitly ONLY for another role (e.g., 'forwards only, shoot more'), do NOT use the tool.

    IMPORTANT: You must affect ALL attributes that logically align with the command, rather than just modifying one or two.
    Here are the ONLY attributes that affect gameplay. Write values in the ranges noted; do NOT invent other keys.
    - speed (0.0-1.0 multiplier on base pace)
    - aggression (0.0-1.0; chance to join the press when the opponent has the ball)
    - pressingIntensity (0.0-1.0; how far and fast you press the ball)
    - defensePositioning (0.0-1.0; how deep you hold when defending)
    - attackPositioning (0.0-1.0; how far you push up to support attacks)
    - supportRunFrequency (0.0-1.0; frequency of forward off-ball runs)
    - widthPreference (0.0-1.0; 1.0 = hug the touchline, 0.0 = tuck central)
    - formationDiscipline (0.0-1.0; hold shape vs. chase the ball)
    - recoverySpeedMultiplier (0.8-1.5; speed when recovering into position)
    - counterAttackUrgency (0.0-1.0; extra speed when carrying/on the counter)
    - dribbleTendency (0.0-1.0; dribble vs. pass/shoot)
    - passProbability (0.0-1.0; pass vs. shoot when on the ball)
    - passRange (0.0-1.0; preferred pass distance)
    - passRiskTolerance (0.0-1.0; willingness to thread tight passing lanes)
    - shotRange (0.0-1.0; distance from goal you will shoot from)
    - shotPower (0.0-1.0; power of shots)
    - tackleRadius (0.0-1.0; distance at which you lunge into a tackle)
    - tackleCooldown (milliseconds, ~400-1500; delay between tackle attempts)
    - interceptionRadius (0.0-1.0; reach for blocking/intercepting passes)
    - foulProbability (0.0-1.0; chance of fouling during a tackle)
    - decisionDelay (milliseconds, ~50-300; reaction delay before acting on the ball)

    CRITICAL INSTRUCTION:
    Step 1. Evaluate and use `update_profile` to apply changes to ALL matching attributes.
    Step 2. Output a final text response that is STRICTLY 3-5 words long. It must be a quirky, football player-style affirmative.

    Examples for Step 2:
    - If asked to attack/go forward: "Going up, boss!"
    - If asked to defend/fall back: "Parking the bus!"
    - If the instruction is for someone else: "Holding the line!"

    You MUST provide the verbal response and it MUST be 3-5 words!""" + CONDITION_GUIDANCE,
    tools=[update_profile, make_condition_toolset()],
    output_key="defender_response"
)

midfielder_agent = LlmAgent(
    name="MidfielderSpecialist",
    model=GeminiConstants.GEMINI_FLASH_LITE,
    description="Handles tactical instructions and attribute updates for the MIDFIELDER role.",
    instruction="""You are an exhausted but creative Midfielder who runs the entire pitch.
    The team captain is relaying an instruction to you. If the instruction is general or specifically for midfielders, use the `update_profile` tool to update the 'midfielder' role attributes.
    If the instruction is explicitly ONLY for another role, do NOT use the tool.

    IMPORTANT: You must affect ALL attributes that logically align with the command, rather than just modifying one or two.
    Here are the ONLY attributes that affect gameplay. Write values in the ranges noted; do NOT invent other keys.
    - speed (0.0-1.0 multiplier on base pace)
    - aggression (0.0-1.0; chance to join the press when the opponent has the ball)
    - pressingIntensity (0.0-1.0; how far and fast you press the ball)
    - defensePositioning (0.0-1.0; how deep you hold when defending)
    - attackPositioning (0.0-1.0; how far you push up to support attacks)
    - supportRunFrequency (0.0-1.0; frequency of forward off-ball runs)
    - widthPreference (0.0-1.0; 1.0 = hug the touchline, 0.0 = tuck central)
    - formationDiscipline (0.0-1.0; hold shape vs. chase the ball)
    - recoverySpeedMultiplier (0.8-1.5; speed when recovering into position)
    - counterAttackUrgency (0.0-1.0; extra speed when carrying/on the counter)
    - dribbleTendency (0.0-1.0; dribble vs. pass/shoot)
    - passProbability (0.0-1.0; pass vs. shoot when on the ball)
    - passRange (0.0-1.0; preferred pass distance)
    - passRiskTolerance (0.0-1.0; willingness to thread tight passing lanes)
    - shotRange (0.0-1.0; distance from goal you will shoot from)
    - shotPower (0.0-1.0; power of shots)
    - tackleRadius (0.0-1.0; distance at which you lunge into a tackle)
    - tackleCooldown (milliseconds, ~400-1500; delay between tackle attempts)
    - interceptionRadius (0.0-1.0; reach for blocking/intercepting passes)
    - foulProbability (0.0-1.0; chance of fouling during a tackle)
    - decisionDelay (milliseconds, ~50-300; reaction delay before acting on the ball)

    CRITICAL INSTRUCTION:
    Step 1. Evaluate and use `update_profile` to apply changes to ALL matching attributes.
    Step 2. Output a final text response that is STRICTLY 3-5 words long. It must be a quirky, football player-style affirmative.

    Examples for Step 2:
    - If asked to attack/go forward: "Pushing up now!"
    - If asked to pass more/tiki-taka: "Passing it around!"
    - If the instruction is for someone else: "Holding my position!"

    You MUST provide the verbal response and it MUST be 3-5 words!""" + CONDITION_GUIDANCE,
    tools=[update_profile, make_condition_toolset()],
    output_key="midfielder_response"
)

forward_agent = LlmAgent(
    name="ForwardSpecialist",
    model=GeminiConstants.GEMINI_FLASH_LITE,
    description="Handles tactical instructions and attribute updates for the FORWARD role.",
    instruction="""You are a highly confident, slightly arrogant Forward who loves scoring goals.
    The team captain is relaying an instruction to you. If the instruction is general or specifically for forwards, use the `update_profile` tool to update the 'forward' role attributes.
    If the instruction is explicitly ONLY for another role, do NOT use the tool.

    IMPORTANT: You must affect ALL attributes that logically align with the command, rather than just modifying one or two.
    Here are the ONLY attributes that affect gameplay. Write values in the ranges noted; do NOT invent other keys.
    - speed (0.0-1.0 multiplier on base pace)
    - aggression (0.0-1.0; chance to join the press when the opponent has the ball)
    - pressingIntensity (0.0-1.0; how far and fast you press the ball)
    - defensePositioning (0.0-1.0; how deep you hold when defending)
    - attackPositioning (0.0-1.0; how far you push up to support attacks)
    - supportRunFrequency (0.0-1.0; frequency of forward off-ball runs)
    - widthPreference (0.0-1.0; 1.0 = hug the touchline, 0.0 = tuck central)
    - formationDiscipline (0.0-1.0; hold shape vs. chase the ball)
    - recoverySpeedMultiplier (0.8-1.5; speed when recovering into position)
    - counterAttackUrgency (0.0-1.0; extra speed when carrying/on the counter)
    - dribbleTendency (0.0-1.0; dribble vs. pass/shoot)
    - passProbability (0.0-1.0; pass vs. shoot when on the ball)
    - passRange (0.0-1.0; preferred pass distance)
    - passRiskTolerance (0.0-1.0; willingness to thread tight passing lanes)
    - shotRange (0.0-1.0; distance from goal you will shoot from)
    - shotPower (0.0-1.0; power of shots)
    - tackleRadius (0.0-1.0; distance at which you lunge into a tackle)
    - tackleCooldown (milliseconds, ~400-1500; delay between tackle attempts)
    - interceptionRadius (0.0-1.0; reach for blocking/intercepting passes)
    - foulProbability (0.0-1.0; chance of fouling during a tackle)
    - decisionDelay (milliseconds, ~50-300; reaction delay before acting on the ball)

    CRITICAL INSTRUCTION:
    Step 1. Evaluate and use `update_profile` to apply changes to ALL matching attributes.
    Step 2. Output a final text response that is STRICTLY 3-5 words long. It must be a quirky, football player-style affirmative.

    Examples for Step 2:
    - If asked to attack/go forward: "Going for goal!"
    - If asked to defend/fall back: "Tracking back, fine."
    - If the instruction is for someone else: "Waiting for the ball."

    You MUST provide the verbal response and it MUST be 3-5 words!""" + CONDITION_GUIDANCE,
    tools=[update_profile, make_condition_toolset()],
    output_key="forward_response"
)

goalkeeper_agent = LlmAgent(
    name="GoalkeeperSpecialist",
    model=GeminiConstants.GEMINI_FLASH_LITE,
    description="Handles tactical instructions and attribute updates for the GOALKEEPER role.",
    instruction="""You are a slightly eccentric and loud Goalkeeper who hates conceding goals.
    The team captain is relaying an instruction to you. If the instruction is general or specifically for goalkeepers, use the `update_profile` tool to update the 'goalkeeper' role attributes.
    If the instruction is explicitly ONLY for another role, do NOT use the tool.

    IMPORTANT: You must affect ALL attributes that logically align with the command, rather than just modifying one or two.
    Here are the ONLY attributes that affect gameplay. Write values in the ranges noted; do NOT invent other keys.
    - speed (0.0-1.0 multiplier on base pace)
    - attackPositioning (0.0-1.0; sweeper tendency — how far you rush off your line to clear long balls; 0.0 = glued to the line)
    - trackingSpeed (0.0-1.0; how quickly you slide across to track the ball, e.g. 0.05 sluggish, 0.2 sharp)
    - diveChance (0.0-1.0; tendency to dive at shots)

    CRITICAL INSTRUCTION:
    Step 1. Evaluate and use `update_profile` to apply changes to ALL matching attributes.
    Step 2. Output a final text response that is STRICTLY 3-5 words long. It must be a quirky, football player-style affirmative.

    Examples for Step 2:
    - If asked to defend/stay back: "Building a brick wall!"
    - If asked to play active/sweep: "Sweeper keeper activated!"
    - If the instruction is for someone else: "Staying on my line!"

    You MUST provide the verbal response and it MUST be 3-5 words!""" + CONDITION_GUIDANCE,
    tools=[update_profile, make_condition_toolset()],
    output_key="goalkeeper_response"
)

# ==========================================
# 2. TEAM CAPTAIN (delegates to players via AgentTool)
# ==========================================

# The captain receives the coach's directive (relayed over A2A) and decides which
# players it applies to, instructing each via its AgentTool. It then synthesises
# the final huddle JSON the frontend renders.
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

# ==========================================
# 3. COACH (root) — reaches the captain over A2A
# ==========================================

# Consume the captain as a remote A2A agent (served by captain_server.py on :8001).
team_captain_remote = RemoteA2aAgent(
    name="team_captain",
    description="The team captain, reachable over the A2A protocol.",
    agent_card=CAPTAIN_A2A_URL,
)

# The coach is the entrypoint the frontend talks to via `adk web` (/run_sse).
# It does nothing but relay the coach's shout to the captain over A2A and return
# the captain's huddle JSON verbatim.
coach_agent = LlmAgent(
    name="ManagerAgent",
    model=GeminiConstants.GEMINI_FLASH_LITE,
    description="The head coach's relay: forwards instructions to the team captain over A2A.",
    instruction="""You are the head coach's relay on the touchline. For EVERY message you receive,
    immediately transfer control to the `team_captain` sub-agent so the captain can relay the tactics
    to the players. Do NOT answer the instruction yourself and do NOT invent a response. The captain's
    JSON huddle response is the final answer — return it unchanged.""",
    sub_agents=[team_captain_remote],
)

# `adk web` discovers `root_agent`. Keep it as the coach so the frontend's
# appName ("football_agents") and /run_sse flow are unchanged.
root_agent = coach_agent
