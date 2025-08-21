import sqlite3
from dataclasses import dataclass
from crypto import HashedPassword
from consts import DB_FILE_PATH

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
