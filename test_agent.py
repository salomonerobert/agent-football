import requests
import json

def test():
    # 1. Create a session
    url_session = "http://localhost:8000/apps/football_agents/users/user/sessions"
    headers = {"Content-Type": "application/json"}
    session_body = {
        "state": {
            "__session_metadata__": {
                "displayName": "Football Coach Test Session"
            }
        }
    }
    
    print("Creating session...")
    res_session = requests.post(url_session, headers=headers, json=session_body)
    if res_session.status_code != 200:
        print(f"Error creating session: {res_session.status_code} - {res_session.text}")
        return
        
    session_id = res_session.json()["id"]
    print(f"Session created: {session_id}")
    
    # 2. Run agent with instruction
    url_run = "http://localhost:8000/run_sse"
    instruction = "everyone attack"
    run_body = {
        "appName": "football_agents",
        "userId": "user",
        "sessionId": session_id,
        "newMessage": {
            "role": "user",
            "parts": [{"text": instruction}]
        },
        "streaming": False,
        "stateDelta": None
    }
    
    print(f"Sending instruction: '{instruction}'")
    res_run = requests.post(url_run, headers=headers, json=run_body)
    if res_run.status_code != 200:
        print(f"Error running agent: {res_run.status_code} - {res_run.text}")
        return
        
    response_data = res_run.json()
    print("\n--- AGENT RESPONSE ---")
    print(json.dumps(response_data, indent=2))
    
if __name__ == "__main__":
    test()
