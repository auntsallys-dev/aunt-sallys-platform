import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";

/**
 * Append-only audit log for every change to a finance-impacting record.
 *
 * Required by BIR for CAS / Components-of-CAS accreditation:
 *   "Maintains an immutable audit trail of every change on a Sales Invoice,
 *    Collection Receipt, or related line item, capturing user, timestamp,
 *    and before/after values."
 *
 * Rows are NEVER updated or deleted in normal operation. A Postgres
 * trigger (see migration 0002) raises EXCEPTION on UPDATE or DELETE.
 *
 * The `before` and `after` JSON columns capture the full row state
 * pre- and post-change. `op` is one of insert | update | void | post.
 * For inserts, `before` is null; for voids, `after` carries the void
 * metadata and the original row remains intact in its source table.
 */
export const auditTrail = pgTable(
  "audit_trail",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Who
    userId: uuid("user_id").references(() => users.id),
    userEmail: varchar("user_email", { length: 255 }), // denormalized for retention even if user is deleted
    userRole: varchar("user_role", { length: 32 }),
    ipAddress: varchar("ip_address", { length: 64 }), // IPv4 or IPv6
    userAgent: text("user_agent"),

    // What
    tableName: varchar("table_name", { length: 64 }).notNull(),
    recordId: uuid("record_id").notNull(),
    op: varchar("op", { length: 16 }).notNull(),

    // Before / after snapshots (jsonb for queryability)
    before: jsonb("before"),
    after: jsonb("after"),

    // Optional human-readable reason (e.g. "void — wrong customer")
    reason: text("reason"),

    // When (immutable; defaults to NOW(), captured server-side)
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    check(
      "audit_trail_op_check",
      sql`${t.op} IN ('insert', 'update', 'void', 'post', 'unpost', 'soft_delete')`
    ),
    // Lookups by record (e.g. "show me everything that ever happened to invoice X")
    index("audit_trail_record_idx").on(t.tableName, t.recordId),
    // Lookups by user (e.g. "what did this cashier do today")
    index("audit_trail_user_idx").on(t.userId, t.createdAt),
    // Lookups by time (e.g. month-end report)
    index("audit_trail_created_at_idx").on(t.createdAt),
  ]
);

export type AuditTrail = typeof auditTrail.$inferSelect;
export type NewAuditTrail = typeof auditTrail.$inferInsert;

/** Operation kinds we record. */
export type AuditOp =
  | "insert"
  | "update"
  | "void"
  | "post"
  | "unpost"
  | "soft_delete";
