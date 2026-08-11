/**
 * Sales / collection / audit-trail reports for the accountant and BIR audits.
 *
 * GET /api/v1/reports/sales-summary?branchId=&from=&to=
 *   Day-by-day summary the accountant uses to post into the loose-leaf Sales Journal.
 * GET /api/v1/reports/collections-summary?branchId=&from=&to=
 *   Day-by-day summary for posting into the Cash Receipts Journal.
 * GET /api/v1/reports/audit-trail?branchId=&from=&to=&recordId=
 *   Append-only log filtered by branch / period / record.
 * GET /api/v1/reports/e-journal?branchId=&from=&to=
 *   BIR Electronic Journal — plain-text (.txt) verbatim dump of every invoice.
 * GET /api/v1/reports/discounts?branchId=&from=&to=
 *   Senior Citizen / PWD statutory-discount report (ID number per sale).
 * GET /api/v1/reports/voids?branchId=&from=&to=
 *   Standalone Void report — who/when/why for every voided invoice.
 */
import { Hono } from "hono";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import {
  db,
  salesInvoices,
  salesInvoiceItems,
  collectionReceipts,
  auditTrail,
  branches,
} from "@aunt-sallys/db";
import { authenticate } from "../middleware/auth.js";
import { formatPhp } from "@aunt-sallys/shared/tax";

export const reportsRoutes = new Hono();

function dayBoundary(s: string, end = false): Date {
  return new Date(`${s}T${end ? "23:59:59" : "00:00:00"}+08:00`);
}

reportsRoutes.get("/sales-summary", authenticate, async (c) => {
  const branchId = c.req.query("branchId");
  const from = c.req.query("from"); // YYYY-MM-DD
  const to = c.req.query("to");
  if (!branchId || !from || !to) return c.json({ success: false, error: "branchId, from, to required" }, 400);

  const rows = await db
    .select({
      day: sql<string>`to_char(${salesInvoices.issuedAt} AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD')`,
      vatable: sql<string>`coalesce(sum(${salesInvoices.vatableSales}),0)`,
      exempt: sql<string>`coalesce(sum(${salesInvoices.vatExemptSales}),0)`,
      zeroRated: sql<string>`coalesce(sum(${salesInvoices.zeroRatedSales}),0)`,
      vat: sql<string>`coalesce(sum(${salesInvoices.vatAmount}),0)`,
      discount: sql<string>`coalesce(sum(${salesInvoices.discountAmount}),0)`,
      total: sql<string>`coalesce(sum(${salesInvoices.total}),0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(salesInvoices)
    .where(and(
      eq(salesInvoices.branchId, branchId),
      gte(salesInvoices.issuedAt, dayBoundary(from)),
      lte(salesInvoices.issuedAt, dayBoundary(to, true)),
    ))
    .groupBy(sql`to_char(${salesInvoices.issuedAt} AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${salesInvoices.issuedAt} AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD')`);

  return c.json({ success: true, data: rows });
});

reportsRoutes.get("/collections-summary", authenticate, async (c) => {
  const branchId = c.req.query("branchId");
  const from = c.req.query("from");
  const to = c.req.query("to");
  if (!branchId || !from || !to) return c.json({ success: false, error: "branchId, from, to required" }, 400);

  const rows = await db
    .select({
      day: sql<string>`to_char(${collectionReceipts.issuedAt} AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD')`,
      total: sql<string>`coalesce(sum(${collectionReceipts.amount}),0)`,
      count: sql<number>`count(*)::int`,
      method: collectionReceipts.paymentMethod,
    })
    .from(collectionReceipts)
    .where(and(
      eq(collectionReceipts.branchId, branchId),
      gte(collectionReceipts.issuedAt, dayBoundary(from)),
      lte(collectionReceipts.issuedAt, dayBoundary(to, true)),
    ))
    .groupBy(
      sql`to_char(${collectionReceipts.issuedAt} AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD')`,
      collectionReceipts.paymentMethod,
    )
    .orderBy(sql`to_char(${collectionReceipts.issuedAt} AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD')`);

  return c.json({ success: true, data: rows });
});

reportsRoutes.get("/audit-trail", authenticate, async (c) => {
  const recordId = c.req.query("recordId");
  const tableName = c.req.query("tableName");
  const from = c.req.query("from");
  const to = c.req.query("to");

  let q = db.select().from(auditTrail).orderBy(desc(auditTrail.createdAt)).$dynamic();
  const conds = [];
  if (recordId) conds.push(eq(auditTrail.recordId, recordId));
  if (tableName) conds.push(eq(auditTrail.tableName, tableName));
  if (from) conds.push(gte(auditTrail.createdAt, dayBoundary(from)));
  if (to) conds.push(lte(auditTrail.createdAt, dayBoundary(to, true)));
  if (conds.length) q = q.where(and(...conds));
  const rows = await q.limit(1000);
  return c.json({ success: true, data: rows });
});

// HTML printout of the sales summary (for handing to the accountant)
reportsRoutes.get("/sales-summary/print", authenticate, async (c) => {
  const branchId = c.req.query("branchId");
  const from = c.req.query("from");
  const to = c.req.query("to");
  if (!branchId || !from || !to) return c.text("branchId, from, to required", 400);

  const rows = await db
    .select({
      day: sql<string>`to_char(${salesInvoices.issuedAt} AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD')`,
      vatable: sql<string>`coalesce(sum(${salesInvoices.vatableSales}),0)`,
      exempt: sql<string>`coalesce(sum(${salesInvoices.vatExemptSales}),0)`,
      zeroRated: sql<string>`coalesce(sum(${salesInvoices.zeroRatedSales}),0)`,
      vat: sql<string>`coalesce(sum(${salesInvoices.vatAmount}),0)`,
      total: sql<string>`coalesce(sum(${salesInvoices.total}),0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(salesInvoices)
    .where(and(
      eq(salesInvoices.branchId, branchId),
      gte(salesInvoices.issuedAt, dayBoundary(from)),
      lte(salesInvoices.issuedAt, dayBoundary(to, true)),
    ))
    .groupBy(sql`to_char(${salesInvoices.issuedAt} AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${salesInvoices.issuedAt} AT TIME ZONE 'Asia/Manila', 'YYYY-MM-DD')`);

  const [branch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, branchId)).limit(1);

  const totalLine = rows.reduce(
    (a, r) => ({
      vatable: a.vatable + parseFloat(r.vatable),
      exempt: a.exempt + parseFloat(r.exempt),
      zr: a.zr + parseFloat(r.zeroRated),
      vat: a.vat + parseFloat(r.vat),
      total: a.total + parseFloat(r.total),
      count: a.count + r.count,
    }),
    { vatable: 0, exempt: 0, zr: 0, vat: 0, total: 0, count: 0 }
  );

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sales Summary by Day</title>
<style>
body { font-family: Arial, sans-serif; padding: 20mm; font-size: 11pt; }
h1 { font-size: 16pt; margin-bottom: 4pt; }
h2 { font-size: 12pt; font-weight: normal; margin-bottom: 16pt; color: #555; }
table { width: 100%; border-collapse: collapse; margin-top: 8pt; }
th, td { padding: 6pt 8pt; border-bottom: 1px solid #ccc; text-align: left; }
th { background: #f0f0f0; }
td.amt { text-align: right; }
tr.total td { font-weight: bold; border-top: 2px solid #000; }
.footer { margin-top: 24pt; font-size: 9pt; color: #666; }
</style></head><body>
<h1>Sales Summary by Day</h1>
<h2>${branch?.name ?? "Branch"} — ${from} to ${to}</h2>
<table>
  <thead><tr>
    <th>Date</th><th>Invoices</th>
    <th class="amt">VATable</th><th class="amt">VAT-Exempt</th>
    <th class="amt">Zero-Rated</th><th class="amt">VAT</th>
    <th class="amt">Gross Total</th>
  </tr></thead>
  <tbody>
    ${rows.map(r => `<tr>
      <td>${r.day}</td><td>${r.count}</td>
      <td class="amt">${formatPhp(parseFloat(r.vatable))}</td>
      <td class="amt">${formatPhp(parseFloat(r.exempt))}</td>
      <td class="amt">${formatPhp(parseFloat(r.zeroRated))}</td>
      <td class="amt">${formatPhp(parseFloat(r.vat))}</td>
      <td class="amt">${formatPhp(parseFloat(r.total))}</td>
    </tr>`).join("")}
    <tr class="total">
      <td>TOTAL</td><td>${totalLine.count}</td>
      <td class="amt">${formatPhp(totalLine.vatable)}</td>
      <td class="amt">${formatPhp(totalLine.exempt)}</td>
      <td class="amt">${formatPhp(totalLine.zr)}</td>
      <td class="amt">${formatPhp(totalLine.vat)}</td>
      <td class="amt">${formatPhp(totalLine.total)}</td>
    </tr>
  </tbody>
</table>
<div class="footer">
  Generated by IBMS v1.0.0 on ${new Date().toLocaleString("en-PH",{timeZone:"Asia/Manila"})}.<br>
  This report is for posting to the registered loose-leaf Sales Journal. Books of accounts are maintained outside the System.
</div>
</body></html>`;
  return c.html(html);
});

// ---------------------------------------------------------------------------
// BIR feature #5 — Electronic Journal (.txt)
//
// A plain-text, human-readable dump of every invoice in the period, in a fixed
// format. This is the "electronic copy of transactions" BIR can demand at any
// time. It is generated read-only from the immutable invoice rows; nothing is
// written. Served as a file download.
// ---------------------------------------------------------------------------
reportsRoutes.get("/e-journal", authenticate, async (c) => {
  const branchId = c.req.query("branchId");
  const from = c.req.query("from");
  const to = c.req.query("to");
  if (!branchId || !from || !to) return c.text("branchId, from, to required", 400);

  const [branch] = await db.select({ name: branches.name }).from(branches).where(eq(branches.id, branchId)).limit(1);
  if (!branch) return c.text("Branch not found", 404);

  const invs = await db.select().from(salesInvoices)
    .where(and(
      eq(salesInvoices.branchId, branchId),
      gte(salesInvoices.issuedAt, dayBoundary(from)),
      lte(salesInvoices.issuedAt, dayBoundary(to, true)),
    ))
    .orderBy(salesInvoices.issuedAt, salesInvoices.invoiceNumber);

  const items = invs.length
    ? await db.select().from(salesInvoiceItems).orderBy(salesInvoiceItems.sortOrder)
    : [];
  const itemsByInvoice = new Map<string, typeof items>();
  for (const it of items) {
    const arr = itemsByInvoice.get(it.invoiceId) ?? [];
    arr.push(it);
    itemsByInvoice.set(it.invoiceId, arr);
  }

  const manila = (d: Date | string) =>
    new Date(d).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" });
  const money = (s: string | null | undefined) => (parseFloat(s ?? "0")).toFixed(2).padStart(14);

  const L: string[] = [];
  L.push("=".repeat(64));
  L.push("ELECTRONIC JOURNAL — SALES INVOICES");
  L.push(`Branch : ${branch.name}`);
  L.push(`Period : ${from} to ${to} (Asia/Manila)`);
  L.push(`Records: ${invs.length}`);
  L.push(`Exported: ${manila(new Date())}`);
  L.push("Generated by IBMS v1.0.0 — POS Module. This file is a verbatim,");
  L.push("read-only copy of issued invoices and is not itself a valid invoice.");
  L.push("=".repeat(64));

  const tot = { vatable: 0, exempt: 0, zr: 0, vat: 0, disc: 0, total: 0, voids: 0 };
  for (const i of invs) {
    L.push("");
    L.push("-".repeat(64));
    L.push(`INVOICE   : ${i.invoiceNumber}${i.voidedAt ? "   *** VOIDED ***" : ""}${i.voidsInvoiceId ? "   [REVERSAL]" : ""}`);
    L.push(`Issued    : ${manila(i.issuedAt)}`);
    L.push(`Sold To   : ${i.customerName}${i.customerTin ? `   TIN ${i.customerTin}` : ""}`);
    L.push(`Seller TIN: ${i.sellerTin}   ${i.sellerVatStatus === "vat" ? "VAT" : "NON-VAT"}`);
    if (i.voidedAt) L.push(`Voided    : ${manila(i.voidedAt)}${i.voidReason ? `   (${i.voidReason})` : ""}`);
    const lines = itemsByInvoice.get(i.id) ?? [];
    for (const it of lines) {
      L.push(`  ${String(it.quantity).padStart(3)} ${it.unit ?? ""}  ${it.description}`.slice(0, 48).padEnd(48) + money(it.lineTotal));
    }
    L.push(`  VATable Sales                                 ${money(i.vatableSales)}`);
    L.push(`  VAT-Exempt Sales                              ${money(i.vatExemptSales)}`);
    L.push(`  Zero-Rated Sales                              ${money(i.zeroRatedSales)}`);
    L.push(`  VAT (12%)                                     ${money(i.vatAmount)}`);
    if (parseFloat(i.discountAmount) > 0)
      L.push(`  Discount (${(i.discountType ?? "").toUpperCase()})`.padEnd(48) + `-${(parseFloat(i.discountAmount)).toFixed(2).padStart(13)}`);
    L.push(`  TOTAL DUE                                     ${money(i.total)}`);
    tot.vatable += parseFloat(i.vatableSales);
    tot.exempt += parseFloat(i.vatExemptSales);
    tot.zr += parseFloat(i.zeroRatedSales);
    tot.vat += parseFloat(i.vatAmount);
    tot.disc += parseFloat(i.discountAmount);
    tot.total += parseFloat(i.total);
    if (i.voidedAt) tot.voids++;
  }

  L.push("");
  L.push("=".repeat(64));
  L.push("PERIOD TOTALS");
  L.push(`  VATable Sales                                 ${tot.vatable.toFixed(2).padStart(14)}`);
  L.push(`  VAT-Exempt Sales                              ${tot.exempt.toFixed(2).padStart(14)}`);
  L.push(`  Zero-Rated Sales                              ${tot.zr.toFixed(2).padStart(14)}`);
  L.push(`  VAT (12%)                                     ${tot.vat.toFixed(2).padStart(14)}`);
  L.push(`  Discounts                                     ${tot.disc.toFixed(2).padStart(14)}`);
  L.push(`  GROSS TOTAL                                   ${tot.total.toFixed(2).padStart(14)}`);
  L.push(`  Invoices: ${invs.length}   Voided: ${tot.voids}`);
  L.push("=".repeat(64));

  const fname = `ejournal_${branch.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}_${from}_${to}.txt`;
  c.header("Content-Type", "text/plain; charset=utf-8");
  c.header("Content-Disposition", `attachment; filename="${fname}"`);
  return c.body(L.join("\n"));
});

// ---------------------------------------------------------------------------
// BIR feature #7a — Senior Citizen / PWD statutory-discount report.
// Lists every invoice that carried an SC or PWD discount, with the ID number
// captured at sale (schema enforces the ID is present for sc/pwd). Extends to
// Solo Parent automatically if that discount type is later added.
// ---------------------------------------------------------------------------
reportsRoutes.get("/discounts", authenticate, async (c) => {
  const branchId = c.req.query("branchId");
  const from = c.req.query("from");
  const to = c.req.query("to");
  if (!branchId || !from || !to) return c.json({ success: false, error: "branchId, from, to required" }, 400);

  const rows = await db.select({
    invoiceNumber: salesInvoices.invoiceNumber,
    issuedAt: salesInvoices.issuedAt,
    customerName: salesInvoices.customerName,
    discountType: salesInvoices.discountType,
    discountIdNumber: salesInvoices.discountIdNumber,
    discountAmount: salesInvoices.discountAmount,
    total: salesInvoices.total,
    voidedAt: salesInvoices.voidedAt,
  })
    .from(salesInvoices)
    .where(and(
      eq(salesInvoices.branchId, branchId),
      gte(salesInvoices.issuedAt, dayBoundary(from)),
      lte(salesInvoices.issuedAt, dayBoundary(to, true)),
      sql`${salesInvoices.discountType} IN ('sc', 'pwd', 'solo')`,
    ))
    .orderBy(salesInvoices.issuedAt);

  const totalDiscount = rows.reduce((a, r) => a + parseFloat(r.discountAmount), 0);
  return c.json({ success: true, data: { rows, totalDiscount: totalDiscount.toFixed(2), count: rows.length } });
});

// ---------------------------------------------------------------------------
// BIR feature #7b — standalone Void report.
// Every voided invoice in the period, with who/when/why and its reversal link.
// ---------------------------------------------------------------------------
reportsRoutes.get("/voids", authenticate, async (c) => {
  const branchId = c.req.query("branchId");
  const from = c.req.query("from");
  const to = c.req.query("to");
  if (!branchId || !from || !to) return c.json({ success: false, error: "branchId, from, to required" }, 400);

  const rows = await db.select({
    invoiceNumber: salesInvoices.invoiceNumber,
    issuedAt: salesInvoices.issuedAt,
    customerName: salesInvoices.customerName,
    total: salesInvoices.total,
    voidedAt: salesInvoices.voidedAt,
    voidedBy: salesInvoices.voidedBy,
    voidReason: salesInvoices.voidReason,
  })
    .from(salesInvoices)
    .where(and(
      eq(salesInvoices.branchId, branchId),
      gte(salesInvoices.issuedAt, dayBoundary(from)),
      lte(salesInvoices.issuedAt, dayBoundary(to, true)),
      sql`${salesInvoices.voidedAt} IS NOT NULL`,
    ))
    .orderBy(desc(salesInvoices.voidedAt));

  const totalVoided = rows.reduce((a, r) => a + parseFloat(r.total), 0);
  return c.json({ success: true, data: { rows, totalVoided: totalVoided.toFixed(2), count: rows.length } });
});

export default reportsRoutes;
