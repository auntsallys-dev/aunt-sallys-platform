import { db } from "./src/client.js";
import { sql } from "drizzle-orm";

const r = await db.execute(sql`SELECT order_number, branch_id, order_type, status, total, notes, created_at FROM orders ORDER BY created_at DESC LIMIT 10`);
const rows = Array.isArray(r) ? r : (r as any).rows ?? [];
if (rows.length === 0) {
  console.log("No orders in DB at all.");
} else {
  for (const row of rows) {
    console.log(`${row.order_number} | branch: ${row.branch_id} | type: ${row.order_type} | status: ${row.status} | total: ${row.total} | ${row.created_at}`);
    if (row.notes) console.log(`  notes: ${row.notes}`);
  }
}
process.exit(0);
