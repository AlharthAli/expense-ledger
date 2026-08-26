# Expense Ledger

A FastAPI + PostgreSQL backend for tracking shared group expenses, splitting costs, simplifying debts, and detecting fairness drift.

## Live API

**Base URL:** http://expense-ledger-alb-185467570.us-east-2.elb.amazonaws.com

**Interactive docs:** http://expense-ledger-alb-185467570.us-east-2.elb.amazonaws.com/docs

## Architecture

```
Internet
   │  (HTTP :80)
   ▼
Application Load Balancer (expense-ledger-alb)
   │  forwards to port 8000
   ▼
Target Group (expense-ledger-tg)
   │  health check: GET /docs → 200
   ▼
ECS Fargate Service (expense-ledger-service)
   │  cluster: expense-ledger-cluster
   │  image: 930271538018.dkr.ecr.us-east-2.amazonaws.com/expense-ledger:latest
   ▼
FastAPI app (uvicorn, port 8000)
   │
   ▼
PostgreSQL (RDS)
```

**AWS Resources:**
- Region: `us-east-2`
- ECR: `930271538018.dkr.ecr.us-east-2.amazonaws.com/expense-ledger`
- ECS Cluster: `expense-ledger-cluster`
- ECS Service: `expense-ledger-service` (Fargate, 1 task)
- ALB: `expense-ledger-alb` — listeners on port 80 (public) and port 8000
- Security Group: `sg-0421ffe4f031f7950` (shared by ALB and ECS tasks) — inbound: 80, 8000 from 0.0.0.0/0

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/users` | Register a new user |
| POST | `/login` | Authenticate a user |
| POST | `/groups` | Create an expense group |
| POST | `/group-members` | Add a user to a group with a split ratio |
| POST | `/expenses` | Add an expense and automatically split it |
| POST | `/settle` | Record a settlement payment between two users |
| GET | `/groups/{group_id}/expenses` | List all expenses in a group |
| GET | `/groups/{group_id}/balances` | Get net balances for each member |
| GET | `/groups/{group_id}/settlement` | Get simplified debt settlement plan |
| GET | `/groups/{group_id}/members/{user_id}/drift` | Detect fairness drift for a member |
| GET | `/users/{user_id}/groups` | List all groups a user belongs to |

## Running Locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Set environment variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

## Deploying to AWS

```bash
# Build and push image
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 930271538018.dkr.ecr.us-east-2.amazonaws.com
docker build -t expense-ledger .
docker tag expense-ledger:latest 930271538018.dkr.ecr.us-east-2.amazonaws.com/expense-ledger:latest
docker push 930271538018.dkr.ecr.us-east-2.amazonaws.com/expense-ledger:latest

# Force ECS to redeploy
aws ecs update-service --cluster expense-ledger-cluster --service expense-ledger-service --force-new-deployment --region us-east-2
```
