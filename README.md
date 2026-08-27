# Expense Ledger

A full-stack shared expense tracker — split costs between friends, track balances, detect fairness drift, and settle up with a single click.

## Live URLs

**Frontend:** http://expense-ledger-frontend-930271538018.s3-website.us-east-2.amazonaws.com

**API Base URL:** http://expense-ledger-alb-185467570.us-east-2.elb.amazonaws.com

**Interactive API docs:** http://expense-ledger-alb-185467570.us-east-2.elb.amazonaws.com/docs

## Architecture

```
Browser (React app on S3)
   │
   ▼
AWS S3 (static site hosting)
   │  serves index.html + JS/CSS assets
   │
   │  API calls (HTTP)
   ▼
AWS ALB (expense-ledger-alb, port 80)
   │  stable DNS, forwards to port 8000
   ▼
AWS ECS Fargate (expense-ledger-service)
   │  cluster: expense-ledger-cluster
   │  image: 930271538018.dkr.ecr.us-east-2.amazonaws.com/expense-ledger:latest
   ▼
FastAPI app (uvicorn, port 8000)
   │
   ▼
AWS RDS (PostgreSQL, private subnet)
```

**AWS Resources:**
- Region: `us-east-2`
- S3 Bucket: `expense-ledger-frontend-930271538018` (static site hosting)
- ECR: `930271538018.dkr.ecr.us-east-2.amazonaws.com/expense-ledger`
- ECS Cluster: `expense-ledger-cluster`
- ECS Service: `expense-ledger-service` (Fargate, 1 task)
- ALB: `expense-ledger-alb` — listeners on port 80 (public) and port 8000
- Security Group: `sg-0421ffe4f031f7950` (shared by ALB and ECS tasks) — inbound: 80, 8000 from 0.0.0.0/0

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/users` | Register a new user |
| POST | `/users/guest` | Create a guest user (name only, no login) |
| POST | `/login` | Authenticate a user |
| GET | `/users/lookup?email=` | Look up a registered user by email |
| GET | `/users/{user_id}/groups` | List all groups a user belongs to |
| POST | `/groups` | Create an expense group |
| POST | `/group-members` | Add a user to a group with a split ratio |
| PATCH | `/groups/{group_id}/members/{user_id}` | Update a member's split ratio |
| GET | `/groups/{group_id}/members` | List all members in a group |
| POST | `/expenses` | Add an expense and automatically split it |
| GET | `/groups/{group_id}/expenses` | List all expenses in a group |
| GET | `/groups/{group_id}/balances` | Get net balances for each member (with names) |
| GET | `/groups/{group_id}/settlement` | Get simplified debt settlement plan |
| GET | `/groups/{group_id}/members/{user_id}/drift` | Detect fairness drift for a member |
| POST | `/settle` | Record a settlement payment between two users |

## Running Locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Set environment variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

## Deploying to AWS

### API (ECS)

```bash
# Build and push image
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 930271538018.dkr.ecr.us-east-2.amazonaws.com
docker build -t expense-ledger .
docker tag expense-ledger:latest 930271538018.dkr.ecr.us-east-2.amazonaws.com/expense-ledger:latest
docker push 930271538018.dkr.ecr.us-east-2.amazonaws.com/expense-ledger:latest

# Force ECS to redeploy
aws ecs update-service --cluster expense-ledger-cluster --service expense-ledger-service --force-new-deployment --region us-east-2
```

### Frontend (S3)

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://expense-ledger-frontend-930271538018 --delete
```
