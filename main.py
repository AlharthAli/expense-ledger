from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import psycopg2
from dotenv import load_dotenv
from passlib.context import CryptContext
from datetime import date

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD")
    )

class User(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class Group(BaseModel):
    name: str

class GroupMember(BaseModel):
    group_id: int
    user_id: int
    split_ratio: float

class Expense(BaseModel):
    group_id: int
    user_id: int
    cost: float
    desc: str
    date: str

@app.post("/users")
def create_user(user: User):
    hashed_password = pwd_context.hash(user.password)
    
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "INSERT INTO users (name, email, password_hash, created_at) VALUES (%s, %s, %s, %s)",
        (user.name, user.email, hashed_password, str(date.today()))
    )
    
    conn.commit()
    conn.close()
    return {"message": "User created successfully"}

@app.post("/login")
def login(credentials: LoginRequest):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, password_hash FROM users WHERE email = %s", (credentials.email,))
    user = cursor.fetchone()
    conn.close()
    
    if user is None:
        return {"message": "Invalid email or password"}
    
    stored_hash = user[1]
    
    if pwd_context.verify(credentials.password, stored_hash):
        return {"message": "Login successful", "user_id": user[0]}
    else:
        return {"message": "Invalid email or password"}

@app.post("/groups")
def create_group(group: Group):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "INSERT INTO groups (name) VALUES (%s)",
        (group.name,)
    )
    
    conn.commit()
    conn.close()
    return {"message": "Group created successfully"}

@app.post("/group-members")
def add_group_member(member: GroupMember):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "INSERT INTO group_members (group_id, user_id, split_ratio) VALUES (%s, %s, %s)",
        (member.group_id, member.user_id, member.split_ratio)
    )
    
    conn.commit()
    conn.close()
    return {"message": "Group member added successfully"}

@app.post("/expenses")
def create_expense(expense: Expense):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        "INSERT INTO expenses (group_id, user_id, cost, description, date) VALUES (%s, %s, %s, %s, %s) RETURNING id",
        (expense.group_id, expense.user_id, expense.cost, expense.desc, expense.date)
    )
    new_expense_id = cursor.fetchone()[0]
    
    cursor.execute(
        "SELECT user_id, split_ratio FROM group_members WHERE group_id = %s",
        (expense.group_id,)
    )
    members = cursor.fetchall()
    
    for member in members:
        member_user_id = member[0]
        member_ratio = member[1]
        amount_owed = expense.cost * member_ratio
        
        cursor.execute(
            "INSERT INTO expense_splits (expense_id, user_id, cost) VALUES (%s, %s, %s)",
            (new_expense_id, member_user_id, amount_owed)
        )
    
    conn.commit()
    conn.close()
    return {"message": "Expense added and split successfully"}