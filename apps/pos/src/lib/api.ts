const BASE = "/api/v1";

function getToken() {
  return localStorage.getItem("pos_token");
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
    logout: (refreshToken?: string) =>
      request("POST", "/auth/logout", { refreshToken }),
  },
  branches: {
    list: () => request<{ success: boolean; data: any[] }>("GET", "/branches"),
  },
  services: {
    list: (branchId?: string) =>
      request<{ success: boolean; data: any[] }>("GET", `/services${branchId ? `?branchId=${branchId}` : ""}`),
  },
  customers: {
    search: (query: string) => {
      const isPhone = /^\d/.test(query);
      const param = isPhone ? `phone=${encodeURIComponent(query)}` : `name=${encodeURIComponent(query)}`;
      return request<{ success: boolean; data: any[] }>("GET", `/customers?${param}`);
    },
    create: (data: { firstName: string; lastName?: string; phone?: string; email?: string }) =>
      request<{ success: boolean; data: any }>("POST", "/customers", data),
  },
  orders: {
    list: (params?: { branchId?: string; status?: string; date?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ success: boolean; data: any[] }>("GET", `/orders${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<{ success: boolean; data: any }>("GET", `/orders/${id}`),
    create: (data: any) => request<{ success: boolean; data: any }>("POST", "/orders", data),
    updateStatus: (id: string, status: string, notes?: string) =>
      request<{ success: boolean; data: any }>("PATCH", `/orders/${id}/status`, { status, notes }),
  },
  payments: {
    create: (data: { orderId: string; amount: number; method: string; reference?: string }) =>
      request<{ success: boolean; data: any }>("POST", "/payments", data),
  },
};
