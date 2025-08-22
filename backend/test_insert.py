import sqlite3
from consts import DB_FILE_PATH
from db import create_user, User, create_transaction, Transaction, get_user_balance
from crypto import hash_password

def test_insert():
    user_id = 1
    transaction = Transaction(user_id, -10)
    for _ in range(5):
        create_transaction(transaction)
    balance  = get_user_balance(user_id)
    print(balance)


if __name__ == "__main__":
    test_insert()
