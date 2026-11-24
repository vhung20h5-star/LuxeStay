## UI & Code Style
- Use Next.js app router
- Use TypeScript
- Use Tailwind CSS
- Use Shadcn/ui components when possible
- Create reusable components
- Follow clean and modern UI design
- Keep code modular and production-ready

## Monorepo Architecture & Boundaries
- Preserve strict layering enforced by `eslint.boundaries.mjs`: `packages/contracts` (`@luxestay/contracts`) -> `packages/domain` (`@luxestay/domain`) -> `apps/api` & `apps/web`.
- `apps/web` features and routes must consume data through `shared/ports/*`, never importing `apps/api`, `hono`, or `@luxestay/domain/seed` directly.
- All DTOs, Zod schemas, endpoints (`API_ENDPOINTS`), and `ApiSuccess`/`ApiError` envelopes must originate in `@luxestay/contracts`.

## Data, Auth & Persistence Invariants
- In `NEXT_PUBLIC_DATA_MODE=api`, never silently fall back to mock/seed data on API or network failures; surface structured errors cleanly.
- Support both explicit API URLs (`http://localhost:4000`) and same-origin mode (`NEXT_PUBLIC_API_BASE_URL=/` normalized to `""`) alongside server-side `API_BASE_URL` binding.
- Keep reservation creation atomic (`SELECT ... FOR UPDATE` in Postgres / per-property lock in memory), server-authoritative for pricing/vouchers, and idempotent in DB migrations/seeds (`db:prepare` must not overwrite existing catalog data).

## Deployment & Repo Hygiene
- Do not make `vercel.json` `services.backend.buildCommand` leave `apps/api/dist` in place (otherwise `@vercel/backends` loads `dist/app.js` as CommonJS instead of bundling `src/server.ts` as `.mjs`).
- Never commit `.env*` secrets or `.vercel/`; keep `!.env.example` and `!**/.env.example` exceptions intact at the bottom of `.gitignore`.
- Before claiming workspace changes are done, verify `npm run build`, `npm run typecheck`, `npm run lint`, and `npm run test`.
