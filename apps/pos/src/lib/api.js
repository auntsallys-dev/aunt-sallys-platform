const API_URL = import.meta.env.VITE_API_URL ?? "";
const BASE = `${API_URL}/api/v1`;
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
        edit: (id, data) => request("PATCH", `/orders/${id}`, data),
        updateStatus: (id, status, notes) => request("PATCH", `/orders/${id}/status`, { status, notes }),
        cancel: (id) => request("PATCH", `/orders/${id}/status`, { status: "cancelled" }),
    },
    payments: {
        create: (data) => request("POST", "/payments", data),
    },
    analytics: {
        overview: (period) => request("GET", `/analytics/overview?period=${period}`),
    },
    admin: {
        customers: {
            list: (params) => {
                const qs = new URLSearchParams(params).toString();
                return request("GET", `/admin/customers?${qs}`);
            },
            get: (customerId) => request("GET", `/admin/customers/${customerId}`),
            update: (customerId, data) => request("PATCH", `/admin/customers/${customerId}`, data),
            orderHistory: (customerId) => request("GET", `/admin/customers/${customerId}/orders`),
        },
        drivers: {
            list: (branchId) => request("GET", `/admin/drivers?branchId=${branchId}`),
            locations: (branchId) => request("GET", `/admin/drivers/locations?branchId=${branchId}`),
        },
    },
    adminServices: {
        list: () => request("GET", "/services"),
        create: (data) => request("POST", "/services", data),
        update: (id, data) => request("PATCH", `/services/${id}`, data),
        delete: (id) => request("DELETE", `/services/${id}`),
    },
    adminBranches: {
        list: () => request("GET", "/branches?all=true"),
        create: (data) => request("POST", "/branches", data),
        update: (id, data) => request("PATCH", `/branches/${id}`, data),
        delete: (id) => request("DELETE", `/branches/${id}`),
    },
    assignDriver: (orderId, driverId) => request("PATCH", `/orders/${orderId}/assign-driver`, { driverId }),
    transferBranch: (orderId, branchId, notes) => request("PATCH", `/orders/${orderId}/transfer-branch`, { branchId, notes }),
    driver: {
        getOrders: (branchId) => {
            const qs = branchId ? `?branchId=${branchId}` : "";
            return request("GET", `/drivers/orders${qs}`);
        },
        postLocation: (lat, lng, branchId, orderId) => request("POST", "/drivers/location", { lat, lng, branchId, orderId }),
        markDelivered: (orderId) => request("PATCH", `/drivers/orders/${orderId}/deliver`, {}),
        collectPayment: (orderId, paymentMethod) => request("PATCH", `/drivers/orders/${orderId}/collect-payment`, { paymentMethod }),
        selfAssign: (orderId) => request("PATCH", `/drivers/orders/${orderId}/self-assign`, {}),
        markPickedUp: (orderId) => request("PATCH", `/drivers/orders/${orderId}/mark-picked-up`, {}),
    },
};
//# sourceMappingURL=api.js.map