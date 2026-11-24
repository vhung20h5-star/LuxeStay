# Promotions Hub, Campaign Banners & Dedicated `/deals` Experience — Design Specification

- **Date**: 2026-11-24
- **Status**: Draft (Pending User Approval)
- **Workspace**: LuxeStay Travel Service (`packages/contracts`, `packages/domain`, `apps/api`, `apps/web`)
- **Reference Inspiration**: Traveloka 3-tier Promotions layout (New-User Ticket-Notch Voucher Carousel + Hero Ongoing Deal Banner + 3-Up Campaign Banner Carousel)

---

## 1. Intent & Why

Currently, LuxeStay's homepage only displays a single dark-emerald Flash Sale card (`PromotionBanner.tsx`) tucked below the entire `PropertyList`, featuring two vouchers (`LUXESTAY250`, `SUMMERVIBE`). Visitors landing on the homepage do not immediately discover what seasonal promotions, new-user discounts, or destination-specific deals are active, nor do they have a dedicated place to browse all ongoing campaigns and inspect terms before booking.

This feature elevates promotions into a first-class discovery and conversion layer:
1. Surfaces ongoing deals immediately below `HeroSection` via a scannable **3-tier Promotions Hub** modeled after modern OTA best practices while remaining 100% authentic to LuxeStay's Vietnam stays catalog (hotels, 5-star resorts, villas, homestays, glamping).
2. Introduces dedicated **`/deals`** and **`/deals/[slug]`** routes so users can explore all vouchers and active campaigns, read full terms, browse matching stays directly on the campaign page, and enter checkout with the campaign's promo code pre-attached.
3. Enforces real voucher eligibility rules (`newUserOnly`, `applicablePropertyTypes`, `applicableCategories`, `memberOnly`, `minOrderTotal`, `expiresAt`) end-to-end across client preview and server-authoritative reservation creation.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **Homepage 3-Tier Promotions Hub** directly under `HeroSection` (replacing the legacy `PromotionBanner`, preserving `#deals-section`):
  - **Tier 1 — New User Vouchers Carousel**: White ticket-notched coupon cards (semicircle side cutouts, dashed divider, category icon badge, concise headline & subtitle, `(i)` info button opening a terms modal, monospace code + soft pill `Sao chép` / `Copy` button, horizontal scroll arrows).
  - **Tier 2 — Ongoing Deals Hero Banner**: Full-width rich campaign banner using high-res Unsplash travel photography + layered Tailwind/React visual design, campaign badge, headline, period tag, terms link, and an actionable right-hand Web CTA glass panel (real-time countdown to `endsAt`, featured copyable voucher code, and primary `Xem ưu đãi` CTA button — replacing the mobile-app QR block from the reference).
  - **Tier 3 — Campaign Deal Cards Carousel**: Multi-palette 3-up horizontal carousel (4+ active campaigns so horizontal arrows slide meaningfully) with distinct campaign themes (coral summer beach, ocean teal cloud-hunting, luxury black-and-gold resorts, forest mist glamping/homestay) plus a `Xem tất cả ưu đãi →` link to `/deals`.
- **Dedicated `/deals` & `/deals/[slug]` Routes**:
  - `Navbar` "Ưu đãi Hot" / "Hot Deals" navigates directly to `/deals` (both desktop and mobile menu).
  - `/deals`: Full Promotions Center with audience filter tabs (*Tất cả / Bạn mới / Thành viên*), full ticket-notched voucher grid, hero spotlight banner, and grid of all ongoing campaigns.
  - `/deals/[slug]`: Campaign detail page with hero banner, validity countdown, full terms & conditions, campaign-linked vouchers (copyable + selectable as active booking promo), and live grid of matching `PropertyCard` stays where booking pre-fills the selected campaign promo code.
- **Independent Full-Stack `deals` Architecture (Selected Approach)**:
  - Keep `CatalogSnapshot` focused on core catalog/vouchers; introduce an independent `deals` API module (`GET /api/v1/deals`, `GET /api/v1/deals/:slug`), PostgreSQL schema & idempotent migration (`0004_promotions_campaigns.sql`), and independent web port (`apps/web/src/shared/ports/dealsPort.ts`) supporting both `mock` and `api` modes with zero silent fallback.
- **Real Server-Authoritative Voucher Eligibility**:
  - Preserve full backward compatibility for existing vouchers (`LUXESTAY250`, `SUMMERVIBE`) and existing tests/E2E suites.
  - Add 4 realistic stay vouchers (`WELCOME150`, `NEWSTAY250`, `HOMESTAY10`, `VIPRESORT1M`) with genuine `newUserOnly`, `applicablePropertyTypes`, `applicableCategories`, and `memberOnly` validation enforced on both client quote preview and server (`POST /api/v1/vouchers/validate` & `POST /api/v1/reservations`).
- **Locale & Currency Integration**:
  - Wire `LocaleContext` (`useLocale()`) for all UI chrome labels (section headings, buttons, filter pills, countdown labels, terms modal labels) and currency formatting (`formatMoney` for VND/USD). Seeded campaign/voucher copy remains natural Vietnamese consistent with existing catalog data (`properties`, `destinations`, `testimonials`).

### Non-Goals
- No Admin/Host CMS tab for creating/editing campaigns or vouchers inside `/host` in this iteration.
- No non-stay verticals (flights, airlines, attraction tickets) and no mobile app download / QR app-deep-linking flow.
- No binary AI-generated banner files committed to `public/images/promotions/`; all photography comes from verified Unsplash URLs paired with crisp React/Tailwind typography & graphic overlays.
- No bilingual database columns for seeded campaign copy (UI chrome only is localized via `LocaleContext`).

### Anti-Goals (Failure Conditions)
- **Never** silently fall back to mock/seed data when `NEXT_PUBLIC_DATA_MODE=api` and `GET /api/v1/deals` fails; surface structured errors cleanly.
- **Never** allow client-only voucher validation bypass: server-side `POST /api/v1/reservations` must re-verify `applicablePropertyTypes`, `applicableCategories`, and `newUserOnly` (via prior confirmed/completed bookings for authenticated users).
- **Never** break existing `db:prepare` idempotency or overwrite existing user/host-modified `properties` rows on an already-seeded Neon/PostgreSQL database.
- **Never** break existing Playwright E2E assertions (`E2E-1` first `property-card-price`, `E2E-2` checkout flow, `E2E-3` Host Portal RBAC).

---

## 3. Architectural Constraints

1. **Strict Monorepo Layering** (`eslint.boundaries.mjs`):
   - `@luxestay/contracts` → `@luxestay/domain` → `apps/api` & `apps/web`.
   - `apps/web` features and route pages must consume deals exclusively through `apps/web/src/shared/ports/dealsPort.ts` (never importing `apps/api`, `hono`, or `@luxestay/domain/seed` directly in features/routes).
2. **Next.js Image & Deployment Rules**:
   - Keep `images.unoptimized: true` in `apps/web/next.config.ts`.
   - Keep `vercel.json` backend build config untouched.
3. **Same-Origin & Explicit API URL Support**:
   - `dealsPort.ts` must normalize `NEXT_PUBLIC_API_BASE_URL=/` to `""` and honor server-side `API_BASE_URL` via `getServerWebEnv()`, mirroring `catalogPort.ts`.
4. **Overlay Stack Coordination**:
   - `VoucherTermsModal` must register via `useOverlayLayer` in `OverlayContext` so `Escape` closing, z-index layering, and body scroll locking remain consistent.

---

## 4. Approaches Considered & Decision

### Approach 1 — Unified `CatalogSnapshot` Extension
- Embed `campaigns` inside `PromotionsBundleSchema` and return them through `GET /api/v1/catalog`.
- **Trade-offs**: Zero extra HTTP requests on SSR and minimal boilerplate, but couples promotional campaign lifecycles to the core property catalog snapshot.

### Approach 2 — Independent `deals` API Module & `dealsPort.ts` *(Selected by User)*
- Keep `CatalogSnapshot` unchanged in shape for campaigns; introduce dedicated `packages/contracts/src/deals.ts`, `packages/domain/src/deals.ts`, `apps/api/src/modules/deals/*` (`GET /api/v1/deals`, `GET /api/v1/deals/:slug`), and `apps/web/src/shared/ports/dealsPort.ts` (HTTP + Mock + SSR loaders).
- **Trade-offs**: Adds a clean domain/service seam and dedicated port so campaigns can scale, cache, or gain Admin CMS management independently in the future, at the cost of one additional lightweight parallel SSR fetch (`Promise.all` or route-local `loadDealsHub()` / `loadDealBySlug(slug)`).

### Approach 3 — Client-Only Rules / Static Seed Campaigns *(Rejected)*
- Violates LuxeStay's server-authoritative pricing/voucher invariant and breaks `api` mode parity with PostgreSQL.

**Decision**: Proceed with **Approach 2** — full-stack independent `deals` module, backed by PostgreSQL migration + seed/prepare idempotency, deep domain module in `@luxestay/domain`, and independent `dealsPort.ts`.

---

## 5. Detailed Design

### 5.1 Visual Layout & User Journey

#### Homepage (`/`) — Section Ordering
```
1. HeroSection (SearchBar + Trust Badges)
2. PromotionsHub (#deals-section)   <-- NEW (replaces legacy PromotionBanner)
   ├── Tier 1: Mã giảm giá cho người dùng mới [Carousel of ticket-notch cards + (i) + Copy + <>]
   ├── Tier 2: Ưu đãi đang diễn ra [Header + "Xem tất cả ưu đãi →" + Full-width Hero Banner]
   └── Tier 3: Campaign Carousel [3-up cards desktop / snap-scroll mobile + <> arrows]
3. CategoryBar
4. PropertyList
5. TrendingDestinations
6. TestimonialsSection
```

#### Visual Sketches

**Tier 1 — Ticket-Notched Voucher Card**:
```
+--------------------------------------------------+
| (Icon)  Giảm 150.000đ cho lần đặt đầu...    (i)  |
|         Áp dụng toàn sàn từ 800.000đ             |
| ( ) - - - - - - - - - - - - - - - - - - - - ( )  |
| [□] WELCOME150                       [ Sao chép ]|
+--------------------------------------------------+
```
- Surface: crisp white `bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-md`, subtle semicircular left/right notches positioned along the dashed horizontal separator (`bg-[#f8fafc]` matching page background so the ticket cutout reads cleanly).
- Clicking `(i)` opens `VoucherTermsModal` (via `OverlayContext`).
- Clicking `Sao chép` / `Copy` copies the code to clipboard and toggles a green checkmark confirmation for 2.5s.
- Carousel arrows (`<` / `>`) appear on desktop when scrollable, scrolling smoothly by card width.

**Tier 2 — Ongoing Deals Hero Banner (`placement: "hero"`)**:
```
+------------------------------------------------------------------------------+
| [BG: Atmospheric night glamping/lakeside Unsplash photo + deep gradient]     |
|                                                                              |
|  [⚡ SIÊU SALE BLACK FRIDAY • 17–27.11]     +-----------------------------+  |
|                                             |  ƯU ĐÃI SẮP KẾT THÚC       |  |
|  Nhận ưu đãi đặc biệt                       |   [ 05d : 14h : 32m : 45s ] |  |
|  lên đến 500K tặng Bạn Mới                  |  Mã: WELCOME150  [Sao chép] |  |
|                                             |  [     Xem ưu đãi  →      ] |  |
|  Điều khoản áp dụng                         +-----------------------------+  |
+------------------------------------------------------------------------------+
```
- Clicking the banner body or `Xem ưu đãi` navigates to `/deals/[slug]`.
- Clicking the quick-copy button inside the right glass card copies the code without triggering navigation (`stopPropagation`).
- Countdown calculates live remaining time until `campaign.endsAt` (client-hydrated safely to avoid SSR hydration mismatch, showing a stable placeholder until mounted).

**Tier 3 — 3-Up Campaign Banner Carousel (`placement: "carousel"`)**:
```
+------------------------+ +------------------------+ +------------------------+
| [Coral-Red Gradient]   | | [Ocean-Teal Gradient]  | | [Black & Gold Luxury]  |
| ★ ĐẢO NGỌC & BIỂN HÈ   | | ★ SĂN MÂY TÂY BẮC      | | ★ BỘ SƯU TẬP 5 SAO     |
| Deal biển siêu hot     | | Thả ga du lịch săn mây | | WORLD'S BEST STAYS     |
| Giảm đến 250K          | | Giảm đến 300K          | | MÃ 1 TRIỆU MỖI NGÀY    |
| Điều khoản áp dụng     | | Điều khoản áp dụng     | | Đối tác resort cao cấp |
+------------------------+ +------------------------+ +------------------------+  (>)
```
- 4 distinct carousel campaigns seeded so desktop displays 3 full cards and the circular `>` button slides smoothly to reveal the 4th card (with `<` appearing once scrolled).
- Each card links directly to `/deals/[slug]`.

#### `/deals` — Promotions Center
- Header banner with breadcrumb (`Trang chủ / Ưu đãi`) and concise overview.
- **Section A — Kho mã giảm giá**: Audience filter pills (`Tất cả`, `Bạn mới`, `Thành viên`) filtering active vouchers in a responsive 1/2/3-column grid of ticket-notch cards (same reusable `VoucherCard` component + `VoucherTermsModal`).
- **Section B — Chiến dịch nổi bật**: Full-width Hero Banner (`CampaignHeroBanner`).
- **Section C — Tất cả ưu đãi đang diễn ra**: Responsive grid of all active carousel campaigns (no hidden overflow).

#### `/deals/[slug]` — Campaign Detail Page
- Back link (`← Tất cả ưu đãi`) + full campaign Hero visual with period badge, title, subtitle, and live countdown timer.
- **Expired Campaign Handling *(Architect Call)***: If a known campaign (`isActive: true`) has passed `endsAt`, `GET /api/v1/deals/:slug` still returns `200` (so bookmarked links remain valid) and `DealDetailView` renders an explicit "Ưu đãi đã kết thúc" status banner, halts the countdown at `00:00:00`, disables promo auto-apply, and provides a CTA to `/deals`. Unknown slugs or `isActive: false` campaigns return `404 NOT_FOUND` (rendered via Next.js `notFound()`).
- Two-column campaign details section:
  - **Left**: Thể lệ & điều khoản áp dụng (`campaign.terms` bulleted list) + phạm vi áp dụng (hiển thị tóm tắt điểm đến / loại hình / danh mục chỗ nghỉ áp dụng).
  - **Right**: Danh sách mã giảm giá thuộc chiến dịch (`campaign.voucherCodes` resolved to full `PromotionVoucher` cards). Each card has `Sao chép` AND an active selection pill (*"Đang chọn áp sẵn khi đặt phòng"* / *"Chọn dùng mã này"*) — defaulting to the campaign's primary voucher.
- **Matching Stays Grid** (*Chỗ nghỉ đang áp dụng ưu đãi này*):
  - Renders matching `Property` items returned by `GET /api/v1/deals/:slug`.
  - Uses a clean deal-aware wrapper around `PropertyCard` (or `PropertyCard` optional `onSelectProperty` / `onBookProperty` props so existing homepage `PropertyCard` behavior is 100% untouched): when a user clicks a property or its `"Đặt phòng ngay"` CTA from `/deals/[slug]`, `DealDetailView` resolves the effective promo code via `resolveEligibleVoucherForProperty(selectedVoucher, campaignVouchers, property)` *(Architect Call: uses the user's selected voucher if eligible for that property, otherwise falls back cleanly to the first eligible voucher in that campaign so no matched stay hits an unexpected `PROPERTY_NOT_ELIGIBLE` dead-end)* and attaches it to `BookingSession` before opening `PropertyModal` / `BookingCheckoutModal`!
  - Inside `BookingCheckoutModal`, when mounted with a pre-attached `bookingSession.promoCode`, the voucher input auto-populates and automatically runs validation (local + server `validateVoucher`) to show immediate green discount confirmation or actionable guidance (e.g. "Cần đăng nhập để áp dụng mã thành viên" / minimum order hint).

---

### 5.2 Contracts (`@luxestay/contracts`)

#### 1. Extended `PromotionVoucherSchema` (`packages/contracts/src/catalog.ts`)
Keep all existing fields intact and add optional/defaulted fields so all existing callers and tests stay backward-compatible:
```ts
export const VoucherAudienceSchema = z.enum(["all", "new-user", "member"]);
export type VoucherAudience = z.infer<typeof VoucherAudienceSchema>;

export const PromotionVoucherSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  title: z.string().min(1).optional(),
  subtitle: z.string().min(1).optional(),
  description: z.string().min(1),
  badge: z.string().min(1).optional(),
  iconName: z.string().min(1).optional(),
  tone: z.enum(["emerald", "amber"]),
  audience: VoucherAudienceSchema.default("all"),
  discountType: z.enum(["fixed", "percent"]).default("fixed"),
  discountValue: z.number().nonnegative().default(0),
  minOrderTotal: z.number().nonnegative().default(0),
  maxDiscount: z.number().nonnegative().optional(),
  expiresAt: z.string().min(1).default("2026-11-30T23:59:59.000Z"),
  isActive: z.boolean().default(true),
  memberOnly: z.boolean().default(false),
  newUserOnly: z.boolean().default(false),
  applicablePropertyTypes: z.array(PropertyTypeSchema).optional(),
  applicableCategories: z.array(CategoryIdSchema).optional(),
  terms: z.array(z.string().min(1)).optional(),
});
```

#### 2. Extended `ValidateVoucherInputSchema` (`packages/contracts/src/catalog.ts`)
```ts
export const ValidateVoucherInputSchema = z.object({
  code: z.string().trim().min(1, "Vui lòng nhập mã giảm giá."),
  subtotal: z.number().nonnegative(),
  propertyId: z.string().trim().min(1).optional(),
});
```

#### 3. New `packages/contracts/src/deals.ts` (re-exported from `index.ts`)
```ts
export const PromotionCampaignPlacementSchema = z.enum(["hero", "carousel"]);
export type PromotionCampaignPlacement = z.infer<typeof PromotionCampaignPlacementSchema>;

export const PromotionCampaignThemeSchema = z.enum([
  "festive-night",
  "coral-summer",
  "ocean-teal",
  "luxury-gold",
  "forest-mist",
]);
export type PromotionCampaignTheme = z.infer<typeof PromotionCampaignThemeSchema>;

export const PromotionCampaignTargetFilterSchema = z.object({
  destinations: z.array(z.string().min(1)).optional(),
  categories: z.array(CategoryIdSchema).optional(),
  propertyTypes: z.array(PropertyTypeSchema).optional(),
  flashDealOnly: z.boolean().optional(),
});
export type PromotionCampaignTargetFilter = z.infer<typeof PromotionCampaignTargetFilterSchema>;

export const PromotionCampaignSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  placement: PromotionCampaignPlacementSchema,
  badge: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  highlightText: z.string().min(1),
  periodLabel: z.string().min(1),
  image: z.string().min(1),
  theme: PromotionCampaignThemeSchema,
  ctaLabel: z.string().min(1),
  terms: z.array(z.string().min(1)).readonly(),
  voucherCodes: z.array(z.string().min(1)).readonly(),
  targetFilter: PromotionCampaignTargetFilterSchema,
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  isActive: z.boolean().default(true),
});
export type PromotionCampaign = z.infer<typeof PromotionCampaignSchema>;

export const DealsHubSchema = z.object({
  expiryLabel: z.string().min(1),
  vouchers: z.array(PromotionVoucherSchema).readonly(),
  campaigns: z.array(PromotionCampaignSchema).readonly(),
});
export type DealsHub = z.infer<typeof DealsHubSchema>;

export const DealDetailSchema = z.object({
  campaign: PromotionCampaignSchema,
  vouchers: z.array(PromotionVoucherSchema).readonly(),
  properties: z.array(PropertySchema).readonly(),
});
export type DealDetail = z.infer<typeof DealDetailSchema>;
```

#### 4. New API Endpoints (`packages/contracts/src/endpoints.ts`)
- `deals: "/api/v1/deals"`
- `dealBySlug: (slug: string) => \`/api/v1/deals/${encodeURIComponent(slug.trim())}\``

---

### 5.3 Domain Logic (`@luxestay/domain`)

#### 1. Deep Module `packages/domain/src/deals.ts`
Encapsulates all pure promotional selection and campaign matching rules:
- `isCampaignActive(campaign, now = new Date()): boolean`: checks `campaign.isActive`, `startsAt <= now <= endsAt` (if valid ISO dates).
- `isCampaignExpired(campaign, now = new Date()): boolean`: checks `Number.isFinite(Date.parse(campaign.endsAt)) && now.getTime() > Date.parse(campaign.endsAt)`.
- `partitionCampaigns(campaigns, now?)`: returns `{ hero, carousel, allActive }`, selecting the first active `"hero"` campaign and all active `"carousel"` campaigns. *(Architect Call: if `hero === null`, Tier 2 is cleanly omitted instead of duplicating a carousel card into a hero slot; if both `hero` and `carousel` are empty, omit the Ongoing Deals block on `/` and render a clear empty state on `/deals`.)*
- `filterVouchersByAudience(vouchers, audience: "all" | "new-user" | "member", now?)`: filters active, non-expired vouchers; `"all"` returns all active vouchers, `"new-user"` returns `audience === "new-user" || newUserOnly`, `"member"` returns `audience === "member" || memberOnly`.
- `resolveCampaignVouchers(campaign, vouchers)`: maps `campaign.voucherCodes` (case-insensitive) to matching `PromotionVoucher` records in campaign order.
- `resolveEligibleVoucherForProperty(preferredVoucher, campaignVouchers, property)`: checks whether `preferredVoucher` satisfies `applicablePropertyTypes` and `applicableCategories` for `property`; if not, returns the first voucher in `campaignVouchers` that matches `property` (or `preferredVoucher` if none match).
- `matchPropertiesForCampaign(properties, campaign): Property[]`: evaluates `campaign.targetFilter`:
  - `flashDealOnly`: requires `property.isFlashDeal === true`.
  - `destinations`: requires case-insensitive/Vietnamese-normalized match on `property.location.city` or `property.location.province`.
  - `categories`: requires `categories.includes(property.category)`.
  - `propertyTypes`: requires `propertyTypes.includes(property.propertyType)`.
  - All specified filter dimensions are AND-ed; values inside an array dimension are OR-ed.
- `buildVoucherTermsList(voucher)`: returns explicit `voucher.terms` if present, otherwise derives readable Vietnamese conditions from `minOrderTotal`, `maxDiscount`, `applicablePropertyTypes`, `applicableCategories`, `newUserOnly`, `memberOnly`, and `expiresAt`.

#### 2. Upgraded `packages/domain/src/vouchers.ts`
Extend `VoucherErrorReason` with `"NEW_USER_ONLY" | "PROPERTY_NOT_ELIGIBLE"` and extend `options`:
```ts
options?: {
  now?: Date;
  isAuthenticated?: boolean;
  hasPriorSuccessfulBookings?: boolean;
  property?: Pick<Property, "propertyType" | "category">;
}
```
Validation order:
1. `EMPTY` → 2. `NOT_FOUND` → 3. `INACTIVE` → 4. `EXPIRED` → 5. `MEMBER_ONLY` (if `memberOnly && !isAuthenticated`) → 6. `NEW_USER_ONLY` (if `newUserOnly && isAuthenticated && hasPriorSuccessfulBookings`) → 7. `PROPERTY_NOT_ELIGIBLE` (if `property` provided and fails `applicablePropertyTypes` or `applicableCategories`) → 8. `MIN_ORDER` → 9. Compute fixed/percent discount capped by `maxDiscount` and `subtotal`.

*Important behavior for guests*: When `newUserOnly: true` and `memberOnly: false` and `isAuthenticated: false`, guest visitors are **allowed** to apply the first-booking welcome voucher cleanly (matching the agreed business rule). When authenticated, the server checks whether the user has any prior `confirmed` or `completed` reservations; if yes, `NEW_USER_ONLY` rejects with a clear message.

#### 3. Upgraded `packages/domain/src/bookingSession.ts`
- Pass `property` and `hasPriorSuccessfulBookings` through `calculateBookingPricing`, `deriveBookingQuote`, `submitBookingSession`, and `processServerReservationIntent`.
- Keep `openPropertySession` and `startCheckoutSession` backward-compatible, and add an optional `initialPromoCode?: string` parameter (or helper `attachPromoToSession`) so opening a property or checkout from `/deals/[slug]` preserves the campaign voucher cleanly across `previewing → checking-out`.

#### 4. Seed Data (`packages/domain/src/seed/promotions.ts`)
- **Expiry Date**: Update campaign & voucher validity comfortably into the future relative to current time (`2026-11-24`), e.g. `2026-12-31T23:59:59.000Z` with `PROMOTION_EXPIRY_LABEL = "31/12/2026"` (checking existing tests first — if any existing test asserts `30/11/2026` or `2026-11-30`, keep `LUXESTAY250`/`SUMMERVIBE` `expiresAt` valid past `2026-11-24` as `"2026-11-30T23:59:59.000Z"` or update appropriately after checking unit tests!).
  - *Builder note*: `2026-11-30T23:59:59.000Z` is still 6 days in the future from `2026-11-24` — great for realistic countdowns on Black Friday (`17–30.11.2026`) while keeping 100% compatibility with existing tests expecting `30/11/2026`! For longer-running seasonal campaigns (like coastal/mountain/resort deals), `endsAt` can be `2026-12-31T23:59:59.000Z`.
- **6 Vouchers** (preserving `LUXESTAY250` and `SUMMERVIBE` exact financial terms):
  1. `WELCOME150` — *Giảm 150.000đ cho lần đặt phòng đầu tiên* | `new-user` | `newUserOnly: true` | `memberOnly: false` | fixed `150_000` | min `800_000` | all stays
  2. `NEWSTAY250` — *Giảm 250.000đ đặt Khách sạn, Resort & Villa* | `new-user` | `newUserOnly: true` | `memberOnly: false` | fixed `250_000` | min `1_500_000` | `applicablePropertyTypes: ["hotel", "resort", "villa"]`
  3. `HOMESTAY10` — *Giảm 10% (tối đa 300.000đ) Homestay & Glamping* | `new-user` | `newUserOnly: true` | `memberOnly: false` | percent `10`, max `300_000` | min `700_000` | `applicablePropertyTypes: ["homestay", "glamping", "villa"]`
  4. `LUXESTAY250` *(existing)* — *Giảm 250.000đ cho đơn từ 1.5tr* | `all` | fixed `250_000` | min `1_500_000` | all stays
  5. `SUMMERVIBE` *(existing)* — *Giảm 10% tối đa 500.000đ mọi kỳ nghỉ* | `all` | percent `10`, max `500_000` | min `0` | all stays
  6. `VIPRESORT1M` — *Mã 1.000.000đ mỗi ngày cho Resort & Villa 5★* | `member` | `memberOnly: true` | fixed `1_000_000` | min `4_000_000` | `applicableCategories: ["luxury-resort", "infinity-pool", "beachfront"]`
- **5 Campaigns** (all verified to match 3–6 real seeded properties and use verified Unsplash URLs already proven reliable in LuxeStay):
  1. **Hero (`black-friday-2026`)** — theme `festive-night`, badge `"BLACK FRIDAY • 17–30.11"`, title `"Nhận ưu đãi đặc biệt lên đến 500K tặng Bạn Mới"`, vouchers `["WELCOME150", "SUMMERVIBE"]`, `targetFilter: { flashDealOnly: true }` (matches `stay-01`, `stay-06`, `stay-10`).
  2. **Carousel 1 (`bien-he-phu-quoc-nha-trang`)** — theme `coral-summer`, badge `"ĐẢO NGỌC & BIỂN XANH"`, title `"Deal biển siêu hot"`, highlight `"Giảm đến 250K"`, vouchers `["NEWSTAY250", "LUXESTAY250"]`, `targetFilter: { destinations: ["Phú Quốc", "Nha Trang", "Đà Nẵng"] }` (matches `stay-02`, `stay-07`, `stay-08`, `stay-10`).
  3. **Carousel 2 (`san-may-da-lat-sapa`)** — theme `ocean-teal`, badge `"SĂN MÂY & ĐỒI THÔNG"`, title `"Thả ga du lịch khám phá"`, highlight `"Giảm đến 300K"`, vouchers `["WELCOME150", "HOMESTAY10"]` *(Architect Call: `WELCOME150` is primary so it works on all 5 matched stays including Sa Pa hotel `stay-03`, while `HOMESTAY10` gives 10% up to 300K on Đà Lạt homestays & glamping; combined with `resolveEligibleVoucherForProperty` in `DealDetailView`)*, `targetFilter: { destinations: ["Đà Lạt", "Sa Pa"] }` (matches `stay-01`, `stay-03`, `stay-04`, `stay-11`, `stay-12`).
  4. **Carousel 3 (`worlds-best-resorts`)** — theme `luxury-gold`, badge `"ĐỐI TÁC ĐỘC QUYỀN 5★"`, title `"WORLD'S BEST STAYS"`, highlight `"MÃ 1 TRIỆU MỖI NGÀY"`, vouchers `["VIPRESORT1M", "SUMMERVIBE"]`, `targetFilter: { categories: ["luxury-resort", "infinity-pool", "beachfront"] }` (matches `stay-02`, `stay-05`, `stay-08`, `stay-10`).
  5. **Carousel 4 (`tron-pho-glamping-homestay`)** — theme `forest-mist`, badge `"CUỐI TUẦN CHILL"`, title `"Trốn phố nghỉ dưỡng xanh"`, highlight `"Giảm ngay 10%"`, vouchers `["HOMESTAY10", "LUXESTAY250"]`, `targetFilter: { propertyTypes: ["glamping", "homestay"] }` (matches `stay-01`, `stay-04`, `stay-06`, `stay-09`, `stay-11`, `stay-12`).

---

### 5.4 Backend Architecture (`apps/api`)

#### 1. Database Schema & Migration (`0004_promotions_campaigns.sql`)
- **`promotions` table additions**:
  - `title text`, `subtitle text`, `badge text`, `icon_name text`, `audience text not null default 'all'`, `new_user_only boolean not null default false`, `applicable_property_types jsonb`, `applicable_categories jsonb`, `terms jsonb`.
- **New `promotion_campaigns` table**:
  - `id text primary key`
  - `slug text not null unique`
  - `placement text not null` (`'hero' | 'carousel'`)
  - `badge text not null`
  - `title text not null`
  - `subtitle text not null`
  - `highlight_text text not null`
  - `period_label text not null`
  - `image text not null`
  - `theme text not null`
  - `cta_label text not null`
  - `terms jsonb not null default '[]'::jsonb`
  - `voucher_codes jsonb not null default '[]'::jsonb`
  - `target_filter jsonb not null default '{}'::jsonb`
  - `starts_at text not null`
  - `ends_at text not null`
  - `is_active boolean not null default true`
  - `sort_order integer not null default 0`
- Register `0004_promotions_campaigns` in `apps/api/src/db/migrations/meta/_journal.json`.

#### 2. Idempotent Seeding & `db:prepare` (`seed.ts` & `vercelPrepare.ts`)
- Extract a helper `seedPromotionsAndCampaigns(db)` called by `seedDatabase(db)` (inserts/upserts seed vouchers & `promotion_campaigns` cleanly).
- In `vercelPrepare.ts` (`prepareDatabaseIfConfigured`): when `propertiesTable` already has rows, still check whether `promotionCampaignsTable` is empty; if so, invoke `seedPromotionsAndCampaigns(client.db)` so existing Neon deployments automatically receive the new campaigns and enriched voucher metadata **without touching `propertiesTable` or user/host data**.

#### 3. Independent `deals` Module (`apps/api/src/modules/deals/`)
- `repository.ts`: `ApiDealsRepository` (`getCampaigns(): Promise<readonly PromotionCampaign[]>`, `getCampaignBySlug(slug: string): Promise<PromotionCampaign | null>`) + `createInMemoryDealsRepository`.
- `postgresRepository.ts`: `createPostgresDealsRepository(db)` reading `promotionCampaignsTable` ordered by `sortOrder`.
- `service.ts`: `DealsService` combining `dealsRepository` + `catalogRepository`:
  - `getDealsHub()`: returns `{ expiryLabel, vouchers, campaigns }`.
  - `getDealBySlug(slug)`: finds campaign by normalized slug, resolves `vouchers` via `resolveCampaignVouchers`, resolves `properties` via `matchPropertiesForCampaign`, returns `DealDetail | null`.
- `routes.ts`:
  - `GET /api/v1/deals` → `200 ApiSuccess<DealsHub>`
  - `GET /api/v1/deals/:slug` → `200 ApiSuccess<DealDetail>` for any `isActive: true` campaign (including expired ones so bookmarked links show an explicit ended-campaign state), or `404 ApiError("NOT_FOUND", ...)` for unknown slugs or `isActive: false` campaigns.
- Wire `dealsRepository` and `dealsService` inside `apps/api/src/app.ts` and `apps/api/src/runtime.ts`.

#### 4. Server-Authoritative Voucher Checks
- In `apps/api/src/modules/catalog/routes.ts` (`POST /api/v1/vouchers/validate`):
  - Accept optional `propertyId` from `ValidateVoucherInputSchema`.
  - Resolve `property` from `catalogService.getPropertyById(propertyId)` when `propertyId` is provided.
  - When `authUser` is present, check `hasPriorSuccessfulBookings` using `reservationRepository.findByUserId(authUser.id)` (true if any booking has status `"confirmed"` or `"completed"`).
  - Pass `{ isAuthenticated, hasPriorSuccessfulBookings, property }` into `evaluatePromotionVoucher`.
- In `apps/api/src/modules/reservations/service.ts` (`createReservation`):
  - Before/when running `processServerReservationIntent`, compute `hasPriorSuccessfulBookings` for `authUser` (via `reservationRepository.findByUserId`) and pass it so checkout submission cannot bypass `newUserOnly` or property-type/category voucher restrictions.

---

### 5.5 Frontend Architecture (`apps/web`)

#### 1. Independent `dealsPort.ts` (`apps/web/src/shared/ports/dealsPort.ts`)
- Implements `DealsRepository` interface (`getDealsHub`, `getDealBySlug`):
  - `createHttpDealsRepository({ baseUrl, fetchImpl })`: calls `API_ENDPOINTS.deals` and `API_ENDPOINTS.dealBySlug(slug)`, parses via `createApiSuccessSchema(DealsHubSchema)` / `createApiSuccessSchema(DealDetailSchema)`, throws `HttpApiError` on network/API failure (never falls back to mock in `api` mode).
  - `createMockDealsRepository(...)`: reads `SEED_CATALOG_SNAPSHOT` + `SEED_PROMOTION_CAMPAIGNS` and applies `@luxestay/domain` helpers (`resolveCampaignVouchers`, `matchPropertiesForCampaign`).
  - `loadDealsHub()` & `loadDealBySlug(slug)`: Server Component loaders using `getServerWebEnv()`.

#### 2. `features/promotions/` Components
- `VoucherCard.tsx`: Reusable ticket-notched card with icon badge, truncated title/subtitle, `(i)` button, dashed divider with side notches, code display, copy feedback button, optional selection state for `/deals/[slug]`.
- `VoucherTermsModal.tsx`: Modal registered in `OverlayContext` (`kind: "dialog"`) displaying full voucher details (localized labels + `formatMoney` amounts + eligibility badges + full terms list + Copy button).
- `VoucherCarousel.tsx`: Horizontal carousel wrapper with smooth scroll controls (`<` / `>`) and responsive snapping for Tier 1.
- `CampaignHeroBanner.tsx`: Full-width hero banner with Unsplash background, deep gradient overlay, campaign badge, bold display typography, terms link, and glassmorphic right CTA panel (live countdown to `endsAt`, quick-copy featured voucher code, `Xem ưu đãi` button).
- `CampaignCard.tsx` & `CampaignCarousel.tsx`: 5 curated visual themes (`festive-night`, `coral-summer`, `ocean-teal`, `luxury-gold`, `forest-mist`), 3-up desktop carousel with floating circular `<` / `>` controls, each card linking to `/deals/[slug]`.
- `PromotionsHub.tsx`: Composes Tier 1 + Tier 2 + Tier 3 inside `<section id="deals-section">`, rendered right below `HeroSection` in `apps/web/src/app/(main)/page.tsx`.
- `DealsCenterView.tsx`: Full `/deals` client view with audience filter tabs (`all` | `new-user` | `member`), voucher grid, hero banner, and all ongoing campaigns grid.
- `DealDetailView.tsx`: Full `/deals/[slug]` client view with campaign banner, countdown, terms list, selectable campaign vouchers, and matched `PropertyCard` grid wired to pre-attach the chosen promo code when booking.

#### 3. Booking & Checkout Promo Pre-Fill Integration
- Add `openPropertyWithPromo(property, promoCode)` and `startCheckoutWithPromo(property, promoCode)` (or optional `promoCode` arg) to `BookingSessionContextValue` in `BookingContext.tsx`.
- Update `PropertyCard.tsx` with optional `onSelectProperty?: (property: Property) => void` and `onBookProperty?: (property: Property) => void` callbacks (defaulting to existing `setSelectedProperty` / `setCheckoutProperty` so `PropertyList` requires zero changes).
- Update `BookingCheckoutModal.tsx`:
  - Send `propertyId: property.id` in `paymentGateway.validateVoucher({ code, subtotal, propertyId: property.id })` and pass `property` to local `evaluatePromotionVoucher`.
  - When `BookingCheckoutModal` opens with a pre-attached `bookingSession.promoCode`, populate `voucherInput` and automatically validate once on open (or when subtotal changes) so the user immediately sees the applied discount or clear eligibility message.
- Update `apps/web/src/shared/ports/paymentPort.ts`: mock `validateVoucher` passes `property` (looked up from `properties`) into `evaluatePromotionVoucher` so `mock` mode enforces the exact same property-level rules as `api` mode.

#### 4. Navigation & Routes
- `apps/web/src/app/(main)/page.tsx`: `async` Server Component calling `loadDealsHub()` and rendering `<PromotionsHub initialDeals={dealsHub} error={dealsError} />` immediately after `<HeroSection />`; remove legacy `<PromotionBanner />` usage.
  - **Homepage Error Isolation *(Architect Call)***: In `api` mode, if `loadDealsHub()` fails on `/` while `loadInitialCatalog()` succeeded, `page.tsx` catches the `HttpApiError` and passes a structured error object (`{ code, message, requestId }`) to `PromotionsHub`, which renders an explicit inline error card inside `#deals-section` with a Retry button (`router.refresh()`) — **never** falling back to mock/seed data and **never** taking down `HeroSection`, `SearchBar`, or `PropertyList`.
- `apps/web/src/app/(main)/deals/page.tsx`: `async` Server Component calling `loadDealsHub()` (unhandled `HttpApiError` bubbles to `app/error.tsx`, consistent with `/stays/[id]`) and rendering `<DealsCenterView initialDeals={dealsHub} />`.
- `apps/web/src/app/(main)/deals/[slug]/page.tsx`: `async` Server Component calling `loadDealBySlug(slug)`, calling `notFound()` if `null`, letting transport/API errors bubble to `app/error.tsx`, otherwise rendering `<DealDetailView detail={detail} />`.
- `apps/web/src/shared/layout/Navbar.tsx`: Update desktop & mobile "Ưu đãi Hot" / "Hot Deals" control to `<Link href="/deals">` with active state styling matching `/bookings` and `/host`.

#### 5. i18n Keys (`packages/domain/src/locale.ts`)
Add `deals.*` translation keys for both `vi` and `en`:
- `deals.newUserTitle`, `deals.newUserSubtitle`, `deals.ongoingTitle`, `deals.viewAll`, `deals.copy`, `deals.copied`, `deals.viewDeal`, `deals.termsApply`, `deals.endsIn`, `deals.days`, `deals.hours`, `deals.minutes`, `deals.seconds`, `deals.modalTitle`, `deals.minOrder`, `deals.expiry`, `deals.scope`, `deals.conditions`, `deals.filterAll`, `deals.filterNewUser`, `deals.filterMember`, `deals.backToDeals`, `deals.matchingStays`, `deals.matchingStaysSubtitle`, `deals.autoApplySelected`, `deals.selectToApply`, `deals.noMatchingStays`, `deals.featuredCode`.

---

## 6. Verification & Testing Plan

1. **Contract & Domain Unit Tests**:
   - `packages/contracts/tests/contracts.test.ts`: validate `DealsHubSchema`, `DealDetailSchema`, extended `PromotionVoucherSchema`, `ValidateVoucherInputSchema` with `propertyId`.
   - `packages/domain/tests/`: test `matchPropertiesForCampaign`, `partitionCampaigns`, `filterVouchersByAudience`, `resolveCampaignVouchers`, upgraded `evaluatePromotionVoucher` (`NEW_USER_ONLY` for logged-in repeat user vs guest/first-time user, `PROPERTY_NOT_ELIGIBLE` for type/category mismatch, preserved `LUXESTAY250`/`SUMMERVIBE` compatibility).
2. **API Integration Tests (`apps/api/tests/api.test.ts`)**:
   - `GET /api/v1/deals` returns hero + carousel campaigns and all active vouchers.
   - `GET /api/v1/deals/:slug` returns matching properties & resolved vouchers; unknown slug returns `404 NOT_FOUND`.
   - `POST /api/v1/vouchers/validate` with `propertyId` enforces property-type/category restrictions and rejects `newUserOnly` for authenticated users with prior confirmed bookings while allowing guests / first-time users.
   - `POST /api/v1/reservations` rejects tampered promo codes violating `newUserOnly` or `applicablePropertyTypes`/`applicableCategories`.
3. **Web Unit & Build Checks**:
   - `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test`.
4. **Playwright E2E Verification (`e2e/luxestay.spec.ts`)**:
   - Ensure `E2E-1`, `E2E-2`, `E2E-3` continue passing unmodified.
   - Add `E2E-4`: Homepage renders Promotions Hub directly below Hero → copy voucher + open `(i)` terms modal → click campaign banner to navigate to `/deals/[slug]` → verify matching stays & pre-attached voucher inside checkout modal → verify Navbar link opens `/deals` with working audience filter tabs.

---

## 7. Left to the Builder

- Exact Tailwind spacing, responsive breakpoints, subtle hover micro-animations (Framer Motion), and Lucide icon mapping for voucher categories.
- Selecting specific verified Unsplash photo URLs from the existing catalog/Unsplash pool (and verifying HTTP 200 reachability during implementation).
- Deciding whether to delete or deprecate `apps/web/src/features/catalog/PromotionBanner.tsx` once replaced (prefer deleting dead code cleanly so nothing goes stale).
