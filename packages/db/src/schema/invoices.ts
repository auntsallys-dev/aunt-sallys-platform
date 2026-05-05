import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  timestamp,
  index,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { branches } from "./branches.js";
import { orders } from "./orders.js";
import { customers } from "./customers.js";
import { services } from "./services.js";
import { users } from "./users.js";

/**
 * BIR-compliant Sales Invoice — the principal sales document under EOPT (RA 11976)
 * and RR 7-2024 / RR 11-2024. Sits alongside `orders` (the operational record):
 * an order represents the laundry job; an invoice represents the tax document.
 *
 * Invariants enforced by triggers (see migration 0002):
 *   - `invoice_number` is assigned by issue_invoice_number(branch_id) — never
 *     by the application — and is unique per branch.
 *   - When `posted = true`, the row cannot be UPDATEd (except for void) or DELETEd.
 *   - A void issues a paired reversal invoice with `voids_invoice_id` set.
 *     The original is NEVER deleted.
 */
export const salesInvoices = pgTable(
  "sales_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Sequential, non-resettable serial in the form "LM-BR<branchCode>-<00000001>".
    // Assigned atomically by the issue_invoice_number(branch_id) Postgres function.
    invoiceNumber: varchar("invoice_number", { length: 32 }).notNull(),

    // Operational order this invoice covers (1:1 — one invoice per order).
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),

    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),

    // ---- Customer info, captured at invoice time ----
    customerId: uuid("customer_id").references(() => customers.id),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    customerAddress: text("customer_address"),
    // Customer TIN — required if subtotal >= PHP 1,000 OR on customer request.
    customerTin: varchar("customer_tin", { length: 32 }),
    customerBusinessStyle: varchar("customer_business_style", { length: 255 }),

    // ---- Discount handling ----
    // none | sc (Senior Citizen, 20% off + VAT-exempt)
    //      | pwd (Person With Disability, 20% off + VAT-exempt)
    //      | promo (regular promotional discount, VATable)
    //      | manager (manager override; requires reason)
    discountType: varchar("discount_type", { length: 16 })
      .default("none")
      .notNull(),
    // ID number of SC / PWD card, if applicable.
    discountIdNumber: varchar("discount_id_number", { length: 64 }),
    discountAmount: decimal("discount_amount", {
      precision: 12,
      scale: 2,
    })
      .default("0")
      .notNull(),
    discountReason: text("discount_reason"),

    // ---- Tax breakdown (computed server-side) ----
    // All amounts are in PHP, two decimals.
    vatableSales: decimal("vatable_sales", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    vatExemptSales: decimal("vat_exempt_sales", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    zeroRatedSales: decimal("zero_rated_sales", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    vatAmount: decimal("vat_amount", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),

    // Subtotal = sum of line totals before discount
    subtotal: decimal("subtotal", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    // Total = subtotal - discount + delivery_fee  (VAT is inclusive in line totals
    // for VAT-registered taxpayers, so total already contains VAT)
    deliveryFee: decimal("delivery_fee", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),

    // ---- Lifecycle ----
    // posted = true means the invoice has been issued and is now immutable
    // for everything except `voided_*` fields.
    posted: boolean("posted").default(false).notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }),

    // Void linkage. If this invoice was voided, voidedAt + voidedBy + voidReason
    // are set. A separate, paired reversal invoice is issued whose
    // voidsInvoiceId points back to the original — that's the BIR-required
    // approach: the original record is never deleted or modified beyond marking.
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: uuid("voided_by").references(() => users.id),
    voidReason: text("void_reason"),
    voidsInvoiceId: uuid("voids_invoice_id"),

    // Issuing user / cashier
    issuedBy: uuid("issued_by")
      .notNull()
      .references(() => users.id),

    // Snapshot of seller info at the moment of issuance (denormalized so the
    // invoice PDF remains accurate even if branch/org config changes later).
    sellerRegisteredName: varchar("seller_registered_name", { length: 255 }).notNull(),
    sellerTradeName: varchar("seller_trade_name", { length: 255 }).notNull(),
    sellerTin: varchar("seller_tin", { length: 32 }).notNull(),
    sellerVatStatus: varchar("seller_vat_status", { length: 16 }).notNull(), // 'vat' | 'non-vat'
    sellerAddress: text("seller_address").notNull(),
    sellerBranchCode: varchar("seller_branch_code", { length: 8 }).notNull(),
    sellerRdo: varchar("seller_rdo", { length: 8 }).notNull(),

    // BIR Acknowledgment Certificate number — printed on the invoice once issued.
    casAcNumber: varchar("cas_ac_number", { length: 64 }),
    casAcIssuedOn: timestamp("cas_ac_issued_on", { withTimezone: false, mode: "date" }),

    issuedAt: timestamp("issued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    // Per-branch uniqueness on the invoice serial. The Postgres sequence
    // guarantees uniqueness inside a branch; this index enforces it.
    unique("sales_invoices_branch_serial_unique").on(t.branchId, t.invoiceNumber),
    // 1:1 — one invoice per order. Drop if we ever need split invoices.
    unique("sales_invoices_order_unique").on(t.orderId),
    index("sales_invoices_branch_issued_idx").on(t.branchId, t.issuedAt),
    index("sales_invoices_customer_idx").on(t.customerId),
    check(
      "sales_invoices_discount_type_check",
      sql`${t.discountType} IN ('none', 'sc', 'pwd', 'promo', 'manager')`
    ),
    check(
      "sales_invoices_vat_status_check",
      sql`${t.sellerVatStatus} IN ('vat', 'non-vat')`
    ),
    // SC and PWD discounts MUST carry an ID number. BIR will ask for this.
    check(
      "sales_invoices_sc_pwd_requires_id_check",
      sql`(${t.discountType} NOT IN ('sc', 'pwd')) OR (${t.discountIdNumber} IS NOT NULL)`
    ),
    // Manager discounts require a reason.
    check(
      "sales_invoices_manager_requires_reason_check",
      sql`(${t.discountType} != 'manager') OR (${t.discountReason} IS NOT NULL)`
    ),
  ]
);

/**
 * Per-line breakdown of a Sales Invoice. Mirrors order_items but carries
 * the tax classification (vatable / vat_exempt / zero_rated) so we can
 * reproduce the totals from the invoice alone.
 */
export const salesInvoiceItems = pgTable(
  "sales_invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => salesInvoices.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id").references(() => services.id),

    // What's printed on the invoice line
    description: text("description").notNull(),
    unit: varchar("unit", { length: 20 }), // 'kg' | 'piece' | 'load'
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),

    // Tax classification per line (a single invoice may mix classes)
    taxClass: varchar("tax_class", { length: 16 }).notNull(),

    // Computed totals for the line
    lineSubtotal: decimal("line_subtotal", { precision: 12, scale: 2 }).notNull(),
    lineVat: decimal("line_vat", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),

    sortOrder: decimal("sort_order", { precision: 6, scale: 0 })
      .default("0")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("sales_invoice_items_invoice_idx").on(t.invoiceId),
    check(
      "sales_invoice_items_tax_class_check",
      sql`${t.taxClass} IN ('vatable', 'vat_exempt', 'zero_rated')`
    ),
  ]
);

/**
 * Collection Receipt — supplementary document issued when a payment is
 * received on a previously issued invoice in a later session.
 * Under EOPT this is NOT a principal tax document; it's an acknowledgment.
 */
export const collectionReceipts = pgTable(
  "collection_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    crNumber: varchar("cr_number", { length: 32 }).notNull(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => salesInvoices.id, { onDelete: "restrict" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),

    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
    paymentReference: varchar("payment_reference", { length: 128 }),

    receivedFromName: varchar("received_from_name", { length: 255 }).notNull(),
    receivedFromTin: varchar("received_from_tin", { length: 32 }),

    issuedBy: uuid("issued_by")
      .notNull()
      .references(() => users.id),

    // Same denormalized seller snapshot as on the invoice.
    sellerRegisteredName: varchar("seller_registered_name", { length: 255 }).notNull(),
    sellerTradeName: varchar("seller_trade_name", { length: 255 }).notNull(),
    sellerTin: varchar("seller_tin", { length: 32 }).notNull(),
    sellerBranchCode: varchar("seller_branch_code", { length: 8 }).notNull(),

    voidedAt: timestamp("voided_at", { withTimezone: true }),
    voidedBy: uuid("voided_by").references(() => users.id),
    voidReason: text("void_reason"),

    issuedAt: timestamp("issued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    unique("collection_receipts_branch_serial_unique").on(t.branchId, t.crNumber),
    index("collection_receipts_invoice_idx").on(t.invoiceId),
    index("collection_receipts_branch_issued_idx").on(t.branchId, t.issuedAt),
  ]
);

export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type NewSalesInvoice = typeof salesInvoices.$inferInsert;
export type SalesInvoiceItem = typeof salesInvoiceItems.$inferSelect;
export type NewSalesInvoiceItem = typeof salesInvoiceItems.$inferInsert;
export type CollectionReceipt = typeof collectionReceipts.$inferSelect;
export type NewCollectionReceipt = typeof collectionReceipts.$inferInsert;

export type DiscountType = "none" | "sc" | "pwd" | "promo" | "manager";
export type TaxClass = "vatable" | "vat_exempt" | "zero_rated";
export type VatStatus = "vat" | "non-vat";
