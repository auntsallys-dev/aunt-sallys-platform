-- ============================================================================
-- 0002_invoice_prints — append-only enforcement for the invoice reprint log.
--
-- STAGED: apply AFTER `db:push` has created the invoice_prints table, the same
-- way 0001 is applied on top of the pushed schema. Not yet applied to prod.
-- Run: pnpm --filter @aunt-sallys/db exec tsx src/apply-bir-cas-sql.ts (or the
-- equivalent apply step wired for 0002).
--
-- BIR: reprints must be logged and immutable. A reprint is a NEW row; the log
-- is never updated or deleted.
-- ============================================================================

CREATE OR REPLACE FUNCTION invoice_prints_block_modify()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'invoice_prints is append-only — % is not permitted (record %)',
    TG_OP, COALESCE(OLD.id::text, '?');
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_prints_no_update ON invoice_prints;
CREATE TRIGGER invoice_prints_no_update
  BEFORE UPDATE ON invoice_prints
  FOR EACH ROW
  EXECUTE FUNCTION invoice_prints_block_modify();

DROP TRIGGER IF EXISTS invoice_prints_no_delete ON invoice_prints;
CREATE TRIGGER invoice_prints_no_delete
  BEFORE DELETE ON invoice_prints
  FOR EACH ROW
  EXECUTE FUNCTION invoice_prints_block_modify();

CREATE OR REPLACE FUNCTION invoice_prints_block_truncate()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'invoice_prints is append-only — TRUNCATE is not permitted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_prints_no_truncate ON invoice_prints;
CREATE TRIGGER invoice_prints_no_truncate
  BEFORE TRUNCATE ON invoice_prints
  FOR EACH STATEMENT
  EXECUTE FUNCTION invoice_prints_block_truncate();
