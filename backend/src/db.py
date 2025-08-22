import sqlite3
import json
from dataclasses import dataclass
from src.crypto import HashedPassword
from src.consts import DB_FILE_PATH

@dataclass
class User:
    username: str
    hashed_password: HashedPassword

def create_user(user: User) -> int:
    """
    Returns create user id
    """
    try:
        with sqlite3.connect(DB_FILE_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    salt TEXT NOT NULL
                )
            ''')
            cursor.execute('''
                INSERT INTO users (username, password_hash, salt)
                VALUES (?, ?, ?)
            ''', (user.username, user.hashed_password.password_hash, user.hashed_password.salt))
            user_id = cursor.lastrowid
            conn.commit()
        return user_id
    except Exception as e:
        print("sqlite error")
        raise e


@dataclass
class Transaction:
    user_id: int
    amount: int

def create_transaction(transaction: Transaction):
    try:
        with sqlite3.connect(DB_FILE_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO transactions (amount, user_id)
                VALUES (?, ?, ?, ?)
            ''', (transaction.amount, transaction.user_id))
            conn.commit()
    except Exception as e:
        print("sqlite error")
        raise e

def get_user_by_username(username: str) -> User | None:
    """
    Retrieve a user by their username.
    Returns None if user is not found.
    """
    conn = sqlite3.connect(DB_FILE_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "SELECT id, username, password_hash, salt FROM users WHERE username = ?",
            (username,)
        )
        row = cursor.fetchone()
        
        if row:
            user = User(username=row[1], hashed_password=HashedPassword(row[3], row[2]))
            user.id = row[0]  # Set the ID from database
            return user
        else:
            return None
            
    except sqlite3.Error as e:
        print(f"Database error in get_user_by_username: {e}")
        return None
    finally:
        conn.close()

def save_user_game_data(user_id: int, game_data: dict) -> bool:
    """
    Save game data for a user. Creates or updates existing save data.
    """
    try:
        with sqlite3.connect(DB_FILE_PATH) as conn:
            cursor = conn.cursor()
            
            # Create game_saves table if it doesn't exist
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS game_saves (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    gold INTEGER NOT NULL DEFAULT 100,
                    collection TEXT NOT NULL DEFAULT '[]',
                    player_team TEXT NOT NULL DEFAULT '[null,null,null,null,null]',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    UNIQUE(user_id)
                )
            ''')
            
            # Convert lists to JSON strings for storage
            collection_json = str(game_data.get('collection', []))
            player_team_json = str(game_data.get('playerTeam', [None, None, None, None, None]))
            
            # Use INSERT OR REPLACE to handle both new saves and updates
            cursor.execute('''
                INSERT OR REPLACE INTO game_saves (user_id, gold, collection, player_team, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (user_id, game_data.get('gold', 100), collection_json, player_team_json))
            
            conn.commit()
            return True
            
    except Exception as e:
        print(f"Database error in save_user_game_data: {e}")
        return False

def load_user_game_data(user_id: int) -> dict | None:
    """
    Load game data for a user. Returns None if no save data exists.
    """
    try:
        with sqlite3.connect(DB_FILE_PATH) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT gold, collection, player_team FROM game_saves WHERE user_id = ?
            ''', (user_id,))
            
            row = cursor.fetchone()
            
            if row:
                # Parse the JSON strings back to Python objects
                import ast
                collection_data = ast.literal_eval(row[1]) if row[1] else []
                player_team_data = ast.literal_eval(row[2]) if row[2] else [None, None, None, None, None]
                
                return {
                    'gold': row[0],
                    'collection': collection_data,
                    'playerTeam': player_team_data
                }
            else:
                return None
                
    except Exception as e:
        print(f"Database error in load_user_game_data: {e}")
        return None

@dataclass
class Character:
    id: int
    name: str
    rarity: str
    character_type: str  # Expanded types
    sprite_set: str
    base_hp: int
    base_attack: int
    base_defense: int

def create_characters_table():
    """Initialize the characters table with default characters"""
    try:
        with sqlite3.connect(DB_FILE_PATH) as conn:
            cursor = conn.cursor()
            
            # Check if moves column exists, if not add it
            cursor.execute("PRAGMA table_info(characters)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'moves' not in columns:
                print("Adding moves column to characters table...")
                cursor.execute('ALTER TABLE characters ADD COLUMN moves TEXT')
            
            # Create characters table if it doesn't exist
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS characters (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    rarity TEXT NOT NULL,
                    character_type TEXT NOT NULL,
                    sprite_set TEXT NOT NULL,
                    base_hp INTEGER NOT NULL,
                    base_attack INTEGER NOT NULL,
                    base_defense INTEGER NOT NULL,
                    moves TEXT DEFAULT '[]'
                )
            ''')
            
            # Check if characters already exist
            cursor.execute('SELECT COUNT(*) FROM characters')
            if cursor.fetchone()[0] == 0:
                # Insert default characters with moves
                default_characters = [
                    # Heroes with moves
                    ('Knight Valor', 'common', 'hero', 'hero', 90, 12, 10, json.dumps([
                        {"name": "Sword Strike", "damage": 15, "description": "A basic sword attack"},
                        {"name": "Shield Bash", "damage": 12, "description": "Strike with shield"}
                    ])),
                    ('Paladin Light', 'rare', 'hero', 'hero', 110, 15, 12, json.dumps([
                        {"name": "Holy Strike", "damage": 18, "description": "Blessed sword attack"},
                        {"name": "Divine Shield", "damage": 16, "description": "Shield blessed by light"}
                    ])),
                    ('Champion Divine', 'epic', 'hero', 'hero', 140, 20, 17, json.dumps([
                        {"name": "Champion's Blade", "damage": 25, "description": "Powerful sword technique"},
                        {"name": "Divine Wrath", "damage": 28, "description": "Unleash divine power"}
                    ])),
                    ('Legendary Guardian', 'legendary', 'hero', 'hero', 190, 28, 24, json.dumps([
                        {"name": "Guardian's Strike", "damage": 35, "description": "Legendary sword attack"},
                        {"name": "Ultimate Protection", "damage": 32, "description": "Divine guardian technique"}
                    ])),
                    
                    # Monsters with moves
                    ('Shadow Beast', 'common', 'monster', 'monster', 75, 15, 6, json.dumps([
                        {"name": "Shadow Claw", "damage": 18, "description": "Dark energy claw attack"},
                        {"name": "Bite", "damage": 16, "description": "Vicious bite"}
                    ])),
                    ('Dark Fiend', 'rare', 'monster', 'monster', 95, 18, 8, json.dumps([
                        {"name": "Dark Strike", "damage": 22, "description": "Strike infused with darkness"},
                        {"name": "Fiend's Rage", "damage": 20, "description": "Unleash fiendish fury"}
                    ])),
                    ('Nightmare Demon', 'epic', 'monster', 'monster', 125, 23, 13, json.dumps([
                        {"name": "Nightmare Slash", "damage": 28, "description": "Attack that induces fear"},
                        {"name": "Demon's Wrath", "damage": 32, "description": "Powerful demonic attack"}
                    ])),
                    ('Ancient Dragon', 'legendary', 'monster', 'monster', 175, 31, 20, json.dumps([
                        {"name": "Dragon Breath", "damage": 40, "description": "Devastating fire breath"},
                        {"name": "Ancient Power", "damage": 38, "description": "Power of ancient dragons"}
                    ])),
                ]
                
                cursor.executemany('''
                    INSERT INTO characters (name, rarity, character_type, sprite_set, base_hp, base_attack, base_defense, moves)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', default_characters)
            
            conn.commit()
            return True
            
    except Exception as e:
        print(f"Database error in create_characters_table: {e}")
        return False

def add_character_to_database(character_data: dict) -> int:
    """Add a new character to the database and return its ID"""
    try:
        with sqlite3.connect(DB_FILE_PATH) as conn:
            cursor = conn.cursor()
            
            # Convert moves to JSON string if they exist
            moves_json = json.dumps(character_data.get('moves', []))
            
            cursor.execute('''
                INSERT INTO characters (name, rarity, character_type, sprite_set, base_hp, base_attack, base_defense, moves)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                character_data['name'],
                character_data['rarity'],
                character_data.get('character_type', 'hero'),
                character_data['sprite_set'],
                character_data['stats']['base_hp'],
                character_data['stats']['base_attack'],
                character_data['stats']['base_defense'],
                moves_json
            ))
            
            character_id = cursor.lastrowid
            conn.commit()
            return character_id
            
    except Exception as e:
        print(f"Database error in add_character_to_database: {e}")
        return None

def get_all_characters() -> list:
    """Get all available characters from the database"""
    try:
        with sqlite3.connect(DB_FILE_PATH) as conn:
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, name, rarity, character_type, sprite_set, base_hp, base_attack, base_defense, moves 
                FROM characters
            ''')
            
            rows = cursor.fetchall()
            characters = []
            
            for row in rows:
                # Parse moves from JSON string
                moves = []
                if row[8]:  # moves column
                    try:
                        moves = json.loads(row[8])
                    except json.JSONDecodeError:
                        print(f"Failed to parse moves for character {row[1]}")
                        moves = []
                
                character = {
                    "id": row[0],
                    "name": row[1],
                    "rarity": row[2],
                    "character_type": row[3],
                    "sprite_set": row[4],
                    "base_hp": row[5],
                    "base_attack": row[6],
                    "base_defense": row[7],
                    "moves": moves
                }
                characters.append(character)
                
            return characters
            
    except Exception as e:
        print(f"Database error in get_all_characters: {e}")
        return []

def get_user_collection_character(user_id: int, character_key: str) -> dict | None:
    """Get a specific character from user's collection"""
    try:
        game_data = load_user_game_data(user_id)
        if not game_data:
            return None
            
        collection = game_data.get('collection', [])
        
        for key, char_data in collection:
            if key == character_key:
                return char_data
        
        return None
        
    except Exception as e:
        print(f"Database error in get_user_collection_character: {e}")
        return None

def update_user_collection_character(user_id: int, character_key: str, new_count: int) -> bool:
    """Update character count in user's collection or remove if count becomes 0"""
    try:
        game_data = load_user_game_data(user_id)
        if not game_data:
            return False
        
        collection = game_data.get('collection', [])
        updated_collection = []
        character_found = False
        
        for key, char_data in collection:
            if key == character_key:
                character_found = True
                if new_count > 0:
                    char_data['count'] = new_count
                    updated_collection.append([key, char_data])
                # If new_count is 0, don't add it back (effectively removing it)
            else:
                updated_collection.append([key, char_data])
        
        if not character_found:
            return False
        
        # Update the game data
        game_data['collection'] = updated_collection
        return save_user_game_data(user_id, game_data)
        
    except Exception as e:
        print(f"Database error in update_user_collection_character: {e}")
        return False

def add_character_to_user_collection(user_id: int, character_data: dict) -> bool:
    """Add a new character to user's collection"""
    try:
        game_data = load_user_game_data(user_id)
        if not game_data:
            return False
        
        collection = game_data.get('collection', [])
        
        # Create the character entry
        character_key = f"{character_data['name']}-{character_data['rarity']}"
        collection.append([character_key, character_data])
        
        # Update the game data
        game_data['collection'] = collection
        return save_user_game_data(user_id, game_data)
        
    except Exception as e:
        print(f"Database error in add_character_to_user_collection: {e}")
        return False
