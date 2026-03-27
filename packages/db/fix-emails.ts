import { db } from "./src/client.js";
import { sql } from "drizzle-orm";

async function fixEmails() {
  await db.execute(
    sql`UPDATE users SET email = REPLACE(email, '@auntsallys.ph', '@auntsallyslaundry.com') WHERE email LIKE '%@auntsallys.ph'`
  );

  const updated = await db.execute(
    sql`SELECT email, role FROM users WHERE email LIKE '%@auntsallyslaundry.com' ORDER BY role, email`
  );
  console.log("Updated accounts:");
  const rows = Array.isArray(updated) ? updated : (updated as any).rows ?? [];
  for (const row of rows) {
    console.log(`  [${row.role}] ${row.email}`);
  }
}

fixEmails().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
