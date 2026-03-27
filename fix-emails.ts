import { db, users } from "@aunt-sallys/db";
import { like, sql } from "drizzle-orm";

async function fixEmails() {
  // Update all @auntsallys.ph → @auntsallyslaundry.com
  const result = await db.execute(
    sql`UPDATE users SET email = REPLACE(email, '@auntsallys.ph', '@auntsallyslaundry.com') WHERE email LIKE '%@auntsallys.ph'`
  );
  console.log("Updated rows:", result.rowCount);

  // Show updated emails
  const updated = await db.execute(
    sql`SELECT email, role FROM users WHERE email LIKE '%@auntsallyslaundry.com' ORDER BY role, email`
  );
  console.log("\nUpdated accounts:");
  for (const row of updated.rows) {
    console.log(`  ${row.role}: ${row.email}`);
  }
}

fixEmails().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
