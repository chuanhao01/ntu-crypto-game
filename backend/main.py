from typing import Union
import jwt
import datetime
import ollama
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from src.db import create_user, User, get_user_by_username, save_user_game_data, load_user_game_data, create_characters_table, get_all_characters
from src.crypto import hash_password, verify_password



app = FastAPI()

# JWT Secret Key - in production, use environment variable
JWT_SECRET = "your-secret-key-change-this-in-production"
JWT_ALGORITHM = "HS256"

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

def init_model():
    try:
        print(f"Checking model: combiner")
        ollama.show("combiner")
        print(f"✅ Model combiner already exists.")
    except Exception:
        print(f"🚧 Model combiner not found. Creating now...")
        ollama.create(
            model='combiner',
            from_='llama3:8b',
            system="""
SYSTEM: You are a character fusion AI. 
The character must have ONE rarity, chosen ONLY from this set:
["common", "rare", "epic", "legendary"].

USER: Fuse these two characters into one new unique character. 

Character A: {name, rarity, type, stats, abilities} 
Character B: {name, rarity, type, stats, abilities} 

Respond ONLY in JSON:
{
"name": "...",
"rarity": "common | rare | epic | legendary",
"description": "...",
"stats": {
    "base_hp": ...,
    "base_attack": ...,
    "base_defense": ...
},
"abilities": [{"name": "...", "damage": ..., "description": "..."}, {...}]
}
""".strip()
        )
        print(f"✅ Created model combiner.")

init_model()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/")
def read_root():
    return {"Hello": "World"}

class CreateAccount(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class SaveGameData(BaseModel):
    gold: int
    collection: list
    playerTeam: list

class CombineCharacters(BaseModel):
    character1_id: int
    character2_id: int


@app.post("/account")
def create_account(create_account: CreateAccount):
    hashed_password = hash_password(create_account.password)
    user = User(create_account.username, hashed_password)
    try:
        create_user(user)
        print(user)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Username already exists")

@app.post("/login")
def login(login_request: LoginRequest):
    # Get user from database
    user = get_user_by_username(login_request.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Verify password
    if not verify_password(login_request.password, user.hashed_password):
        print("HEY")
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Generate JWT token
    payload = {
        "user_id": user.id,
        "username": user.username,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username
        }
    }

@app.post("/save-game")
def save_game(save_data: SaveGameData, user_data = Depends(verify_token)):
    user_id = user_data["user_id"]
    
    try:
        success = save_user_game_data(user_id, save_data.dict())
        if success:
            return {"status": "ok", "message": "Game saved successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to save game data")
    except Exception as e:
        print(f"Save game error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save game")

@app.get("/load-game")
def load_game(user_data = Depends(verify_token)):
    user_id = user_data["user_id"]
    
    try:
        game_data = load_user_game_data(user_id)
        if game_data:
            return game_data
        else:
            # Return default game state for new users
            return {
                "gold": 100,
                "collection": [],
                "playerTeam": [None, None, None, None, None]
            }
    except Exception as e:
        print(f"Load game error: {e}")
        raise HTTPException(status_code=500, detail="Failed to load game")

# Initialize characters table on startup
@app.on_event("startup")
async def startup_event():
    create_characters_table()

@app.get("/characters")
def get_characters():
    """Get all available characters with their moves from JSON"""
    characters = get_all_characters()
    
    # Convert to format expected by frontend
    character_data = []
    for char in characters:
        character_data.append({
            "id": char["id"],
            "name": char["name"],
            "rarity": char["rarity"],
            "character_type": char["character_type"],
            "sprites": {
                "default": f"{char['sprite_set']}-default",
                "spinning": f"{char['sprite_set']}-spinning", 
                "battleLeft": f"{char['sprite_set']}-battle-left",
                "battleRight": f"{char['sprite_set']}-battle-right"
            },
            "stats": {
                "hp": char["base_hp"],
                "attack": char["base_attack"],
                "defense": char["base_defense"]
            },
            "moves": char["moves"]
        })
    
    return {"characters": character_data}

@app.post("/combine-characters")
def combine_characters(combine_data: CombineCharacters, user_data = Depends(verify_token)):
    """Combine two characters using AI to create a new unique character"""
    try:
        # Get the characters from database
        characters = get_all_characters()
        char1 = next((c for c in characters if c["id"] == combine_data.character1_id), None)
        char2 = next((c for c in characters if c["id"] == combine_data.character2_id), None)
        
        if not char1 or not char2:
            raise HTTPException(status_code=404, detail="One or both characters not found")
        
        # Format characters for the AI prompt
        char1_prompt = f"{{name: '{char1['name']}', rarity: '{char1['rarity']}', type: '{char1['character_type']}', stats: {{hp: {char1['base_hp']}, attack: {char1['base_attack']}, defense: {char1['base_defense']}}}, abilities: {char1['moves']}}}"
        char2_prompt = f"{{name: '{char2['name']}', rarity: '{char2['rarity']}', type: '{char2['character_type']}', stats: {{hp: {char2['base_hp']}, attack: {char2['base_attack']}, defense: {char2['base_defense']}}}, abilities: {char2['moves']}}}"
        
        # Create the fusion prompt
        fusion_prompt = f"""Fuse these two characters into one new unique character.

Character A: {char1_prompt}
Character B: {char2_prompt}

Respond ONLY in JSON format."""
        
        # Call Ollama to generate the fused character
        response = ollama.generate(
            model='combiner',
            prompt=fusion_prompt,
            stream=False
        )
        
        # Parse the AI response
        import json
        try:
            fused_character = json.loads(response['response'])
            
            # Validate the response has required fields
            required_fields = ['name', 'rarity', 'description', 'stats', 'abilities']
            if not all(field in fused_character for field in required_fields):
                raise ValueError("Missing required fields in AI response")
            
            # Ensure rarity is valid
            valid_rarities = ['common', 'rare', 'epic', 'legendary']
            if fused_character['rarity'] not in valid_rarities:
                fused_character['rarity'] = 'rare'  # Default fallback
            
            return {
                "success": True,
                "fused_character": fused_character
            }
            
        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {e}")
            print(f"AI Response: {response['response']}")
            raise HTTPException(status_code=500, detail="AI generated invalid response")
            
    except Exception as e:
        print(f"Combine characters error: {e}")
        raise HTTPException(status_code=500, detail="Failed to combine characters")