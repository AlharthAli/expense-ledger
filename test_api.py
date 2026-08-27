#!/usr/bin/env python3
"""End-to-end smoke test for the Ledger API."""

import requests
import sys
import uuid

BASE = "http://expense-ledger-alb-185467570.us-east-2.elb.amazonaws.com"

PASS = "\033[32m✓\033[0m"
FAIL = "\033[31m✗\033[0m"

def check(label, condition, detail=""):
    if condition:
        print(f"  {PASS} {label}")
    else:
        print(f"  {FAIL} {label}" + (f" — {detail}" if detail else ""))
    return condition

def section(title):
    print(f"\n{'─'*50}\n  {title}\n{'─'*50}")

ok = True

# ── 1. Sign up a fresh test user ─────────────────────
section("1. SIGNUP")
email = f"test_{uuid.uuid4().hex[:6]}@example.com"
r = requests.post(f"{BASE}/users", json={"name": "Test Runner", "email": email, "password": "pass123"})
ok &= check("POST /users returns 200", r.status_code == 200, r.text)

# ── 2. Login ─────────────────────────────────────────
section("2. LOGIN")
r = requests.post(f"{BASE}/login", json={"email": email, "password": "pass123"})
ok &= check("POST /login returns 200", r.status_code == 200, r.text)
user_id = r.json().get("user_id")
ok &= check(f"Returns user_id ({user_id})", user_id is not None)

# ── 3. Create group — key fix: returns real group_id ─
section("3. CREATE GROUP")
r = requests.post(f"{BASE}/groups", json={"name": "Smoke Test Group"})
ok &= check("POST /groups returns 200", r.status_code == 200, r.text)
group_id = r.json().get("group_id")
ok &= check(f"Returns real group_id ({group_id})", group_id is not None, "BROKEN if None — old code returned no ID")

# ── 4. Add creator as member ──────────────────────────
section("4. ADD SELF TO GROUP")
r = requests.post(f"{BASE}/group-members", json={"group_id": group_id, "user_id": user_id, "split_ratio": 0.5})
ok &= check("POST /group-members returns 200", r.status_code == 200, r.text)

# ── 5. Add a guest member by name (no account needed) ─
section("5. GUEST MEMBER (add by name)")
r = requests.post(f"{BASE}/users/guest", json={"name": "Alice Guest"})
ok &= check("POST /users/guest returns 200", r.status_code == 200, r.text)
guest_id = r.json().get("user_id")
ok &= check(f"Returns guest user_id ({guest_id})", guest_id is not None)
r = requests.post(f"{BASE}/group-members", json={"group_id": group_id, "user_id": guest_id, "split_ratio": 0.5})
ok &= check("Guest added to group", r.status_code == 200, r.text)

# ── 6. Duplicate member rejected ─────────────────────
section("6. DUPLICATE MEMBER REJECTED")
r = requests.post(f"{BASE}/group-members", json={"group_id": group_id, "user_id": user_id, "split_ratio": 0.5})
ok &= check("Adding same member twice returns 400", r.status_code == 400, r.text)
ok &= check("Error message is human-readable", "already a member" in r.json().get("detail","").lower(), r.text)

# ── 7. Group appears in user's group list ────────────
section("7. USER'S GROUP LIST")
r = requests.get(f"{BASE}/users/{user_id}/groups")
ok &= check("GET /users/{id}/groups returns 200", r.status_code == 200, r.text)
group_ids = [row[0] for row in r.json()]
ok &= check(f"New group ({group_id}) in list", group_id in group_ids, f"Got: {group_ids}")

# ── 8. Add an expense ────────────────────────────────
section("8. ADD EXPENSE")
r = requests.post(f"{BASE}/expenses", json={
    "group_id": group_id, "user_id": user_id,
    "cost": 100.0, "desc": "Smoke test dinner", "date": "2026-08-26"
})
ok &= check("POST /expenses returns 200", r.status_code == 200, r.text)

# ── 9. Balances — names not user IDs ────────────────
section("9. BALANCES (names not IDs)")
r = requests.get(f"{BASE}/groups/{group_id}/balances")
ok &= check("GET /groups/{id}/balances returns 200", r.status_code == 200, r.text)
balances = r.json()
ok &= check("Returns list (not dict)", isinstance(balances, list), type(balances).__name__)
ok &= check("Each entry has name field", all("name" in b for b in balances), str(balances))
ok &= check("Names are strings not 'User N'", all(not b["name"].startswith("User ") for b in balances), str(balances))
for b in balances:
    print(f"       {b['name']:20s} balance={b['balance']:+.2f}")

# ── 10. Settlement ───────────────────────────────────
section("10. SETTLEMENT")
r = requests.get(f"{BASE}/groups/{group_id}/settlement")
ok &= check("GET /groups/{id}/settlement returns 200", r.status_code == 200, r.text)
settlement = r.json()
ok &= check("Has 'settlement' key", "settlement" in settlement, str(settlement.keys()))
txns = settlement.get("settlement", [])
for t in txns:
    print(f"       {t.get('from_name')} → {t.get('to_name')}: ${t.get('amount'):.2f}")
if not txns:
    print("       (no transactions — balanced)")

# ── 11. Lookup by email ──────────────────────────────
section("11. EMAIL LOOKUP")
r = requests.get(f"{BASE}/users/lookup?email={email}")
ok &= check("GET /users/lookup finds user", r.status_code == 200, r.text)
ok &= check("Returns correct user_id", r.json().get("user_id") == user_id)
r = requests.get(f"{BASE}/users/lookup?email=nobody@nowhere.com")
ok &= check("Unknown email returns 404", r.status_code == 404, r.text)

# ── Summary ──────────────────────────────────────────
print(f"\n{'═'*50}")
if ok:
    print("  \033[32mALL TESTS PASSED\033[0m")
else:
    print("  \033[31mSOME TESTS FAILED — see above\033[0m")
print(f"{'═'*50}\n")
sys.exit(0 if ok else 1)
