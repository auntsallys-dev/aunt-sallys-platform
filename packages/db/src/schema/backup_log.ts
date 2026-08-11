import {
  pgTable,
  uuid,
  varchar,
  text,
  bigint,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

/**
 * Append-only log of every nightly backup run — BIR 10-year retention proof.
 *
 * The backup job (apps/api/src/jobs/backup.ts) writes one row per run: the
 * object key, the SHA-256 + size of the encrypted dump, and whether it
 * succeeded. Failures are recorded too (status = 'failed', error captured) so
 * a missed backup is visible rather than silent.
 *
 * Rows are NEVER updated or deleted — a Postgres trigger (migration
 * 0003_backup_log.sql) raises on UPDATE/DELETE/TRUNCATE. The log is the audit
 * evidence that backups ran; mutating it would defeat the point.
 */
export const backupLog = pgTable(
  "backup_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // R2/local object key of the encrypted dump (null if it failed before upload).
    objectKey: varchar("object_key", { length: 512 }),
    sha256: varchar("sha256", { length: 64 }),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    // 'success' | 'failed'
    status: varchar("status", { length: 16 }).notNull(),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("backup_log_finished_idx").on(t.finishedAt),
    index("backup_log_status_idx").on(t.status),
  ]
);

export type BackupLog = typeof backupLog.$inferSelect;
export type NewBackupLog = typeof backupLog.$inferInsert;
