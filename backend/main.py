from typing import Union

from fastapi import FastAPI
from pydantic import BaseModel


class CreateAccount(BaseModel):
    username: str
    name: str
    password: str


app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/account")
def read_item(create_account: CreateAccount):
    return {
        "username": create_account.username,
        "name": create_account.name,
        "password": create_account.password,
    }
