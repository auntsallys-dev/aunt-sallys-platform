import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  timestamp,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { branches } from "./branches.js";
import { users } from "./users.js";

/**
 * Register sessions = a per-branch shift / business-day.
 *
 * Required by BIR for any POS deployment: a day's invoices are closed off
 * with a Z-Reading. The Z-Reading is the immutable summary of the day.
 * Once a day is closed, no new invoice may be issued with that day's date,
 * and the Z-Reading PDF is archived.
 *
 * The table also supports an opening cash float (for cash registers) and
 * the closing cash count for over/short reconciliation.
 */
export const registerSessions = pgTable(
  "register_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),

    // Business day (Asia/Manila). Stored as date, not timestamp.
    businessDate: timestamp("business_date", { withTimezone: false, mode: "date" }).notNull(),

    // 'open' until the cashier runs Close. 'closed' is terminal — no further
    // changes permitted (enforced by trigger added in the SQL post-migration).
    status: varchar("status", { length: 16 }).default("open").notNull(),

    // Opening
    openedAt: timestamp("opened_at", { withTimezone: true }).defaultNow().notNull(),
    openedBy: uuid("opened_by")
      .notNull()
      .references(() => users.id),
    openingCash: decimal("opening_cash", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),

    // Closing — populated when status flips to 'closed'.
    closedAt: timestamp("closed_at", { withTimezone: true }),
    closedBy: uuid("closed_by").references(() => users.id),
    countedCash: decimal("counted_cash", { precision: 12, scale: 2 }),
    cashOverShort: decimal("cash_over_short", { precision: 12, scale: 2 }),

    // Z-Reading sequential counter, one per branch, never reset.
    zNumber: varchar("z_number", { length: 32 }),

    // Daily aggregates captured at close time. These are denormalized — also
    // computable from the underlying invoice rows — but stored here for the
    // permanent Z-Reading record so the day can never silently re-summarize.
    grossSales: decimal("gross_sales", { precision: 14, scale: 2 }),
    vatableSales: decimal("vatable_sales", { precision: 14, scale: 2 }),
    vatExemptSales: decimal("vat_exempt_sales", { precision: 14, scale: 2 }),
    zeroRatedSales: decimal("zero_rated_sales", { precision: 14, scale: 2 }),
    vatAmount: decimal("vat_amount", { precision: 14, scale: 2 }),
    discountTotal: decimal("discount_total", { precision: 14, scale: 2 }),
    voidsCount: decimal("voids_count", { precision: 8, scale: 0 }),
    invoicesCount: decimal("invoices_count", { precision: 8, scale: 0 }),

    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // One session per branch per business day.
    unique("register_sessions_branch_date_unique").on(t.branchId, t.businessDate),
    index("register_sessions_branch_status_idx").on(t.branchId, t.status),
    check(
      "register_sessions_status_check",
      sql`${t.status} IN ('open', 'closed')`
    ),
  ]
);

export type RegisterSession = typeof registerSessions.$inferSelect;
export type NewRegisterSession = typeof registerSessions.$inferInsert;
