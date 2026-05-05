/**
 * BIR-compliant audit trail helpers.
 *
 * Wraps writes on finance-impacting tables so that every change emits a
 * row to `audit_trail`, in the SAME transaction as the change itself.
 * If the audit insert fails, the change is rolled back — there is never
 * a sales-side change without a matching audit row.
 *
 * Usage:
 *   import { withAudit, auditedInsert, auditedUpdate } from "@aunt-sallys/db";
 *
 *   await withAudit(db, ctx, async (tx, audit) => {
 *     const inv = await auditedInsert(tx, audit, salesInvoices, {
 *       invoiceNumber, branchId, customerName, ...
 *     });
 *     await auditedInsert(tx, audit, salesInvoiceItems, {...});
 *     return inv;
 *   });
 *
 * Apps (the API layer) populate `ctx` from the authenticated request:
 *   userId, role, ipAddress, userAgent, optional reason for void/post.
 */
import type { Database } from "../client.js";
import { eq, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { auditTrail, type AuditOp } from "../schema/audit_trail.js";

/** Transaction handle from drizzle's `db.transaction(async tx => ...)`. */
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Per-request context that flows from the API layer down to writes. */
export interface AuditContext {
  userId: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  /** Optional human-readable reason — captured for void / post / soft_delete. */
  reason?: string | null;
}

/**
 * Helper bound to a specific transaction + context. Methods record audit rows.
 */
export interface AuditRecorder {
  log(args: {
    tableName: string;
    recordId: string;
    op: AuditOp;
    before?: unknown;
    after?: unknown;
    reason?: string | null;
  }): Promise<void>;
}

function makeRecorder(tx: Tx, ctx: AuditContext): AuditRecorder {
  return {
    async log({ tableName, recordId, op, before, after, reason }) {
      await tx.insert(auditTrail).values({
        userId: ctx.userId ?? null,
        userEmail: ctx.userEmail ?? null,
        userRole: ctx.userRole ?? null,
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        tableName,
        recordId,
        op,
        before: (before as object | undefined) ?? null,
        after: (after as object | undefined) ?? null,
        reason: reason ?? ctx.reason ?? null,
      });
    },
  };
}

/**
 * Run a unit of work inside a transaction with an audit recorder injected.
 * The audit row(s) are written in the same transaction as the data change.
 * Throwing inside the callback rolls everything back.
 */
export async function withAudit<T>(
  db: Database,
  ctx: AuditContext,
  fn: (tx: Tx, audit: AuditRecorder) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    const audit = makeRecorder(tx, ctx);
    return fn(tx, audit);
  });
}

// ---------- Convenience wrappers ----------

/**
 * Insert into a sales-side table and write a matching audit_trail row.
 * Returns the inserted row.
 *
 * NOTE: callers must pass the table object and a typed values payload
 * compatible with that table's `$inferInsert` shape.
 */
export async function auditedInsert<T extends PgTable & { id: { name: string } }>(
  tx: Tx,
  audit: AuditRecorder,
  table: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta: { tableName: string }
): Promise<any> {
  const inserted = await tx.insert(table).values(values).returning();
  const row = inserted[0];
  if (!row) throw new Error(`auditedInsert: no row returned from ${meta.tableName}`);
  await audit.log({
    tableName: meta.tableName,
    recordId: (row as { id: string }).id,
    op: "insert",
    before: null,
    after: row,
  });
  return row;
}

/**
 * Update by id and emit an audit row capturing before/after snapshots.
 * Throws if the id doesn't match a row.
 */
export async function auditedUpdate<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends PgTable & { id: any }
>(
  tx: Tx,
  audit: AuditRecorder,
  table: T,
  id: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patch: any,
  meta: { tableName: string; op?: AuditOp; reason?: string | null }
): Promise<unknown> {
  const before = await tx
    .select()
    .from(table)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .where(eq((table as any).id, id))
    .limit(1);
  if (!before[0]) {
    throw new Error(`auditedUpdate: ${meta.tableName} ${id} not found`);
  }
  const updated = await tx
    .update(table)
    .set({ ...patch, updatedAt: sql`NOW()` })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .where(eq((table as any).id, id))
    .returning();
  const after = updated[0];
  await audit.log({
    tableName: meta.tableName,
    recordId: id,
    op: meta.op ?? "update",
    before: before[0],
    after,
    reason: meta.reason ?? null,
  });
  return after;
}

/**
 * Mark a Sales Invoice as posted (immutable thereafter, except for void_*).
 * The Postgres trigger sales_invoices_protect_posted enforces the rest.
 */
export async function postSalesInvoice(
  tx: Tx,
  audit: AuditRecorder,
  invoiceId: string
): Promise<void> {
  // Imported here to avoid a circular module reference at load time.
  const { salesInvoices } = await import("../schema/invoices.js");
  await auditedUpdate(
    tx,
    audit,
    salesInvoices,
    invoiceId,
    { posted: true, postedAt: sql`NOW()` },
    { tableName: "sales_invoices", op: "post" }
  );
}

/**
 * Void a Sales Invoice. Flags void_* on the original and creates a paired
 * reversal invoice the caller is responsible for issuing — this helper only
 * marks the original. The reversal is created via auditedInsert on the same
 * transaction.
 */
export async function voidSalesInvoice(
  tx: Tx,
  audit: AuditRecorder,
  originalId: string,
  args: { voidedBy: string; reason: string; reversalInvoiceId?: string }
): Promise<void> {
  const { salesInvoices } = await import("../schema/invoices.js");
  await auditedUpdate(
    tx,
    audit,
    salesInvoices,
    originalId,
    {
      voidedAt: sql`NOW()`,
      voidedBy: args.voidedBy,
      voidReason: args.reason,
      voidsInvoiceId: args.reversalInvoiceId ?? null,
    },
    { tableName: "sales_invoices", op: "void", reason: args.reason }
  );
}

/**
 * Atomically issue the next BIR invoice serial for a branch.
 * Wraps the issue_invoice_number(branch_id) Postgres function.
 */
export async function nextInvoiceNumber(tx: Tx, branchId: string): Promise<string> {
  const result = await tx.execute<{ issue_invoice_number: string }>(
    sql`SELECT issue_invoice_number(${branchId}::uuid) AS issue_invoice_number`
  );
  // postgres-js returns rows as the `rows` array on the result, but Drizzle
  // exposes the array directly when using `tx.execute` with postgres-js driver.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = ((result as any).rows ?? result)[0];
  if (!row || !row.issue_invoice_number) {
    throw new Error(`nextInvoiceNumber: failed for branch ${branchId}`);
  }
  return row.issue_invoice_number as string;
}

export async function nextCrNumber(tx: Tx, branchId: string): Promise<string> {
  const result = await tx.execute<{ issue_cr_number: string }>(
    sql`SELECT issue_cr_number(${branchId}::uuid) AS issue_cr_number`
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = ((result as any).rows ?? result)[0];
  if (!row || !row.issue_cr_number) {
    throw new Error(`nextCrNumber: failed for branch ${branchId}`);
  }
  return row.issue_cr_number as string;
}
