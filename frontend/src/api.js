const BASE = "http://expense-ledger-alb-185467570.us-east-2.elb.amazonaws.com";

async function request(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  signup: (name, email, password) =>
    request("POST", "/users", { name, email, password }),

  login: (email, password) =>
    request("POST", "/login", { email, password }),

  getUserGroups: (userId) =>
    request("GET", `/users/${userId}/groups`),

  getGroupBalances: (groupId) =>
    request("GET", `/groups/${groupId}/balances`),

  getGroupSettlement: (groupId) =>
    request("GET", `/groups/${groupId}/settlement`),

  getGroupExpenses: (groupId) =>
    request("GET", `/groups/${groupId}/expenses`),

  createGroup: (name) =>
    request("POST", "/groups", { name }),

  createExpense: (groupId, userId, cost, desc, date) =>
    request("POST", "/expenses", { group_id: groupId, user_id: userId, cost, desc, date }),

  addGroupMember: (groupId, userId, splitRatio) =>
    request("POST", "/group-members", { group_id: groupId, user_id: userId, split_ratio: splitRatio }),
};
