-- ============================================================================
-- 0003_backup_log — append-only enforcement for the nightly backup log.
--
-- STAGED: apply AFTER `db:push` has created the backup_log table, same as
-- 0001/0002 are applied on top of the pushed schema. Not yet applied to prod.
-- Run via the ordered applier: pnpm --filter @aunt-sallys/db db:apply-bir-cas.
--
-- BIR: the backup log is retention evidence. A run is a NEW row; the log is
-- never updated or deleted.
-- ============================================================================

CREATE OR REPLACE FUNCTION backup_log_block_modify()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'backup_log is append-only — % is not permitted (record %)',
    TG_OP, COALESCE(OLD.id::text, '?');
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS backup_log_no_update ON backup_log;
CREATE TRIGGER backup_log_no_update
  BEFORE UPDATE ON backup_log
  FOR EACH ROW
  EXECUTE FUNCTION backup_log_block_modify();

DROP TRIGGER IF EXISTS backup_log_no_delete ON backup_log;
CREATE TRIGGER backup_log_no_delete
  BEFORE DELETE ON backup_log
  FOR EACH ROW
  EXECUTE FUNCTION backup_log_block_modify();

CREATE OR REPLACE FUNCTION backup_log_block_truncate()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'backup_log is append-only — TRUNCATE is not permitted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS backup_log_no_truncate ON backup_log;
CREATE TRIGGER backup_log_no_truncate
  BEFORE TRUNCATE ON backup_log
  FOR EACH STATEMENT
  EXECUTE FUNCTION backup_log_block_truncate();
