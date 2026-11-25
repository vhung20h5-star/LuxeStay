---
name: luxestay-deploy-and-verify
description: >-
  Run, verify, and deploy the LuxeStay full-stack monorepo locally (Web + Hono API + Docker/Neon Postgres), run isolated Playwright Chromium E2E tests, and debug Vercel Services + Neon deployments. Use when starting or troubleshooting localhost:3000/4000, running db:migrate/db:seed/db:prepare, running Playwright E2E alongside an active dev server, or deploying/inspecting Vercel builds and runtime logs.
---

# LuxeStay Operations, E2E & Vercel Deployment Runbook

## 1. Local Full-Stack Development
- **Root full-stack (in-memory/seed):** Run `npm run dev` from repo root so both `@luxestay/api` (`:4000`) and `@luxestay/web` (`:3000`) start together. Starting only `apps/web` in `api` mode intentionally triggers the API connection error boundary.
- **Standalone UI demo (no backend):** Set `NEXT_PUBLIC_DATA_MODE=mock` and run `npm run dev:web`.
- **Docker PostgreSQL (`:5434`):** Note that `tsx` and `drizzle-kit` do NOT auto-load `.env` files—pass env vars in the active shell session:
  - Start DB & apply schema/seed: `docker compose up -d`, `npm run db:migrate`, `npm run db:seed`
  - Run API against Postgres: set `STORAGE_DRIVER=database` and `DATABASE_URL=postgresql://postgres:postgres@localhost:5434/luxestay`, then `npm run dev`.

## 2. Verification & Isolated Playwright E2E
1. **Static & unit gates:** Run `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test`.
   - Workspace tests import compiled `../dist/...` artifacts, so always run `npm run build` before `npm run test` after editing `@luxestay/contracts`, `@luxestay/domain`, or `@luxestay/api`.
   - If `@luxestay/contracts` or `@luxestay/domain` `.d.ts` files trigger stale Turbo cache errors in `@luxestay/api`, run `npx turbo run build --force`.
   - On **Windows PowerShell**, chain failing commands with `; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }` (PowerShell 5.1 rejects `&&`), and single-quote Next.js route-group paths in `git add` (e.g., `'apps/web/src/app/(main)/page.tsx'`).
2. **Playwright E2E without dev-server collision:** If `npm run dev` is already running on `:3000/:4000`, `next build` overwrites `.next` and breaks the live dev server's chunks. Always isolate E2E ports:
   - PowerShell: `$env:E2E_API_PORT="4100"; $env:E2E_WEB_PORT="3100"; npm run test:e2e`
   - Bash: `E2E_API_PORT=4100 E2E_WEB_PORT=3100 npm run test:e2e`
   - Includes `E2E-6` mobile responsive checks (`390×844`, `360×800`) asserting `documentElement.scrollWidth <= innerWidth` across routes and open popovers/drawers.
3. **Seed media curation & audit (`scripts/verify-seed-images.mjs`):**
   - Prefer verified real photography (`images.unsplash.com`, `images.pexels.com`) and reserve compact local assets under `apps/web/public/images/(stays|destinations)/` (`< 350 KB`) for Vietnam-specific landmarks lacking accurate stock photos.
   - Before modifying seed arrays, render Chromium contact-sheets to inspect all slots visually, ensure 0% global duplication, and run `node scripts/verify-seed-images.mjs` after `npm run build` to verify `HTTP 200 image/*` and local file existence.

## 3. Vercel Services + Neon Postgres Deployment
- **Project setup:** Keep Vercel **Root Directory** as `.` so `vercel.json` orchestrates both `frontend` (`apps/web`) and `backend` (`apps/api`, `entrypoint: src/server.ts`) under one domain with Service Binding `API_BASE_URL`.
- **Next.js Images under Vercel Services:** Keep `images.unoptimized: true` in `apps/web/next.config.ts`—Vercel Services (Beta) returns `404` for `/_next/image`, keep `remotePatterns` aligned (`images.unsplash.com`, `plus.unsplash.com`, `images.pexels.com`), and store local assets under `apps/web/public/images/`.
- **Critical `@vercel/backends` rule:** `services.backend.buildCommand` MUST remove `apps/api/dist` and build only upstream workspaces (`@luxestay/contracts`, `@luxestay/domain`). Leaving `apps/api/dist/app.js` causes `@vercel/backends` to serve raw CJS `/var/task/app.js` (`500 FUNCTION_INVOCATION_FAILED`) instead of Rolldown's ESM `server.mjs`.
- **Required Vercel Env Vars (Production & Preview):**
  - Config: `NEXT_PUBLIC_DATA_MODE=api`, `NEXT_PUBLIC_API_BASE_URL=/`, `STORAGE_DRIVER=database`, `PAYMENT_SANDBOX_ENABLED=true` (demo) or `false` (prod).
  - Secret: `PAYMENT_WEBHOOK_SECRET` (distinct >=32-char secrets per environment) + Marketplace Neon vars (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`).
- **Migrations & Seed on Neon:**
  - Vercel builds run `npm run db:prepare --workspace=@luxestay/api` (`apps/api/src/db/vercelPrepare.ts`) using injected Neon Secrets (`DATABASE_URL_UNPOOLED` first) to migrate idempotently and seed only when `properties` is empty.
  - When adding modular seed stays or replacing retired seed images on an already-seeded Neon DB, rely on the helpers in `apps/api/src/db/vercelPrepare.ts`: `backfillMissingSeedProperties` (`ON CONFLICT DO NOTHING`) and `repairRetiredSeedImages` (matches `RETIRED_SEED_*` snapshots in `packages/domain/src/seed/retiredImages.ts` so host/admin edits are never overwritten).
  - Note: `npx vercel env pull` writes `"[SENSITIVE]"` for Neon Secrets; for manual local runs against Neon, copy `DATABASE_URL_UNPOOLED` from Vercel Storage / Neon Console instead. Running `vercel pull` may also append `.env*` to `.gitignore`—ensure `!.env.example` stays below any `.env*` rule.
- **Debugging live deploys:**
  - Build logs: `npx vercel inspect <deployment-url> --wait --logs`
  - Hobby runtime logs (30m retention): `npx vercel logs --deployment <deployment-url> --limit 50 --json`
  - Smoke checks: verify `200 OK` on `/health`, `/api/v1/catalog`, `/`, `/stays/stay-01`, and same-origin login (`/api/v1/auth/login`).
  - Live media & browser check: SSR HTML `200` does not catch broken images or `/_next/image` `404`s; verify in headless Chromium that all `<img>` tags load (`complete && naturalWidth > 0`, `nextProxy === 0`, zero `status >= 400` image responses) and audit seed image URLs with HTTP status checks before pushing.
