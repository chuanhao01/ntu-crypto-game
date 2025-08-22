from typing import Union, Any
import jwt
import datetime
import ollama
import pixellab
import os
from dotenv import load_dotenv
from PIL import Image
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from src.db import (
    get_user_balance,
    create_user,
    User,
    get_user_by_username,
    save_user_game_data,
    load_user_game_data,
    create_characters_table,
    get_all_characters,
    get_user_id_from_username,
    create_transaction,
    Transaction,
    add_money,
    add_character_to_database,
    get_user_collection_character,
    update_user_collection_character,
    add_character_to_user_collection
)
from src.crypto import hash_password, verify_password

# Load environment variables
load_dotenv()

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

# Add pixellab client initialization
pixellab_api_key = os.getenv("PIXELLAB_API_KEY")
print(f"Pixellab API key loaded: {pixellab_api_key}")
if not pixellab_api_key:
    raise ValueError("PIXELLAB_API_KEY environment variable is not set")
pixellab_client = pixellab.Client(secret=pixellab_api_key)

# Add pixellab client initialization
pixellab_api_key = os.getenv("PIXELLAB_API_KEY")
print(f"Pixellab API key loaded: {pixellab_api_key}")
if not pixellab_api_key:
    raise ValueError("PIXELLAB_API_KEY environment variable is not set")
pixellab_client = pixellab.Client(secret=pixellab_api_key)


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
The character can only have a maximum of 4 abilities.

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
        payload = jwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
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
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24),
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    return {
        "success": True,
        "token": token,
        "user": {"id": user.id, "username": user.username},
    }


@app.post("/save-game")
def save_game(save_data: SaveGameData, user_data=Depends(verify_token)):
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
def load_game(user_data=Depends(verify_token)):
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
                "playerTeam": [None, None, None, None, None],
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

def create_character_spritesheets(character_description, character_name):
    """Create a character and generate mock spritesheets for the game"""
    
    # Create output directory in the correct location
    output_dir = f"../my-minikit-app/public/sprites"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    try:
        # Step 1: Generate the base character
        print(f"Generating character: {character_description}")
        base_response = pixellab_client.generate_image_pixflux(
            description=character_description,
            image_size=dict(width=64, height=64),
            no_background=True
        )
        
        # Get the base character image
        base_image = base_response.image.pil_image()
        
        print(f"Generated base character for: {character_name}")
        
        # Create spritesheets
        spritesheets = [
            {"name": f"{character_name}-default", "layout": (4, 1)},      # 4x1 spritesheet
            {"name": f"{character_name}-battle-left", "layout": (4, 1)},  # 4x1 spritesheet
            {"name": f"{character_name}-battle-right", "layout": (4, 1)}, # 4x1 spritesheet
            {"name": f"{character_name}-spinning", "layout": (4, 2)}      # 4x2 spritesheet
        ]
        
        created_files = []
        
        for sheet in spritesheets:
            cols, rows = sheet["layout"]
            sheet_width = 64 * cols
            sheet_height = 64 * rows
            
            # Create new spritesheet image
            spritesheet = Image.new('RGBA', (sheet_width, sheet_height), (0, 0, 0, 0))
            
            # Fill the spritesheet with copies of the base character
            for row in range(rows):
                for col in range(cols):
                    x = col * 64
                    y = row * 64
                    spritesheet.paste(base_image, (x, y))
            
            # Save the spritesheet
            filename = f"{output_dir}/{sheet['name']}.png"
            spritesheet.save(filename)
            
            created_files.append(filename)
            print(f"✅ Created spritesheet: {sheet['name']}.png ({cols}x{rows})")
        
        print(f"🎉 Successfully created {len(created_files)} spritesheets for {character_name}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to generate sprites for {character_name}: {e}")
        return False

@app.post("/combine-characters")
def combine_characters(combine_data: CombineCharacters, user_data = Depends(verify_token)):
    """Combine two characters using AI to create a new unique character"""
    try:
        user_id = user_data["user_id"]
        
        # Get the characters from database
        characters = get_all_characters()
        char1 = next((c for c in characters if c["id"] == combine_data.character1_id), None)
        char2 = next((c for c in characters if c["id"] == combine_data.character2_id), None)

        if not char1 or not char2:
            raise HTTPException(status_code=404, detail="One or both characters not found")
        
        # Create collection keys
        char1_collection_key = f"{char1['name']}-{char1['rarity']}"
        char2_collection_key = f"{char2['name']}-{char2['rarity']}"
        
        # Check if user owns both characters in their collection
        char1_owned = get_user_collection_character(user_id, char1_collection_key)
        char2_owned = get_user_collection_character(user_id, char2_collection_key)
        
        if not char1_owned or not char2_owned:
            raise HTTPException(status_code=400, detail="You don't own one or both of these characters")
        
        if char1_owned['count'] < 1 or char2_owned['count'] < 1:
            raise HTTPException(status_code=400, detail="Insufficient character count")
        
        print(f"User owns {char1_owned['count']} of {char1['name']} and {char2_owned['count']} of {char2['name']}")
        
        # Format characters for the AI prompt
        char1_prompt = f"{{name: '{char1['name']}', rarity: '{char1['rarity']}', type: '{char1['character_type']}', stats: {{hp: {char1['base_hp']}, attack: {char1['base_attack']}, defense: {char1['base_defense']}}}, abilities: {char1['moves']}}}"
        char2_prompt = f"{{name: '{char2['name']}', rarity: '{char2['rarity']}', type: '{char2['character_type']}', stats: {{hp: {char2['base_hp']}, attack: {char2['base_attack']}, defense: {char2['base_defense']}}}, abilities: {char2['moves']}}}"

        # Create the fusion prompt
        fusion_prompt = f"""Fuse these two characters into one new unique character.

Character A: {char1_prompt}
Character B: {char2_prompt}

Respond ONLY in JSON format."""
        
        print("Calling Ollama to generate fused character...")
        
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
            
            print(f"AI generated character: {fused_character['name']} ({fused_character['rarity']})")
            print(f"Generated stats: {fused_character['stats']}")
            print(f"Generated moves: {fused_character['abilities']}")
            
            # Create sprite name from character name (remove spaces and special chars)
            sprite_name = fused_character['name'].lower().replace(' ', '_').replace('-', '_')
            sprite_name = ''.join(c for c in sprite_name if c.isalnum() or c == '_')
            
            print(f"Generating sprites for: {sprite_name}")
            
            # Generate sprites for the new character
            character_description = f"pixelart {fused_character['description']}, fantasy game character style, 64x64 pixel art"
            sprite_success = create_character_spritesheets(character_description, sprite_name)
            
            if not sprite_success:
                print("Failed to generate sprites, but continuing with character creation...")
            
            # Add character to database with moves - ENSURE CONSISTENT FORMAT
            character_data = {
                'name': fused_character['name'],
                'rarity': fused_character['rarity'],
                'character_type': 'hero',  # Default to hero for fused characters
                'sprite_set': sprite_name,
                'stats': fused_character['stats'],  # This contains base_hp, base_attack, base_defense
                'moves': fused_character['abilities']  # Include moves in database
            }
            
            new_character_id = add_character_to_database(character_data)
            
            if not new_character_id:
                raise HTTPException(status_code=500, detail="Failed to add character to database")
            
            print(f"Added new character to database with ID: {new_character_id}")
            print(f"Database stats format: {fused_character['stats']}")
            
            # CONSUME THE CHARACTERS FROM USER'S COLLECTION
            print("Consuming characters from user's collection...")
            
            # Reduce count of first character by 1
            new_char1_count = char1_owned['count'] - 1
            char1_update_success = update_user_collection_character(user_id, char1_collection_key, new_char1_count)
            
            if not char1_update_success:
                raise HTTPException(status_code=500, detail=f"Failed to consume {char1['name']}")
            
            print(f"Consumed 1 {char1['name']}, new count: {new_char1_count}")
            
            # Reduce count of second character by 1
            new_char2_count = char2_owned['count'] - 1
            char2_update_success = update_user_collection_character(user_id, char2_collection_key, new_char2_count)
            
            if not char2_update_success:
                raise HTTPException(status_code=500, detail=f"Failed to consume {char2['name']}")
            
            print(f"Consumed 1 {char2['name']}, new count: {new_char2_count}")
            
            # ADD THE NEW FUSED CHARACTER TO USER'S COLLECTION - CONSISTENT FORMAT
            print("Adding new fused character to user's collection...")
            
            # Convert base_hp/base_attack/base_defense to hp/attack/defense for user collection
            collection_stats = {
                'hp': fused_character['stats']['base_hp'],
                'attack': fused_character['stats']['base_attack'],
                'defense': fused_character['stats']['base_defense']
            }
            
            new_char_data = {
                'id': f"{fused_character['name']}-{fused_character['rarity']}",
                'originalId': new_character_id,
                'name': fused_character['name'],
                'rarity': fused_character['rarity'],
                'sprites': {
                    'default': f"{sprite_name}-default",
                    'spinning': f"{sprite_name}-spinning",
                    'battleLeft': f"{sprite_name}-battle-left",
                    'battleRight': f"{sprite_name}-battle-right"
                },
                'obtainedAt': datetime.datetime.utcnow().isoformat(),
                'count': 1,
                'stats': collection_stats,  # Use converted format for user collection
                'moves': fused_character['abilities']  # Include moves in user collection
            }
            
            print(f"User collection stats format: {collection_stats}")
            
            add_success = add_character_to_user_collection(user_id, new_char_data)
            
            if not add_success:
                raise HTTPException(status_code=500, detail="Failed to add new character to collection")
            
            print(f"Successfully added {fused_character['name']} to user's collection")
            
            return {
                "success": True,
                "fused_character": fused_character,
                "character_id": new_character_id,
                "sprites_generated": sprite_success,
                "consumed_characters": [
                    {"name": char1['name'], "remaining_count": new_char1_count},
                    {"name": char2['name'], "remaining_count": new_char2_count}
                ],
                "new_character_data": new_char_data  # Include for debugging
            }

        except json.JSONDecodeError as e:
            print(f"Failed to parse AI response as JSON: {e}")
            print(f"AI Response: {response['response']}")
            raise HTTPException(status_code=500, detail="AI generated invalid response")

    except Exception as e:
        print(f"Combine characters error: {e}")
        raise HTTPException(status_code=500, detail="Failed to combine characters")


class UserDeposit(BaseModel):
    username: str
    amount: int
    transaction_id: str


@app.post("/user_deposit")
def payment_callback(user_deposit: UserDeposit):
    # TODO, verify and get value from transaction id
    # print(user_deposit)
    user_id = get_user_id_from_username(user_deposit.username)
    if user_id is None:
        raise HTTPException(status_code=500, detail="Failed to find user")
    # create_transaction(Transaction(user_id, user_deposit.amount))
    add_money(user_deposit.amount, user_id)
    return ""

class UserModel(BaseModel):
    username: str

@app.post("/user/balance")
def get_balance(user: UserModel):
    user_id = get_user_id_from_username(user.username)
    if user_id is None:
        raise HTTPException(status_code=500, detail="Failed to find user")
    user_balance = get_user_balance(user_id)
    return {"balance": user_balance}
