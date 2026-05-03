/**
 * Collection Receipt routes — issued for payments collected against an invoice
 * in a session AFTER the invoice was issued. Supplementary under EOPT.
 *
 * POST /api/v1/collection-receipts            — issue CR for an invoice
 * GET  /api/v1/collection-receipts/:id/print  — server-rendered HTML
 */
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  salesInvoices,
  collectionReceipts,
  branches,
  users,
  withAudit,
  auditedInsert,
  nextCrNumber,
} from "@aunt-sallys/db";
import { authenticate } from "../middleware/auth.js";
import { auditContextFrom } from "../lib/audit-context.js";
import { renderCollectionReceiptHtml } from "../lib/invoice-template.js";

export const collectionReceiptsRoutes = new Hono();

const issueCrSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["cash", "card", "gcash", "maya", "bank_transfer", "other"]),
  paymentReference: z.string().optional().nullable(),
  receivedFromName: z.string().min(1).optional(),
  receivedFromTin: z.string().optional().nullable(),
});

collectionReceiptsRoutes.post("/", authenticate, async (c) => {
  const authUser = c.get("authUser");
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }
  const parsed = issueCrSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message ?? "Invalid request" }, 400);
  }
  const input = parsed.data;

  const [inv] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, input.invoiceId)).limit(1);
  if (!inv) return c.json({ success: false, error: "Invoice not found" }, 404);
  if (inv.voidedAt) return c.json({ success: false, error: "Cannot collect against a voided invoice" }, 409);

  const ctx = auditContextFrom(c);
  try {
    const result = await withAudit(db, ctx, async (tx, audit) => {
      const crNumber = await nextCrNumber(tx, inv.branchId);
      const cr: any = await auditedInsert(
        tx, audit, collectionReceipts,
        {
          crNumber,
          invoiceId: inv.id,
          branchId: inv.branchId,
          amount: String(input.amount.toFixed(2)),
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference ?? null,
          receivedFromName: input.receivedFromName ?? inv.customerName,
          receivedFromTin: input.receivedFromTin ?? inv.customerTin ?? null,
          issuedBy: authUser.id,
          sellerRegisteredName: inv.sellerRegisteredName,
          sellerTradeName: inv.sellerTradeName,
          sellerTin: inv.sellerTin,
          sellerBranchCode: inv.sellerBranchCode,
        },
        { tableName: "collection_receipts" }
      );
      return cr.id as string;
    });

    const [issued] = await db.select().from(collectionReceipts)
      .where(eq(collectionReceipts.id, result)).limit(1);
    return c.json({ success: true, data: issued });
  } catch (e: any) {
    return c.json({ success: false, error: `CR issuance failed: ${e.message ?? e}` }, 500);
  }
});

collectionReceiptsRoutes.get("/:id/print", authenticate, async (c) => {
  const id = c.req.param("id")!;
  const [cr] = await db.select().from(collectionReceipts).where(eq(collectionReceipts.id, id)).limit(1);
  if (!cr) return c.text("Collection Receipt not found", 404);

  const [inv] = await db.select({ invoiceNumber: salesInvoices.invoiceNumber, issuedAt: salesInvoices.issuedAt })
    .from(salesInvoices).where(eq(salesInvoices.id, cr.invoiceId)).limit(1);
  const [branch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, cr.branchId)).limit(1);
  const [issuer] = await db.select({ firstName: users.firstName, lastName: users.lastName })
    .from(users).where(eq(users.id, cr.issuedBy)).limit(1);

  const html = renderCollectionReceiptHtml({
    cr,
    branchName: branch?.name ?? "Branch",
    cashierName: [issuer?.firstName, issuer?.lastName].filter(Boolean).join(" ") || "Cashier",
    invoiceNumber: inv?.invoiceNumber ?? "",
    invoiceIssuedAt: inv?.issuedAt ?? new Date(),
  });
  return c.html(html);
});

export default collectionReceiptsRoutes;
