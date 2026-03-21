# Aunt Sally's Laundry Platform

Multi-tenant laundry management platform built with Turborepo + pnpm monorepo.

## Apps

| App | Description | Port |
|-----|-------------|------|
| `apps/web` | Customer-facing website (Next.js 15) | 3000 |
| `apps/pos` | Branch POS app (React + Vite) | 5173 |
| `apps/admin` | Admin dashboard (React + Vite) | 5174 |
| `apps/api` | Backend API (Fastify) | 4000 |

## Packages

| Package | Description |
|---------|-------------|
| `packages/db` | Drizzle ORM schema, migrations, DB client |
| `packages/shared` | Types, constants, utils, Zod schemas |
| `packages/ui` | Shared React component library |

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- PostgreSQL 16
- Redis

## Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill environment variables
cp .env.example .env

# 3. Run database migrations
pnpm db:migrate

# 4. Seed the database
pnpm db:seed

# 5. Start all apps in development mode
pnpm dev
```

## Individual App Dev

```bash
# API only
pnpm --filter api dev

# Web only
pnpm --filter web dev

# POS only
pnpm --filter pos dev

# Admin only
pnpm --filter admin dev
```

## Database

```bash
# Generate migrations from schema changes
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Seed with sample data
pnpm db:seed
```

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **API**: Fastify + TypeScript
- **Web**: Next.js 15 App Router
- **POS/Admin**: React + Vite
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT + refresh tokens
- **Payments**: PayMongo (GCash, Maya, Cards)
- **Real-time**: WebSockets
- **Cache**: Redis
- **Storage**: Cloudflare R2

## Branch Locations (Seed Data)

1. Aunt Sally's — Mandaue City
2. Aunt Sally's — Cebu IT Park
3. Aunt Sally's — Consolacion
4. Aunt Sally's — Lapu-Lapu City
