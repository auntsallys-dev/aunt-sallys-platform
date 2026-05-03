-- =============================================================================
-- BIR CAS — Post-migration DDL
-- =============================================================================
-- Run AFTER `pnpm db:migrate` has applied the Drizzle-generated schema.
--
-- This file contains things Drizzle Kit cannot generate automatically:
--   1. Per-branch invoice and CR sequences (created lazily on first issuance).
--   2. issue_invoice_number(branch_id) and issue_cr_number(branch_id) functions.
--   3. Triggers preventing UPDATE / DELETE of audit_trail rows.
--   4. Triggers preventing DELETE / late-edit of posted sales_invoices.
--   5. Trigger preventing DELETE of collection_receipts.
--
-- Usage:
--   psql $DATABASE_URL -f packages/db/sql/0001_bir_cas_post_migration.sql
-- or via the npm script:
--   pnpm --filter @aunt-sallys/db db:apply-bir-cas
--
-- This file is idempotent: every CREATE uses CREATE OR REPLACE / IF NOT EXISTS
-- so it can be safely re-run after schema changes.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Per-branch sequences — created lazily by ensure_invoice_sequence()
-- -----------------------------------------------------------------------------
-- We do NOT create one big sequence for all branches because BIR requires
-- the serial to be unique and contiguous *per branch* (with gaps explained
-- only by voids). The function below ensures a sequence exists for the
-- given branch on first call.
--
-- Naming convention:
--   invoice_seq_br_<branch_code>     — for sales_invoices.invoice_number
--   cr_seq_br_<branch_code>          — for collection_receipts.cr_number
--
-- branch_code is taken from branches.branch_code (from the BIR 2303).
-- A branch with a NULL branch_code cannot issue invoices.

CREATE OR REPLACE FUNCTION ensure_invoice_sequence(p_branch_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_branch_code text;
  v_seq_name    text;
BEGIN
  SELECT branch_code INTO v_branch_code
  FROM branches WHERE id = p_branch_id;

  IF v_branch_code IS NULL OR v_branch_code = '' THEN
    RAISE EXCEPTION
      'cannot issue invoice for branch %: branch_code is not set (BIR 2303 not yet registered)',
      p_branch_id;
  END IF;

  -- normalize branch code: strip whitespace, lowercase for sequence name only
  v_seq_name := 'invoice_seq_br_' || lower(regexp_replace(v_branch_code, '\s', '', 'g'));

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S' AND c.relname = v_seq_name
  ) THEN
    EXECUTE format('CREATE SEQUENCE %I INCREMENT 1 MINVALUE 1 START 1 NO CYCLE', v_seq_name);
  END IF;

  RETURN v_seq_name;
END;
$$;

CREATE OR REPLACE FUNCTION ensure_cr_sequence(p_branch_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_branch_code text;
  v_seq_name    text;
BEGIN
  SELECT branch_code INTO v_branch_code
  FROM branches WHERE id = p_branch_id;

  IF v_branch_code IS NULL OR v_branch_code = '' THEN
    RAISE EXCEPTION
      'cannot issue collection receipt for branch %: branch_code is not set',
      p_branch_id;
  END IF;

  v_seq_name := 'cr_seq_br_' || lower(regexp_replace(v_branch_code, '\s', '', 'g'));

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S' AND c.relname = v_seq_name
  ) THEN
    EXECUTE format('CREATE SEQUENCE %I INCREMENT 1 MINVALUE 1 START 1 NO CYCLE', v_seq_name);
  END IF;

  RETURN v_seq_name;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. issue_invoice_number(branch_id) — atomic, non-resettable, BIR-formatted
-- -----------------------------------------------------------------------------
-- Returns a string of the form: "LM-BR<branch_code>-<00000001>"
-- where the last 8 digits are the next value from invoice_seq_br_<branch_code>.
--
-- Concurrency: nextval() is atomic. Two parallel callers will receive
-- distinct sequential numbers without locking the branches row.

CREATE OR REPLACE FUNCTION issue_invoice_number(p_branch_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq_name    text;
  v_next        bigint;
  v_branch_code text;
BEGIN
  v_seq_name := ensure_invoice_sequence(p_branch_id);

  EXECUTE format('SELECT nextval(%L)', v_seq_name) INTO v_next;

  SELECT branch_code INTO v_branch_code FROM branches WHERE id = p_branch_id;

  RETURN format('LM-BR%s-%s', v_branch_code, lpad(v_next::text, 8, '0'));
END;
$$;

CREATE OR REPLACE FUNCTION issue_cr_number(p_branch_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq_name    text;
  v_next        bigint;
  v_branch_code text;
BEGIN
  v_seq_name := ensure_cr_sequence(p_branch_id);

  EXECUTE format('SELECT nextval(%L)', v_seq_name) INTO v_next;

  SELECT branch_code INTO v_branch_code FROM branches WHERE id = p_branch_id;

  RETURN format('LM-CR-BR%s-%s', v_branch_code, lpad(v_next::text, 8, '0'));
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. Sequence reset guard
-- -----------------------------------------------------------------------------
-- Postgres has no built-in "you cannot reset a sequence" flag. The closest
-- thing is a permissions strategy: REVOKE setval, ALTER SEQUENCE from the
-- application role. We codify that here in the form of a function the app
-- role is supposed to use exclusively. Operations should also revoke direct
-- privileges on these sequences once provisioned.
--
-- For belt-and-suspenders, we add a comment that flags the intent. Real
-- enforcement happens at the role/grant level (out of scope for this file).

COMMENT ON FUNCTION issue_invoice_number IS
  'BIR CAS — issues the next sequential invoice number for a branch. ' ||
  'Application role MUST NOT call setval() or ALTER SEQUENCE directly. ' ||
  'Per RR 11-2024, invoice serials must be non-resettable.';

-- -----------------------------------------------------------------------------
-- 4. Audit trail — append-only enforcement
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION audit_trail_block_modify()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'audit_trail is append-only — % is not permitted (record %)',
    TG_OP, COALESCE(OLD.id::text, NEW.id::text);
END;
$$;

DROP TRIGGER IF EXISTS audit_trail_no_update ON audit_trail;
CREATE TRIGGER audit_trail_no_update
  BEFORE UPDATE ON audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION audit_trail_block_modify();

DROP TRIGGER IF EXISTS audit_trail_no_delete ON audit_trail;
CREATE TRIGGER audit_trail_no_delete
  BEFORE DELETE ON audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION audit_trail_block_modify();

-- TRUNCATE is not handled by row triggers; block at the statement level.
CREATE OR REPLACE FUNCTION audit_trail_block_truncate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_trail is append-only — TRUNCATE is not permitted';
END;
$$;

DROP TRIGGER IF EXISTS audit_trail_no_truncate ON audit_trail;
CREATE TRIGGER audit_trail_no_truncate
  BEFORE TRUNCATE ON audit_trail
  FOR EACH STATEMENT
  EXECUTE FUNCTION audit_trail_block_truncate();

-- -----------------------------------------------------------------------------
-- 5. Sales invoices — posted-row protection
-- -----------------------------------------------------------------------------
-- Once posted = true, the only fields that may change are the void-related
-- fields and the cas_ac_* fields. DELETE is never permitted on a posted
-- invoice, regardless of intent.

CREATE OR REPLACE FUNCTION sales_invoices_protect_posted()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  -- columns that ARE allowed to mutate after posting:
  --   updated_at, voided_at, voided_by, void_reason, voids_invoice_id,
  --   cas_ac_number, cas_ac_issued_on
  has_disallowed_change boolean;
BEGIN
  IF TG_OP = 'DELETE' AND OLD.posted THEN
    RAISE EXCEPTION
      'sales_invoices: cannot DELETE a posted invoice (% / %). Issue a void instead.',
      OLD.id, OLD.invoice_number;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.posted THEN
    has_disallowed_change :=
         NEW.invoice_number     IS DISTINCT FROM OLD.invoice_number
      OR NEW.order_id           IS DISTINCT FROM OLD.order_id
      OR NEW.branch_id          IS DISTINCT FROM OLD.branch_id
      OR NEW.customer_id        IS DISTINCT FROM OLD.customer_id
      OR NEW.customer_name      IS DISTINCT FROM OLD.customer_name
      OR NEW.customer_address   IS DISTINCT FROM OLD.customer_address
      OR NEW.customer_tin       IS DISTINCT FROM OLD.customer_tin
      OR NEW.discount_type      IS DISTINCT FROM OLD.discount_type
      OR NEW.discount_id_number IS DISTINCT FROM OLD.discount_id_number
      OR NEW.discount_amount    IS DISTINCT FROM OLD.discount_amount
      OR NEW.vatable_sales      IS DISTINCT FROM OLD.vatable_sales
      OR NEW.vat_exempt_sales   IS DISTINCT FROM OLD.vat_exempt_sales
      OR NEW.zero_rated_sales   IS DISTINCT FROM OLD.zero_rated_sales
      OR NEW.vat_amount         IS DISTINCT FROM OLD.vat_amount
      OR NEW.subtotal           IS DISTINCT FROM OLD.subtotal
      OR NEW.delivery_fee       IS DISTINCT FROM OLD.delivery_fee
      OR NEW.total              IS DISTINCT FROM OLD.total
      OR NEW.posted             IS DISTINCT FROM OLD.posted
      OR NEW.posted_at          IS DISTINCT FROM OLD.posted_at
      OR NEW.issued_by          IS DISTINCT FROM OLD.issued_by
      OR NEW.issued_at          IS DISTINCT FROM OLD.issued_at
      OR NEW.seller_registered_name IS DISTINCT FROM OLD.seller_registered_name
      OR NEW.seller_trade_name      IS DISTINCT FROM OLD.seller_trade_name
      OR NEW.seller_tin             IS DISTINCT FROM OLD.seller_tin
      OR NEW.seller_vat_status      IS DISTINCT FROM OLD.seller_vat_status
      OR NEW.seller_address         IS DISTINCT FROM OLD.seller_address
      OR NEW.seller_branch_code     IS DISTINCT FROM OLD.seller_branch_code
      OR NEW.seller_rdo             IS DISTINCT FROM OLD.seller_rdo;

    IF has_disallowed_change THEN
      RAISE EXCEPTION
        'sales_invoices: posted invoice % is immutable; only void_*, cas_ac_*, and updated_at may change.',
        OLD.invoice_number;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sales_invoices_protect_posted_upd ON sales_invoices;
CREATE TRIGGER sales_invoices_protect_posted_upd
  BEFORE UPDATE ON sales_invoices
  FOR EACH ROW
  EXECUTE FUNCTION sales_invoices_protect_posted();

DROP TRIGGER IF EXISTS sales_invoices_protect_posted_del ON sales_invoices;
CREATE TRIGGER sales_invoices_protect_posted_del
  BEFORE DELETE ON sales_invoices
  FOR EACH ROW
  EXECUTE FUNCTION sales_invoices_protect_posted();

-- Also protect line items of a posted invoice
CREATE OR REPLACE FUNCTION sales_invoice_items_protect_posted()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_posted boolean;
  v_invoice_id uuid;
BEGIN
  v_invoice_id := COALESCE(OLD.invoice_id, NEW.invoice_id);
  SELECT posted INTO v_posted FROM sales_invoices WHERE id = v_invoice_id;

  IF v_posted IS TRUE THEN
    RAISE EXCEPTION
      'sales_invoice_items: cannot % a line item belonging to a posted invoice',
      TG_OP;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sales_invoice_items_protect_upd ON sales_invoice_items;
CREATE TRIGGER sales_invoice_items_protect_upd
  BEFORE UPDATE ON sales_invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION sales_invoice_items_protect_posted();

DROP TRIGGER IF EXISTS sales_invoice_items_protect_del ON sales_invoice_items;
CREATE TRIGGER sales_invoice_items_protect_del
  BEFORE DELETE ON sales_invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION sales_invoice_items_protect_posted();

-- -----------------------------------------------------------------------------
-- 6. Collection receipts — no DELETE
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION collection_receipts_block_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'collection_receipts: cannot DELETE (%, %). Use void_* fields instead.',
    OLD.id, OLD.cr_number;
END;
$$;

DROP TRIGGER IF EXISTS collection_receipts_no_delete ON collection_receipts;
CREATE TRIGGER collection_receipts_no_delete
  BEFORE DELETE ON collection_receipts
  FOR EACH ROW
  EXECUTE FUNCTION collection_receipts_block_delete();

COMMIT;

-- =============================================================================
-- End of 0001_bir_cas_post_migration.sql
-- =============================================================================
