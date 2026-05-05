/**
 * Applies the hand-written SQL files in packages/db/sql/ in numeric order.
 * Run AFTER `pnpm db:migrate` so the Drizzle schema exists.
 *
 * Each .sql file is wrapped in its own BEGIN ... COMMIT internally — we run
 * them one at a time. The script is idempotent: every CREATE in those files
 * uses CREATE OR REPLACE / IF NOT EXISTS, so re-running is safe.
 */
import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_DIR = path.resolve(__dirname, "..", "sql");

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const files = fs
    .readdirSync(SQL_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // 0001_*.sql, 0002_*.sql, ...

  if (files.length === 0) {
    console.log(`(no .sql files in ${SQL_DIR})`);
    return;
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    for (const f of files) {
      const fp = path.join(SQL_DIR, f);
      const body = fs.readFileSync(fp, "utf8");
      console.log(`applying ${f} ...`);
      await sql.unsafe(body);
      console.log(`  ok`);
    }
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("apply-bir-cas-sql failed:", err);
  process.exit(1);
});
