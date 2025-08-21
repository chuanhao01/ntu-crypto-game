import sqlite3
from consts import DB_FILE_PATH
from db import create_user, User
from crypto import hash_password

def test_insert():
    username = "bob"
    password = "bob"
    hashed_password = hash_password(password)
    user = User(username, hashed_password)

    create_user(user)

if __name__ == "__main__":
    test_insert()
