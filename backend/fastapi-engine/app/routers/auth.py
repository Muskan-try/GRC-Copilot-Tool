from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pymongo import MongoClient
from passlib.context import CryptContext
import os

router = APIRouter()

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(MONGO_URI)
db = client["grc_db"]
users = db["users"]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class RegisterRequest(BaseModel):
    organization_name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register")
async def register(data: RegisterRequest):

    existing_user = users.find_one({"email": data.email})

    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = pwd_context.hash(data.password)

    users.insert_one({
        "organization_name": data.organization_name,
        "email": data.email,
        "password": hashed_password
    })

    return {"message": "User registered successfully"}


@router.post("/login")
async def login(data: LoginRequest):

    user = users.find_one({"email": data.email})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    valid_password = pwd_context.verify(
        data.password,
        user["password"]
    )

    if not valid_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "message": "Login successful",
        "email": user["email"],
        "organization_name": user["organization_name"]
    }
