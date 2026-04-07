import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { branches } from "./branches.js";
import { customers, customerAddresses, customerSubscriptions } from "./customers.js";
import { services } from "./services.js";
import { users } from "./users.js";

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: varchar("order_number", { length: 20 }).unique().notNull(),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id),
  customerId: uuid("customer_id").references(() => customers.id),
  subscriptionId: uuid("subscription_id").references(() => customerSubscriptions.id),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  orderType: varchar("order_type", { length: 20 }).default("walk_in").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0").notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0").notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).default("0").notNull(),
  paymentStatus: varchar("payment_status", { length: 20 }).default("unpaid").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }),
  notes: text("notes"),
  pickupAddressId: uuid("pickup_address_id").references(() => customerAddresses.id),
  deliveryAddressId: uuid("delivery_address_id").references(() => customerAddresses.id),
  estimatedCompletion: timestamp("estimated_completion", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  returnMethod: varchar("return_method", { length: 50 }).default("delivery"),
  needsClarification: boolean("needs_clarification").default(false),
  bookedAs: varchar("booked_as", { length: 255 }),
  createdBy: uuid("created_by").references(() => users.id),
  pickupPhotoUrl: text("pickup_photo_url"),
  deliveryPhotoUrl: text("delivery_photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check("orders_status_check", sql`${t.status} IN ('pending', 'confirmed', 'out_for_pickup', 'picked_up', 'processing', 'ready', 'assigned_for_pickup', 'out_for_delivery', 'delivered', 'collected', 'completed', 'cancelled', 'transferred')`),
  check("orders_order_type_check", sql`${t.orderType} IN ('walk_in', 'pickup', 'delivery')`),
  check("orders_payment_status_check", sql`${t.paymentStatus} IN ('unpaid', 'partial', 'paid', 'refunded')`),
]);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").references(() => services.id),
  customName: text("custom_name"),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 30 }).notNull(),
  notes: text("notes"),
  changedBy: uuid("changed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type NewOrderStatusHistory = typeof orderStatusHistory.$inferInsert;
