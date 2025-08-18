from hashlib import pbkdf2_hmac
import os
from .consts import PASSWORD_APP_ITERS, SALT_SIZE
from dataclasses import dataclass

@dataclass
class HashedPassword:
    """
    salt is in hex format
    password_hash is in hex format
    """

    salt: str
    password_hash: str

def hash_password(password: str) -> HashedPassword:
    """
    password is a str

    Returns: [salt: str, password_hash: str]
    """
    salt = os.urandom(SALT_SIZE)  # Generate a 16-byte random salt
    password_hash = pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_APP_ITERS)
    return HashedPassword(salt.hex(), password_hash.hex())


def verify_password(password: str, hashed_password: HashedPassword) -> bool:
    verify_password_hash = pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(hashed_password.salt), PASSWORD_APP_ITERS)
    return verify_password_hash.hex() == hashed_password.password_hash
