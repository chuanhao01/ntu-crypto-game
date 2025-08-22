import sqlite3
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

def get_user_id_from_username(username: str) -> int | None:
    conn = sqlite3.connect(DB_FILE_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT id, username, password_hash, salt FROM users WHERE username = ?",
            (username,)
        )
        row = cursor.fetchone()

        if row:
            return row[0]
        else:
            return None

    except sqlite3.Error as e:
        print(f"Database error in get_user_by_username: {e}")
        return None
    finally:
        conn.close()

@dataclass
class Transaction:
    user_id: int
    amount: int
    """
    Amount is in cents where 100cents = $1
    """

def create_transaction(transaction: Transaction):
    try:
        with sqlite3.connect(DB_FILE_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO transactions (amount, user_id)
                VALUES (?, ?)
            ''', (transaction.amount, transaction.user_id))
            conn.commit()
    except Exception as e:
        print("sqlite error")
        raise e

def get_user_balance(user_id: int) -> int:
    try:
        with sqlite3.connect(DB_FILE_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT SUM(amount)
                FROM transactions
                WHERE user_id = ?
            ''', (user_id,))
            rows = cursor.fetchall()
            assert len(rows) == 1 # Should fail if we somehow have more than 1 row
            row = rows[0]
            balance = row[0]
            conn.commit()

        return balance
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
    """Initialize the characters table with moves stored as JSON"""
    try:
        with sqlite3.connect(DB_FILE_PATH) as conn:
            cursor = conn.cursor()

            # Create characters table with moves as JSON
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
                    moves TEXT NOT NULL DEFAULT '[]'
                )
            ''')

            # Check if characters already exist
            cursor.execute('SELECT COUNT(*) FROM characters')
            if cursor.fetchone()[0] == 0:
                # Insert diverse characters with different types and their moves as JSON
                import json

                default_characters = [
                    # Heroes
                    ('Knight Valor', 'common', 'hero', 'hero', 90, 12, 10,
                     json.dumps([
                         {'name': 'Slash', 'damage': 15, 'description': 'A quick sword strike'},
                         {'name': 'Shield Bash', 'damage': 12, 'description': 'Strike with shield'},
                         {'name': 'Heroic Strike', 'damage': 18, 'description': 'Powerful heroic attack'}
                     ])),
                    ('Paladin Light', 'rare', 'hero', 'hero', 110, 15, 12,
                     json.dumps([
                         {'name': 'Slash', 'damage': 18, 'description': 'A quick sword strike'},
                         {'name': 'Shield Bash', 'damage': 15, 'description': 'Strike with shield'},
                         {'name': 'Heroic Strike', 'damage': 22, 'description': 'Powerful heroic attack'}
                     ])),
                    ('Champion Divine', 'epic', 'hero', 'hero', 140, 20, 17,
                     json.dumps([
                         {'name': 'Slash', 'damage': 22, 'description': 'A quick sword strike'},
                         {'name': 'Shield Bash', 'damage': 18, 'description': 'Strike with shield'},
                         {'name': 'Heroic Strike', 'damage': 28, 'description': 'Powerful heroic attack'}
                     ])),
                    ('Legendary Guardian', 'legendary', 'hero', 'hero', 190, 28, 24,
                     json.dumps([
                         {'name': 'Slash', 'damage': 30, 'description': 'A quick sword strike'},
                         {'name': 'Shield Bash', 'damage': 25, 'description': 'Strike with shield'},
                         {'name': 'Heroic Strike', 'damage': 35, 'description': 'Powerful heroic attack'}
                     ])),

                    # Mages
                    ('Apprentice Mage', 'common', 'mage', 'mage', 70, 18, 8,
                     json.dumps([
                         {'name': 'Fireball', 'damage': 20, 'description': 'Launch a ball of fire'},
                         {'name': 'Ice Shard', 'damage': 16, 'description': 'Sharp ice projectile'},
                         {'name': 'Lightning Bolt', 'damage': 22, 'description': 'Electric attack'}
                     ])),
                    ('Fire Wizard', 'rare', 'mage', 'mage', 85, 22, 10,
                     json.dumps([
                         {'name': 'Fireball', 'damage': 25, 'description': 'Launch a ball of fire'},
                         {'name': 'Ice Shard', 'damage': 20, 'description': 'Sharp ice projectile'},
                         {'name': 'Lightning Bolt', 'damage': 28, 'description': 'Electric attack'}
                     ])),
                    ('Archmage', 'epic', 'mage', 'mage', 105, 28, 14,
                     json.dumps([
                         {'name': 'Fireball', 'damage': 32, 'description': 'Launch a ball of fire'},
                         {'name': 'Ice Shard', 'damage': 26, 'description': 'Sharp ice projectile'},
                         {'name': 'Lightning Bolt', 'damage': 35, 'description': 'Electric attack'}
                     ])),
                    ('Cosmic Sorcerer', 'legendary', 'mage', 'mage', 130, 35, 18,
                     json.dumps([
                         {'name': 'Fireball', 'damage': 40, 'description': 'Launch a ball of fire'},
                         {'name': 'Ice Shard', 'damage': 32, 'description': 'Sharp ice projectile'},
                         {'name': 'Lightning Bolt', 'damage': 45, 'description': 'Electric attack'}
                     ])),

                    # Archers
                    ('Forest Ranger', 'common', 'archer', 'archer', 80, 16, 9,
                     json.dumps([
                         {'name': 'Precise Shot', 'damage': 18, 'description': 'Accurate arrow shot'},
                         {'name': 'Multi-Shot', 'damage': 14, 'description': 'Fire multiple arrows'},
                         {'name': 'Explosive Arrow', 'damage': 24, 'description': 'Arrow that explodes on impact'}
                     ])),
                    ('Eagle Eye', 'rare', 'archer', 'archer', 95, 20, 11,
                     json.dumps([
                         {'name': 'Precise Shot', 'damage': 22, 'description': 'Accurate arrow shot'},
                         {'name': 'Multi-Shot', 'damage': 18, 'description': 'Fire multiple arrows'},
                         {'name': 'Explosive Arrow', 'damage': 28, 'description': 'Arrow that explodes on impact'}
                     ])),
                    ('Master Archer', 'epic', 'archer', 'archer', 115, 26, 15,
                     json.dumps([
                         {'name': 'Precise Shot', 'damage': 28, 'description': 'Accurate arrow shot'},
                         {'name': 'Multi-Shot', 'damage': 22, 'description': 'Fire multiple arrows'},
                         {'name': 'Explosive Arrow', 'damage': 35, 'description': 'Arrow that explodes on impact'}
                     ])),
                    ('Legendary Marksman', 'legendary', 'archer', 'archer', 140, 32, 19,
                     json.dumps([
                         {'name': 'Precise Shot', 'damage': 35, 'description': 'Accurate arrow shot'},
                         {'name': 'Multi-Shot', 'damage': 28, 'description': 'Fire multiple arrows'},
                         {'name': 'Explosive Arrow', 'damage': 42, 'description': 'Arrow that explodes on impact'}
                     ])),

                    # Assassins
                    ('Shadow Blade', 'common', 'assassin', 'assassin', 75, 20, 6,
                     json.dumps([
                         {'name': 'Backstab', 'damage': 25, 'description': 'Critical strike from behind'},
                         {'name': 'Poison Blade', 'damage': 16, 'description': 'Venomous attack'},
                         {'name': 'Shadow Strike', 'damage': 20, 'description': 'Attack from the shadows'}
                     ])),
                    ('Night Stalker', 'rare', 'assassin', 'assassin', 90, 25, 8,
                     json.dumps([
                         {'name': 'Backstab', 'damage': 30, 'description': 'Critical strike from behind'},
                         {'name': 'Poison Blade', 'damage': 20, 'description': 'Venomous attack'},
                         {'name': 'Shadow Strike', 'damage': 25, 'description': 'Attack from the shadows'}
                     ])),
                    ('Death\'s Shadow', 'epic', 'assassin', 'assassin', 110, 32, 12,
                     json.dumps([
                         {'name': 'Backstab', 'damage': 38, 'description': 'Critical strike from behind'},
                         {'name': 'Poison Blade', 'damage': 26, 'description': 'Venomous attack'},
                         {'name': 'Shadow Strike', 'damage': 32, 'description': 'Attack from the shadows'}
                     ])),
                    ('Phantom Assassin', 'legendary', 'assassin', 'assassin', 135, 40, 16,
                     json.dumps([
                         {'name': 'Backstab', 'damage': 48, 'description': 'Critical strike from behind'},
                         {'name': 'Poison Blade', 'damage': 32, 'description': 'Venomous attack'},
                         {'name': 'Shadow Strike', 'damage': 40, 'description': 'Attack from the shadows'}
                     ])),

                    # Tanks
                    ('Iron Wall', 'common', 'tank', 'tank', 120, 10, 15,
                     json.dumps([
                         {'name': 'Shield Slam', 'damage': 10, 'description': 'Defensive counter-attack'},
                         {'name': 'Taunt', 'damage': 8, 'description': 'Provoke enemy'},
                         {'name': 'Fortress Wall', 'damage': 12, 'description': 'Protective barrier attack'}
                     ])),
                    ('Steel Guardian', 'rare', 'tank', 'tank', 140, 12, 18,
                     json.dumps([
                         {'name': 'Shield Slam', 'damage': 14, 'description': 'Defensive counter-attack'},
                         {'name': 'Taunt', 'damage': 10, 'description': 'Provoke enemy'},
                         {'name': 'Fortress Wall', 'damage': 16, 'description': 'Protective barrier attack'}
                     ])),
                    ('Fortress Defender', 'epic', 'tank', 'tank', 170, 16, 25,
                     json.dumps([
                         {'name': 'Shield Slam', 'damage': 18, 'description': 'Defensive counter-attack'},
                         {'name': 'Taunt', 'damage': 14, 'description': 'Provoke enemy'},
                         {'name': 'Fortress Wall', 'damage': 22, 'description': 'Protective barrier attack'}
                     ])),
                    ('Immortal Bulwark', 'legendary', 'tank', 'tank', 220, 20, 32,
                     json.dumps([
                         {'name': 'Shield Slam', 'damage': 24, 'description': 'Defensive counter-attack'},
                         {'name': 'Taunt', 'damage': 18, 'description': 'Provoke enemy'},
                         {'name': 'Fortress Wall', 'damage': 28, 'description': 'Protective barrier attack'}
                     ])),

                    # Healers
                    ('Village Priest', 'common', 'healer', 'healer', 85, 8, 12,
                     json.dumps([
                         {'name': 'Holy Light', 'damage': 14, 'description': 'Divine healing energy as attack'},
                         {'name': 'Purify', 'damage': 12, 'description': 'Cleansing light attack'},
                         {'name': 'Divine Wrath', 'damage': 18, 'description': 'Righteous anger'}
                     ])),
                    ('Temple Cleric', 'rare', 'healer', 'healer', 100, 10, 15,
                     json.dumps([
                         {'name': 'Holy Light', 'damage': 18, 'description': 'Divine healing energy as attack'},
                         {'name': 'Purify', 'damage': 15, 'description': 'Cleansing light attack'},
                         {'name': 'Divine Wrath', 'damage': 22, 'description': 'Righteous anger'}
                     ])),
                    ('High Priest', 'epic', 'healer', 'healer', 125, 14, 20,
                     json.dumps([
                         {'name': 'Holy Light', 'damage': 24, 'description': 'Divine healing energy as attack'},
                         {'name': 'Purify', 'damage': 20, 'description': 'Cleansing light attack'},
                         {'name': 'Divine Wrath', 'damage': 28, 'description': 'Righteous anger'}
                     ])),
                    ('Divine Oracle', 'legendary', 'healer', 'healer', 160, 18, 26,
                     json.dumps([
                         {'name': 'Holy Light', 'damage': 30, 'description': 'Divine healing energy as attack'},
                         {'name': 'Purify', 'damage': 25, 'description': 'Cleansing light attack'},
                         {'name': 'Divine Wrath', 'damage': 35, 'description': 'Righteous anger'}
                     ])),
                ]

                # Add remaining character types with similar pattern...
                remaining_characters = [
                    # Monsters
                    ('Shadow Beast', 'common', 'monster', 'monster', 75, 15, 6,
                     json.dumps([
                         {'name': 'Claw', 'damage': 14, 'description': 'Sharp claw attack'},
                         {'name': 'Bite', 'damage': 16, 'description': 'Vicious bite'},
                         {'name': 'Dark Energy', 'damage': 20, 'description': 'Malevolent force'}
                     ])),
                    ('Dark Fiend', 'rare', 'monster', 'monster', 95, 18, 8,
                     json.dumps([
                         {'name': 'Claw', 'damage': 18, 'description': 'Sharp claw attack'},
                         {'name': 'Bite', 'damage': 20, 'description': 'Vicious bite'},
                         {'name': 'Dark Energy', 'damage': 24, 'description': 'Malevolent force'}
                     ])),
                    ('Nightmare Demon', 'epic', 'monster', 'monster', 125, 23, 13,
                     json.dumps([
                         {'name': 'Claw', 'damage': 24, 'description': 'Sharp claw attack'},
                         {'name': 'Bite', 'damage': 26, 'description': 'Vicious bite'},
                         {'name': 'Dark Energy', 'damage': 30, 'description': 'Malevolent force'}
                     ])),

                    # Add other character types with JSON moves...
                    ('Ancient Dragon', 'legendary', 'dragon', 'dragon', 220, 38, 25,
                     json.dumps([
                         {'name': 'Dragon Breath', 'damage': 45, 'description': 'Powerful breath weapon'},
                         {'name': 'Tail Sweep', 'damage': 35, 'description': 'Sweeping tail attack'},
                         {'name': 'Wing Buffet', 'damage': 30, 'description': 'Powerful wing strike'}
                     ])),
                ]

                all_characters = default_characters + remaining_characters

                cursor.executemany('''
                    INSERT INTO characters (name, rarity, character_type, sprite_set, base_hp, base_attack, base_defense, moves)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', all_characters)

            conn.commit()
            return True

    except Exception as e:
        print(f"Database error in create_characters_table: {e}")
        return False

def get_all_characters() -> list[dict]:
    """Get all available characters from the database with moves parsed from JSON"""
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
                import json
                moves = json.loads(row[8]) if row[8] else []

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


def add_money(amount: int, user_id: int):
    try:
        with sqlite3.connect(DB_FILE_PATH) as conn:
            cursor = conn.cursor()

            cursor.execute('''
                UPDATE game_saves
                SET gold = gold + ?
                WHERE user_id = ?
            ''', (amount / 100, user_id))
            conn.commit()
        return
    except Exception as e:
        print(f"Database error in load_user_game_data: {e}")
        return None
