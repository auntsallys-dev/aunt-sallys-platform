// ── Order Statuses ───────────────────────────────────────────
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "out_for_pickup",
  "picked_up",
  "processing",
  "ready",
  "assigned_for_pickup",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  out_for_pickup: "Out for Pickup",
  picked_up: "Picked Up",
  processing: "Processing",
  ready: "Ready for Delivery",
  assigned_for_pickup: "Assigned for Pickup",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "yellow",
  confirmed: "blue",
  out_for_pickup: "cyan",
  picked_up: "purple",
  processing: "orange",
  ready: "teal",
  assigned_for_pickup: "blue",
  out_for_delivery: "indigo",
  delivered: "green",
  completed: "green",
  cancelled: "red",
};

// ── Payment Statuses ─────────────────────────────────────────
export const PAYMENT_STATUSES = ["unpaid", "partial", "paid", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// ── Payment Methods ──────────────────────────────────────────
export const PAYMENT_METHODS = ["cash", "card", "gcash", "maya", "bank_transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Credit/Debit Card",
  gcash: "GCash",
  maya: "Maya",
  bank_transfer: "Bank Transfer",
};

// ── Order Types ──────────────────────────────────────────────
export const ORDER_TYPES = ["walk_in", "pickup", "delivery"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

// ── User Roles ───────────────────────────────────────────────
export const USER_ROLES = ["customer", "staff", "branch_admin", "org_admin", "superadmin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  customer: 0,
  staff: 1,
  branch_admin: 2,
  org_admin: 3,
  superadmin: 4,
};

// ── Service Categories ───────────────────────────────────────
export const SERVICE_CATEGORIES = ["wash", "dry_clean", "iron", "special"] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  wash: "Wash",
  dry_clean: "Dry Clean",
  iron: "Iron",
  special: "Special",
};

// ── Subscription Statuses ────────────────────────────────────
export const SUBSCRIPTION_STATUSES = ["active", "paused", "cancelled", "expired"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

// ── Delivery Statuses ────────────────────────────────────────
export const DELIVERY_STATUSES = ["pending", "assigned", "in_transit", "completed", "failed"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

// ── Billing Cycles ───────────────────────────────────────────
export const BILLING_CYCLES = ["weekly", "monthly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

// ── App Constants ────────────────────────────────────────────
export const ORDER_NUMBER_PREFIX = "AS";
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
