/**
 * Sales / collection / audit-trail reports for the accountant and BIR audits.
 *
 * GET /api/v1/reports/sales-summary?branchId=&from=&to=
 *   Day-by-day summary the accountant uses to post into the loose-leaf Sales Journal.
 * GET /api/v1/reports/collections-summary?branchId=&from=&to=
 *   Day-by-day summary for posting into the Cash Receipts Journal.
 * GET /api/v1/reports/audit-trail?branchId=&from=&to=&recordId=
 *   Append-only log filtered by branch / period / record.
 */
import { Hono } from "hono";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import {
  db,
  salesInvoices,
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

export default reportsRoutes;
