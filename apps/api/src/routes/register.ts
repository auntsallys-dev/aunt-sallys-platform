/**
 * Register session routes — open and close the day per branch, generate Z-Reading.
 *
 * POST /api/v1/register/open     — open a new register session for a branch
 * POST /api/v1/register/close    — close the active session, generate Z-Reading aggregates
 * GET  /api/v1/register/active   — fetch the active session for a branch (if any)
 * GET  /api/v1/register/:id/x    — X-Reading HTML (interim, open session, read-only)
 * GET  /api/v1/register/:id/z    — Z-Reading HTML for a closed session
 *
 * The Z-Reading carries the BIR Accumulated Grand Total (beginning → ending),
 * derived from the immutable grossSales of prior closed sessions.
 */
import { Hono } from "hono";
import { eq, and, gte, lte, lt, desc, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  registerSessions,
  salesInvoices,
  branches,
  users,
  withAudit,
  auditedInsert,
  auditedUpdate,
} from "@aunt-sallys/db";
import { authenticate } from "../middleware/auth.js";
import { auditContextFrom } from "../lib/audit-context.js";
import { formatPhp } from "@aunt-sallys/shared/tax";

export const registerRoutes = new Hono();

const openSchema = z.object({
  branchId: z.string().uuid(),
  businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  openingCash: z.number().nonnegative().default(0),
});

const closeSchema = z.object({
  sessionId: z.string().uuid(),
  countedCash: z.number().nonnegative(),
  notes: z.string().optional().nullable(),
});

// ---------- Open ----------

registerRoutes.post("/open", authenticate, async (c) => {
  const authUser = c.get("authUser");
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }
  const parsed = openSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.errors[0]?.message ?? "Invalid" }, 400);
  const input = parsed.data;

  // Block opening a new day if the previous day for this branch is still open.
  const [stillOpen] = await db.select().from(registerSessions)
    .where(and(eq(registerSessions.branchId, input.branchId), eq(registerSessions.status, "open")))
    .orderBy(desc(registerSessions.businessDate))
    .limit(1);
  if (stillOpen) {
    return c.json({
      success: false,
      error: `Branch has an open register session for ${stillOpen.businessDate}. Close it before opening a new day.`,
      sessionId: stillOpen.id,
    }, 409);
  }

  const ctx = auditContextFrom(c);
  try {
    const id = await withAudit(db, ctx, async (tx, audit) => {
      const session: any = await auditedInsert(
        tx, audit, registerSessions,
        {
          branchId: input.branchId,
          businessDate: new Date(input.businessDate + "T00:00:00+08:00"),
          status: "open",
          openedBy: authUser.id,
          openingCash: String(input.openingCash.toFixed(2)),
        },
        { tableName: "register_sessions" }
      );
      return session.id as string;
    });
    const [created] = await db.select().from(registerSessions).where(eq(registerSessions.id, id)).limit(1);
    return c.json({ success: true, data: created });
  } catch (e: any) {
    return c.json({ success: false, error: `Open failed: ${e.message ?? e}` }, 500);
  }
});

// ---------- Close ----------

registerRoutes.post("/close", authenticate, async (c) => {
  const authUser = c.get("authUser");
  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }
  const parsed = closeSchema.safeParse(body);
  if (!parsed.success) return c.json({ success: false, error: parsed.error.errors[0]?.message ?? "Invalid" }, 400);
  const input = parsed.data;

  const [sess] = await db.select().from(registerSessions).where(eq(registerSessions.id, input.sessionId)).limit(1);
  if (!sess) return c.json({ success: false, error: "Session not found" }, 404);
  if (sess.status !== "open") return c.json({ success: false, error: "Session is not open" }, 409);

  // Aggregate the day's invoices (all invoices for this branch issued on businessDate)
  const dayStart = new Date(sess.businessDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const invoices = await db.select().from(salesInvoices)
    .where(and(
      eq(salesInvoices.branchId, sess.branchId),
      gte(salesInvoices.issuedAt, dayStart),
      lte(salesInvoices.issuedAt, dayEnd),
    ));

  // Sum (excluding voided originals; reversal invoices already net out)
  let grossSales = 0, vatable = 0, exempt = 0, zr = 0, vat = 0, disc = 0, voids = 0;
  for (const i of invoices) {
    grossSales += parseFloat(i.total);
    vatable += parseFloat(i.vatableSales);
    exempt += parseFloat(i.vatExemptSales);
    zr += parseFloat(i.zeroRatedSales);
    vat += parseFloat(i.vatAmount);
    disc += parseFloat(i.discountAmount);
    if (i.voidedAt) voids++;
  }

  // Z-counter: count of closed sessions for this branch + 1
  const [{ count: prevClosed }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(registerSessions)
    .where(and(eq(registerSessions.branchId, sess.branchId), eq(registerSessions.status, "closed")));
  const zNumber = `Z-${String(prevClosed + 1).padStart(8, "0")}`;

  const ctx = auditContextFrom(c, { reason: input.notes ?? null });
  try {
    await withAudit(db, ctx, async (tx, audit) => {
      await auditedUpdate(
        tx, audit, registerSessions, sess.id,
        {
          status: "closed",
          closedAt: sql`NOW()`,
          closedBy: authUser.id,
          countedCash: String(input.countedCash.toFixed(2)),
          cashOverShort: String((input.countedCash - parseFloat(sess.openingCash) - grossSales).toFixed(2)),
          zNumber,
          grossSales: String(grossSales.toFixed(2)),
          vatableSales: String(vatable.toFixed(2)),
          vatExemptSales: String(exempt.toFixed(2)),
          zeroRatedSales: String(zr.toFixed(2)),
          vatAmount: String(vat.toFixed(2)),
          discountTotal: String(disc.toFixed(2)),
          voidsCount: String(voids),
          invoicesCount: String(invoices.length),
          notes: input.notes ?? null,
        },
        { tableName: "register_sessions", op: "post" }
      );
    });

    const [closed] = await db.select().from(registerSessions).where(eq(registerSessions.id, sess.id)).limit(1);
    return c.json({ success: true, data: closed });
  } catch (e: any) {
    return c.json({ success: false, error: `Close failed: ${e.message ?? e}` }, 500);
  }
});

// ---------- Active ----------

registerRoutes.get("/active", authenticate, async (c) => {
  const branchId = c.req.query("branchId");
  if (!branchId) return c.json({ success: false, error: "branchId required" }, 400);
  const [sess] = await db.select().from(registerSessions)
    .where(and(eq(registerSessions.branchId, branchId), eq(registerSessions.status, "open")))
    .orderBy(desc(registerSessions.businessDate))
    .limit(1);
  return c.json({ success: true, data: sess ?? null });
});

// ---------- X-Reading HTML (interim, read-only) ----------
//
// BIR requires an X-Reading: a mid-shift snapshot of the running totals that
// does NOT close the day, does NOT advance the Z-counter, and can be run any
// number of times. It reads live from the day's invoices; nothing is written.

registerRoutes.get("/:id/x", authenticate, async (c) => {
  const id = c.req.param("id")!;
  const [sess] = await db.select().from(registerSessions).where(eq(registerSessions.id, id)).limit(1);
  if (!sess) return c.text("Session not found", 404);
  if (sess.status !== "open") return c.text("X-Reading is only available for an open session", 409);

  const dayStart = new Date(sess.businessDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const invoices = await db.select().from(salesInvoices)
    .where(and(
      eq(salesInvoices.branchId, sess.branchId),
      gte(salesInvoices.issuedAt, dayStart),
      lte(salesInvoices.issuedAt, dayEnd),
    ));

  let grossSales = 0, vatable = 0, exempt = 0, zr = 0, vat = 0, disc = 0, voids = 0;
  for (const i of invoices) {
    grossSales += parseFloat(i.total);
    vatable += parseFloat(i.vatableSales);
    exempt += parseFloat(i.vatExemptSales);
    zr += parseFloat(i.zeroRatedSales);
    vat += parseFloat(i.vatAmount);
    disc += parseFloat(i.discountAmount);
    if (i.voidedAt) voids++;
  }

  // Running accumulated grand total = prior closed sessions + today so far.
  const [{ beginning }] = await db
    .select({ beginning: sql<string>`COALESCE(SUM(${registerSessions.grossSales}), 0)::text` })
    .from(registerSessions)
    .where(and(
      eq(registerSessions.branchId, sess.branchId),
      eq(registerSessions.status, "closed"),
      lt(registerSessions.businessDate, sess.businessDate),
    ));
  const beginningGrandTotal = parseFloat(beginning ?? "0");

  const [branch] = await db.select().from(branches).where(eq(branches.id, sess.branchId)).limit(1);
  const [reader] = await db.select({ firstName: users.firstName, lastName: users.lastName })
    .from(users).where(eq(users.id, c.get("authUser").id)).limit(1);

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>X-Reading — ${branch?.name ?? "Branch"}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 8px; }
.center { text-align: center; }
.bold { font-weight: bold; }
.divider { border-top: 1px dashed #000; margin: 6px 0; }
table { width: 100%; border-collapse: collapse; }
td.amt { text-align: right; }
.total td { font-weight: bold; padding-top: 4px; border-top: 1px solid #000; }
@media print { @page { margin: 0; size: 80mm auto; } }
</style></head><body>
<div class="center bold">${branch?.name ?? "Branch"}</div>
<div class="divider"></div>
<div class="center bold" style="font-size:14px;letter-spacing:2px">X-READING</div>
<div class="center" style="font-size:10px">(interim — the day remains OPEN)</div>
<div class="divider"></div>
<table>
  <tr><td><b>Business Date</b></td><td class="amt">${new Date(sess.businessDate).toLocaleDateString("en-PH")}</td></tr>
  <tr><td><b>Opened</b></td><td class="amt">${new Date(sess.openedAt).toLocaleString("en-PH",{timeZone:"Asia/Manila"})}</td></tr>
  <tr><td><b>Printed</b></td><td class="amt">${new Date().toLocaleString("en-PH",{timeZone:"Asia/Manila"})}</td></tr>
  <tr><td><b>Read By</b></td><td class="amt">${[reader?.firstName, reader?.lastName].filter(Boolean).join(" ")}</td></tr>
</table>
<div class="divider"></div>
<table>
  <tr><td>Invoices Issued</td><td class="amt">${invoices.length}</td></tr>
  <tr><td>Voids</td><td class="amt">${voids}</td></tr>
  <tr><td>Discounts</td><td class="amt">${formatPhp(disc)}</td></tr>
</table>
<div class="divider"></div>
<table>
  <tr><td>VATable Sales</td><td class="amt">${formatPhp(vatable)}</td></tr>
  <tr><td>VAT-Exempt</td><td class="amt">${formatPhp(exempt)}</td></tr>
  <tr><td>Zero-Rated</td><td class="amt">${formatPhp(zr)}</td></tr>
  <tr><td>VAT Amount</td><td class="amt">${formatPhp(vat)}</td></tr>
  <tr class="total"><td>SALES SO FAR</td><td class="amt">${formatPhp(grossSales)}</td></tr>
</table>
<div class="divider"></div>
<table>
  <tr><td>Beginning Grand Total</td><td class="amt">${formatPhp(beginningGrandTotal)}</td></tr>
  <tr><td>Sales So Far</td><td class="amt">${formatPhp(grossSales)}</td></tr>
  <tr class="total"><td>RUNNING GRAND TOTAL</td><td class="amt">${formatPhp(beginningGrandTotal + grossSales)}</td></tr>
</table>
<div class="divider"></div>
<div class="center" style="margin-top:8px;font-size:10px">Generated by IBMS v1.0.0 — POS Module</div>
<script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script>
</body></html>`;
  return c.html(html);
});

// ---------- Z-Reading HTML ----------

registerRoutes.get("/:id/z", authenticate, async (c) => {
  const id = c.req.param("id")!;
  const [sess] = await db.select().from(registerSessions).where(eq(registerSessions.id, id)).limit(1);
  if (!sess) return c.text("Session not found", 404);
  if (sess.status !== "closed") return c.text("Z-Reading is only available for closed sessions", 409);

  const [branch] = await db.select().from(branches).where(eq(branches.id, sess.branchId)).limit(1);
  const [closer] = await db.select({ firstName: users.firstName, lastName: users.lastName })
    .from(users).where(eq(users.id, sess.closedBy!)).limit(1);

  const cashOverShort = sess.cashOverShort ? parseFloat(sess.cashOverShort) : 0;

  // BIR feature #1 — Accumulated Grand Total. The perpetual, never-reset sales
  // accumulator. It is derived (not stored twice) from the immutable grossSales
  // of every closed session before this one: closed sessions are terminal and
  // trigger-protected, so this sum is as tamper-evident as a stored counter and
  // never drifts. Examiners reconcile: ending GT here = beginning GT of the next
  // Z-Reading, and the chain must be unbroken from the machine's first close.
  const [{ beginning }] = await db
    .select({ beginning: sql<string>`COALESCE(SUM(${registerSessions.grossSales}), 0)::text` })
    .from(registerSessions)
    .where(and(
      eq(registerSessions.branchId, sess.branchId),
      eq(registerSessions.status, "closed"),
      lt(registerSessions.businessDate, sess.businessDate),
    ));
  const beginningGrandTotal = parseFloat(beginning ?? "0");
  const salesForDay = parseFloat(sess.grossSales ?? "0");
  const endingGrandTotal = beginningGrandTotal + salesForDay;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Z-Reading ${sess.zNumber}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 8px; }
.center { text-align: center; }
.right { text-align: right; }
.bold { font-weight: bold; }
.divider { border-top: 1px dashed #000; margin: 6px 0; }
table { width: 100%; border-collapse: collapse; }
td.amt { text-align: right; }
.total td { font-weight: bold; padding-top: 4px; border-top: 1px solid #000; }
@media print { @page { margin: 0; size: 80mm auto; } }
</style></head><body>
<div class="center bold">${branch?.name ?? "Branch"}</div>
<div class="divider"></div>
<div class="center bold" style="font-size:14px;letter-spacing:2px">Z-READING</div>
<div class="divider"></div>
<table>
  <tr><td><b>Z No.</b></td><td class="amt">${sess.zNumber}</td></tr>
  <tr><td><b>Business Date</b></td><td class="amt">${new Date(sess.businessDate).toLocaleDateString("en-PH")}</td></tr>
  <tr><td><b>Opened</b></td><td class="amt">${new Date(sess.openedAt).toLocaleString("en-PH",{timeZone:"Asia/Manila"})}</td></tr>
  <tr><td><b>Closed</b></td><td class="amt">${sess.closedAt ? new Date(sess.closedAt).toLocaleString("en-PH",{timeZone:"Asia/Manila"}) : ""}</td></tr>
  <tr><td><b>Closed By</b></td><td class="amt">${[closer?.firstName, closer?.lastName].filter(Boolean).join(" ")}</td></tr>
</table>
<div class="divider"></div>
<table>
  <tr><td>Invoices Issued</td><td class="amt">${sess.invoicesCount ?? 0}</td></tr>
  <tr><td>Voids</td><td class="amt">${sess.voidsCount ?? 0}</td></tr>
  <tr><td>Discounts</td><td class="amt">${formatPhp(parseFloat(sess.discountTotal ?? "0"))}</td></tr>
</table>
<div class="divider"></div>
<table>
  <tr><td>VATable Sales</td><td class="amt">${formatPhp(parseFloat(sess.vatableSales ?? "0"))}</td></tr>
  <tr><td>VAT-Exempt</td><td class="amt">${formatPhp(parseFloat(sess.vatExemptSales ?? "0"))}</td></tr>
  <tr><td>Zero-Rated</td><td class="amt">${formatPhp(parseFloat(sess.zeroRatedSales ?? "0"))}</td></tr>
  <tr><td>VAT Amount</td><td class="amt">${formatPhp(parseFloat(sess.vatAmount ?? "0"))}</td></tr>
  <tr class="total"><td>GROSS SALES</td><td class="amt">${formatPhp(parseFloat(sess.grossSales ?? "0"))}</td></tr>
</table>
<div class="divider"></div>
<table>
  <tr><td>Beginning Grand Total</td><td class="amt">${formatPhp(beginningGrandTotal)}</td></tr>
  <tr><td>Sales for the Day</td><td class="amt">${formatPhp(salesForDay)}</td></tr>
  <tr class="total"><td>ENDING GRAND TOTAL</td><td class="amt">${formatPhp(endingGrandTotal)}</td></tr>
</table>
<div class="divider"></div>
<table>
  <tr><td>Opening Cash</td><td class="amt">${formatPhp(parseFloat(sess.openingCash))}</td></tr>
  <tr><td>Counted Cash</td><td class="amt">${formatPhp(parseFloat(sess.countedCash ?? "0"))}</td></tr>
  <tr class="total"><td>${cashOverShort >= 0 ? "Over" : "Short"}</td><td class="amt">${formatPhp(Math.abs(cashOverShort))}</td></tr>
</table>
<div class="divider"></div>
<div class="center" style="margin-top:8px;font-size:10px">Generated by IBMS v1.0.0 — POS Module</div>
<script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script>
</body></html>`;
  return c.html(html);
});

export default registerRoutes;
