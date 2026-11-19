# StockPilot

Café inventory management: ingredients, supplies, batches with expiry dates, suppliers, usage, wastage and a permanent audit trail, for a team of administrators, managers and staff.

Built with **Next.js 16** (App Router, Cache Components), **TypeScript**, **Tailwind CSS**, **Supabase** (Postgres, Auth, Row Level Security) and deployed on **Vercel**.

## Features

- **Dashboard**: stock totals per unit, low / out-of-stock alerts, expiring batches, recent transactions and wastage.
- **Inventory**: search, filter, sort and paginate items, archive or restore them, item details with batches and history.
- **Stock operations**: Stock In (batches with cost and expiry), Usage (first-expired-first-out), Wastage (with reasons, per batch), Adjustments (physical counts).
- **Transactions**: an append-only audit log with filters and CSV export.
- **Suppliers and categories**: supplier contacts and purchase history.
- **Reports**: inventory, low stock, expiring stock, movement summary, wastage by reason, supplier purchasing, all with CSV export.
- **Users**: sign-ups need admin approval, roles are Administrator / Manager / Staff, and accounts can be disabled.

## How it stays correct and secure

| Concern | Where it is enforced |
|---|---|
| Who can read or write what | Postgres **Row Level Security** and column grants (`supabase/migrations/…_rls_and_grants.sql`) |
| Stock changes | Only through database functions (`receive_stock`, `record_usage`, `record_wastage`, `adjust_stock`) that check the role, **lock the item row** and write batches and movements in one transaction |
| No negative stock, item total = sum of batches | Check constraints and a deferred consistency trigger |
| Audit trail | `stock_movements` cannot be updated, deleted or truncated (trigger) |
| Pages and Server Actions | `lib/auth.ts` (`requireActiveUser`, `requirePermission`); the database checks again |
| Browser hardening | Security headers in `next.config.ts`; CSV exports are protected against formula injection |

The Supabase **publishable** key is safe in the browser: RLS protects the data. No secret or service-role key is used anywhere in this app.

## Local setup

Requirements: Node.js 22+, a Supabase project.

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Required | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | Supabase → Project Settings → API Keys (publishable key) |
| `CAFE_TIME_ZONE` | recommended | An IANA zone such as `Asia/Manila`. Used to display dates and for date filters. Defaults to the server zone (UTC on Vercel). |

### Database

Apply the migrations in `supabase/migrations/` in order (Supabase SQL Editor, Supabase CLI `supabase db push`, or the Supabase MCP). Then create the first administrator:

1. Sign up in the app.
2. In the Supabase **SQL Editor** run:
   ```sql
   select public.bootstrap_admin('you@example.com');
   ```
   This only works while no active administrator exists and cannot be called from the website.
3. Further accounts sign up, then an administrator approves them under **User Management**.

### Supabase Auth settings

- **URL Configuration**: set the Site URL to your production URL and add `http://localhost:3000/**` and `https://<your-domain>/**` as Redirect URLs.
- **Email templates** (recommended, so links work on any device):
  - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard`
  - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password`
- Enable **leaked password protection** (Authentication → Sign In / Providers → Email).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest): validation, URL parsing, CSV safety, time zones, permissions |
| `npm run check` | All three of the above |

**Database tests** live in `supabase/tests/database_tests.sql`: permissions, RLS, FEFO, locking guards, reports. Each `DO` block rolls itself back and ends with `ALL n TESTS PASSED`. Run one block at a time in the SQL Editor.

## Project structure

```text
app/
  (app)/          signed-in pages: dashboard, inventory, categories, suppliers,
                  stock-in, stock-usage, wastage, transactions, reports, users, account
  auth/           login, sign-up, password reset, email confirmation
  pending/        "waiting for approval" screen
components/       UI by feature (layout, dashboard, inventory, stock, reports, ui/ …)
lib/
  auth.ts         who is signed in, plus permission guards (server only)
  permissions.ts  role → permission table (mirrors the database rules)
  data/           server-side queries per feature
  actions/        Server Actions for stock operations
  validations/    input validation and URL parsing
  supabase/       browser, server and proxy clients
supabase/
  migrations/     schema, RLS, functions (applied in order)
  tests/          database test suite
tests/unit/       Vitest unit tests
types/database.ts generated from the live schema
```

## Deployment (Vercel)

1. Push to the `master` branch on GitHub; Vercel builds and deploys automatically.
2. In Vercel → Project → Settings → Environment Variables, set the three variables above for **Production** (and Preview if you use it).
3. Update the Supabase Auth Site URL and Redirect URLs to the Vercel domain.
