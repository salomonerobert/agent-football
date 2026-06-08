import os
import json
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Import modular prompts and utilities
from prompts import get_player_prompt, get_goalkeeper_prompt
from utils import (
    get_index_html, 
    extract_image_bytes, 
    process_avatar_image, 
    save_and_encode_image
)

# Load environment variables
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(BASE_DIR, "../.env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

app = FastAPI(title="LAB01 - Avatar Spritesheet Generator")

# Target directory for saving spritesheets directly into LAB02
OUTPUT_DIR = os.path.abspath(os.path.join(BASE_DIR, "../LAB02/frontend/public/assets/sprites"))

class TeamAttributes(BaseModel):
    color: str
    logo: str
    style: str

# Global dictionary to store chat sessions per team to maintain style consistency
# Key: "blue" (My Team) or "red" (Opponent)
chat_sessions = {}

# Initialize the Gemini Client
try:
    client = genai.Client()
except Exception as e:
    print(f"Error initializing GenAI Client: {e}")
    client = None


@app.get("/", response_class=HTMLResponse)
async def get_index():
    return HTMLResponse(content=get_index_html(BASE_DIR))


async def generate_team_stream(team_id: str, team_data: TeamAttributes):
    color = team_data.color
    logo = team_data.logo
    style = team_data.style
    target_size = (1408, 768)
    
    # 1. Generate Player
    yield f"data: {json.dumps({'status': 'log', 'message': f'Initializing player generation for {team_id} team...'})}\n\n"
    await asyncio.sleep(0.1)
    
    # Load modular player prompt
    player_prompt = get_player_prompt(color, logo, style)
    
    # Create chat session to maintain style consistency between player and goalkeeper
    chat = client.aio.chats.create(model="publishers/google/models/gemini-3.1-flash-image")
    chat_sessions[team_id] = chat
    
    yield f"data: {json.dumps({'status': 'log', 'message': 'Sending player prompt to Gemini...'})}\n\n"
    
    try:
        response = await chat.send_message(
            player_prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio="16:9")
            )
        )
    except Exception as e:
        yield f"data: {json.dumps({'status': 'error', 'message': f'Gemini Error: {str(e)}'})}\n\n"
        return

    player_bytes = extract_image_bytes(response)
    if not player_bytes:
        yield f"data: {json.dumps({'status': 'error', 'message': 'Gemini did not return an image for player.'})}\n\n"
        return

    yield f"data: {json.dumps({'status': 'log', 'message': 'Player image received. Post-processing...'})}\n\n"
    
    # Process and Save Player
    player_image = process_avatar_image(player_bytes, target_size)
    player_filename = f"player_{team_id}_team.png"
    player_uri = save_and_encode_image(player_image, player_filename, OUTPUT_DIR)
    
    yield f"data: {json.dumps({'status': 'log', 'message': f'Player avatar saved as {player_filename}'})}\n\n"
    yield f"data: {json.dumps({'status': 'player_done', 'image': player_uri})}\n\n"
    
    # 2. Generate Goalkeeper
    yield f"data: {json.dumps({'status': 'log', 'message': f'Initializing goalkeeper generation for {team_id} team (using active chat session)...'})}\n\n"
    await asyncio.sleep(0.1)
    
    # Load modular goalkeeper prompt
    gk_prompt = get_goalkeeper_prompt(color, logo, style)
    
    yield f"data: {json.dumps({'status': 'log', 'message': 'Sending goalkeeper prompt to Gemini...'})}\n\n"
    
    try:
        response = await chat.send_message(
            gk_prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=types.ImageConfig(aspect_ratio="16:9")
            )
        )
    except Exception as e:
        yield f"data: {json.dumps({'status': 'error', 'message': f'Gemini Error: {str(e)}'})}\n\n"
        return

    gk_bytes = extract_image_bytes(response)
    if not gk_bytes:
        yield f"data: {json.dumps({'status': 'error', 'message': 'Gemini did not return an image for goalkeeper.'})}\n\n"
        return

    yield f"data: {json.dumps({'status': 'log', 'message': 'Goalkeeper image received. Post-processing...'})}\n\n"
    
    # Process and Save Goalkeeper
    gk_image = process_avatar_image(gk_bytes, target_size)
    gk_filename = f"goalkeeper_{team_id}_team.png"
    make_default = (team_id == "blue")
    
    gk_uri = save_and_encode_image(gk_image, gk_filename, OUTPUT_DIR, make_default_gk=make_default)
    
    if make_default:
        yield f"data: {json.dumps({'status': 'log', 'message': f'Copied My Team goalkeeper to default goalkeeper.png'})}\n\n"
            
    yield f"data: {json.dumps({'status': 'log', 'message': f'Goalkeeper avatar saved as {gk_filename}'})}\n\n"
    yield f"data: {json.dumps({'status': 'gk_done', 'image': gk_uri})}\n\n"
    yield f"data: {json.dumps({'status': 'all_done'})}\n\n"


@app.post("/generate/stream/{team_id}")
async def generate_stream(team_id: str, request: TeamAttributes):
    if not client:
        raise HTTPException(status_code=500, detail="GenAI Client not initialized. Check your credentials.")
    if team_id not in ["blue", "red"]:
        raise HTTPException(status_code=400, detail="Invalid team_id. Use 'blue' or 'red'.")
        
    return StreamingResponse(
        generate_team_stream(team_id, request),
        media_type="text/event-stream"
    )


class SaveProfilesRequest(BaseModel):
    defender: dict
    midfielder: dict
    forward: dict
    goalkeeper: dict

@app.post("/save/profiles")
async def save_profiles(request: SaveProfilesRequest):
    try:
        target_dir = os.path.abspath(os.path.join(BASE_DIR, "../LAB02/frontend/public/player_state"))
        os.makedirs(target_dir, exist_ok=True)
        
        profiles = {
            "defender": request.defender,
            "midfielder": request.midfielder,
            "forward": request.forward,
            "goalkeeper": request.goalkeeper
        }
        
        for role, data in profiles.items():
            file_path = os.path.join(target_dir, f"{role}.json")
            
            existing_data = {}
            if os.path.exists(file_path):
                try:
                    with open(file_path, "r") as f:
                        existing_data = json.load(f)
                except Exception:
                    existing_data = {}
            
            if not existing_data:
                fallback_defaults = {
                    "defender": {"speed": 210, "defensePositioning": 0.8, "attackPositioning": 0.3, "aggression": 0.6, "passProbability": 0.75, "widthPreference": 0.3, "pressingIntensity": 0.3, "formationDiscipline": 0.8, "tackleRadius": 0.6},
                    "midfielder": {"speed": 235, "defensePositioning": 0.5, "attackPositioning": 0.6, "aggression": 0.75, "passProbability": 0.85, "widthPreference": 0.5, "pressingIntensity": 0.6, "supportRunFrequency": 0.5},
                    "forward": {"speed": 260, "defensePositioning": 0.2, "attackPositioning": 0.9, "aggression": 0.9, "passProbability": 0.3, "widthPreference": 0.8, "pressingIntensity": 0.8, "shotRange": 0.7, "dribbleTendency": 0.6},
                    "goalkeeper": {"speed": 180, "defensePositioning": 1.0, "attackPositioning": 0.0, "aggression": 0.1, "passProbability": 0.9, "diveChance": 0.08, "trackingSpeed": 0.05}
                }
                existing_data = fallback_defaults.get(role, {})
            
            # Merge new changes
            existing_data.update(data)
            
            with open(file_path, "w") as f:
                json.dump(existing_data, f, indent=2)
                
        print(f"--> [SYSTEM] Saved customized player profiles to {target_dir}")
        return {"status": "success", "message": "Player profiles saved successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save profiles: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
