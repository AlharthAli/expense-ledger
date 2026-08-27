const BASE = "http://expense-ledger-alb-185467570.us-east-2.elb.amazonaws.com";

async function request(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body.detail) message = body.detail
    } catch {}
    throw new Error(message)
  }
  return res.json();
}

export const api = {
  signup: (name, email, password) =>
    request("POST", "/users", { name, email, password }),

  login: (email, password) =>
    request("POST", "/login", { email, password }),

  getUserGroups: (userId) =>
    request("GET", `/users/${userId}/groups`),

  getGroupMembers: (groupId) =>
    request("GET", `/groups/${groupId}/members`),

  updateMemberSplit: (groupId, userId, splitRatio) =>
    request("PATCH", `/groups/${groupId}/members/${userId}`, { split_ratio: splitRatio }),

  getGroupBalances: (groupId) =>
    request("GET", `/groups/${groupId}/balances`),

  getGroupSettlement: (groupId) =>
    request("GET", `/groups/${groupId}/settlement`),

  getGroupExpenses: (groupId) =>
    request("GET", `/groups/${groupId}/expenses`),

  createGroup: (name) =>
    request("POST", "/groups", { name }),

  createExpense: (groupId, userId, cost, desc, date, splits = null) =>
    request("POST", "/expenses", { group_id: groupId, user_id: userId, cost, desc, date, ...(splits ? { splits } : {}) }),

  createGuestUser: (name) =>
    request("POST", "/users/guest", { name }),

  lookupUser: (email) =>
    request("GET", `/users/lookup?email=${encodeURIComponent(email)}`),

  addGroupMember: (groupId, userId, splitRatio) =>
    request("POST", "/group-members", { group_id: groupId, user_id: userId, split_ratio: splitRatio }),

  settle: (groupId, fromUser, toUser, amount) =>
    request("POST", "/settle", { group_id: groupId, from_user: fromUser, to_user: toUser, amount }),

  getDrift: (groupId, userId) =>
    request("GET", `/groups/${groupId}/members/${userId}/drift`),
};
