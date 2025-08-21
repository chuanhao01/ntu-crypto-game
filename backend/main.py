from typing import Union
import jwt
import datetime
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
    """Get all available characters"""
    characters = get_all_characters()
    
    # Convert to format expected by frontend
    character_data = []
    for char in characters:
        character_data.append({
            "id": char.id,
            "name": char.name,
            "rarity": char.rarity,
            "character_type": char.character_type,
            "sprites": {
                "default": f"{char.sprite_set}-default",
                "spinning": f"{char.sprite_set}-spinning", 
                "battleLeft": f"{char.sprite_set}-battle-left",
                "battleRight": f"{char.sprite_set}-battle-right"
            },
            "stats": {
                "hp": char.base_hp,
                "attack": char.base_attack,
                "defense": char.base_defense
            }
        })
    
    return {"characters": character_data}