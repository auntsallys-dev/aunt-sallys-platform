import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";
import { sql } from "drizzle-orm";

async function reset() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client, { schema });

  console.log("Resetting database...");
  await db.execute(sql`
    TRUNCATE TABLE
      customer_addresses, customers, orders, order_items,
      branch_services, service_plans, services,
      users, branches, organizations
    RESTART IDENTITY CASCADE
  `);
  console.log("Database cleared.");
  await client.end();
}

reset().catch((err) => { console.error(err); process.exit(1); });
