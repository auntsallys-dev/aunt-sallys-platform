import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orders } from "./orders.js";
import { branches } from "./branches.js";
import { customerAddresses } from "./customers.js";

export const deliveries = pgTable("deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id),
  type: varchar("type", { length: 10 }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  driverName: varchar("driver_name", { length: 255 }),
  driverPhone: varchar("driver_phone", { length: 20 }),
  addressId: uuid("address_id").references(() => customerAddresses.id),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check("deliveries_type_check", sql`${t.type} IN ('pickup', 'delivery')`),
  check("deliveries_status_check", sql`${t.status} IN ('pending', 'assigned', 'in_transit', 'completed', 'failed')`),
]);

export type Delivery = typeof deliveries.$inferSelect;
export type NewDelivery = typeof deliveries.$inferInsert;
