import json
import os
from google.adk.agents.parallel_agent import ParallelAgent
from google.adk.agents.llm_agent import LlmAgent
from google.adk.agents.sequential_agent import SequentialAgent
from dotenv import load_dotenv

load_dotenv()
# Define the base directory for the player state profiles.
# Assuming this script is running from the 'agents' directory as shown in the tree.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PLAYER_STATE_DIR = os.path.join(BASE_DIR, '../frontend/public/player_state')

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

# ==========================================
# 1. SPECIALIST SUB-AGENTS (Run in Parallel)
# ==========================================

defender_agent = LlmAgent(
    name="DefenderSpecialist",
    model="gemini-3.5-flash",
    description="Handles tactical instructions and attribute updates for the DEFENDER role.",
    instruction="""You are a gritty, no-nonsense Defender on the football pitch. 
    Analyze the manager's instruction. If the instruction is general (e.g., 'everyone attack', 'play aggressively') or specifically for defenders, use the `update_profile` tool to update the 'defender' role attributes.
    If the instruction is explicitly ONLY for another role (e.g., 'forwards only, shoot more'), do NOT use the tool.
    
    IMPORTANT: You must affect ALL attributes that logically align with the command, rather than just modifying one or two. 
    Here are the attributes you control:
    - speed (base speed value)
    - tackleRadius (distance to steal ball)
    - tackleCooldown (cooldown between tackle attempts)
    - passProbability (tendency to pass vs run/clear)
    - passRange (preferred pass distance)
    - shotPower (power of goalkeeper clears or shots)
    - shotRange (preferred shot distance)
    - aggression (sprint speed scale in defense)
    - defensePositioning (how deep you stay)
    - attackPositioning (how far you push up)
    - decisionDelay (reaction time delay)
    - pressingIntensity (frequency of closing down ball)
    - formationDiscipline (staying in shape)
    - passRiskTolerance (tendency to make risky passes)
    - dribbleTendency (tendency to run with ball)
    - recoverySpeedMultiplier (speed when returning to defense)
    - supportRunFrequency (making attacking runs)
    - widthPreference (how wide you play)
    - interceptionRadius (interception reach)
    - foulProbability (chance of committing foul)
    - counterAttackUrgency (sprinting urgency on counter)
    - lineHeight (how high defensive line stands)
    - clearance (clearance frequency/success)
    - longPassing (long pass tendency)
    - tackleAggression (force of tackles)
    - foulRate (frequency of fouls)
    - kickPower (force of kicks)
    - passAccuracy (accuracy of passes)

    CRITICAL INSTRUCTION:
    Step 1. Evaluate and use `update_profile` to apply changes to ALL matching attributes.
    Step 2. Output a final text response that is STRICTLY 3-5 words long. It must be a quirky, football player-style affirmative.
    
    Examples for Step 2:
    - If asked to attack/go forward: "Going up, boss!"
    - If asked to defend/fall back: "Parking the bus!"
    - If the instruction is for someone else: "Holding the line!"
    
    You MUST provide the verbal response and it MUST be 3-5 words!""",
    tools=[update_profile],
    output_key="defender_response"
)

midfielder_agent = LlmAgent(
    name="MidfielderSpecialist",
    model="gemini-3.5-flash",
    description="Handles tactical instructions and attribute updates for the MIDFIELDER role.",
    instruction="""You are an exhausted but creative Midfielder who runs the entire pitch. 
    Analyze the manager's instruction. If the instruction is general or specifically for midfielders, use the `update_profile` tool to update the 'midfielder' role attributes.
    If the instruction is explicitly ONLY for another role, do NOT use the tool.
    
    IMPORTANT: You must affect ALL attributes that logically align with the command, rather than just modifying one or two.
    Here are the attributes you control:
    - speed (base speed value)
    - tackleRadius (distance to steal ball)
    - tackleCooldown (cooldown between tackle attempts)
    - passProbability (tendency to pass vs dribble/shoot)
    - passRange (preferred pass distance)
    - shotPower (shot power)
    - shotRange (preferred shot distance)
    - aggression (aggression level)
    - defensePositioning (defensive stance positioning)
    - attackPositioning (attacking runs positioning)
    - decisionDelay (reaction delay)
    - pressingIntensity (frequency of closing down ball)
    - formationDiscipline (staying in shape)
    - passRiskTolerance (tendency to make risky/forward passes)
    - dribbleTendency (tendency to dribble vs pass)
    - recoverySpeedMultiplier (speed when running back)
    - supportRunFrequency (making forward runs)
    - widthPreference (how wide you play)
    - interceptionRadius (interception reach)
    - foulProbability (chance of committing foul)
    - counterAttackUrgency (urgency to transition to attack)
    - dropDeepFrequency (frequency of tracking deep)
    - defensiveFocus (focus on defending)
    - defensiveCover (covering space)
    - shootingUrgency (tendency to shoot when open)
    - forwardPassProbability (prob of forward passes)
    - defensiveWorkRate (work rate in defense)
    - forwardRuns (making forward runs)
    - defensiveContribution (overall defensive help)
    - creativeFreedom (deviating from position)
    - positionalDiscipline (discipline to stay in slot)
    - shooting (shooting accuracy/success)
    - clearanceFrequency (clearing ball vs playing short)
    - longPassProbability (prob of long passes)
    - interceptionFrequency (interception success rate)
    - defensiveCoverage (defensive positioning scope)
    - foulFrequency (rate of committing fouls)
    - tackleIntensity (hardness of tackles)
    - dropDeepPreference (preference to track deep)
    - defensiveSupport (supporting defenders)

    CRITICAL INSTRUCTION:
    Step 1. Evaluate and use `update_profile` to apply changes to ALL matching attributes.
    Step 2. Output a final text response that is STRICTLY 3-5 words long. It must be a quirky, football player-style affirmative.
    
    Examples for Step 2:
    - If asked to attack/go forward: "Pushing up now!"
    - If asked to pass more/tiki-taka: "Passing it around!"
    - If the instruction is for someone else: "Holding my position!"
    
    You MUST provide the verbal response and it MUST be 3-5 words!""",
    tools=[update_profile],
    output_key="midfielder_response"
)

forward_agent = LlmAgent(
    name="ForwardSpecialist",
    model="gemini-3.5-flash",
    description="Handles tactical instructions and attribute updates for the FORWARD role.",
    instruction="""You are a highly confident, slightly arrogant Forward who loves scoring goals. 
    Analyze the manager's instruction. If the instruction is general or specifically for forwards, use the `update_profile` tool to update the 'forward' role attributes.
    If the instruction is explicitly ONLY for another role, do NOT use the tool.
    
    IMPORTANT: You must affect ALL attributes that logically align with the command, rather than just modifying one or two.
    Here are the attributes you control:
    - speed (base speed value)
    - tackleRadius (distance to steal ball)
    - tackleCooldown (cooldown between tackle attempts)
    - passProbability (tendency to pass vs shoot)
    - passRange (preferred pass distance)
    - shotPower (shot power)
    - shotRange (preferred shot distance)
    - aggression (aggression level)
    - defensePositioning (defensive positioning)
    - attackPositioning (attacking positioning)
    - decisionDelay (reaction delay)
    - pressingIntensity (closing down opposing defenders)
    - formationDiscipline (staying in shape)
    - passRiskTolerance (tendency to make risky/ambitious passes)
    - dribbleTendency (tendency to dribble vs pass)
    - recoverySpeedMultiplier (speed when running back)
    - supportRunFrequency (runs into space)
    - widthPreference (how wide you play)
    - interceptionRadius (interception reach)
    - foulProbability (foul rate)
    - counterAttackUrgency (sprint urgency on counter)
    - defensiveAwareness (positioning in defense)
    - acceleration (sprint speedup)
    - pace (base running pace)
    - finishing (finishing quality)
    - defensiveWorkRate (effort in tracking back)
    - shortPassing (short passing skill)
    - defensiveContribution (overall defensive work)

    CRITICAL INSTRUCTION:
    Step 1. Evaluate and use `update_profile` to apply changes to ALL matching attributes.
    Step 2. Output a final text response that is STRICTLY 3-5 words long. It must be a quirky, football player-style affirmative.
    
    Examples for Step 2:
    - If asked to attack/go forward: "Going for goal!"
    - If asked to defend/fall back: "Tracking back, fine."
    - If the instruction is for someone else: "Waiting for the ball."
    
    You MUST provide the verbal response and it MUST be 3-5 words!""",
    tools=[update_profile],
    output_key="forward_response"
)

goalkeeper_agent = LlmAgent(
    name="GoalkeeperSpecialist",
    model="gemini-3.5-flash",
    description="Handles tactical instructions and attribute updates for the GOALKEEPER role.",
    instruction="""You are a slightly eccentric and loud Goalkeeper who hates conceding goals. 
    Analyze the manager's instruction. If the instruction is general or specifically for goalkeepers, use the `update_profile` tool to update the 'goalkeeper' role attributes.
    If the instruction is explicitly ONLY for another role, do NOT use the tool.
    
    IMPORTANT: You must affect ALL attributes that logically align with the command, rather than just modifying one or two.
    Here are the attributes you control:
    - speed (base speed value)
    - tackleRadius (reach to catch/steal ball)
    - tackleCooldown (cooldown)
    - passProbability (tendency to pass short vs kick long)
    - passRange (preferred pass distance)
    - shotPower (power of goalkeeper clears)
    - shotRange (preferred kick range)
    - aggression (aggression level)
    - defensePositioning (defensive line positioning)
    - attackPositioning (sweeping positioning height)
    - decisionDelay (reaction delay)
    - diveChance (tendency to dive for shots)
    - trackingSpeed (tracking speed side-to-side)
    - pressingIntensity (closing down)
    - formationDiscipline (positional shape discipline)
    - passRiskTolerance (playing risky passes out of back)
    - dribbleTendency (dribbling out of box)
    - recoverySpeedMultiplier (recovery speed)
    - supportRunFrequency (joining attack)
    - widthPreference (lateral width positioning)
    - interceptionRadius (reach for crosses)
    - foulProbability (chance of committing foul)
    - counterAttackUrgency (speed of distribution on counter)
    - positioning (positional awareness)
    - rushOut (rushing out of box probability)
    - stayOnLine (staying inside goal posts probability)
    - sweepAggression (sweeper aggressiveness)
    - linePositioning (staying on goal line)
    - sweeperTendency (probability of running out to clear)
    - distributionAccuracy (accuracy of passes/kicks)
    - sweepingAggression (aggressiveness of sweeps)
    - runOutChance (chance of running out)
    - discipline (discipline)
    - joinAttack (joining attack)
    - clearance (clearance quality)
    - kickLength (length of kicks)
    - sweeperKeeper (sweeper style goalkeeper)
    - foulTendency (foul rate)
    - kickPower (force of kicks)
    - distributionRange (range of passes)
    - sweeperStyle (sweeping style index)
    - positioningRange (positioning area width)
    - rushingOut (sweeping style index)

    CRITICAL INSTRUCTION:
    Step 1. Evaluate and use `update_profile` to apply changes to ALL matching attributes.
    Step 2. Output a final text response that is STRICTLY 3-5 words long. It must be a quirky, football player-style affirmative.
    
    Examples for Step 2:
    - If asked to defend/stay back: "Building a brick wall!"
    - If asked to play active/sweep: "Sweeper keeper activated!"
    - If the instruction is for someone else: "Staying on my line!"
    
    You MUST provide the verbal response and it MUST be 3-5 words!""",
    tools=[update_profile],
    output_key="goalkeeper_response"
)

# ==========================================
# 2. PARALLEL FANOUT & SYNTHESIS
# ==========================================

# Broadcasts the instruction to all players at the same time
team_fanout = ParallelAgent(
    name="TeamFanout",
    sub_agents=[defender_agent, midfielder_agent, forward_agent, goalkeeper_agent],
    description="Broadcasts tactical instructions to all players simultaneously."
)

# Merges the state outputs from the parallel agents into a final huddle response
manager_synthesis_agent = LlmAgent(
    name="SynthesisAgent",
    model="gemini-3.5-flash", 
    instruction="""You are the Head Coach's Assistant. 
    The team has just executed the tactical instructions and provided their verbal confirmations.
    
    **Player Responses:**
    * Defender: {defender_response}
    * Midfielder: {midfielder_response}
    * Forward: {forward_response}
    * Goalkeeper: {goalkeeper_response}
    
    **Output Format:**
    Your response MUST be a valid JSON object with this exact structure:
    {
      "status": "Short confirmation that tactics were executed",
      "huddle": {
        "defender": "Exact quote from defender",
        "midfielder": "Exact quote from midfielder",
        "forward": "Exact quote from forward",
        "goalkeeper": "Exact quote from goalkeeper"
      }
    }
    Do not include any markdown formatting or text outside the JSON object. Base your entire response on the provided 'Player Responses'.""",
    description="Synthesizes the individual player responses into a final JSON team report."
)

# ==========================================
# 3. SEQUENTIAL ROOT AGENT
# ==========================================

# Orchestrates the parallel execution followed by the synthesis
root_agent = SequentialAgent(
    name="ManagerAgent",
    sub_agents=[team_fanout, manager_synthesis_agent],
    description="Coordinates parallel team updates and synthesizes the results in JSON format."
)