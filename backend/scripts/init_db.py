import sqlite3
from consts import DB_FILE_PATH

def init_db():
    """Initializes the database and creates the users table."""
    with sqlite3.connect(DB_FILE_PATH) as conn:
        cursor = conn.cursor()

        # Create the users table if it doesn't exist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL
            )
        ''')
        conn.commit()


if __name__ == "__main__":
    init_db()
