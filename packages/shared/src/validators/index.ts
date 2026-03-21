import { z } from "zod";
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  ORDER_TYPES,
  USER_ROLES,
  SERVICE_CATEGORIES,
} from "../constants/index.js";

// ── Auth ─────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
  password: z.string().min(8),
}).refine((d) => d.email || d.phone, {
  message: "Email or phone is required",
});

export const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(7).max(20).optional(),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
}).refine((d) => d.email || d.phone, {
  message: "Email or phone is required",
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

// ── Customer ─────────────────────────────────────────────────
export const createCustomerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().min(7).max(20),
  email: z.string().email().optional(),
  notes: z.string().optional(),
  preferredBranchId: z.string().uuid().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const createAddressSchema = z.object({
  label: z.string().max(50).default("home"),
  addressLine: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isDefault: z.boolean().default(false),
});

// ── Order ────────────────────────────────────────────────────
export const orderItemSchema = z.object({
  serviceId: z.string().uuid(),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});

export const createOrderSchema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  orderType: z.enum(ORDER_TYPES).default("walk_in"),
  items: z.array(orderItemSchema).min(1),
  notes: z.string().optional(),
  pickupAddressId: z.string().uuid().optional(),
  deliveryAddressId: z.string().uuid().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  notes: z.string().optional(),
});

// ── Service ──────────────────────────────────────────────────
export const createServiceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  category: z.enum(SERVICE_CATEGORIES).optional(),
  basePrice: z.number().positive(),
  priceUnit: z.enum(["kg", "piece", "load", "pair"]).default("kg"),
  minQuantity: z.number().positive().default(1),
  estimatedHours: z.number().int().positive().optional(),
  sortOrder: z.number().int().default(0),
});

export const updateServiceSchema = createServiceSchema.partial();

// ── Branch ───────────────────────────────────────────────────
export const createBranchSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  address: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  operatingHours: z.record(z.object({ open: z.string(), close: z.string() })).optional(),
});

export const updateBranchSchema = createBranchSchema.partial();

// ── Payment ──────────────────────────────────────────────────
export const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().optional(),
});

// ── Nearest branch ───────────────────────────────────────────
export const nearestBranchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

// ── Pagination ───────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// ── Staff ────────────────────────────────────────────────────
export const createStaffSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.enum(["staff", "branch_admin"]),
  branchId: z.string().uuid(),
});

// ── Types ────────────────────────────────────────────────────
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
