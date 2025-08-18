from hashlib import pbkdf2_hmac
import os
from src.crypto import hash_password, verify_password

passwd = "this cant be real"
p1 = hash_password(passwd)
print(verify_password(passwd, p1))
