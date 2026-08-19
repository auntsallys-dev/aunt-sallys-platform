/**
 * In-process nightly backup scheduler.
 *
 * The backup job (./backup.ts) is written to also run standalone under an
 * external cron (`node dist/jobs/backup.js`). When no external scheduler is
 * available (single Render web service), this arms an in-process timer that
 * fires runBackup() once a day at 02:30 Manila — low-traffic hour.
 *
 * Safety:
 *   - Arms only when BACKUP_ENC_KEY is set. Otherwise it logs a clear skip and
 *     does nothing, so boot never crashes on a missing secret.
 *   - A failed run is logged (and recorded in backup_log by runBackup) but never
 *     propagates — a bad backup must not take down the API.
 */
import { runBackup } from "./backup.js";

const MANILA_BACKUP_HOUR = 2; // 02:30 Manila local
const MANILA_BACKUP_MIN = 30;
const MANILA_OFFSET_HOURS = 8; // PH has no DST — fixed +8

/** Milliseconds from `now` until the next 02:30 Manila. */
function msUntilNextRun(now: Date = new Date()): number {
  const targetUtcHour = ((MANILA_BACKUP_HOUR - MANILA_OFFSET_HOURS) % 24 + 24) % 24;
  const next = new Date(now);
  next.setUTCHours(targetUtcHour, MANILA_BACKUP_MIN, 0, 0);
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}

let armed = false;

export function startBackupScheduler(): void {
  if (armed) return;
  if (!process.env.BACKUP_ENC_KEY) {
    console.log(
      "[backup] scheduler NOT armed — BACKUP_ENC_KEY unset. Set it (plus R2 creds or BACKUP_LOCAL_DIR) to enable nightly backups."
    );
    return;
  }
  armed = true;

  const scheduleNext = () => {
    const delay = msUntilNextRun();
    console.log(`[backup] next nightly run in ~${Math.round(delay / 60000)} min (02:30 Manila)`);
    const t = setTimeout(async () => {
      try {
        const r = await runBackup();
        console.log("[backup] nightly run complete", r);
      } catch (e) {
        console.error("[backup] nightly run FAILED", e);
      } finally {
        scheduleNext();
      }
    }, delay);
    // Let the HTTP server, not this timer, be what keeps the process alive.
    t.unref?.();
  };

  scheduleNext();
}
