import {
  pgTable,
  uuid,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { salesInvoices } from "./invoices.js";
import { users } from "./users.js";

/**
 * Append-only log of every time a Sales Invoice is rendered for printing.
 *
 * BIR requires that any print AFTER the original be visibly marked "REPRINT"
 * and that reprints be logged. This table is the log: the first print of an
 * invoice is the original (printSeq = 1, isReprint = false); every subsequent
 * render is a reprint (printSeq = 2, 3, … isReprint = true). The renderer
 * stamps the REPRINT watermark based on this flag.
 *
 * Rows are NEVER updated or deleted — a Postgres trigger (see migration
 * 0002_invoice_prints.sql) raises on UPDATE/DELETE/TRUNCATE. Do not add an
 * update path; a reprint is a new row, never a mutation of an old one.
 */
export const invoicePrints = pgTable(
  "invoice_prints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => salesInvoices.id, { onDelete: "restrict" }),
    // Who triggered this print/reprint.
    printedBy: uuid("printed_by").references(() => users.id),
    // 1 = original, 2+ = reprint. Monotonic per invoice.
    printSeq: integer("print_seq").notNull(),
    isReprint: boolean("is_reprint").notNull(),
    printedAt: timestamp("printed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("invoice_prints_invoice_idx").on(t.invoiceId, t.printSeq),
    index("invoice_prints_printed_at_idx").on(t.printedAt),
  ]
);

export type InvoicePrint = typeof invoicePrints.$inferSelect;
export type NewInvoicePrint = typeof invoicePrints.$inferInsert;
