'use strict';

const { Client } = require('pg');

const DATABASE_URL = 'postgresql://neondb_owner:npg_VBIYZSC9nUX5@ep-fragrant-violet-a1a9ir2v-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const DDL = `
-- 1. organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. branches
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  address TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  operating_hours JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, slug)
);

-- 3. users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(20) NOT NULL,
  org_id UUID REFERENCES organizations(id),
  branch_id UUID REFERENCES branches(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_role_check CHECK (role IN ('customer', 'staff', 'branch_admin', 'org_admin', 'superadmin'))
);

-- 4. refresh_tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. services
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  base_price DECIMAL(10, 2) NOT NULL,
  price_unit VARCHAR(20) NOT NULL DEFAULT 'kg',
  min_quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  estimated_hours INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. branch_services
CREATE TABLE IF NOT EXISTS branch_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  service_id UUID NOT NULL REFERENCES services(id),
  price_override DECIMAL(10, 2),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (branch_id, service_id)
);

-- 7. service_plans
CREATE TABLE IF NOT EXISTS service_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
  included_kg DECIMAL(10, 2),
  included_loads INTEGER,
  services JSONB,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. customers
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id),
  org_id UUID NOT NULL REFERENCES organizations(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  notes TEXT,
  preferred_branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. customer_addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label VARCHAR(50) NOT NULL DEFAULT 'home',
  address_line TEXT NOT NULL,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. customer_subscriptions
CREATE TABLE IF NOT EXISTS customer_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  plan_id UUID NOT NULL REFERENCES service_plans(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customer_subscriptions_status_check CHECK (status IN ('active', 'paused', 'cancelled', 'expired'))
);

-- 11. orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  branch_id UUID NOT NULL REFERENCES branches(id),
  customer_id UUID REFERENCES customers(id),
  subscription_id UUID REFERENCES customer_subscriptions(id),
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  order_type VARCHAR(20) NOT NULL DEFAULT 'walk_in',
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
  payment_method VARCHAR(20),
  notes TEXT,
  pickup_address_id UUID REFERENCES customer_addresses(id),
  delivery_address_id UUID REFERENCES customer_addresses(id),
  estimated_completion TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_status_check CHECK (status IN ('pending', 'confirmed', 'picked_up', 'processing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled')),
  CONSTRAINT orders_order_type_check CHECK (order_type IN ('walk_in', 'pickup', 'delivery')),
  CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded'))
);

-- 12. order_items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  quantity DECIMAL(10, 2) NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. order_status_history
CREATE TABLE IF NOT EXISTS order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  amount DECIMAL(10, 2) NOT NULL,
  method VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reference VARCHAR(255),
  paymongo_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_status_check CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);

-- 15. deliveries
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  type VARCHAR(10),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  driver_name VARCHAR(255),
  driver_phone VARCHAR(20),
  address_id UUID REFERENCES customer_addresses(id),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT deliveries_type_check CHECK (type IN ('pickup', 'delivery')),
  CONSTRAINT deliveries_status_check CHECK (status IN ('pending', 'assigned', 'in_transit', 'completed', 'failed'))
);
`;

const SEED = `
-- Seed: organization
INSERT INTO organizations (id, name, slug, settings)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Aunt Sally''s Laundry',
  'aunt-sallys',
  '{"currency": "PHP", "timezone": "Asia/Manila"}'
)
ON CONFLICT (slug) DO NOTHING;

-- Seed: branches
INSERT INTO branches (id, org_id, name, slug, address, phone, is_active)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Arton Rockwell', 'arton-rockwell',
   'Arton by Rockwell, Makati City', '+639000000001', TRUE),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Ayala 30th', 'ayala-30th',
   '30th St, Bonifacio Global City, Taguig', '+639000000002', TRUE),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Tiendesitas Pasig', 'tiendesitas-pasig',
   'Tiendesitas, Pasig City', '+639000000003', TRUE),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'Xavierville Katipunan', 'xavierville-katipunan',
   'Xavierville Ave, Loyola Heights, Quezon City', '+639000000004', TRUE)
ON CONFLICT DO NOTHING;

-- Seed: services
INSERT INTO services (id, org_id, name, description, category, base_price, price_unit, min_quantity, estimated_hours, sort_order)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Wash & Fold', 'Machine wash and fold, sorted by color', 'Wash & Fold',
   80.00, 'kg', 3, 24, 1),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Dry Clean', 'Professional dry cleaning for delicate garments', 'Dry Clean',
   250.00, 'piece', 1, 48, 2),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Steam Press', 'Steam pressing for wrinkle-free clothes', 'Steam Press',
   50.00, 'piece', 1, 4, 3),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'Wash & Iron', 'Machine wash then pressed and hung', 'Wash & Iron',
   120.00, 'kg', 3, 36, 4),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
   'Curtains & Beddings', 'Wash and press for curtains, bedsheets, duvet covers', 'Curtains & Beddings',
   200.00, 'piece', 1, 48, 5)
ON CONFLICT DO NOTHING;

-- Seed: branch_services (all branches get all services)
INSERT INTO branch_services (branch_id, service_id, is_available)
SELECT b.id, s.id, TRUE
FROM branches b
CROSS JOIN services s
WHERE b.org_id = 'a0000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

-- Seed: admin user
INSERT INTO users (id, email, password_hash, first_name, last_name, role, org_id, is_active)
VALUES (
  'u0000000-0000-0000-0000-000000000001',
  'admin@auntsallys.ph',
  -- bcrypt hash of 'Admin@123' (12 rounds)
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFAEuQ0OkBTX5mi',
  'Admin',
  'User',
  'org_admin',
  'a0000000-0000-0000-0000-000000000001',
  TRUE
)
ON CONFLICT (email) DO NOTHING;
`;

const VERIFY = `
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
`;

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to Neon database.');

  console.log('\n--- Creating tables ---');
  await client.query(DDL);
  console.log('DDL executed successfully.');

  console.log('\n--- Seeding data ---');
  await client.query(SEED);
  console.log('Seed executed successfully.');

  console.log('\n--- Verifying tables ---');
  const result = await client.query(VERIFY);
  const tables = result.rows.map(r => r.table_name);
  console.log('Tables in public schema:');
  tables.forEach(t => console.log('  -', t));
  console.log('\nTotal tables:', tables.length);

  await client.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
