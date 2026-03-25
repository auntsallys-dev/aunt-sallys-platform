const BASE = "/api/v1";
function getToken() {
    return localStorage.getItem("pos_token");
}
async function request(method, path, body) {
    const token = getToken();
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json();
    if (!res.ok)
        throw new Error(json.error ?? "Request failed");
    return json;
}
export const api = {
    auth: {
        login: (email, password) => request("POST", "/auth/login", { email, password }),
        logout: (refreshToken) => request("POST", "/auth/logout", { refreshToken }),
    },
    branches: {
        list: () => request("GET", "/branches"),
    },
    services: {
        list: (branchId) => request("GET", `/services${branchId ? `?branchId=${branchId}` : ""}`),
    },
    customers: {
        search: (query) => {
            const isPhone = /^\d/.test(query);
            const param = isPhone ? `phone=${encodeURIComponent(query)}` : `name=${encodeURIComponent(query)}`;
            return request("GET", `/customers?${param}`);
        },
        create: (data) => request("POST", "/customers", data),
    },
    orders: {
        list: (params) => {
            const qs = new URLSearchParams(params).toString();
            return request("GET", `/orders${qs ? `?${qs}` : ""}`);
        },
        get: (id) => request("GET", `/orders/${id}`),
        create: (data) => request("POST", "/orders", data),
        updateStatus: (id, status, notes) => request("PATCH", `/orders/${id}/status`, { status, notes }),
    },
    payments: {
        create: (data) => request("POST", "/payments", data),
    },
};
//# sourceMappingURL=api.js.map