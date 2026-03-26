import {
  pgTable,
  uuid,
  decimal,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { branches } from "./branches.js";
import { orders } from "./orders.js";

export const driverLocations = pgTable("driver_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id")
    .notNull()
    .references(() => users.id),
  branchId: uuid("branch_id")
    .notNull()
    .references(() => branches.id),
  orderId: uuid("order_id").references(() => orders.id),
  lat: decimal("lat", { precision: 10, scale: 8 }).notNull(),
  lng: decimal("lng", { precision: 11, scale: 8 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DriverLocation = typeof driverLocations.$inferSelect;
export type NewDriverLocation = typeof driverLocations.$inferInsert;
