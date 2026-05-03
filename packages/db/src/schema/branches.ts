import {
  pgTable,
  uuid,
  varchar,
  text,
  decimal,
  boolean,
  jsonb,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations.js";

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    address: text("address"),
    lat: decimal("lat", { precision: 10, scale: 8 }),
    lng: decimal("lng", { precision: 11, scale: 8 }),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    isActive: boolean("is_active").default(true).notNull(),
    operatingHours: text("operating_hours"),
    secondaryPhone: varchar("secondary_phone", { length: 50 }),
    settings: jsonb("settings").default({}),

    // ---- BIR / CAS fields ----
    // The branch code that appears on the BIR 2303 (e.g. "001", "00003", "00004").
    // Used as the suffix on invoice serials, e.g. LM-BR00004-00000001.
    // Nullable until each branch is officially registered; invoice issuance
    // refuses to mint a serial for a branch with no branchCode.
    branchCode: varchar("branch_code", { length: 8 }),
    // Revenue District Office, e.g. "039", "043". For display on invoice and reports.
    rdo: varchar("rdo", { length: 8 }),
    // Address as it appears on the 2303 — distinct from the operational `address`
    // above. This is what gets printed on the invoice header.
    registeredAddress: text("registered_address"),
    // Date the branch was registered with BIR (per 2303). Stored as date, not timestamp.
    birRegisteredOn: timestamp("bir_registered_on", { withTimezone: false, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique().on(t.orgId, t.slug),
    // BIR branch code is unique within an organization. Nullable rows are not
    // constrained by the unique index in PostgreSQL, so unregistered branches
    // can coexist freely until their 2303 is issued.
    unique("branches_org_branch_code_unique").on(t.orgId, t.branchCode),
  ]
);

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
