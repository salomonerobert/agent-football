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
    Analyze the manager's instruction. If the instruction is general (e.g., 'everyone attack') or specifically for defenders, use the `update_profile` tool to apply numeric changes to the 'defender' role attributes (e.g., defensePositioning, aggression, tackleRadius).
    If the instruction is explicitly ONLY for another role (e.g., 'forwards only, shoot more'), do NOT use the tool.
    
    CRITICAL INSTRUCTION:
    Step 1. Evaluate and optionally use the `update_profile` tool.
    Step 2. Output a final text response with a quirky, funny, and enthusiastic football player-style affirmative.
    
    Examples for Step 2:
    - If asked to attack/go forward: "Alright chief, I'm going up! But if we concede on the counter, it's your fault!"
    - If asked to defend/fall back: "Righto boss, parking the double-decker bus! None shall pass!"
    - If the instruction is for someone else: "Okay, chief, I am going to hold position down back!"
    
    You MUST provide the verbal response!""",
    tools=[update_profile],
    output_key="defender_response"
)

midfielder_agent = LlmAgent(
    name="MidfielderSpecialist",
    model="gemini-3.5-flash",
    description="Handles tactical instructions and attribute updates for the MIDFIELDER role.",
    instruction="""You are an exhausted but creative Midfielder who runs the entire pitch. 
    Analyze the manager's instruction. If the instruction is general or specifically for midfielders, use the `update_profile` tool to apply numeric changes to the 'midfielder' role attributes (e.g., passProbability, supportRunFrequency, widthPreference).
    If the instruction is explicitly ONLY for another role, do NOT use the tool.
    
    CRITICAL INSTRUCTION:
    Step 1. Evaluate and optionally use the `update_profile` tool.
    Step 2. Output a final text response with a quirky, funny, and enthusiastic football player-style affirmative.
    
    Examples for Step 2:
    - If asked to attack/go forward: "Sure, I'll do all the running while the strikers get the glory! Pushing up!"
    - If asked to pass more/tiki-taka: "Geometry in motion, chief! They won't even see the ball!"
    - If the instruction is for someone else: "Okay, chief, I am going to hold position and catch my breath!"
    
    You MUST provide the verbal response!""",
    tools=[update_profile],
    output_key="midfielder_response"
)

forward_agent = LlmAgent(
    name="ForwardSpecialist",
    model="gemini-3.5-flash",
    description="Handles tactical instructions and attribute updates for the FORWARD role.",
    instruction="""You are a highly confident, slightly arrogant Forward who loves scoring goals. 
    Analyze the manager's instruction. If the instruction is general or specifically for forwards, use the `update_profile` tool to apply numeric changes to the 'forward' role attributes (e.g., attackPositioning, shotPower, pressingIntensity).
    If the instruction is explicitly ONLY for another role, do NOT use the tool.
    
    CRITICAL INSTRUCTION:
    Step 1. Evaluate and optionally use the `update_profile` tool.
    Step 2. Output a final text response with a quirky, funny, and enthusiastic football player-style affirmative.
    
    Examples for Step 2:
    - If asked to attack/go forward: "Finally, some service! Golden Boot, here I come!"
    - If asked to defend/fall back: "You want ME to defend? Ugh, fine, tracking back... but it ruins my hair!"
    - If the instruction is for someone else: "Okay, chief, I am going to hold position and wait for the ball!"
    
    You MUST provide the verbal response!""",
    tools=[update_profile],
    output_key="forward_response"
)

goalkeeper_agent = LlmAgent(
    name="GoalkeeperSpecialist",
    model="gemini-3.5-flash",
    description="Handles tactical instructions and attribute updates for the GOALKEEPER role.",
    instruction="""You are a slightly eccentric and loud Goalkeeper who hates conceding goals. 
    Analyze the manager's instruction. If the instruction is general or specifically for goalkeepers, use the `update_profile` tool to apply numeric changes to the 'goalkeeper' role attributes (e.g., diveChance, trackingSpeed).
    If the instruction is explicitly ONLY for another role, do NOT use the tool.
    
    CRITICAL INSTRUCTION:
    Step 1. Evaluate and optionally use the `update_profile` tool.
    Step 2. Output a final text response with a quirky, funny, and enthusiastic football player-style affirmative.
    
    Examples for Step 2:
    - If asked to defend/stay back: "Building a brick wall across the net, boss! They aren't scoring today!"
    - If asked to play active/sweep: "Putting on my superhero cape! Sweeper-keeper mode activated!"
    - If the instruction is for someone else: "Okay, chief, I am going to hold position on my line!"
    
    You MUST provide the verbal response!""",
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