const API_URL = import.meta.env.VITE_API_URL ?? "";
const BASE = `${API_URL}/api/v1`;

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
    create: (data: { firstName: string; lastName?: string; phone?: string; email?: string; address?: string }) =>
      request<{ success: boolean; data: any }>("POST", "/customers", data),
  },
  orders: {
    list: (params?: { branchId?: string; status?: string; date?: string }) => {
      const qs = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ success: boolean; data: any[] }>("GET", `/orders${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<{ success: boolean; data: any }>("GET", `/orders/${id}`),
    create: (data: any) => request<{ success: boolean; data: any }>("POST", "/orders", data),
    edit: (id: string, data: {
      addItems?: { serviceId: string; quantity: number; notes?: string }[];
      removeItemIds?: string[];
      extraCharges?: { name: string; price: number }[];
      refund?: boolean;
    }) => request<{ success: boolean; data: any }>("PATCH", `/orders/${id}`, data),
    updateStatus: (id: string, status: string, notes?: string) =>
      request<{ success: boolean; data: any }>("PATCH", `/orders/${id}/status`, { status, notes }),
    cancel: (id: string) =>
      request<{ success: boolean; data: any }>("PATCH", `/orders/${id}/status`, { status: "cancelled" }),
  },
  payments: {
    create: (data: { orderId: string; amount: number; method: string; reference?: string }) =>
      request<{ success: boolean; data: any }>("POST", "/payments", data),
  },
  analytics: {
    overview: (period: "today" | "week" | "month") =>
      request<{ success: boolean; data: any }>("GET", `/analytics/overview?period=${period}`),
    dashboard: (params: { branchId?: string; from: string; to: string }) => {
      const qs = new URLSearchParams();
      if (params.branchId && params.branchId !== "all") qs.set("branchId", params.branchId);
      qs.set("from", params.from);
      qs.set("to", params.to);
      return request<{ success: boolean; data: any }>("GET", `/admin/analytics?${qs}`);
    },
  },
  admin: {
    customers: {
      list: (params: { page?: number; pageSize?: number; sort?: string; search?: string }) => {
        const qs = new URLSearchParams(params as Record<string, string>).toString();
        return request<{ success: boolean; data: any[]; meta: any }>("GET", `/admin/customers?${qs}`);
      },
      get: (customerId: string) =>
        request<{ success: boolean; data: any }>("GET", `/admin/customers/${customerId}`),
      update: (customerId: string, data: Record<string, unknown>) =>
        request<{ success: boolean; data: any }>("PATCH", `/admin/customers/${customerId}`, data),
      orderHistory: (customerId: string) =>
        request<{ success: boolean; data: any }>("GET", `/admin/customers/${customerId}/orders`),
    },
    drivers: {
      list: (branchId: string) =>
        request<{ success: boolean; data: any[] }>("GET", `/admin/drivers?branchId=${branchId}`),
      locations: (branchId: string) =>
        request<{ success: boolean; data: any }>("GET", `/admin/drivers/locations?branchId=${branchId}`),
    },
  },
  adminServices: {
    list: () => request<{ success: boolean; data: any[] }>("GET", "/services"),
    create: (data: { name: string; category: string; basePrice: number; priceUnit: string; estimatedHours?: number; description?: string }) =>
      request<{ success: boolean; data: any }>("POST", "/services", data),
    update: (id: string, data: Partial<{ name: string; category: string; basePrice: number; priceUnit: string; estimatedHours: number; description: string; isActive: boolean }>) =>
      request<{ success: boolean; data: any }>("PATCH", `/services/${id}`, data),
    delete: (id: string) =>
      request<{ success: boolean; data: any }>("DELETE", `/services/${id}`),
  },
  adminBranches: {
    list: () => request<{ success: boolean; data: any[] }>("GET", "/branches?all=true"),
    create: (data: { name: string; slug: string; address?: string; phone?: string; email?: string; lat?: number; lng?: number }) =>
      request<{ success: boolean; data: any }>("POST", "/branches", data),
    update: (id: string, data: Partial<{ name: string; slug: string; address: string; phone: string; email: string; isActive: boolean; lat: number; lng: number }>) =>
      request<{ success: boolean; data: any }>("PATCH", `/branches/${id}`, data),
    delete: (id: string) =>
      request<{ success: boolean; data: any }>("DELETE", `/branches/${id}`),
  },
  assignDriver: (orderId: string, driverId: string) =>
    request<{ success: boolean; data: any }>("PATCH", `/orders/${orderId}/assign-driver`, { driverId }),
  transferBranch: (orderId: string, branchId: string, notes?: string) =>
    request<{ success: boolean; data: any }>("PATCH", `/orders/${orderId}/transfer-branch`, { branchId, notes }),
  driver: {
    getOrders: (branchId?: string) => {
      const qs = branchId ? `?branchId=${branchId}` : "";
      return request<{ success: boolean; data: any }>("GET", `/drivers/orders${qs}`);
    },
    postLocation: (lat: number, lng: number, branchId: string, orderId?: string) =>
      request<{ success: boolean; data: any }>("POST", "/drivers/location", { lat, lng, branchId, orderId }),
    markDelivered: (orderId: string) =>
      request<{ success: boolean; data: any }>("PATCH", `/drivers/orders/${orderId}/deliver`, {}),
    collectPayment: (orderId: string, paymentMethod: "cash" | "gcash" | "maya") =>
      request<{ success: boolean; data: any }>("PATCH", `/drivers/orders/${orderId}/collect-payment`, { paymentMethod }),
    selfAssign: (orderId: string) =>
      request<{ success: boolean; data: any }>("PATCH", `/drivers/orders/${orderId}/self-assign`, {}),
    markPickedUp: (orderId: string) =>
      request<{ success: boolean; data: any }>("PATCH", `/drivers/orders/${orderId}/mark-picked-up`, {}),
  },
};
