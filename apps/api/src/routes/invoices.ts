/**
 * Sales Invoice routes — BIR EOPT compliant.
 *
 * POST /api/v1/invoices/issue            — issue an invoice for a posted order
 * GET  /api/v1/invoices                   — list invoices (filterable)
 * GET  /api/v1/invoices/:id               — fetch single invoice
 * GET  /api/v1/invoices/:id/print         — server-rendered HTML for the POS
 * POST /api/v1/invoices/:id/void          — void with required reason; issues paired reversal
 *
 * All write paths run inside withAudit() so the audit_trail row is committed
 * in the same transaction as the data change. Sequential serials are issued
 * via the Postgres function issue_invoice_number(branch_id) — the application
 * never decides the number itself.
 */
import { Hono } from "hono";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  salesInvoices,
  salesInvoiceItems,
  orders,
  orderItems,
  customers,
  branches,
  services,
  users,
  withAudit,
  auditedInsert,
  auditedUpdate,
  postSalesInvoice,
  voidSalesInvoice,
  nextInvoiceNumber,
} from "@aunt-sallys/db";
import { computeTax, type TaxLineInput, type DiscountType, type VatStatus } from "@aunt-sallys/shared/tax";
import { authenticate } from "../middleware/auth.js";
import { auditContextFrom } from "../lib/audit-context.js";
import { renderSalesInvoiceHtml } from "../lib/invoice-template.js";

export const invoicesRoutes = new Hono();

// ---------- helpers ----------

const issueInvoiceSchema = z.object({
  orderId: z.string().uuid(),
  customer: z.object({
    name: z.string().min(1),
    address: z.string().optional().nullable(),
    tin: z.string().optional().nullable(),
    businessStyle: z.string().optional().nullable(),
  }),
  discount: z
    .object({
      type: z.enum(["none", "sc", "pwd", "promo", "manager"]).default("none"),
      idNumber: z.string().optional().nullable(),
      amount: z.number().nonnegative().optional(),
      reason: z.string().optional().nullable(),
    })
    .optional(),
  // Per-line tax classification (defaults to 'vatable' on every line).
  lineTaxClass: z
    .record(z.string(), z.enum(["vatable", "vat_exempt", "zero_rated"]))
    .optional(),
});

const voidInvoiceSchema = z.object({
  reason: z.string().min(3, "void reason is required"),
});

async function loadOrderBundle(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;

  const items = await db
    .select({
      id: orderItems.id,
      serviceId: orderItems.serviceId,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      totalPrice: orderItems.totalPrice,
      notes: orderItems.notes,
      serviceName: services.name,
      priceUnit: services.priceUnit,
      customName: orderItems.customName,
    })
    .from(orderItems)
    .leftJoin(services, eq(services.id, orderItems.serviceId))
    .where(eq(orderItems.orderId, order.id));

  const [branch] = await db.select().from(branches).where(eq(branches.id, order.branchId)).limit(1);
  if (!branch) return null;

  return { order, items, branch };
}

// ---------- POST /issue ----------

invoicesRoutes.post("/issue", authenticate, async (c) => {
  const authUser = c.get("authUser");
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

  const parsed = issueInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message ?? "Invalid request" }, 400);
  }
  const input = parsed.data;

  const bundle = await loadOrderBundle(input.orderId);
  if (!bundle) return c.json({ success: false, error: "Order not found" }, 404);
  const { order, items, branch } = bundle;

  // Refuse if branch isn't BIR-registered yet.
  if (!branch.branchCode || !branch.rdo) {
    return c.json({
      success: false,
      error: `Branch ${branch.name} has no BIR branch_code/rdo configured. Update it in admin before issuing an invoice.`,
    }, 422);
  }

  // Idempotent: if an invoice was already issued for this order, return it
  // instead of erroring. Lets the POS "Print Receipt" button be clicked
  // multiple times without a duplicate-invoice error.
  const [existing] = await db.select()
    .from(salesInvoices)
    .where(eq(salesInvoices.orderId, order.id))
    .limit(1);
  if (existing) {
    return c.json({ success: true, data: existing, alreadyIssued: true });
  }

  // Determine seller VAT status. For now read from branch.settings or env.
  // Fallback: VAT (per Luxury Momnrock HQ confirmation).
  const settings = (branch.settings as Record<string, unknown> | null) ?? {};
  const sellerVatStatus: VatStatus =
    typeof settings["vatStatus"] === "string" && settings["vatStatus"] === "non-vat"
      ? "non-vat"
      : "vat";
  const sellerRegName =
    (typeof settings["registeredName"] === "string" && (settings["registeredName"] as string)) ||
    "BAUTISTA, JENNIFER KRISTINE BONNEVIE";
  const sellerTradeName =
    (typeof settings["tradeName"] === "string" && (settings["tradeName"] as string)) ||
    "Luxury Momnrock Laundry Service";
  const sellerTin =
    (typeof settings["tin"] === "string" && (settings["tin"] as string)) ||
    `236-606-454-${branch.branchCode}`;

  // Build tax-compute input.
  const lineTaxClass = input.lineTaxClass ?? {};
  const taxLines: TaxLineInput[] = items.map((it) => ({
    description: it.serviceName ?? it.customName ?? "Service",
    unit: it.priceUnit ?? undefined,
    quantity: parseFloat(it.quantity),
    unitPrice: parseFloat(it.unitPrice),
    taxClass: lineTaxClass[it.id] ?? "vatable",
  }));

  let computed;
  try {
    computed = computeTax({
      sellerVatStatus,
      lines: taxLines,
      deliveryFee: parseFloat(order.deliveryFee ?? "0"),
      discountType: (input.discount?.type ?? "none") as DiscountType,
      discountAmount: input.discount?.amount,
    });
  } catch (e: any) {
    return c.json({ success: false, error: `Tax computation failed: ${e.message ?? e}` }, 422);
  }

  // Issue invoice + lines + post — all in one transaction.
  const ctx = auditContextFrom(c);

  try {
    const result = await withAudit(db, ctx, async (tx, audit) => {
      const invoiceNumber = await nextInvoiceNumber(tx, branch.id);

      const inv: any = await auditedInsert(
        tx, audit, salesInvoices,
        {
          invoiceNumber,
          orderId: order.id,
          branchId: branch.id,
          customerId: order.customerId ?? null,
          customerName: input.customer.name,
          customerAddress: input.customer.address ?? null,
          customerTin: input.customer.tin ?? null,
          customerBusinessStyle: input.customer.businessStyle ?? null,
          discountType: input.discount?.type ?? "none",
          discountIdNumber: input.discount?.idNumber ?? null,
          discountAmount: String(computed.discountAmount.toFixed(2)),
          discountReason: input.discount?.reason ?? null,
          vatableSales: String(computed.vatableSales.toFixed(2)),
          vatExemptSales: String(computed.vatExemptSales.toFixed(2)),
          zeroRatedSales: String(computed.zeroRatedSales.toFixed(2)),
          vatAmount: String(computed.vatAmount.toFixed(2)),
          subtotal: String(computed.subtotal.toFixed(2)),
          deliveryFee: String(computed.deliveryFee.toFixed(2)),
          total: String(computed.total.toFixed(2)),
          posted: false,
          issuedBy: authUser.id,
          sellerRegisteredName: sellerRegName,
          sellerTradeName,
          sellerTin,
          sellerVatStatus,
          sellerAddress: branch.registeredAddress ?? branch.address ?? "",
          sellerBranchCode: branch.branchCode!,
          sellerRdo: branch.rdo!,
        },
        { tableName: "sales_invoices" }
      );

      // Insert line items
      let sortOrder = 0;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const cl = computed.lines[i];
        await auditedInsert(
          tx, audit, salesInvoiceItems,
          {
            invoiceId: inv.id,
            serviceId: it.serviceId ?? null,
            description: cl.description,
            unit: cl.unit ?? null,
            quantity: String(cl.quantity),
            unitPrice: String(cl.unitPrice.toFixed(2)),
            taxClass: cl.taxClass,
            lineSubtotal: String(cl.lineSubtotal.toFixed(2)),
            lineVat: String(cl.lineVat.toFixed(2)),
            lineTotal: String(cl.lineTotal.toFixed(2)),
            sortOrder: String(sortOrder++),
          },
          { tableName: "sales_invoice_items" }
        );
      }

      // Mark posted (immutable thereafter, except void/AC fields)
      await postSalesInvoice(tx, audit, inv.id);

      return inv.id as string;
    });

    const [issued] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, result)).limit(1);
    return c.json({ success: true, data: issued });
  } catch (e: any) {
    return c.json({ success: false, error: `Issue failed: ${e.message ?? e}` }, 500);
  }
});

// ---------- GET /:id ----------

invoicesRoutes.get("/:id", authenticate, async (c) => {
  const id = c.req.param("id")!;
  const [inv] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, id)).limit(1);
  if (!inv) return c.json({ success: false, error: "Invoice not found" }, 404);
  const lines = await db
    .select()
    .from(salesInvoiceItems)
    .where(eq(salesInvoiceItems.invoiceId, inv.id))
    .orderBy(salesInvoiceItems.sortOrder);
  return c.json({ success: true, data: { ...inv, items: lines } });
});

// ---------- GET / (list) ----------

invoicesRoutes.get("/", authenticate, async (c) => {
  const branchId = c.req.query("branchId");
  const fromDate = c.req.query("from");  // YYYY-MM-DD
  const toDate = c.req.query("to");
  const includeVoided = c.req.query("includeVoided") === "true";

  let q = db.select().from(salesInvoices).orderBy(desc(salesInvoices.issuedAt)).$dynamic();
  if (branchId) q = q.where(eq(salesInvoices.branchId, branchId));
  const list = await q.limit(500);

  let filtered = list;
  if (fromDate) {
    const d = new Date(fromDate + "T00:00:00+08:00");
    filtered = filtered.filter((i) => new Date(i.issuedAt) >= d);
  }
  if (toDate) {
    const d = new Date(toDate + "T23:59:59+08:00");
    filtered = filtered.filter((i) => new Date(i.issuedAt) <= d);
  }
  if (!includeVoided) {
    filtered = filtered.filter((i) => !i.voidedAt);
  }
  return c.json({ success: true, data: filtered });
});

// ---------- GET /:id/print ----------

invoicesRoutes.get("/:id/print", authenticate, async (c) => {
  const id = c.req.param("id")!;
  const [inv] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, id)).limit(1);
  if (!inv) return c.text("Invoice not found", 404);

  const lines = await db.select().from(salesInvoiceItems)
    .where(eq(salesInvoiceItems.invoiceId, inv.id))
    .orderBy(salesInvoiceItems.sortOrder);

  const [branch] = await db.select().from(branches).where(eq(branches.id, inv.branchId)).limit(1);
  const [issuer] = await db.select({ firstName: users.firstName, lastName: users.lastName })
    .from(users).where(eq(users.id, inv.issuedBy)).limit(1);

  const html = renderSalesInvoiceHtml({
    invoice: inv,
    items: lines,
    branchName: branch?.name ?? "Branch",
    cashierName: [issuer?.firstName, issuer?.lastName].filter(Boolean).join(" ") || "Cashier",
  });
  return c.html(html);
});

// ---------- POST /:id/void ----------

invoicesRoutes.post("/:id/void", authenticate, async (c) => {
  const id = c.req.param("id")!;
  const authUser = c.get("authUser");
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }
  const parsed = voidInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message ?? "Invalid request" }, 400);
  }

  const [orig] = await db.select().from(salesInvoices).where(eq(salesInvoices.id, id)).limit(1);
  if (!orig) return c.json({ success: false, error: "Invoice not found" }, 404);
  if (orig.voidedAt) return c.json({ success: false, error: "Invoice already voided" }, 409);

  const ctx = auditContextFrom(c, { reason: parsed.data.reason });
  try {
    const reversalId = await withAudit(db, ctx, async (tx, audit) => {
      // Issue a paired reversal invoice with negated totals
      const reversalNumber = await nextInvoiceNumber(tx, orig.branchId);
      const neg = (s: string) => String((-parseFloat(s)).toFixed(2));

      const reversal: any = await auditedInsert(
        tx, audit, salesInvoices,
        {
          invoiceNumber: reversalNumber,
          orderId: orig.orderId,
          branchId: orig.branchId,
          customerId: orig.customerId,
          customerName: orig.customerName,
          customerAddress: orig.customerAddress,
          customerTin: orig.customerTin,
          customerBusinessStyle: orig.customerBusinessStyle,
          discountType: orig.discountType,
          discountIdNumber: orig.discountIdNumber,
          discountAmount: neg(orig.discountAmount),
          discountReason: parsed.data.reason,
          vatableSales: neg(orig.vatableSales),
          vatExemptSales: neg(orig.vatExemptSales),
          zeroRatedSales: neg(orig.zeroRatedSales),
          vatAmount: neg(orig.vatAmount),
          subtotal: neg(orig.subtotal),
          deliveryFee: neg(orig.deliveryFee),
          total: neg(orig.total),
          posted: false,
          voidsInvoiceId: orig.id,
          issuedBy: authUser.id,
          sellerRegisteredName: orig.sellerRegisteredName,
          sellerTradeName: orig.sellerTradeName,
          sellerTin: orig.sellerTin,
          sellerVatStatus: orig.sellerVatStatus,
          sellerAddress: orig.sellerAddress,
          sellerBranchCode: orig.sellerBranchCode,
          sellerRdo: orig.sellerRdo,
        },
        { tableName: "sales_invoices" }
      );

      await postSalesInvoice(tx, audit, reversal.id);

      // Mark the original as voided
      await voidSalesInvoice(tx, audit, orig.id, {
        voidedBy: authUser.id,
        reason: parsed.data.reason,
        reversalInvoiceId: reversal.id,
      });

      return reversal.id as string;
    });

    return c.json({ success: true, data: { reversalInvoiceId: reversalId } });
  } catch (e: any) {
    return c.json({ success: false, error: `Void failed: ${e.message ?? e}` }, 500);
  }
});

export default invoicesRoutes;
