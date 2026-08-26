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

@app.get("/groups/{group_id}/balances")
def get_group_balances(group_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    # Total each person paid in this group
    cursor.execute(
        "SELECT user_id, SUM(cost) FROM expenses WHERE group_id = %s GROUP BY user_id",
        (group_id,)
    )
    paid = dict(cursor.fetchall())

    # Total each person owes (their share of every expense in this group)
    cursor.execute("""
        SELECT expense_splits.user_id, SUM(expense_splits.cost)
        FROM expense_splits
        JOIN expenses ON expense_splits.expense_id = expenses.id
        WHERE expenses.group_id = %s
        GROUP BY expense_splits.user_id
    """, (group_id,))
    owed = dict(cursor.fetchall())

    conn.close()

    # Combine into net balances: positive = owed money, negative = owes money
    member_ids = set(paid.keys()) | set(owed.keys())
    balances = {}
    for user_id in member_ids:
        balances[user_id] = round(paid.get(user_id, 0) - owed.get(user_id, 0), 2)

    return balances
def simplify_debts(balances):
    creditors = [[uid, bal] for uid, bal in balances.items() if bal > 0]
    debtors = [[uid, bal] for uid, bal in balances.items() if bal < 0]

    transactions = []

    while creditors and debtors:
        creditors.sort(key=lambda x: x[1], reverse=True)
        debtors.sort(key=lambda x: x[1])

        creditor = creditors[0]
        debtor = debtors[0]

        payment = round(min(creditor[1], -debtor[1]), 2)

        transactions.append({
            "from_user": debtor[0],
            "to_user": creditor[0],
            "amount": payment
        })

        creditor[1] -= payment
        debtor[1] += payment

        if creditor[1] == 0:
            creditors.pop(0)
        if debtor[1] == 0:
            debtors.pop(0)

    return transactions

@app.get("/groups/{group_id}/settlement")
def get_settlement(group_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT user_id, SUM(cost) FROM expenses WHERE group_id = %s GROUP BY user_id",
        (group_id,)
    )
    paid = dict(cursor.fetchall())

    cursor.execute("""
        SELECT expense_splits.user_id, SUM(expense_splits.cost)
        FROM expense_splits
        JOIN expenses ON expense_splits.expense_id = expenses.id
        WHERE expenses.group_id = %s
        GROUP BY expense_splits.user_id
    """, (group_id,))
    owed = dict(cursor.fetchall())

    conn.close()

    member_ids = set(paid.keys()) | set(owed.keys())
    balances = {uid: round(paid.get(uid, 0) - owed.get(uid, 0), 2) for uid in member_ids}

    transactions = simplify_debts(balances)

    return {"balances": balances, "settlement": transactions}

DRIFT_WINDOW = 5  # how many recent expenses to look back across

@app.get("/groups/{group_id}/members/{user_id}/drift")
def get_fairness_drift(group_id: int, user_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT expenses.id, expenses.user_id, expenses.cost, expense_splits.cost
        FROM expenses
        JOIN expense_splits ON expenses.id = expense_splits.expense_id
        WHERE expenses.group_id = %s AND expense_splits.user_id = %s
        ORDER BY expenses.date
    """, (group_id, user_id))
    rows = cursor.fetchall()

    conn.close()

    if not rows:
        return {"message": "No expense history yet for this member"}

    # Calculate drift (actual contribution - fair share) for every expense
    drifts = []
    for row in rows:
        expense_id, paid_by, total_cost, split_amount = row
        actual_paid = total_cost if paid_by == user_id else 0
        drift = round(actual_paid - split_amount, 2)
        drifts.append(drift)

    # Only look at the most recent N expenses
    recent_drifts = drifts[-DRIFT_WINDOW:]

    if len(recent_drifts) < DRIFT_WINDOW:
        return {
            "message": f"Not enough history yet ({len(recent_drifts)}/{DRIFT_WINDOW} expenses) to detect drift",
            "recent_drifts": recent_drifts
        }

    if all(d > 0 for d in recent_drifts):
        return {
            "drift_detected": True,
            "direction": "overpaying",
            "reason": f"Consistently paid more than their fair share across the last {DRIFT_WINDOW} expenses",
            "recent_drifts": recent_drifts
        }
    elif all(d < 0 for d in recent_drifts):
        return {
            "drift_detected": True,
            "direction": "underpaying",
            "reason": f"Consistently paid less than their fair share across the last {DRIFT_WINDOW} expenses",
            "recent_drifts": recent_drifts
        }
    else:
        return {
            "drift_detected": False,
            "reason": "Contribution has varied — no consistent pattern detected",
            "recent_drifts": recent_drifts
        }