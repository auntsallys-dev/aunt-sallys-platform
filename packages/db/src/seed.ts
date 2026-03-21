/**
 * Seed script — populates the database with:
 * - 1 organization (Aunt Sally's Laundry)
 * - 4 branches (real Cebu locations)
 * - Sample services
 * - Test users (superadmin, org admin, branch staff x4, sample customer)
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import * as schema from "./schema/index.js";

async function seed() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(process.env.DATABASE_URL);
  const db = drizzle(sql, { schema });

  console.log("Seeding database...");

  // ── Organization ───────────────────────────────────────────
  const [org] = await db
    .insert(schema.organizations)
    .values({
      name: "Aunt Sally's Laundry",
      slug: "aunt-sallys",
      settings: {
        currency: "PHP",
        timezone: "Asia/Manila",
        defaultDeliveryFee: 50,
        freeDeliveryThreshold: 500,
      },
    })
    .returning();

  console.log("Created organization:", org.name);

  // ── Branches ───────────────────────────────────────────────
  const branchData = [
    {
      name: "Aunt Sally's — Mandaue City",
      slug: "mandaue",
      address: "A. Del Rosario Ave, Mandaue City, Cebu 6014",
      lat: "10.3236",
      lng: "123.9223",
      phone: "+63 32 344 0001",
      email: "mandaue@auntsallys.ph",
    },
    {
      name: "Aunt Sally's — Cebu IT Park",
      slug: "it-park",
      address: "Cebu IT Park, Apas, Cebu City, Cebu 6000",
      lat: "10.3310",
      lng: "123.9056",
      phone: "+63 32 344 0002",
      email: "itpark@auntsallys.ph",
    },
    {
      name: "Aunt Sally's — Consolacion",
      slug: "consolacion",
      address: "National Highway, Consolacion, Cebu 6001",
      lat: "10.3762",
      lng: "123.9609",
      phone: "+63 32 344 0003",
      email: "consolacion@auntsallys.ph",
    },
    {
      name: "Aunt Sally's — Lapu-Lapu City",
      slug: "lapu-lapu",
      address: "M.L. Quezon National Highway, Lapu-Lapu City, Cebu 6015",
      lat: "10.3102",
      lng: "123.9494",
      phone: "+63 32 344 0004",
      email: "lapulapu@auntsallys.ph",
    },
  ];

  const insertedBranches = await db
    .insert(schema.branches)
    .values(branchData.map((b) => ({ ...b, orgId: org.id, operatingHours: {
      mon: { open: "07:00", close: "20:00" },
      tue: { open: "07:00", close: "20:00" },
      wed: { open: "07:00", close: "20:00" },
      thu: { open: "07:00", close: "20:00" },
      fri: { open: "07:00", close: "20:00" },
      sat: { open: "08:00", close: "18:00" },
      sun: { open: "08:00", close: "17:00" },
    } })))
    .returning();

  console.log(`Created ${insertedBranches.length} branches`);

  // ── Services ───────────────────────────────────────────────
  const serviceData = [
    { name: "Wash & Fold", description: "Regular wash, dry, and fold", category: "wash", basePrice: "65.00", priceUnit: "kg", minQuantity: "3", estimatedHours: 4, sortOrder: 1 },
    { name: "Wash & Iron", description: "Wash, dry, and iron", category: "wash", basePrice: "90.00", priceUnit: "kg", minQuantity: "3", estimatedHours: 6, sortOrder: 2 },
    { name: "Dry Clean", description: "Professional dry cleaning", category: "dry_clean", basePrice: "150.00", priceUnit: "piece", minQuantity: "1", estimatedHours: 24, sortOrder: 3 },
    { name: "Iron Only", description: "Ironing service only", category: "iron", basePrice: "40.00", priceUnit: "piece", minQuantity: "1", estimatedHours: 2, sortOrder: 4 },
    { name: "Beddings & Linens", description: "Comforters, pillows, bedsheets", category: "wash", basePrice: "120.00", priceUnit: "piece", minQuantity: "1", estimatedHours: 8, sortOrder: 5 },
    { name: "Sneaker Cleaning", description: "Specialized shoe cleaning", category: "special", basePrice: "250.00", priceUnit: "pair", minQuantity: "1", estimatedHours: 48, sortOrder: 6 },
    { name: "Express Wash & Fold", description: "Same-day wash and fold (before 10am)", category: "wash", basePrice: "90.00", priceUnit: "kg", minQuantity: "3", estimatedHours: 6, sortOrder: 7 },
  ];

  const insertedServices = await db
    .insert(schema.services)
    .values(serviceData.map((s) => ({ ...s, orgId: org.id })))
    .returning();

  console.log(`Created ${insertedServices.length} services`);

  // Link all services to all branches
  const branchServiceLinks = insertedBranches.flatMap((branch) =>
    insertedServices.map((service) => ({
      branchId: branch.id,
      serviceId: service.id,
      isAvailable: true,
    }))
  );

  await db.insert(schema.branchServices).values(branchServiceLinks);
  console.log("Linked services to all branches");

  // ── Service Plans ──────────────────────────────────────────
  await db.insert(schema.servicePlans).values([
    {
      orgId: org.id,
      name: "Starter Plan",
      description: "8kg wash & fold monthly",
      price: "480.00",
      billingCycle: "monthly",
      includedKg: "8",
      isActive: true,
    },
    {
      orgId: org.id,
      name: "Regular Plan",
      description: "16kg wash & fold monthly",
      price: "880.00",
      billingCycle: "monthly",
      includedKg: "16",
      isActive: true,
    },
    {
      orgId: org.id,
      name: "Family Plan",
      description: "30kg wash & fold monthly + free delivery",
      price: "1500.00",
      billingCycle: "monthly",
      includedKg: "30",
      isActive: true,
    },
  ]);
  console.log("Created service plans");

  // ── Users ──────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  const [superadmin] = await db
    .insert(schema.users)
    .values({
      email: "superadmin@auntsallys.ph",
      passwordHash: hashedPassword,
      firstName: "Super",
      lastName: "Admin",
      role: "superadmin",
      orgId: org.id,
    })
    .returning();

  const [orgAdmin] = await db
    .insert(schema.users)
    .values({
      email: "admin@auntsallys.ph",
      passwordHash: hashedPassword,
      firstName: "Sally",
      lastName: "Reyes",
      role: "org_admin",
      orgId: org.id,
    })
    .returning();

  // Branch staff for each branch
  for (const branch of insertedBranches) {
    await db.insert(schema.users).values({
      email: `staff.${branch.slug}@auntsallys.ph`,
      passwordHash: hashedPassword,
      firstName: "Staff",
      lastName: branch.slug.charAt(0).toUpperCase() + branch.slug.slice(1),
      role: "staff",
      orgId: org.id,
      branchId: branch.id,
    });
  }

  // Sample customer
  const [customerUser] = await db
    .insert(schema.users)
    .values({
      email: "customer@example.com",
      phone: "+63 917 123 4567",
      passwordHash: hashedPassword,
      firstName: "Maria",
      lastName: "Santos",
      role: "customer",
      orgId: org.id,
    })
    .returning();

  const [customer] = await db
    .insert(schema.customers)
    .values({
      userId: customerUser.id,
      orgId: org.id,
      firstName: "Maria",
      lastName: "Santos",
      phone: "+63 917 123 4567",
      email: "customer@example.com",
      preferredBranchId: insertedBranches[0].id,
    })
    .returning();

  await db.insert(schema.customerAddresses).values({
    customerId: customer.id,
    label: "home",
    addressLine: "123 Osmena Blvd, Cebu City, 6000",
    lat: "10.2937",
    lng: "123.9022",
    isDefault: true,
  });

  console.log("Created users and sample customer");
  console.log("\nSeed complete! Test credentials:");
  console.log("  superadmin@auntsallys.ph / Password123!");
  console.log("  admin@auntsallys.ph / Password123!");
  console.log("  staff.mandaue@auntsallys.ph / Password123!");
  console.log("  customer@example.com / Password123!");

  await sql.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
