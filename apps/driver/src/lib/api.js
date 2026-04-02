const API_URL = import.meta.env.VITE_API_URL ?? "";
const BASE = `${API_URL}/api/v1`;
function getToken() {
    return localStorage.getItem("driver_token");
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
    },
    driver: {
        getOrders: (branchId) => {
            const qs = branchId ? `?branchId=${branchId}` : "";
            return request("GET", `/drivers/orders${qs}`);
        },
        postLocation: (lat, lng, branchId, orderId) => request("POST", "/drivers/location", { lat, lng, branchId, orderId }),
        markDelivered: (orderId) => request("PATCH", `/drivers/orders/${orderId}/deliver`, {}),
        selfAssign: (orderId) => request("PATCH", `/drivers/orders/${orderId}/self-assign`, {}),
        markPickedUp: (orderId) => request("PATCH", `/drivers/orders/${orderId}/mark-picked-up`, {}),
    },
};
//# sourceMappingURL=api.js.map