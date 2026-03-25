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
      name: "Aunt Sally's — Arton Rockwell",
      slug: "arton",
      address: "Arton by Rockwell, Quezon City, Metro Manila",
      lat: "14.6488",
      lng: "121.0520",
      phone: "+63 2 8000 0001",
      email: "arton@auntsallys.ph",
    },
    {
      name: "Aunt Sally's — Ayala 30th",
      slug: "ayala-30th",
      address: "Ayala 30th, Pasig City, Metro Manila",
      lat: "14.5547",
      lng: "121.0508",
      phone: "+63 2 8000 0002",
      email: "ayala30th@auntsallys.ph",
    },
    {
      name: "Aunt Sally's — Tiendesitas",
      slug: "tiendesitas",
      address: "Tiendesitas, Ortigas Ave, Pasig City, Metro Manila",
      lat: "14.5853",
      lng: "121.0817",
      phone: "+63 2 8000 0003",
      email: "tiendesitas@auntsallys.ph",
    },
    {
      name: "Aunt Sally's — Xavierville",
      slug: "xavierville",
      address: "Xavierville Ave, Loyola Heights, Quezon City, Metro Manila",
      lat: "14.6378",
      lng: "121.0777",
      phone: "+63 2 8000 0004",
      email: "xavierville@auntsallys.ph",
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
    // WASH DRY FOLD
    { name: "Wash Dry Fold — Regular Bag (1-5kg)", description: "Wash, dry, and fold. Regular bag up to 5kg.", category: "wash_dry_fold", basePrice: "400.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 4, sortOrder: 1 },
    { name: "Wash Dry Fold — Large Bag (6+kg)", description: "Wash, dry, and fold. Large bag 6kg and above.", category: "wash_dry_fold", basePrice: "500.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 4, sortOrder: 2 },

    // WASH DRY PRESS
    { name: "Wash Dry Press — Regular Bag (12 pcs iron)", description: "Wash, dry, and press. Regular bag with 12 pieces ironed.", category: "wash_dry_press", basePrice: "1120.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 6, sortOrder: 10 },
    { name: "Wash Dry Press — Large Bag (24 pcs iron)", description: "Wash, dry, and press. Large bag with 24 pieces ironed.", category: "wash_dry_press", basePrice: "1680.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 6, sortOrder: 11 },
    { name: "Hand Wash & Fold (1kg)", description: "Hand wash and fold per kg.", category: "wash_dry_press", basePrice: "400.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 5, sortOrder: 12 },
    { name: "Hand Wash & Press (1kg)", description: "Hand wash and press per kg.", category: "wash_dry_press", basePrice: "1120.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 7, sortOrder: 13 },

    // DRY ONLY
    { name: "Dry Only — 1-5kg", description: "Drying service only. Up to 5kg.", category: "dry_only", basePrice: "240.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 2, sortOrder: 20 },
    { name: "Dry Only — 6-10kg", description: "Drying service only. 6 to 10kg.", category: "dry_only", basePrice: "340.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 2, sortOrder: 21 },

    // HEAVY WASHING
    { name: "Heavy Wash — Bed Sheet, Blanket & Towel", description: "Heavy washing for bed sheets, blankets (light), and towels. Up to 8kg.", category: "heavy_wash", basePrice: "780.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 6, sortOrder: 30 },
    { name: "Heavy Wash — Seat Cover & Curtains", description: "Heavy washing for seat covers and curtains. Up to 8kg. If handwash, follow handwash rate.", category: "heavy_wash", basePrice: "890.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 6, sortOrder: 31 },

    // COMFORTERS
    { name: "Comforter — Single/Twin", description: "Wash and dry for single or twin comforter.", category: "comforter", basePrice: "500.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 8, sortOrder: 40 },
    { name: "Comforter — Double/Queen", description: "Wash and dry for double or queen comforter.", category: "comforter", basePrice: "560.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 8, sortOrder: 41 },
    { name: "Comforter — King", description: "Wash and dry for king size comforter.", category: "comforter", basePrice: "670.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 8, sortOrder: 42 },
    { name: "Comforter — Extra King", description: "Wash and dry for extra king size comforter.", category: "comforter", basePrice: "1120.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 8, sortOrder: 43 },

    // DRY CLEANING
    { name: "Dry Clean — Barong (Kids/Youth S-XL)", description: "Dry cleaning for barong. Kids/youth sizes S to XL.", category: "dry_clean", basePrice: "450.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 50 },
    { name: "Dry Clean — Barong (Adults S-XXXL)", description: "Dry cleaning for barong. Adult sizes S to XXXL.", category: "dry_clean", basePrice: "670.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 51 },
    { name: "Dry Clean — Coat/Sweater/Jacket (Kids)", description: "Dry cleaning for coat, sweater, or jacket. Kids size.", category: "dry_clean", basePrice: "450.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 52 },
    { name: "Dry Clean — Coat/Sweater/Jacket (Adults)", description: "Dry cleaning for coat, sweater, or jacket. Adults.", category: "dry_clean", basePrice: "560.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 53 },
    { name: "Dry Clean — Pants & Skirt", description: "Dry cleaning for pants or skirt.", category: "dry_clean", basePrice: "340.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 54 },
    { name: "Dry Clean — Blouse/Collared Shirt", description: "Dry cleaning for blouse or collared shirt.", category: "dry_clean", basePrice: "340.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 55 },
    { name: "Dry Clean — Dress (Kids/Youth)", description: "Dry cleaning for dress. Kids/youth.", category: "dry_clean", basePrice: "450.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 56 },
    { name: "Dry Clean — Dress (Adults)", description: "Dry cleaning for dress. Adults.", category: "dry_clean", basePrice: "670.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 57 },
    { name: "Dry Clean — Evening Gown (Light)", description: "Dry cleaning for light evening gown.", category: "dry_clean", basePrice: "670.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 58 },
    { name: "Dry Clean — Evening Gown (Layered w/ Lining)", description: "Dry cleaning for layered evening gown with lining.", category: "dry_clean", basePrice: "1120.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 59 },
    { name: "Dry Clean — Wedding Gown (Small Layered)", description: "Dry cleaning for small layered wedding gown.", category: "dry_clean", basePrice: "2800.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 48, sortOrder: 60 },
    { name: "Dry Clean — Two-Piece Suit (Youth)", description: "Dry cleaning for two-piece suit. Youth.", category: "dry_clean", basePrice: "670.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 61 },
    { name: "Dry Clean — Two-Piece Suit (Adults)", description: "Dry cleaning for two-piece suit. Adults.", category: "dry_clean", basePrice: "890.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 62 },
    { name: "Dry Clean — Pillows", description: "Dry cleaning per pillow.", category: "dry_clean", basePrice: "220.00", priceUnit: "per_piece", minQuantity: "1", estimatedHours: 24, sortOrder: 63 },
    { name: "Dry Clean — Caps (Washable)", description: "Cleaning for washable caps per piece.", category: "dry_clean", basePrice: "400.00", priceUnit: "per_piece", minQuantity: "1", estimatedHours: 24, sortOrder: 64 },
    { name: "Dry Clean — Bags Small (Washable)", description: "Cleaning for small washable bags.", category: "dry_clean", basePrice: "340.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 65 },
    { name: "Dry Clean — Bags Medium to Large (Washable)", description: "Cleaning for medium to large washable bags.", category: "dry_clean", basePrice: "670.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 66 },
    { name: "Dry Clean — Shoes (Washable)", description: "Cleaning for washable shoes.", category: "dry_clean", basePrice: "400.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 48, sortOrder: 67 },
    { name: "Dry Clean — Carpet", description: "Carpet cleaning per square inch.", category: "dry_clean", basePrice: "1.00", priceUnit: "per_sqinch", minQuantity: "1", estimatedHours: 48, sortOrder: 68 },
    { name: "Dry Clean — Stuffed Toys (12 inches)", description: "Cleaning for stuffed toys up to 12 inches.", category: "dry_clean", basePrice: "220.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 69 },
    { name: "Dry Clean — Stuffed Toys (25 inches)", description: "Cleaning for stuffed toys up to 25 inches.", category: "dry_clean", basePrice: "450.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 70 },
    { name: "Dry Clean — Stuffed Toys (36 inches)", description: "Cleaning for stuffed toys up to 36 inches.", category: "dry_clean", basePrice: "890.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 71 },
    { name: "Dry Clean — Stuffed Toys (60 inches)", description: "Cleaning for stuffed toys up to 60 inches.", category: "dry_clean", basePrice: "1680.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 72 },

    // ADD ONS
    { name: "Special Detergent", description: "Special detergent per 60ml.", category: "addon", basePrice: "50.00", priceUnit: "per_60ml", minQuantity: "1", estimatedHours: 0, sortOrder: 80 },
    { name: "Special Fabric Conditioner", description: "Special fabric conditioner per 60ml.", category: "addon", basePrice: "50.00", priceUnit: "per_60ml", minQuantity: "1", estimatedHours: 0, sortOrder: 81 },
    { name: "Drying Sheet", description: "Drying sheet add-on.", category: "addon", basePrice: "50.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 0, sortOrder: 82 },
    { name: "Hanger", description: "Hanger per piece.", category: "addon", basePrice: "20.00", priceUnit: "per_piece", minQuantity: "1", estimatedHours: 0, sortOrder: 83 },
    { name: "Eco-Bag", description: "Eco-bag purchase.", category: "addon", basePrice: "200.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 0, sortOrder: 84 },
    { name: "Repair — Minor", description: "Minor clothing repair.", category: "addon", basePrice: "50.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 2, sortOrder: 85 },
    { name: "Repair — Major", description: "Major clothing repair.", category: "addon", basePrice: "100.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 4, sortOrder: 86 },

    // LOGISTICS
    { name: "Pick-up / Delivery", description: "Door-to-door pick-up and delivery service.", category: "logistics", basePrice: "180.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 0, sortOrder: 90 },
    { name: "Rush Service — Next Day", description: "Rush service with next day turnaround.", category: "logistics", basePrice: "300.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 24, sortOrder: 91 },
    { name: "Rush Service — Same Day", description: "Rush service with same day turnaround.", category: "logistics", basePrice: "500.00", priceUnit: "flat", minQuantity: "1", estimatedHours: 8, sortOrder: 92 },
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
    addressLine: "123 Katipunan Ave, Quezon City, Metro Manila",
    lat: "14.6378",
    lng: "121.0777",
    isDefault: true,
  });

  console.log("Created users and sample customer");
  console.log("\nSeed complete! Test credentials:");
  console.log("  superadmin@auntsallys.ph / Password123!");
  console.log("  admin@auntsallys.ph / Password123!");
  console.log("  staff.arton@auntsallys.ph / Password123!");
  console.log("  staff.ayala-30th@auntsallys.ph / Password123!");
  console.log("  staff.tiendesitas@auntsallys.ph / Password123!");
  console.log("  staff.xavierville@auntsallys.ph / Password123!");
  console.log("  customer@example.com / Password123!");

  await sql.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
