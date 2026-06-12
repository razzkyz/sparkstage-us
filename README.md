# Spark Stage

Spark Stage is a fullstack booking ticket and commerce app.

- Frontend: Vite + React + TypeScript in `frontend/`
- Backend: Supabase Postgres + Edge Functions in `supabase/`
- Payments: DOKU for tickets and product orders

## Start Here

- Repo memory for AI-assisted work: `AGENTS.md`
- Architecture map: `docs/architecture.md`
- Docs index: `docs/README.md`

## Project Structure

```text
Spark studio/
|- AGENTS.md
|- README.md
|- docs/
|  |- architecture.md
|  |- decisions/
|  `- runbooks/
|- frontend/
|  `- src/
|- scripts/
`- supabase/
   |- functions/
   `- migrations/
```

## Core Docs

- DB migrations workflow: `docs/runbooks/db-migrations.md`
- DOKU payment workflow: `docs/runbooks/doku-payments.md`
- Midtrans to DOKU migration status: `docs/migrasi-dari-midtrans-ke-doku.md`
- ImageKit migration runbook: `docs/runbooks/imagekit-migration.md`
- Admin product entry guide: `docs/runbooks/admin-product-entry.md`
- Voucher behavior and constraints: `docs/decisions/voucher-system.md`

## Getting Started

### Prerequisites

- Node.js 20.19+
- npm
- Supabase project access
- DOKU merchant access

### Install

```bash
npm install
```

### Local Env

Copy `.env.example` to `.env.local`, then fill in:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_URL=http://localhost:5173
VITE_DOKU_IS_PRODUCTION=false
```

`VITE_DOKU_IS_PRODUCTION` is an internal repo flag. `false` loads DOKU sandbox JS, `true` loads DOKU production JS.

Set these only in Supabase secrets, never in frontend hosting env:

- `SUPABASE_SERVICE_ROLE_KEY`
- `DOKU_CLIENT_ID`
- `DOKU_SECRET_KEY`
- `DOKU_IS_PRODUCTION`
- `PUBLIC_APP_URL`
- `APP_ALLOWED_ORIGINS`

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run test
npm run preview
```

## Repo Conventions

- Run commands from the repo root.
- `frontend/` is the Vite app root.
- `supabase/migrations/` is the database source of truth.
- Prefer updating an existing doc over creating a new Markdown file.

## Deployment

### Frontend

- Deploy target: Vercel
- Build command: `npm run build`
- Output directory: `dist`

### Backend

- Deploy target: Supabase
- Schema and RLS: `supabase/migrations/`
- Edge Functions: `supabase/functions/`

## Current Payment Status

- Active payment provider: DOKU Checkout
- Production smoke tests for ticket and product flows passed on `2026-04-25`
- Remaining backlog is mostly hardening, test coverage, and non-blocking Midtrans cleanup

## License

Copyright 2026 Spark Stage.
