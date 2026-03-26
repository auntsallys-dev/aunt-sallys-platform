const API_URL = import.meta.env.VITE_API_URL ?? "";
const BASE = `${API_URL}/api/v1`;

function getToken() {
  return localStorage.getItem("driver_token");
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
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
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ success: boolean; data: { accessToken: string; user: any } }>("POST", "/auth/login", { email, password }),
  },
  driver: {
    getOrders: (branchId?: string) => {
      const qs = branchId ? `?branchId=${branchId}` : "";
      return request<{ success: boolean; data: any[] }>("GET", `/drivers/orders${qs}`);
    },
    postLocation: (lat: number, lng: number, branchId: string, orderId?: string) =>
      request<{ success: boolean; data: any }>("POST", "/drivers/location", { lat, lng, branchId, orderId }),
    markDelivered: (orderId: string) =>
      request<{ success: boolean; data: any }>("PATCH", `/drivers/orders/${orderId}/deliver`, {}),
  },
};
