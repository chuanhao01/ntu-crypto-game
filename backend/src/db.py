import sqlite3
from dataclasses import dataclass
from .crypto import HashedPassword
from .consts import DB_FILE_PATH

@dataclass
class User:
    username: str
    name: str
    hashed_password: HashedPassword

def create_user(user: User) -> bool:
    try:
        with sqlite3.connect(DB_FILE_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO users (username, name, password_hash, salt)
                VALUES (?, ?, ?, ?)
            ''', (user.username, user.name, user.hashed_password.password_hash, user.hashed_password.salt))
            conn.commit()
    except:
        pass
