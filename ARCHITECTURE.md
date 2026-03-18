# Aunt Sally's Laundry Platform — Architecture

## Overview

A centralized, multi-tenant digital platform for Aunt Sally's Laundry. Supports multiple branches with a single codebase, designed for future franchising.

## System Components

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTS                             │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Customer  │  │   POS    │  │  Admin   │              │
│  │  Website  │  │   App    │  │Dashboard │              │
│  │ (Next.js) │  │ (React)  │  │ (React)  │              │
│  └─────┬─────┘  └─────┬────┘  └─────┬────┘              │
│        │              │              │                    │
└────────┼──────────────┼──────────────┼───────────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────────────────────────────────────────────────┐
│                    API GATEWAY                            │
│                  (Node.js / Fastify)                      │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  Auth    │ │  Orders  │ │ Payments │ │ Delivery │   │
│  │ Module   │ │  Module  │ │  Module  │ │  Module  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ Services │ │ Branches │ │Customers │                │
│  │  Module  │ │  Module  │ │  Module  │                │
│  └──────────┘ └──────────┘ └──────────┘                │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │PostgreSQL│ │  Redis   │ │  S3/R2   │
   │(Database)│ │ (Cache/  │ │ (Files)  │
   │          │ │  Queue)  │ │          │
   └──────────┘ └──────────┘ └──────────┘
```

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Customer Web | Next.js 15 (App Router) | SEO, SSR, fast page loads, React ecosystem |
| POS App | React + Vite | SPA for tablet/desktop at branches, offline-capable |
| Admin Dashboard | React + Vite | SPA, shared component library with POS |
| Backend API | Node.js + Fastify | Fast, lightweight, TypeScript, great DX |
| Database | PostgreSQL 16 | Multi-tenant, JSONB, reliable, scales well |
| Cache/Queue | Redis | Session cache, real-time pub/sub, job queue |
| ORM | Drizzle ORM | Type-safe, lightweight, great migrations |
| Auth | JWT + refresh tokens | Stateless, role-based (customer/staff/admin/superadmin) |
| Payments | PayMongo | Philippine-native, GCash/Maya/Cards, good API |
| File Storage | Cloudflare R2 | Cheap, S3-compatible, receipts/images |
| Hosting | Railway (API + DB) / Vercel (web) | Fast deploys, managed infra, affordable |
| Real-time | WebSocket (via Fastify) | Order status updates, delivery tracking |
| Monorepo | Turborepo + pnpm | Shared types, libs, single repo |

## Monorepo Structure

```
aunt-sallys/
├── apps/
│   ├── web/              # Customer-facing website (Next.js)
│   ├── pos/              # POS app for branches (React + Vite)
│   ├── admin/            # Admin dashboard (React + Vite)
│   └── api/              # Backend API (Fastify)
├── packages/
│   ├── db/               # Database schema, migrations, client (Drizzle)
│   ├── shared/           # Shared types, constants, utils
│   └── ui/               # Shared UI components
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

## Multi-Tenant Design

**Strategy: Shared database, tenant isolation via `branch_id` / `org_id`**

- All branches share one database
- Every table with branch-specific data has `branch_id` (FK)
- Organization level (`org_id`) for franchise grouping
- Row-level queries always filter by tenant
- Middleware enforces tenant context on every request

This is the right tradeoff for 4-50 branches. If we hit 500+ franchise locations, we can shard later.

## Database Schema (Core Tables)

### Organizations & Branches
```sql
-- Top-level organization (franchise group)
CREATE TABLE organizations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) UNIQUE NOT NULL,
  settings      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Individual branch locations
CREATE TABLE branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(100) NOT NULL,
  address       TEXT,
  lat           DECIMAL(10, 8),
  lng           DECIMAL(11, 8),
  phone         VARCHAR(20),
  email         VARCHAR(255),
  is_active     BOOLEAN DEFAULT true,
  operating_hours JSONB DEFAULT '{}',
  settings      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, slug)
);
```

### Users & Auth
```sql
-- All user types in one table with role-based access
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE,
  phone         VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255),
  first_name    VARCHAR(100),
  last_name     VARCHAR(100),
  role          VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'staff', 'branch_admin', 'org_admin', 'superadmin')),
  org_id        UUID REFERENCES organizations(id),
  branch_id     UUID REFERENCES branches(id),  -- NULL for org_admin/superadmin
  is_active     BOOLEAN DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    VARCHAR(255) NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Services & Pricing
```sql
-- Laundry services offered
CREATE TABLE services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  name          VARCHAR(255) NOT NULL,        -- e.g., "Wash & Fold", "Dry Clean", "Iron Only"
  description   TEXT,
  category      VARCHAR(50),                  -- wash, dry_clean, iron, special
  base_price    DECIMAL(10, 2) NOT NULL,
  price_unit    VARCHAR(20) DEFAULT 'kg',     -- kg, piece, load
  min_quantity  DECIMAL(10, 2) DEFAULT 1,
  estimated_hours INT,                        -- estimated turnaround
  is_active     BOOLEAN DEFAULT true,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Branch-specific pricing overrides (optional)
CREATE TABLE branch_services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  service_id    UUID NOT NULL REFERENCES services(id),
  price_override DECIMAL(10, 2),              -- NULL = use base price
  is_available  BOOLEAN DEFAULT true,
  UNIQUE(branch_id, service_id)
);

-- Subscription plans
CREATE TABLE service_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  name          VARCHAR(255) NOT NULL,        -- e.g., "Weekly Wash 8kg"
  description   TEXT,
  price         DECIMAL(10, 2) NOT NULL,
  billing_cycle VARCHAR(20) DEFAULT 'monthly', -- weekly, monthly
  included_kg   DECIMAL(10, 2),
  included_loads INT,
  services      JSONB,                        -- which services are included
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Customers
```sql
-- Customer profiles (linked to users table)
CREATE TABLE customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE REFERENCES users(id),
  org_id        UUID NOT NULL REFERENCES organizations(id),
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20) NOT NULL,
  email         VARCHAR(255),
  notes         TEXT,
  preferred_branch_id UUID REFERENCES branches(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Customer addresses for delivery
CREATE TABLE customer_addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label         VARCHAR(50) DEFAULT 'home',   -- home, office, other
  address_line  TEXT NOT NULL,
  lat           DECIMAL(10, 8),
  lng           DECIMAL(11, 8),
  is_default    BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Customer subscriptions
CREATE TABLE customer_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID NOT NULL REFERENCES customers(id),
  plan_id       UUID NOT NULL REFERENCES service_plans(id),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  status        VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Orders
```sql
-- Core order entity
CREATE TABLE orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number  VARCHAR(20) UNIQUE NOT NULL,  -- human-readable: AS-2026-00001
  branch_id     UUID NOT NULL REFERENCES branches(id),
  customer_id   UUID REFERENCES customers(id),
  subscription_id UUID REFERENCES customer_subscriptions(id),
  status        VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'picked_up', 'processing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled'
  )),
  order_type    VARCHAR(20) DEFAULT 'walk_in' CHECK (order_type IN ('walk_in', 'pickup', 'delivery')),
  subtotal      DECIMAL(10, 2) DEFAULT 0,
  discount      DECIMAL(10, 2) DEFAULT 0,
  delivery_fee  DECIMAL(10, 2) DEFAULT 0,
  total         DECIMAL(10, 2) DEFAULT 0,
  payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
  payment_method VARCHAR(20),                 -- cash, card, gcash, maya, bank_transfer
  notes         TEXT,
  pickup_address_id  UUID REFERENCES customer_addresses(id),
  delivery_address_id UUID REFERENCES customer_addresses(id),
  estimated_completion TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_by    UUID REFERENCES users(id),    -- staff who created (POS)
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Individual items in an order
CREATE TABLE order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_id    UUID NOT NULL REFERENCES services(id),
  quantity      DECIMAL(10, 2) NOT NULL,      -- kg or pieces
  unit_price    DECIMAL(10, 2) NOT NULL,
  total_price   DECIMAL(10, 2) NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Order status history for tracking
CREATE TABLE order_status_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status        VARCHAR(30) NOT NULL,
  notes         TEXT,
  changed_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Payments
```sql
CREATE TABLE payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  amount        DECIMAL(10, 2) NOT NULL,
  method        VARCHAR(20) NOT NULL,         -- cash, card, gcash, maya, bank_transfer
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  reference     VARCHAR(255),                 -- PayMongo payment ID or manual ref
  paymongo_id   VARCHAR(255),                 -- PayMongo payment intent ID
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### Deliveries
```sql
CREATE TABLE deliveries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  type          VARCHAR(10) CHECK (type IN ('pickup', 'delivery')),
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_transit', 'completed', 'failed')),
  driver_name   VARCHAR(255),
  driver_phone  VARCHAR(20),
  address_id    UUID REFERENCES customer_addresses(id),
  scheduled_at  TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

## Authentication & Authorization

### Roles
| Role | Scope | Access |
|------|-------|--------|
| `customer` | Self | Place orders, view own orders, manage profile |
| `staff` | Branch | POS operations, update order status, view branch orders |
| `branch_admin` | Branch | Staff management, branch settings, branch reports |
| `org_admin` | Organization | All branches, all reports, service/pricing management |
| `superadmin` | System | Everything, franchise management |

### Auth Flow
1. Login → JWT access token (15min) + refresh token (7d)
2. Every request carries `Authorization: Bearer <token>`
3. Middleware extracts user + role + org_id + branch_id
4. Route handlers check role permissions
5. All queries filter by org_id/branch_id based on role

## Nearest Branch Routing

When a customer places an order:
1. Get customer's address coordinates (geocoding via address or GPS)
2. Query active branches within service radius
3. Calculate distance using Haversine formula
4. Route to nearest branch with capacity
5. Customer can override if preferred

## Payment Flow (PayMongo)

### Online (GCash / Maya / Card)
1. Create PayMongo PaymentIntent
2. Redirect customer to payment page
3. Webhook receives payment confirmation
4. Update order `payment_status` → `paid`

### In-Store (POS)
- Cash: Staff marks as paid, records in payments table
- Card terminal: Staff processes on terminal, records reference number
- GCash/Maya (QR): Generate QR via PayMongo, customer scans

## Real-Time Updates

WebSocket channels:
- `branch:{id}:orders` — new/updated orders for POS
- `order:{id}:status` — order status changes for customer tracking
- `branch:{id}:queue` — live queue count

## API Route Structure

```
/api/v1
├── /auth
│   ├── POST /register
│   ├── POST /login
│   ├── POST /refresh
│   └── POST /logout
├── /customers
│   ├── GET /me
│   ├── PUT /me
│   ├── GET /me/orders
│   └── CRUD /me/addresses
├── /services
│   ├── GET /                    # List services (public)
│   └── GET /:id
├── /plans
│   ├── GET /                    # List subscription plans
│   └── POST /subscribe
├── /orders
│   ├── POST /                   # Place order (customer or POS)
│   ├── GET /:id
│   ├── PATCH /:id/status        # Update status (staff)
│   └── GET /                    # List (filtered by role)
├── /branches
│   ├── GET /                    # List branches (public)
│   ├── GET /nearest             # Nearest branch by coords
│   └── GET /:id
├── /payments
│   ├── POST /                   # Create payment
│   ├── POST /webhook            # PayMongo webhook
│   └── GET /:orderId
├── /deliveries
│   ├── GET /:orderId
│   └── PATCH /:id/status
└── /admin
    ├── /branches                # CRUD branches
    ├── /services                # CRUD services
    ├── /staff                   # CRUD staff users
    ├── /reports                 # Revenue, orders, performance
    └── /settings                # Org settings
```

## Deployment

### Development
- Local: `pnpm dev` runs all apps via Turborepo
- Database: Local PostgreSQL or Railway dev instance
- Hot reload on all apps

### Production
- **API**: Railway (auto-deploy from main branch)
- **Customer Web**: Vercel (auto-deploy)
- **POS + Admin**: Vercel or Railway static hosting
- **Database**: Railway PostgreSQL (managed)
- **Redis**: Railway Redis (managed)
- **Files**: Cloudflare R2

### CI/CD
- GitHub Actions: lint, typecheck, test on PR
- Auto-deploy to staging on `develop` merge
- Auto-deploy to production on `main` merge

## Security

- All passwords hashed with bcrypt
- JWT with short expiry + refresh rotation
- Rate limiting on auth endpoints
- Input validation on all endpoints (Zod schemas)
- SQL injection prevention via ORM (Drizzle)
- CORS configured per environment
- HTTPS enforced in production
- PayMongo webhook signature verification

## Future Considerations (Phase 2+)

- AI chatbot for customer support (WhatsApp/Messenger integration)
- Smart order routing based on branch load + distance
- Demand forecasting for staffing
- Marketing automation (promotions, retention)
- Inventory tracking (detergent, supplies)
- Staff scheduling
- Franchise management portal
- Mobile app (React Native)
