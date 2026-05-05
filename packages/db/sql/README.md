# Hand-written SQL migrations

Drizzle Kit can't generate every kind of DDL we need for BIR CAS compliance
(per-branch sequences, custom Postgres functions, append-only triggers).
Those live here as numbered, idempotent SQL files.

## Order of operations

1. `pnpm db:generate` — produces Drizzle migrations for the schema in
   `packages/db/src/schema/`.
2. `pnpm db:migrate` — applies them.
3. `pnpm db:apply-bir-cas` — applies the files in this folder, in numeric order.

## Files

| File | What it does |
|------|--------------|
| `0001_bir_cas_post_migration.sql` | Per-branch invoice/CR sequences, `issue_invoice_number()` / `issue_cr_number()` functions, append-only audit_trail enforcement, posted-invoice protection. |

Each file is wrapped in a `BEGIN … COMMIT` and uses `CREATE OR REPLACE` /
`DROP IF EXISTS` so re-running is safe.

## Why this isn't a Drizzle migration

Drizzle Kit emits SQL based on schema diffs. Sequences keyed by data
(per-branch), functions, and triggers don't show up in a schema diff —
they're operational guarantees, not column changes. Keeping them as
explicit, reviewable SQL is clearer than smuggling them through Drizzle's
journal.

## After adding a new branch

When a new branch is registered with BIR and `branches.branch_code` is
populated, the first call to `issue_invoice_number(<branch_id>)` will
lazily create the per-branch sequence. No manual provisioning needed.
