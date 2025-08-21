from typing import Union

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db import create_user, User
from crypto import hash_password



app = FastAPI()

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

@app.get("/")
def read_root():
    return {"Hello": "World"}

class CreateAccount(BaseModel):
    username: str
    password: str



@app.post("/account")
def read_item(create_account: CreateAccount):
    hashed_password = hash_password(create_account.password)
    user = User(create_account.username, hashed_password)
    # create_user(user)
    print(user)
    return ""
