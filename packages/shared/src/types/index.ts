import type {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  OrderType,
  UserRole,
  ServiceCategory,
  SubscriptionStatus,
  DeliveryStatus,
  BillingCycle,
} from "../constants/index.js";

// ── Base ─────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ── Organization ─────────────────────────────────────────────
export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Branch ───────────────────────────────────────────────────
export interface Branch {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  address: string | null;
  lat: string | null;
  lng: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  operatingHours: Record<string, { open: string; close: string }>;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface BranchWithDistance extends Branch {
  distanceKm: number;
}

// ── User ─────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  orgId: string | null;
  branchId: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
  orgId: string | null;
  branchId: string | null;
  iat: number;
  exp: number;
}

// ── Service ──────────────────────────────────────────────────
export interface Service {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  category: ServiceCategory | null;
  basePrice: string;
  priceUnit: string;
  minQuantity: string;
  estimatedHours: number | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServicePlan {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  price: string;
  billingCycle: BillingCycle;
  includedKg: string | null;
  includedLoads: number | null;
  services: unknown;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Customer ─────────────────────────────────────────────────
export interface Customer {
  id: string;
  userId: string | null;
  orgId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  notes: string | null;
  preferredBranchId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string;
  addressLine: string;
  lat: string | null;
  lng: string | null;
  isDefault: boolean;
  createdAt: string;
}

// ── Order ────────────────────────────────────────────────────
export interface Order {
  id: string;
  orderNumber: string;
  branchId: string;
  customerId: string | null;
  subscriptionId: string | null;
  status: OrderStatus;
  orderType: OrderType;
  subtotal: string;
  discount: string;
  deliveryFee: string;
  total: string;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  pickupAddressId: string | null;
  deliveryAddressId: string | null;
  estimatedCompletion: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  serviceId: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  notes: string | null;
  createdAt: string;
  service?: Service;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  customer?: Customer | null;
  branch?: Branch;
}

// ── Payment ──────────────────────────────────────────────────
export interface Payment {
  id: string;
  orderId: string;
  branchId: string;
  amount: string;
  method: PaymentMethod;
  status: string;
  reference: string | null;
  paymongoId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ── Delivery ─────────────────────────────────────────────────
export interface Delivery {
  id: string;
  orderId: string;
  branchId: string;
  type: "pickup" | "delivery" | null;
  status: DeliveryStatus;
  driverName: string | null;
  driverPhone: string | null;
  addressId: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Re-exports ───────────────────────────────────────────────
export type {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  OrderType,
  UserRole,
  ServiceCategory,
  SubscriptionStatus,
  DeliveryStatus,
  BillingCycle,
};
