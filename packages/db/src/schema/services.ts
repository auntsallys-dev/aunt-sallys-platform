import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  integer,
  boolean,
  jsonb,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";
import { branches } from "./branches.js";

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  priceUnit: varchar("price_unit", { length: 20 }).default("kg").notNull(),
  minQuantity: decimal("min_quantity", { precision: 10, scale: 2 }).default("1").notNull(),
  estimatedHours: integer("estimated_hours"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const branchServices = pgTable(
  "branch_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id),
    priceOverride: decimal("price_override", { precision: 10, scale: 2 }),
    isAvailable: boolean("is_available").default(true).notNull(),
  },
  (t) => [unique().on(t.branchId, t.serviceId)]
);

export const servicePlans = pgTable("service_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  billingCycle: varchar("billing_cycle", { length: 20 }).default("monthly").notNull(),
  includedKg: decimal("included_kg", { precision: 10, scale: 2 }),
  includedLoads: integer("included_loads"),
  services: jsonb("services"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type BranchService = typeof branchServices.$inferSelect;
export type NewBranchService = typeof branchServices.$inferInsert;
export type ServicePlan = typeof servicePlans.$inferSelect;
export type NewServicePlan = typeof servicePlans.$inferInsert;
