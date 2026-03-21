import {
  pgTable,
  uuid,
  varchar,
  decimal,
  jsonb,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orders } from "./orders.js";
import { branches } from "./branches.js";

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  method: varchar("method", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  reference: varchar("reference", { length: 255 }),
  paymongoId: varchar("paymongo_id", { length: 255 }),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check("payments_status_check", sql`${t.status} IN ('pending', 'completed', 'failed', 'refunded')`),
]);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
