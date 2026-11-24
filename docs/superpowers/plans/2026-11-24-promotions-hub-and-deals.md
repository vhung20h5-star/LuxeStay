# Promotions Hub & Dedicated `/deals` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy homepage `PromotionBanner` with a 3-tier Traveloka-inspired Promotions Hub directly below `HeroSection`, add dedicated `/deals` and `/deals/[slug]` pages backed by an independent full-stack `deals` API module & PostgreSQL schema, and enforce property-scope and new-user voucher eligibility end-to-end.

**Architecture:** Keep `CatalogSnapshot` focused on core stays/vouchers while introducing an independent `deals` vertical slice across `@luxestay/contracts` (`deals.ts`), `@luxestay/domain` (`deals.ts` deep module + upgraded `vouchers.ts` & `bookingSession.ts`), `apps/api` (`modules/deals/*` + PostgreSQL migration `0004_promotions_campaigns.sql` + idempotent `db:prepare` backfill), and `apps/web` (`shared/ports/dealsPort.ts` + `features/promotions/*` + `/deals` & `/deals/[slug]` SSR routes). Voucher pricing and eligibility remain strictly server-authoritative on both `POST /api/v1/vouchers/validate` and `POST /api/v1/reservations`.

**Tech Stack:** TypeScript 5, Next.js App Router, React 19, Tailwind CSS v4, Framer Motion, Lucide Icons, Hono, Zod, Drizzle ORM, PostgreSQL, Node Test Runner (`node:test`), Playwright.

**Spec:** [docs/superpowers/specs/2026-11-24-promotions-hub-and-deals-design.md](../../specs/2026-11-24-promotions-hub-and-deals-design.md)

## Global Constraints

- Preserve strict monorepo layering enforced by `eslint.boundaries.mjs`: `@luxestay/contracts` → `@luxestay/domain` → `apps/api` & `apps/web`; `apps/web` features and route pages must never import `apps/api`, `hono`, or `@luxestay/domain/seed` directly (consume data exclusively via `shared/ports/*`).
- In `NEXT_PUBLIC_DATA_MODE=api`, never silently fall back to mock/seed data on API or network failure; surface structured errors cleanly.
- Support both explicit API URLs (`http://localhost:4000`) and same-origin mode (`NEXT_PUBLIC_API_BASE_URL=/` normalized to `""`) alongside server-side `API_BASE_URL` binding via `getServerWebEnv()`.
- Keep reservation pricing and voucher validation strictly server-authoritative (`SELECT ... FOR UPDATE` / per-property lock preserved untouched) and keep DB migrations/seed/`db:prepare` idempotent without ever overwriting existing `properties` rows.
- Keep `images.unoptimized: true` in `apps/web/next.config.ts` and do not alter `vercel.json` backend build config or commit binary banner files.
- Keep all existing `LUXESTAY250` and `SUMMERVIBE` financial terms (`expiresAt: "2026-11-30T23:59:59.000Z"`) and existing Playwright E2E flows (`E2E-1`, `E2E-2`, `E2E-3`) passing without regression.
- Wire `LocaleContext` (`useLocale()`) for all new UI chrome labels and `formatMoney` for currency amounts; seeded campaign and voucher descriptions remain natural Vietnamese matching the rest of the catalog.
- Before claiming completion, verify `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test`, and Playwright E2E.

## Review Focus

1. **Prior-booking status boundary for `newUserOnly` vouchers:** An authenticated user with a prior `confirmed` or `completed` booking must be rejected with `NEW_USER_ONLY` on `WELCOME150`, whereas an authenticated user whose only prior bookings are `cancelled`, `expired`, or `payment_failed` — or an unauthenticated guest on a non-`memberOnly` welcome code — must still succeed. *(Pinned in Task 2 & Task 4 tests.)*
2. **Slug normalization, inactive hiding, and expired-campaign preservation:** `GET /api/v1/deals/:slug` must normalize surrounding whitespace/casing, return `404 NOT_FOUND` for unknown slugs or `isActive: false` campaigns, and return `200` for `isActive: true` campaigns past `endsAt` so bookmarked links render the ended-campaign state instead of breaking. *(Pinned in Task 2 & Task 4 tests.)*
3. **Mixed property types inside a single campaign (`san-may-da-lat-sapa` + Sa Pa hotel `stay-03`):** `resolveEligibleVoucherForProperty` must fall back from `HOMESTAY10` to `WELCOME150` when booking `stay-03` (`hotel`), while directly submitting `HOMESTAY10` for `stay-03` at `/api/v1/vouchers/validate` or `/api/v1/reservations` must still be rejected with `PROPERTY_NOT_ELIGIBLE`. *(Pinned in Task 2 & Task 4 tests.)*
4. **Isolated homepage error handling in `api` mode:** When `GET /api/v1/deals` fails with HTTP 500 or a network error in `api` mode, `createHttpDealsRepository` must throw `HttpApiError` with zero fallback to seed data, and `/` must catch and isolate it to an explicit error card with Retry inside `#deals-section` without breaking `HeroSection` or `PropertyList`. *(Pinned in Task 5 & Task 6.)*
5. **Idempotent `db:prepare` backfill on an already-seeded database:** When `properties` already contains rows (e.g., an existing Neon deployment with host edits), `prepareDatabaseIfConfigured` must seed `promotion_campaigns` and update seed voucher metadata when `promotion_campaigns` is empty without touching `properties`. *(Pinned in Task 3 tests.)*

---

## File Structure

### Created Files
- `packages/contracts/src/deals.ts` — Zod schemas & TypeScript types for `PromotionCampaign`, `DealsHub`, and `DealDetail`.
- `packages/domain/src/deals.ts` — Deep module for campaign activity/expiry, partitioning, audience filtering, campaign-to-property matching, and voucher eligibility fallback.
- `packages/domain/tests/deals.test.ts` — Unit tests for `deals.ts` and upgraded voucher eligibility (`NEW_USER_ONLY`, `PROPERTY_NOT_ELIGIBLE`).
- `apps/api/src/db/migrations/0004_promotions_campaigns.sql` — Additive SQL migration extending `promotions` and creating `promotion_campaigns`.
- `apps/api/src/modules/deals/repository.ts` — `ApiDealsRepository` interface + in-memory seed repository.
- `apps/api/src/modules/deals/postgresRepository.ts` — Drizzle PostgreSQL implementation & row mapper for `promotion_campaigns`.
- `apps/api/src/modules/deals/service.ts` — `DealsService` composing `dealsRepository` and `catalogRepository` for `/api/v1/deals` and `/api/v1/deals/:slug`.
- `apps/api/src/modules/deals/routes.ts` — Hono routes for `GET /api/v1/deals` and `GET /api/v1/deals/:slug`.
- `apps/web/src/shared/ports/dealsPort.ts` — Independent `DealsRepository` HTTP + Mock adapters and SSR loaders (`loadDealsHub`, `loadDealBySlug`).
- `apps/web/src/features/promotions/VoucherCard.tsx` — Reusable ticket-notched voucher card with `(i)` button, copy confirmation, and optional selection pill.
- `apps/web/src/features/promotions/VoucherTermsModal.tsx` — `OverlayContext`-managed modal showing full localized voucher terms, `formatMoney` thresholds, and Copy action.
- `apps/web/src/features/promotions/VoucherCarousel.tsx` — Tier 1 horizontal snap-scroll carousel with floating `<` / `>` buttons.
- `apps/web/src/features/promotions/CampaignCountdown.tsx` — Hydration-safe live countdown timer to `campaign.endsAt`.
- `apps/web/src/features/promotions/CampaignHeroBanner.tsx` — Tier 2 full-width hero banner with Unsplash background, glass CTA panel, countdown, quick-copy code, and `/deals/[slug]` link.
- `apps/web/src/features/promotions/CampaignCard.tsx` — Multi-theme campaign card (`festive-night`, `coral-summer`, `ocean-teal`, `luxury-gold`, `forest-mist`).
- `apps/web/src/features/promotions/CampaignCarousel.tsx` — Tier 3 3-up horizontal carousel with floating `<` / `>` controls.
- `apps/web/src/features/promotions/PromotionsHub.tsx` — Homepage 3-tier composer (`#deals-section`) including isolated inline error card + Retry state.
- `apps/web/src/features/promotions/DealsCenterView.tsx` — Client UI for `/deals` (audience filter tabs, voucher grid, hero spotlight, full campaign grid).
- `apps/web/src/features/promotions/DealDetailView.tsx` — Client UI for `/deals/[slug]` (hero, expired-state banner, terms, selectable campaign vouchers, matched `PropertyCard` grid with promo pre-attach).
- `apps/web/src/app/(main)/deals/page.tsx` — SSR route for `/deals`.
- `apps/web/src/app/(main)/deals/[slug]/page.tsx` — SSR route for `/deals/[slug]`.

### Modified / Removed Files
- `packages/contracts/src/catalog.ts` — Add `VoucherAudienceSchema`, extend `PromotionVoucherSchema` & `ValidateVoucherInputSchema` (`propertyId?`).
- `packages/contracts/src/endpoints.ts` — Add `deals` and `dealBySlug`.
- `packages/contracts/src/index.ts` — Re-export `./deals.js`.
- `packages/contracts/tests/contracts.test.ts` — Add contract tests for deals & extended voucher schemas.
- `packages/domain/src/vouchers.ts` — Add `NEW_USER_ONLY` & `PROPERTY_NOT_ELIGIBLE` checks.
- `packages/domain/src/bookingSession.ts` — Thread `property`, `hasPriorSuccessfulBookings`, and optional `initialPromoCode` through pricing & session transitions.
- `packages/domain/src/seed/promotions.ts` & `packages/domain/src/seed/index.ts` — Enrich 2 existing vouchers, add 4 new stay vouchers (6 total), add `PROMOTION_CAMPAIGNS` (5 campaigns).
- `packages/domain/src/locale.ts` — Add `deals.*` VI/EN keys.
- `packages/domain/src/index.ts` — Re-export `./deals.js`.
- `packages/domain/tests/booking-session.test.ts` & `packages/domain/tests/host-locale.test.ts` — Cover new booking session promo prefill/server checks and locale keys.
- `apps/api/src/db/schema/catalog.ts` — Extend `promotionsTable`, add `promotionCampaignsTable`.
- `apps/api/src/db/migrations/meta/_journal.json` — Register `0004_promotions_campaigns`.
- `apps/api/src/db/seed.ts` & `apps/api/src/db/vercelPrepare.ts` — Extract `seedPromotionsAndCampaigns` and wire safe idempotent backfill.
- `apps/api/src/modules/catalog/postgresRepository.ts` — Map extended voucher columns.
- `apps/api/src/modules/catalog/routes.ts` — Accept `propertyId`, resolve `property` & `hasPriorSuccessfulBookings`.
- `apps/api/src/modules/reservations/service.ts` — Compute and pass `hasPriorSuccessfulBookings` for server-authoritative reservation creation.
- `apps/api/src/app.ts` & `apps/api/src/runtime.ts` — Wire `dealsRepository`, `dealsService`, `createDealsRoutes`, and pass `reservationRepository` to `createCatalogRoutes`.
- `apps/api/tests/api.test.ts` — Update voucher count `2 → 6` and add full deals & voucher eligibility integration tests.
- `apps/web/src/shared/ports/types.ts`, `paymentPort.ts`, `persistencePort.ts` — Add `DealsRepository`, pass `properties` to mock `validateVoucher`.
- `apps/web/src/features/booking/BookingContext.tsx` & `BookingCheckoutModal.tsx` — Add `openPropertyWithPromo` / `startCheckoutWithPromo`, send `propertyId` on validate, auto-validate pre-attached promo code on open.
- `apps/web/src/features/catalog/PropertyCard.tsx` — Add optional `onSelectProperty` / `onBookProperty` overrides (defaulting to current behavior).
- `apps/web/src/shared/layout/Navbar.tsx` — Route "Ưu đãi Hot" / "Hot Deals" directly to `<Link href="/deals">` in desktop and mobile menus.
- `apps/web/src/app/(main)/page.tsx` — Convert to `async` Server Component calling `loadDealsHub()` with isolated `#deals-section` error handling; mount `<PromotionsHub />` right after `<HeroSection />`.
- `apps/web/tests/persistence-port.test.ts` — Update voucher count `2 → 6` and add `dealsPort` + property-scoped mock `validateVoucher` tests.
- `e2e/luxestay.spec.ts` — Add `E2E-4` verifying Promotions Hub, `/deals`, `/deals/[slug]`, and checkout promo prefill.
- Delete: `apps/web/src/features/catalog/PromotionBanner.tsx` (replaced by `features/promotions/PromotionsHub.tsx`).

---

## Task 1: Contracts & API Endpoints (`@luxestay/contracts`)

**Files:**
- Create: `packages/contracts/src/deals.ts`
- Modify: `packages/contracts/src/catalog.ts:172-203`
- Modify: `packages/contracts/src/endpoints.ts:1-41`
- Modify: `packages/contracts/src/index.ts:1-8`
- Test: `packages/contracts/tests/contracts.test.ts`

**Interfaces:**
- Consumes: `CategoryIdSchema`, `PropertyTypeSchema` (`./common.js`); `PromotionVoucherSchema`, `PropertySchema` (`./catalog.js`).
- Produces:
  - `VoucherAudienceSchema` / `VoucherAudience` (`"all" | "new-user" | "member"`)
  - Extended `PromotionVoucherSchema` / `PromotionVoucher` (adds optional `title`, `subtitle`, `badge`, `iconName`, `applicablePropertyTypes`, `applicableCategories`, `terms`; defaulted `audience: "all"`, `newUserOnly: false`)
  - Extended `ValidateVoucherInputSchema` / `ValidateVoucherInput` (adds optional `propertyId?: string`)
  - `PromotionCampaignPlacementSchema` / `PromotionCampaignPlacement` (`"hero" | "carousel"`)
  - `PromotionCampaignThemeSchema` / `PromotionCampaignTheme` (`"festive-night" | "coral-summer" | "ocean-teal" | "luxury-gold" | "forest-mist"`)
  - `PromotionCampaignTargetFilterSchema` / `PromotionCampaignTargetFilter`
  - `PromotionCampaignSchema` / `PromotionCampaign`
  - `DealsHubSchema` / `DealsHub`
  - `DealDetailSchema` / `DealDetail`
  - `API_ENDPOINTS.deals` (`"/api/v1/deals"`) and `API_ENDPOINTS.dealBySlug(slug)` (`"/api/v1/deals/<encoded>"`)

- [ ] **Step 1: Write failing contract tests in `packages/contracts/tests/contracts.test.ts`**

Add a test `"Promotions Hub and Deals contracts validate extended vouchers, campaigns, deal details, and endpoints"` asserting:
- `PromotionVoucherSchema.parse` on a minimal legacy voucher defaults `audience` to `"all"` and `newUserOnly` to `false`, while accepting full metadata (`title`, `subtitle`, `badge`, `iconName`, `applicablePropertyTypes: ["hotel", "resort"]`, `applicableCategories: ["luxury-resort"]`, `terms: ["..."]`).
- `ValidateVoucherInputSchema.safeParse` accepts both `{ code: "LUXESTAY250", subtotal: 2000000 }` (legacy) and `{ code: "NEWSTAY250", subtotal: 2000000, propertyId: "stay-02" }`.
- `DealsHubSchema.safeParse` and `DealDetailSchema.safeParse` pass for valid campaign/voucher/property payloads and reject an unknown `theme` or `placement`.
- `API_ENDPOINTS.deals === "/api/v1/deals"` and `API_ENDPOINTS.dealBySlug(" black-friday-2026 ") === "/api/v1/deals/black-friday-2026"` (plus URL-encoding safety for `"a/b c"`).

- [ ] **Step 2: Run contracts test suite to confirm failure**

Run: `npm run test --workspace=@luxestay/contracts`
Expected: FAIL (missing exports `DealsHubSchema`, `DealDetailSchema`, `PromotionCampaignSchema`, `API_ENDPOINTS.deals`).

- [ ] **Step 3: Implement `packages/contracts/src/deals.ts`, extend `catalog.ts`, `endpoints.ts`, and `index.ts`**

- In `packages/contracts/src/catalog.ts`: add `VoucherAudienceSchema` and optional/defaulted fields on `PromotionVoucherSchema` and optional `propertyId` on `ValidateVoucherInputSchema` matching Spec §5.2.
- In `packages/contracts/src/deals.ts`: define and export `PromotionCampaignPlacementSchema`, `PromotionCampaignThemeSchema`, `PromotionCampaignTargetFilterSchema`, `PromotionCampaignSchema`, `DealsHubSchema`, `DealDetailSchema` and their inferred types matching Spec §5.2.
- In `packages/contracts/src/endpoints.ts`: add `deals: "/api/v1/deals"` and `dealBySlug: (slug: string) => \`/api/v1/deals/${encodeURIComponent(slug.trim())}\``.
- In `packages/contracts/src/index.ts`: add `export * from "./deals.js";`.

- [ ] **Step 4: Build & run contracts tests to verify pass**

Run: `npm run build --workspace=@luxestay/contracts && npm run test --workspace=@luxestay/contracts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts/src/catalog.ts packages/contracts/src/deals.ts packages/contracts/src/endpoints.ts packages/contracts/src/index.ts packages/contracts/tests/contracts.test.ts
git commit -m "feat(contracts): add deals campaign schemas and extended voucher contracts"
```

---

## Task 2: Domain Deals Engine, Voucher Eligibility, Seed Data & Locale (`@luxestay/domain`)

**Files:**
- Create: `packages/domain/src/deals.ts`
- Create: `packages/domain/tests/deals.test.ts`
- Modify: `packages/domain/src/vouchers.ts:1-120`
- Modify: `packages/domain/src/bookingSession.ts:218-385, 650-950` (pricing, session seed/open/start, server intent)
- Modify: `packages/domain/src/seed/promotions.ts:1-31`
- Modify: `packages/domain/src/seed/index.ts:1-36`
- Modify: `packages/domain/src/locale.ts:42-158`
- Modify: `packages/domain/src/index.ts:1-9`
- Modify: `packages/domain/tests/booking-session.test.ts`
- Modify: `packages/domain/tests/host-locale.test.ts`

**Interfaces:**
- Consumes: Task 1 schemas/types (`PromotionCampaign`, `PromotionVoucher`, `VoucherAudience`, `DealsHub`, `DealDetail`).
- Produces:
  - From `packages/domain/src/deals.ts`:
    - `isCampaignExpired(campaign: PromotionCampaign, now?: Date): boolean`
    - `isCampaignActive(campaign: PromotionCampaign, now?: Date): boolean`
    - `partitionCampaigns(campaigns: readonly PromotionCampaign[], now?: Date): { hero: PromotionCampaign | null; carousel: PromotionCampaign[]; allActive: PromotionCampaign[] }`
    - `filterVouchersByAudience(vouchers: readonly PromotionVoucher[], audience: VoucherAudience, now?: Date): PromotionVoucher[]`
    - `resolveCampaignVouchers(campaign: PromotionCampaign, vouchers: readonly PromotionVoucher[]): PromotionVoucher[]`
    - `isVoucherEligibleForProperty(voucher: PromotionVoucher, property: Pick<Property, "propertyType" | "category">): boolean`
    - `resolveEligibleVoucherForProperty(preferredVoucher: PromotionVoucher | null, campaignVouchers: readonly PromotionVoucher[], property: Pick<Property, "propertyType" | "category">): PromotionVoucher | null`
    - `matchPropertiesForCampaign(properties: readonly Property[], campaign: PromotionCampaign): Property[]`
    - `buildVoucherTermsList(voucher: PromotionVoucher): string[]`
    - `hasPriorSuccessfulBookings(reservations: readonly Pick<BookingDetails, "status">[]): boolean` (returns `true` iff any reservation has `status === "confirmed" || status === "completed"`)
  - From `packages/domain/src/vouchers.ts`:
    - Extended `VoucherErrorReason` (`| "NEW_USER_ONLY" | "PROPERTY_NOT_ELIGIBLE"`)
    - Extended `evaluatePromotionVoucher(rawCode, subtotal, vouchers, options?: { now?: Date; isAuthenticated?: boolean; hasPriorSuccessfulBookings?: boolean; property?: Pick<Property, "propertyType" | "category"> })`
  - From `packages/domain/src/bookingSession.ts`:
    - `openPropertySession(current, property, searchCriteria?, fallbackBaseDate?, initialPromoCode?)`
    - `startCheckoutSession(current, property, searchCriteria?, fallbackBaseDate?, initialPromoCode?)`
    - `deriveBookingQuote(session, fallbackBaseDate?, options?: { vouchers?, isAuthenticated?, hasPriorSuccessfulBookings? })`
    - `processServerReservationIntent(intent, properties, options?: { ..., hasPriorSuccessfulBookings? })`
  - From `packages/domain/src/seed/index.ts`:
    - `PROMOTION_VOUCHERS` (6 vouchers: `WELCOME150`, `NEWSTAY250`, `HOMESTAY10`, `LUXESTAY250`, `SUMMERVIBE`, `VIPRESORT1M`)
    - `PROMOTION_CAMPAIGNS` (5 campaigns: `black-friday-2026`, `bien-he-phu-quoc-nha-trang`, `san-may-da-lat-sapa`, `worlds-best-resorts`, `tron-pho-glamping-homestay`)
  - From `packages/domain/src/locale.ts`: all 28 `deals.*` keys in both `vi` and `en`.

- [ ] **Step 1: Write failing domain tests in `packages/domain/tests/deals.test.ts` and extend `booking-session.test.ts` & `host-locale.test.ts`**

In `packages/domain/tests/deals.test.ts`, assert:
- `PROMOTION_VOUCHERS` has 6 vouchers (`WELCOME150`, `NEWSTAY250`, `HOMESTAY10`, `LUXESTAY250`, `SUMMERVIBE`, `VIPRESORT1M`) with `LUXESTAY250` & `SUMMERVIBE` preserving exact existing amounts and `expiresAt: "2026-11-30T23:59:59.000Z"`.
- `PROMOTION_CAMPAIGNS` has 5 campaigns; `partitionCampaigns(PROMOTION_CAMPAIGNS, new Date("2026-11-24T12:00:00.000Z"))` returns `hero.slug === "black-friday-2026"` and `carousel.length === 4`; when `now` is `"2026-12-05T00:00:00.000Z"`, `hero` is `null` (does NOT promote a carousel campaign) and `isCampaignExpired(blackFriday, ...)` is `true`.
- `matchPropertiesForCampaign` on every seeded campaign matches exact expected stay IDs:
  - `black-friday-2026`: `["stay-01", "stay-06", "stay-10"]`
  - `bien-he-phu-quoc-nha-trang`: `["stay-02", "stay-07", "stay-08", "stay-10"]`
  - `san-may-da-lat-sapa`: `["stay-01", "stay-03", "stay-04", "stay-11", "stay-12"]`
  - `worlds-best-resorts`: `["stay-02", "stay-05", "stay-08", "stay-10"]`
  - `tron-pho-glamping-homestay`: `["stay-01", "stay-04", "stay-06", "stay-09", "stay-11", "stay-12"]`
- **Review Focus #1**: `evaluatePromotionVoucher("WELCOME150", 1_500_000, PROMOTION_VOUCHERS, { now, isAuthenticated: false })` succeeds (guest welcome allowed); `{ isAuthenticated: true, hasPriorSuccessfulBookings: false }` succeeds (first-time member, or only cancelled/expired prior bookings via `hasPriorSuccessfulBookings([{ status: "cancelled" }, { status: "expired" }]) === false`); `{ isAuthenticated: true, hasPriorSuccessfulBookings: true }` fails with `reason === "NEW_USER_ONLY"`.
- **Review Focus #3**: `evaluatePromotionVoucher("HOMESTAY10", 2_000_000, PROMOTION_VOUCHERS, { now, property: stay03 })` fails with `reason === "PROPERTY_NOT_ELIGIBLE"` (`stay-03` is `hotel`), whereas `resolveEligibleVoucherForProperty(homestay10, resolveCampaignVouchers(sanMayCampaign, PROMOTION_VOUCHERS), stay03)?.code === "WELCOME150"`.
- `evaluatePromotionVoucher("VIPRESORT1M", 5_000_000, PROMOTION_VOUCHERS, { now, isAuthenticated: true, property: stay01 })` fails with `PROPERTY_NOT_ELIGIBLE`, and with `property: stay08` (`luxury-resort`) succeeds with `discount === 1_000_000`.
- `filterVouchersByAudience` returns 3 vouchers for `"new-user"`, 1 for `"member"`, and 6 for `"all"` at `2026-11-24`.
- In `booking-session.test.ts`: verify `openPropertySession(..., "WELCOME150")` keeps `promoCode: "WELCOME150"` across `startCheckoutSession`, and `processServerReservationIntent` rejects `HOMESTAY10` on `stay-03` (`400`) and rejects `WELCOME150` when `hasPriorSuccessfulBookings: true` (`400`).
- In `host-locale.test.ts`: verify `translate("vi", "deals.newUserTitle")` and `translate("en", "deals.newUserTitle")` return non-empty distinct strings.

- [ ] **Step 2: Run domain tests to verify failure**

Run: `npm run build --workspace=@luxestay/domain && npm run test --workspace=@luxestay/domain`
Expected: FAIL (missing `deals.ts`, `PROMOTION_CAMPAIGNS`, `NEW_USER_ONLY`, `PROPERTY_NOT_ELIGIBLE`).

- [ ] **Step 3: Implement `deals.ts`, upgrade `vouchers.ts`, `bookingSession.ts`, `seed/promotions.ts`, `seed/index.ts`, `locale.ts`, and `index.ts`**

- Keep `PROMOTION_VOUCHERS[0]` as `WELCOME150` (not property-restricted, `minOrderTotal: 800000`, `expiresAt: "2026-12-31T23:59:59.000Z"`) or `LUXESTAY250` — wait: verify `booking-session.test.ts:598` clones `PROMOTION_VOUCHERS[0]` into `MEMBERVIP` and evaluates with `now: baseDate` (`2026-11-21`). Both `WELCOME150` and `LUXESTAY250` have no `applicablePropertyTypes`/`applicableCategories`, so cloning `PROMOTION_VOUCHERS[0]` continues to pass `booking-session.test.ts` cleanly! Put `WELCOME150`, `NEWSTAY250`, `HOMESTAY10` first so the Tier 1 New-User carousel shows the 3 welcome vouchers first, followed by `LUXESTAY250`, `SUMMERVIBE`, `VIPRESORT1M`.
- Use verified Unsplash URLs already proven working in `packages/domain/src/seed/destinations.ts` and `properties.ts` (for example: night/glamping lake/camp `photo-1504280390367-361c6d9f38f4` or verified existing property/destination Unsplash photos — confirm HTTP 200 during execution, or select directly from existing `properties.ts` / `destinations.ts` URLs).
- In `matchPropertiesForCampaign`, normalize Vietnamese diacritics (`normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase()`) so destination matching is resilient to accents and case.
- In `vouchers.ts`, validate in exact Spec §5.3 order: `EMPTY → NOT_FOUND → INACTIVE → EXPIRED → MEMBER_ONLY → NEW_USER_ONLY → PROPERTY_NOT_ELIGIBLE → MIN_ORDER → discount`.
- In `bookingSession.ts`, pass `property` and `hasPriorSuccessfulBookings` to `evaluatePromotionVoucher` inside `calculateBookingPricing`, `deriveBookingQuote`, and `processServerReservationIntent`; add optional `initialPromoCode?: string` parameter to `openPropertySession` and `startCheckoutSession` (applied via `normalizeVoucherCode` when provided).
- In `locale.ts`, add all 28 `deals.*` keys from Spec §5.5 for both `vi` and `en`.

- [ ] **Step 4: Build & run domain tests to verify pass**

Run: `npm run build --workspace=@luxestay/domain && npm run test --workspace=@luxestay/domain`
Expected: All existing and new domain tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/deals.ts packages/domain/src/vouchers.ts packages/domain/src/bookingSession.ts packages/domain/src/seed/promotions.ts packages/domain/src/seed/index.ts packages/domain/src/locale.ts packages/domain/src/index.ts packages/domain/tests/deals.test.ts packages/domain/tests/booking-session.test.ts packages/domain/tests/host-locale.test.ts
git commit -m "feat(domain): add deals matching engine, voucher eligibility rules, and seed campaigns"
```

---

## Task 3: PostgreSQL Schema, Migration `0004` & Idempotent Seed/Prepare (`apps/api/src/db`)

**Files:**
- Create: `apps/api/src/db/migrations/0004_promotions_campaigns.sql`
- Modify: `apps/api/src/db/migrations/meta/_journal.json`
- Modify: `apps/api/src/db/schema/catalog.ts:39-54`
- Modify: `apps/api/src/db/seed.ts:20-90`
- Modify: `apps/api/src/db/vercelPrepare.ts:36-92`
- Modify: `apps/api/src/modules/catalog/postgresRepository.ts:220-236`
- Test: `apps/api/tests/api.test.ts`

**Interfaces:**
- Consumes: Task 1 & Task 2 (`PromotionCampaign`, `PromotionVoucher`, `PROMOTION_CAMPAIGNS`, `SEED_CATALOG_SNAPSHOT`).
- Produces:
  - `promotionsTable` with additive columns (`title`, `subtitle`, `badge`, `iconName`, `audience`, `newUserOnly`, `applicablePropertyTypes`, `applicableCategories`, `terms`)
  - `promotionCampaignsTable` (`promotion_campaigns` table with unique `slug`)
  - `seedPromotionsAndCampaigns(dbOrTx)` exported from `apps/api/src/db/seed.ts`
  - `mapPromotionVoucherRowToDomain(row)` exported from `apps/api/src/modules/catalog/postgresRepository.ts`
  - `backfillPromotionsIfNeeded(db)` helper invoked inside `prepareDatabaseIfConfigured`

- [ ] **Step 1: Write failing tests in `apps/api/tests/api.test.ts` for migration SQL/journal integrity, voucher row mapping, and idempotent backfill**

Add unit tests asserting:
- `0004_promotions_campaigns.sql` exists, is registered as `idx: 4` in `meta/_journal.json`, uses `ADD COLUMN IF NOT EXISTS` on `promotions` and `CREATE TABLE IF NOT EXISTS "promotion_campaigns"`.
- `mapPromotionVoucherRowToDomain` accurately maps extended columns (`audience`, `newUserOnly`, `applicablePropertyTypes`, `applicableCategories`, `terms`, nulls → `undefined`).
- **Review Focus #5**: A unit test for `backfillPromotionsIfNeeded` with a minimal mock/stub `db` verifies that when `promotion_campaigns` returns 0 rows, `seedPromotionsAndCampaigns` runs without ever issuing an insert/update on `propertiesTable`; when `promotion_campaigns` already has rows, it skips cleanly.

- [ ] **Step 2: Run API tests to confirm failure**

Run: `npm run build --workspace=@luxestay/api && npm run test --workspace=@luxestay/api`
Expected: FAIL (missing `0004_promotions_campaigns.sql`, `mapPromotionVoucherRowToDomain`, `backfillPromotionsIfNeeded`).

- [ ] **Step 3: Implement schema, SQL migration `0004`, journal entry, `seed.ts`, `vercelPrepare.ts`, and `catalog/postgresRepository.ts`**

- In `apps/api/src/db/schema/catalog.ts`: add the 9 new columns to `promotionsTable` and define `promotionCampaignsTable` per Spec §5.4.
- In `apps/api/src/db/migrations/0004_promotions_campaigns.sql`: write idempotent DDL (`ALTER TABLE "promotions" ADD COLUMN IF NOT EXISTS ...`, `CREATE TABLE IF NOT EXISTS "promotion_campaigns" (...)`, `CREATE UNIQUE INDEX IF NOT EXISTS "promotion_campaigns_slug_unique" ...`). Add entry `idx: 4, tag: "0004_promotions_campaigns"` to `meta/_journal.json`.
- In `apps/api/src/db/seed.ts`: extract `seedPromotionsAndCampaigns(db)` that upserts all `SEED_CATALOG_SNAPSHOT.promotions.vouchers` (including new columns) and `PROMOTION_CAMPAIGNS` into `promotionCampaignsTable`, and call it inside `seedDatabase`.
- In `apps/api/src/db/vercelPrepare.ts`: export `backfillPromotionsIfNeeded(db)` checking `select({ id: promotionCampaignsTable.id }).from(promotionCampaignsTable).limit(1)`; if empty, call `seedPromotionsAndCampaigns(db)` without touching `propertiesTable`. Invoke it in the `existing.length > 0` branch of `prepareDatabaseIfConfigured`.
- In `apps/api/src/modules/catalog/postgresRepository.ts`: extract & export `mapPromotionVoucherRowToDomain(row)` and use it in `getSnapshot()`.

- [ ] **Step 4: Build & run API tests to verify pass**

Run: `npm run build --workspace=@luxestay/api && npm run test --workspace=@luxestay/api`
Expected: New DB/migration/mapper tests PASS (note: update the single existing `api.test.ts:77` assertion `vouchers.length === 2` → `6` here if Task 2 seed already bumped it to 6).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/db/schema/catalog.ts apps/api/src/db/migrations/0004_promotions_campaigns.sql apps/api/src/db/migrations/meta/_journal.json apps/api/src/db/seed.ts apps/api/src/db/vercelPrepare.ts apps/api/src/modules/catalog/postgresRepository.ts apps/api/tests/api.test.ts
git commit -m "feat(api-db): add promotion_campaigns migration, extended voucher columns, and idempotent backfill"
```

---

## Task 4: Independent Backend `deals` Module & Authoritative Voucher Validation (`apps/api`)

**Files:**
- Create: `apps/api/src/modules/deals/repository.ts`
- Create: `apps/api/src/modules/deals/postgresRepository.ts`
- Create: `apps/api/src/modules/deals/service.ts`
- Create: `apps/api/src/modules/deals/routes.ts`
- Modify: `apps/api/src/modules/catalog/routes.ts:13-102`
- Modify: `apps/api/src/modules/reservations/service.ts:83-145`
- Modify: `apps/api/src/app.ts:1-217`
- Modify: `apps/api/src/runtime.ts:1-62`
- Test: `apps/api/tests/api.test.ts`

**Interfaces:**
- Consumes: Task 1 (`DealsHub`, `DealDetail`, `API_ENDPOINTS.deals`, `API_ENDPOINTS.dealBySlug`), Task 2 (`matchPropertiesForCampaign`, `resolveCampaignVouchers`, `hasPriorSuccessfulBookings`, `evaluatePromotionVoucher`), Task 3 (`promotionCampaignsTable`).
- Produces:
  - `ApiDealsRepository` (`getCampaigns()`, `getCampaignBySlug(slug)`)
  - `createInMemoryDealsRepository(initialCampaigns?)` & `createPostgresDealsRepository(db)` + `mapCampaignRowToDomain(row)`
  - `DealsService` (`getDealsHub(): Promise<DealsHub>`, `getDealBySlug(slug: string): Promise<DealDetail | null>`)
  - `createDealsRoutes(dealsService)` exposing `GET /api/v1/deals` and `GET /api/v1/deals/:slug`
  - Upgraded `POST /api/v1/vouchers/validate` & `POST /api/v1/reservations` enforcing `propertyId` and `hasPriorSuccessfulBookings`

- [ ] **Step 1: Write failing API integration tests in `apps/api/tests/api.test.ts`**

Add integration tests covering:
- `GET /api/v1/deals` returns `200 ApiSuccess<DealsHub>` validated by `DealsHubSchema` with 5 campaigns (1 hero + 4 carousel) and 6 vouchers.
- `GET /api/v1/deals/bien-he-phu-quoc-nha-trang` returns `200 ApiSuccess<DealDetail>` validated by `DealDetailSchema` with 4 matched coastal stays (`stay-02`, `stay-07`, `stay-08`, `stay-10`) and resolved vouchers `["NEWSTAY250", "LUXESTAY250"]`.
- **Review Focus #2**:
  - `GET /api/v1/deals/%20BIEN-HE-PHU-QUOC-NHA-TRANG%20` normalizes and returns `200`.
  - Unknown slug returns `404 NOT_FOUND`.
  - A campaign injected with `isActive: false` returns `404 NOT_FOUND` on `GET /api/v1/deals/:slug`.
  - A campaign injected with `isActive: true` and `endsAt: "2020-01-01T00:00:00.000Z"` returns `200` on `GET /api/v1/deals/:slug` (so bookmarked links render the ended-campaign banner).
- **Review Focus #1 & #3**:
  - `POST /api/v1/vouchers/validate` with `{ code: "HOMESTAY10", subtotal: 2_000_000, propertyId: "stay-03" }` returns `{ valid: false }` (Sa Pa `hotel` ineligible), while `propertyId: "stay-01"` (`homestay`) returns `{ valid: true, discount: 200_000 }`.
  - Authenticated user with 0 bookings succeeds with `WELCOME150`; after creating a confirmed hotel-pay reservation, both `POST /api/v1/vouchers/validate` AND `POST /api/v1/reservations` reject `WELCOME150` with `NEW_USER_ONLY` (`valid: false` / `400`).
  - Authenticated user whose only prior booking was `cancelled` is still allowed to use `WELCOME150`!
  - `POST /api/v1/reservations` rejects tampered `VIPRESORT1M` on `stay-01` (`mountain-view`, not luxury/beachfront) with `400`.
- `mapCampaignRowToDomain` maps a Drizzle campaign row cleanly to `PromotionCampaign`.

- [ ] **Step 2: Run API tests to verify failure**

Run: `npm run build --workspace=@luxestay/api && npm run test --workspace=@luxestay/api`
Expected: FAIL (404 on `/api/v1/deals`, missing property/repeat-user enforcement).

- [ ] **Step 3: Implement `apps/api/src/modules/deals/*`, wire `app.ts` & `runtime.ts`, and upgrade voucher checks in `catalog/routes.ts` & `reservations/service.ts`**

- In `apps/api/src/modules/deals/repository.ts`: implement `ApiDealsRepository` & `createInMemoryDealsRepository(initialCampaigns = PROMOTION_CAMPAIGNS)` normalizing `slug.trim().toLowerCase()`.
- In `apps/api/src/modules/deals/postgresRepository.ts`: query `promotionCampaignsTable` ordered by `asc(promotionCampaignsTable.sortOrder)` and export `mapCampaignRowToDomain(row)`.
- In `apps/api/src/modules/deals/service.ts`:
  - `getDealsHub()`: reads `dealsRepository.getCampaigns()` + `catalogRepository.getSnapshot()` → `{ expiryLabel, vouchers, campaigns }`.
  - `getDealBySlug(slug)`: fetches campaign by normalized slug; if `!campaign || !campaign.isActive`, return `null`; otherwise resolve `vouchers` via `resolveCampaignVouchers` and `properties` via `matchPropertiesForCampaign`.
- In `apps/api/src/modules/deals/routes.ts`: register `GET ${API_ENDPOINTS.deals}` and `GET /api/v1/deals/:slug`.
- In `apps/api/src/modules/catalog/routes.ts`: accept optional `deps?: { reservationRepository?: ApiReservationRepository }` on `createCatalogRoutes(catalogService, deps)`. On `POST /api/v1/vouchers/validate`, resolve `property` when `parsed.data.propertyId` is provided and compute `priorSuccessful = authUser && deps?.reservationRepository ? hasPriorSuccessfulBookings(await deps.reservationRepository.findByUserId(authUser.id)) : false`.
- In `apps/api/src/modules/reservations/service.ts`: compute `priorSuccessful` for `authUser` via `deps.reservationRepository.findByUserId(authUser.id)` before calling `processServerReservationIntent` (in both the fast-path and locked-path) and pass `hasPriorSuccessfulBookings: priorSuccessful`.
- In `apps/api/src/app.ts` & `apps/api/src/runtime.ts`: wire `dealsRepository` (in-memory default / Postgres in `STORAGE_DRIVER=database`), `dealsService`, `createDealsRoutes(dealsService)`, and pass `{ reservationRepository }` to `createCatalogRoutes`.

- [ ] **Step 4: Build & run API tests to verify pass**

Run: `npm run build --workspace=@luxestay/api && npm run test --workspace=@luxestay/api`
Expected: All API tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/deals apps/api/src/modules/catalog/routes.ts apps/api/src/modules/reservations/service.ts apps/api/src/app.ts apps/api/src/runtime.ts apps/api/tests/api.test.ts
git commit -m "feat(api): add independent deals module and enforce property/new-user voucher rules"
```

---

## Task 5: Web `dealsPort.ts`, Payment Port Parity & Checkout Promo Pre-Fill (`apps/web`)

**Files:**
- Create: `apps/web/src/shared/ports/dealsPort.ts`
- Modify: `apps/web/src/shared/ports/types.ts:45-50`
- Modify: `apps/web/src/shared/ports/paymentPort.ts:148-189`
- Modify: `apps/web/src/shared/ports/persistencePort.ts:1060-1110`
- Modify: `apps/web/src/features/booking/BookingContext.tsx:120-175, 496-585, 648-702`
- Modify: `apps/web/src/features/booking/BookingCheckoutModal.tsx:58-145`
- Modify: `apps/web/src/features/catalog/PropertyCard.tsx:23-62, 230-255`
- Test: `apps/web/tests/persistence-port.test.ts`

**Interfaces:**
- Consumes: Task 1 (`DealsHubSchema`, `DealDetailSchema`, `API_ENDPOINTS.deals`, `API_ENDPOINTS.dealBySlug`), Task 2 (`PROMOTION_CAMPAIGNS`, `matchPropertiesForCampaign`, `resolveCampaignVouchers`, `openPropertySession`, `startCheckoutSession`), Task 4 (`GET /api/v1/deals`, `GET /api/v1/deals/:slug`, `POST /api/v1/vouchers/validate` with `propertyId`).
- Produces:
  - `DealsRepository` (`getDealsHub(options?)`, `getDealBySlug(slug, options?)`) in `shared/ports/types.ts`
  - `createHttpDealsRepository`, `createMockDealsRepository`, `createDealsRepositoryForMode`, `loadDealsHub`, `loadDealBySlug` in `shared/ports/dealsPort.ts`
  - `openPropertyWithPromo(property: Property, promoCode?: string | null): void` and `startCheckoutWithPromo(property: Property, promoCode?: string | null): void` in `BookingSessionContextValue`
  - `PropertyCardProps` extended with optional `onSelectProperty?: (property: Property) => void` and `onBookProperty?: (property: Property) => void`

- [ ] **Step 1: Write failing web port tests in `apps/web/tests/persistence-port.test.ts`**

Update line 493 (`apiSnapshot.promotions.vouchers.length` → `6`) and add tests:
- `createMockDealsRepository().getDealsHub()` returns 5 campaigns and 6 vouchers; `getDealBySlug("worlds-best-resorts")` returns 4 luxury stays and `VIPRESORT1M` + `SUMMERVIBE`; `getDealBySlug("missing")` returns `null`; inactive campaign returns `null`.
- **Review Focus #4**: `createHttpDealsRepository({ baseUrl: "", fetchImpl })` calls same-origin `/api/v1/deals` and `/api/v1/deals/<slug>`, validates responses against Zod schemas, returns `null` on `404` for `getDealBySlug`, and throws structured `HttpApiError` (`status: 500` / `NETWORK_ERROR`, preserving `requestId`) with zero fallback to mock data when the API fails.
- `createMockPaymentGatewayPort({ vouchers, properties }).validateVoucher({ code: "HOMESTAY10", subtotal: 2_000_000, propertyId: "stay-03" })` returns `{ valid: false }`, while `propertyId: "stay-01"` returns `{ valid: true, discount: 200_000 }`.

- [ ] **Step 2: Run web unit tests to verify failure**

Run: `npm run test --workspace=@luxestay/web`
Expected: FAIL (missing `dealsPort.ts` and mock `propertyId` handling).

- [ ] **Step 3: Implement `dealsPort.ts`, update `types.ts`, `paymentPort.ts`, `persistencePort.ts`, `BookingContext.tsx`, `BookingCheckoutModal.tsx`, and `PropertyCard.tsx`**

- In `apps/web/src/shared/ports/dealsPort.ts`: mirror `catalogPort.ts` structure cleanly (`joinUrl` supporting same-origin `""`, `cache: "no-store"`, `ApiErrorResponseSchema` parsing, `createApiSuccessSchema(DealsHubSchema)` / `DealDetailSchema`, `404 → null` on `getDealBySlug`, `loadDealsHub()` / `loadDealBySlug(slug)` using `getServerWebEnv()`).
- In `apps/web/src/shared/ports/paymentPort.ts` & `persistencePort.ts`: accept optional `properties?: readonly Property[]` in `createMockPaymentGatewayPort`, look up `property` by `input.propertyId`, and pass it into `evaluatePromotionVoucher`.
- In `apps/web/src/features/booking/BookingContext.tsx`: expose `openPropertyWithPromo(property, promoCode)` and `startCheckoutWithPromo(property, promoCode)` using Task 2's `initialPromoCode` parameter on `openPropertySession` / `startCheckoutSession`.
- In `apps/web/src/features/booking/BookingCheckoutModal.tsx`:
  - Initialize `voucherInput` from `bookingSession.promoCode ?? pricing.appliedPromoCode ?? ""`.
  - Pass `property` to client `evaluatePromotionVoucher` and `propertyId: property.id` to `paymentGateway.validateVoucher`.
  - Run a one-shot `useEffect` on mount when `bookingSession.promoCode` is already populated so the user immediately sees the green discount badge or eligibility reason (using an `AbortController` cleanup).
- In `apps/web/src/features/catalog/PropertyCard.tsx`: accept optional `onSelectProperty` and `onBookProperty` props, falling back to `setSelectedProperty` and `setCheckoutProperty`.

- [ ] **Step 4: Run web tests & typecheck to verify pass**

Run: `npm run test --workspace=@luxestay/web && npm run typecheck --workspace=@luxestay/web`
Expected: All web unit tests PASS and zero TS errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/shared/ports/dealsPort.ts apps/web/src/shared/ports/types.ts apps/web/src/shared/ports/paymentPort.ts apps/web/src/shared/ports/persistencePort.ts apps/web/src/features/booking/BookingContext.tsx apps/web/src/features/booking/BookingCheckoutModal.tsx apps/web/src/features/catalog/PropertyCard.tsx apps/web/tests/persistence-port.test.ts
git commit -m "feat(web-ports): add independent dealsPort and checkout promo pre-fill integration"
```

---

## Task 6: Homepage 3-Tier `PromotionsHub` UI, `VoucherTermsModal` & Navbar Update (`apps/web`)

**Files:**
- Create: `apps/web/src/features/promotions/VoucherCard.tsx`
- Create: `apps/web/src/features/promotions/VoucherTermsModal.tsx`
- Create: `apps/web/src/features/promotions/VoucherCarousel.tsx`
- Create: `apps/web/src/features/promotions/CampaignCountdown.tsx`
- Create: `apps/web/src/features/promotions/CampaignHeroBanner.tsx`
- Create: `apps/web/src/features/promotions/CampaignCard.tsx`
- Create: `apps/web/src/features/promotions/CampaignCarousel.tsx`
- Create: `apps/web/src/features/promotions/PromotionsHub.tsx`
- Modify: `apps/web/src/app/(main)/page.tsx:1-36`
- Modify: `apps/web/src/shared/layout/Navbar.tsx:120-135, 315-345`
- Delete: `apps/web/src/features/catalog/PromotionBanner.tsx`

**Interfaces:**
- Consumes: Task 1 (`DealsHub`, `PromotionCampaign`, `PromotionVoucher`), Task 2 (`partitionCampaigns`, `filterVouchersByAudience`, `buildVoucherTermsList`, `isCampaignExpired`, `deals.*` locale keys), Task 5 (`loadDealsHub`), `useOverlayLayer` (`shared/overlay/OverlayContext`), `useLocale` (`features/locale/LocaleContext`).
- Produces:
  - Reusable components exported from `features/promotions/`: `VoucherCard`, `VoucherTermsModal`, `VoucherCarousel`, `CampaignCountdown`, `CampaignHeroBanner`, `CampaignCard`, `CampaignCarousel`, `PromotionsHub`.
  - Stable `data-testid` hooks for E2E: `promotions-hub`, `voucher-card-<code>`, `voucher-copy-<code>`, `voucher-info-<code>`, `voucher-terms-modal`, `campaign-hero-banner`, `campaign-card-<slug>`, `deals-error-card`.

- [ ] **Step 1: Build reusable voucher components (`VoucherCard.tsx`, `VoucherTermsModal.tsx`, `VoucherCarousel.tsx`)**

- `VoucherCard`: crisp white rounded-2xl card with left/right semicircular ticket notches (`-left-2.5` / `-right-2.5`, matching `#f8fafc` surface), dashed middle divider, Lucide icon circle derived from `voucher.iconName`, 1-line title + 1-line subtitle, `(i)` info button calling `onInspect(voucher)`, monospace code with copy icon + soft emerald/sky pill `Sao chép` / `Đã sao chép` button (localized via `t("deals.copy")` / `t("deals.copied")`), optional `selected` / `onSelect` pill for `/deals/[slug]`.
- `VoucherTermsModal`: registers with `useOverlayLayer({ id: "voucher-terms-modal", kind: "dialog", isOpen: Boolean(voucher), onClose })`, uses `formatPrice` for `minOrderTotal` / `discountValue` / `maxDiscount`, renders `buildVoucherTermsList(voucher)`, eligibility badges (Bạn mới / Thành viên / Loại hình áp dụng), and Copy button.
- `VoucherCarousel`: horizontal snap-scroll strip (`no-scrollbar`) showing 3 cards on desktop (`lg:basis-[calc(33.333%-12px)]`), 2 on tablet, 1.15 on mobile, with circular floating `<` and `>` arrows that update visibility from scroll position.

- [ ] **Step 2: Build campaign banner components (`CampaignCountdown.tsx`, `CampaignHeroBanner.tsx`, `CampaignCard.tsx`, `CampaignCarousel.tsx`)**

- `CampaignCountdown`: client-only hydration-safe countdown (`-- : -- : --` on initial render before mount, ticking every 1s to `endsAt`, stopping at `00:00:00` when expired) with localized `t("deals.days")` / `hours` / `minutes` / `seconds`.
- `CampaignHeroBanner`: full-width rounded-3xl banner with Unsplash `<Image fill>` + deep atmospheric gradient, glowing campaign badge (`campaign.badge`), bold display title, `t("deals.termsApply")` caption, and right-hand glassmorphic Web CTA panel containing `<CampaignCountdown endsAt={campaign.endsAt} />`, featured voucher code pill with quick-copy button (`e.stopPropagation(); e.preventDefault()`), and primary CTA button `Xem ưu đãi →` linking to `/deals/${campaign.slug}`.
- `CampaignCard`: landscape rounded-2xl banner card linking to `/deals/${campaign.slug}` with themed color treatments matching the 5 `PromotionCampaignTheme` tokens (`coral-summer` vibrant coral-red split like the reference's left card, `ocean-teal` vibrant teal split like the middle card, `luxury-gold` dark obsidian + metallic gold frame like the right "World's Best" card, `forest-mist` deep emerald/sage, `festive-night` midnight indigo/amber).
- `CampaignCarousel`: 3-up desktop horizontal carousel with floating circular `<` / `>` arrows.

- [ ] **Step 3: Compose `PromotionsHub.tsx`, update `apps/web/src/app/(main)/page.tsx`, update `Navbar.tsx`, and remove legacy `PromotionBanner.tsx`**

- `PromotionsHub`:
  - Accepts `{ initialDeals: DealsHub | null; error?: { code: string; message: string; requestId?: string } | null }`.
  - **Review Focus #4**: When `error` is truthy and `initialDeals` is null, render `<section id="deals-section" data-testid="deals-error-card">` displaying the structured error message, `requestId` if present, and a `Thử lại` button calling `router.refresh()` — never silently falling back to mock data.
  - Otherwise build the Tier 1 voucher strip by placing `filterVouchersByAudience(vouchers, "new-user")` first (`WELCOME150`, `NEWSTAY250`, `HOMESTAY10`) followed by remaining active non-member-only vouchers (`LUXESTAY250`, `SUMMERVIBE`) so the 3 new-user vouchers lead the viewport while desktop's `>` carousel arrow scrolls smoothly to reveal the additional all-user vouchers; partition active campaigns via `partitionCampaigns(campaigns)`:
    - Tier 1: Heading `t("deals.newUserTitle")` + subtitle `t("deals.newUserSubtitle")` + `<VoucherCarousel />`
    - Tier 2 + 3: Header `t("deals.ongoingTitle")` + `<Link href="/deals">{t("deals.viewAll")} →</Link>`, render `<CampaignHeroBanner />` only when `hero !== null`, followed by `<CampaignCarousel />` when `carousel.length > 0`.
  - Manages `inspectedVoucher` state rendering `<VoucherTermsModal />`.
- `apps/web/src/app/(main)/page.tsx`: convert `HomePage` to `async function HomePage()`, call `loadDealsHub()` inside `try/catch` (capturing `HttpApiError` / unexpected errors into `dealsError` without throwing so `HeroSection` & `PropertyList` remain functional), place `<PromotionsHub initialDeals={dealsHub} error={dealsError} />` directly between `<HeroSection />` and `<CategoryBar />`, and remove the old `<PromotionBanner />` import/usage.
- `apps/web/src/shared/layout/Navbar.tsx`: replace the desktop `scrollToSection("deals-section")` button with `<Link href="/deals" data-testid="nav-deals-link">` styled with active highlight when `pathname.startsWith("/deals")`, and add a matching `<Link href="/deals">` item in the mobile navigation drawer.
- Delete `apps/web/src/features/catalog/PromotionBanner.tsx` (verify zero remaining references with grep).

- [ ] **Step 4: Run web lint, typecheck, and build to verify**

Run: `npm run lint --workspace=@luxestay/web && npm run typecheck --workspace=@luxestay/web && npm run build --workspace=@luxestay/web`
Expected: Zero lint/boundary errors, zero TS errors, clean Next.js build.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/promotions apps/web/src/app/'(main)'/page.tsx apps/web/src/shared/layout/Navbar.tsx
git rm apps/web/src/features/catalog/PromotionBanner.tsx
git commit -m "feat(web): build 3-tier PromotionsHub below HeroSection and link Navbar to /deals"
```

---

## Task 7: Dedicated `/deals` & `/deals/[slug]` Pages (`apps/web`)

**Files:**
- Create: `apps/web/src/features/promotions/DealsCenterView.tsx`
- Create: `apps/web/src/features/promotions/DealDetailView.tsx`
- Create: `apps/web/src/app/(main)/deals/page.tsx`
- Create: `apps/web/src/app/(main)/deals/[slug]/page.tsx`

**Interfaces:**
- Consumes: Task 5 (`loadDealsHub`, `loadDealBySlug`, `openPropertyWithPromo`, `startCheckoutWithPromo`, `PropertyCard` optional callbacks), Task 6 (`VoucherCard`, `VoucherTermsModal`, `CampaignHeroBanner`, `CampaignCard`, `CampaignCountdown`), Task 2 (`partitionCampaigns`, `filterVouchersByAudience`, `isCampaignExpired`, `resolveEligibleVoucherForProperty`, `deals.*` locale keys).
- Produces:
  - SSR route `/deals` (`apps/web/src/app/(main)/deals/page.tsx`)
  - SSR route `/deals/[slug]` (`apps/web/src/app/(main)/deals/[slug]/page.tsx`)
  - Stable `data-testid` hooks: `deals-center-view`, `deals-filter-all`, `deals-filter-new-user`, `deals-filter-member`, `deal-detail-view`, `deal-expired-banner`, `deal-matching-stays`.

- [ ] **Step 1: Implement `DealsCenterView.tsx` and `apps/web/src/app/(main)/deals/page.tsx`**

- `DealsCenterView`:
  - Breadcrumb (`Trang chủ / Ưu đãi`) and clean hero header.
  - Audience filter pills (`all` / `new-user` / `member`) with live count badges filtering `initialDeals.vouchers` via `filterVouchersByAudience` into a responsive 1/2/3-column grid of `VoucherCard`s + shared `VoucherTermsModal`.
  - Spotlight section rendering `CampaignHeroBanner` when `hero !== null`, followed by a responsive grid of all active `carousel` campaigns (`CampaignCard`) or clean localized empty state when none are active.
- `apps/web/src/app/(main)/deals/page.tsx`: `async` Server Component calling `loadDealsHub()` (unhandled `HttpApiError` bubbles to `app/error.tsx`) and rendering `<DealsCenterView initialDeals={dealsHub} />`.

- [ ] **Step 2: Implement `DealDetailView.tsx` and `apps/web/src/app/(main)/deals/[slug]/page.tsx`**

- `DealDetailView`:
  - Back link to `/deals`, full campaign hero banner artwork with period badge, title, subtitle, and `CampaignCountdown`.
  - Compute `expired = isCampaignExpired(campaign)`. When `expired` is `true`, render an amber/slate `deal-expired-banner` ("Chương trình ưu đãi đã kết thúc" + link back to `/deals`), disable voucher auto-apply, and omit promo pre-fill when opening properties.
  - Two-column campaign detail body:
    - Left: full `campaign.terms` checklist + visual summary of `campaign.targetFilter` scope (destinations, categories, property types, flash deals).
    - Right: resolved campaign `VoucherCard`s with Copy button, `(i)` modal trigger, and selectable `"Đang chọn áp sẵn"` / `"Chọn dùng mã này"` toggle (defaulting to `detail.vouchers[0]` when not expired).
  - Matching Stays section (`data-testid="deal-matching-stays"`):
    - Renders `detail.properties` using `<PropertyCard>` with `onSelectProperty` and `onBookProperty` handlers that compute `effectiveVoucher = expired ? null : resolveEligibleVoucherForProperty(selectedVoucher, detail.vouchers, property)` and invoke `openPropertyWithPromo(property, effectiveVoucher?.code)` / `startCheckoutWithPromo(property, effectiveVoucher?.code)`.
    - Displays a subtle chip showing which promo code will auto-apply (so on `/deals/san-may-da-lat-sapa` with `HOMESTAY10` selected, Sa Pa hotel `stay-03` transparently falls back to `WELCOME150`).
- `apps/web/src/app/(main)/deals/[slug]/page.tsx`: `async` Server Component calling `loadDealBySlug(slug)`; if `null`, calls `notFound()`; otherwise renders `<DealDetailView detail={detail} />`.

- [ ] **Step 3: Run web lint, typecheck, and full monorepo build to verify**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: All workspaces lint, typecheck, and build cleanly including SSR routes `/deals` and `/deals/[slug]`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/promotions/DealsCenterView.tsx apps/web/src/features/promotions/DealDetailView.tsx apps/web/src/app/'(main)'/deals
git commit -m "feat(web): add dedicated /deals center and /deals/[slug] campaign detail pages"
```

---

## Task 8: Playwright E2E Verification (`E2E-4`) & Full Workspace Quality Gate

**Files:**
- Modify: `e2e/luxestay.spec.ts`

**Interfaces:**
- Consumes: Homepage `PromotionsHub`, `Navbar` `/deals` link, `/deals`, `/deals/[slug]`, `VoucherTermsModal`, `BookingCheckoutModal`.
- Produces: Passing `E2E-1` through `E2E-4` and green monorepo verification (`build`, `typecheck`, `lint`, `test`, `test:e2e`).

- [ ] **Step 1: Add `E2E-4` to `e2e/luxestay.spec.ts`**

Add `test("E2E-4: Promotions Hub on homepage, voucher terms modal, /deals center, and /deals/[slug] checkout promo pre-fill", async ({ page }) => { ... })` asserting:
1. On `/`, `promotions-hub` is visible above `properties-section` (compare bounding box `y` coordinates so placement below Hero & above PropertyList is regression-locked!).
2. Click `voucher-info-WELCOME150` → `voucher-terms-modal` opens with minimum order & terms → close via `Escape` (verifying `OverlayContext`).
3. Click `campaign-card-bien-he-phu-quoc-nha-trang` → navigates to `/deals/bien-he-phu-quoc-nha-trang` → `deal-matching-stays` displays coastal stays including `The Coral Luxury Villa & Sunset Beach`.
4. Click `"Đặt phòng ngay"` on the first matched stay → `BookingCheckoutModal` opens with `NEWSTAY250` pre-filled in the voucher input and displays a verified discount line (`-250.000 ₫`).
5. Click `nav-deals-link` → navigates to `/deals` → toggle `deals-filter-new-user` (shows 3 welcome vouchers) and `deals-filter-member` (shows `VIPRESORT1M`).

- [ ] **Step 2: Run full monorepo build, typecheck, lint, and unit/API tests**

Run:
```bash
npm run build
npm run typecheck
npm run lint
npm run test
```
Expected: Every workspace (`@luxestay/contracts`, `@luxestay/domain`, `@luxestay/api`, `@luxestay/web`) exits with code 0.

- [ ] **Step 3: Run full Playwright E2E suite (isolated ports if dev server is active)**

Run: `npm run test:e2e` (or isolated `PLAYWRIGHT_API_PORT`/`PLAYWRIGHT_WEB_PORT` per `.agents/skills/luxestay-deploy-and-verify/SKILL.md` if ports 3000/4000 are occupied).
Expected: `4 passed` (`E2E-1`, `E2E-2`, `E2E-3`, `E2E-4`).

- [ ] **Step 4: Commit E2E tests**

```bash
git add e2e/luxestay.spec.ts
git commit -m "test(e2e): add Promotions Hub and /deals end-to-end verification"
```
