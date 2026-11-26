# LuxeStay `ARCHITECTURE.md` & `PRD.md` Comprehensive Sync Implementation Plan

> **For agentic execution:** Execute this plan only after user confirmation of execution mode (`Native` recommended vs `Subagent-driven`). Keep edits strictly scoped to documentation (`docs/ARCHITECTURE.md` and `docs/PRD.md`) — make zero application code changes, preserve `docs/adr/*` as immutable history, keep `docs/PLAN.md` (`v3.0`) unchanged, and preserve pending `.agents/` + `apps/web/AGENTS.md` workspace improvements.

**Approved Design Spec:** [2026-11-25-architecture-prd-sync-design.md](../specs/2026-11-25-architecture-prd-sync-design.md)  
**Authoritative Roadmap:** [PLAN.md](../../PLAN.md) (`v3.0`)

---

## Goal

Đồng bộ toàn diện hai tài liệu gốc của dự án — [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) (nâng lên `v3.0`) và [`docs/PRD.md`](../../PRD.md) (nâng lên `v2.0`) — khớp 100% với codebase thực tế tính đến **Phase 4C** (`feat/catalog-expansion-30-stays`, `PLAN.md v3.0`), đồng thời chuẩn bị đường băng sạch cho **Phase 5 (`Activities, Tours & Transfers`)** mà không gộp tính năng tương lai vào phần hiện trạng.

## Global Constraints

1. **Zero App Code Edits:** Không chỉnh sửa bất kỳ file nào trong `apps/`, `packages/`, `scripts/`, `e2e/`, `docs/adr/`, hay `docs/PLAN.md`. Bảo toàn nguyên trạng các cập nhật rule/skill ở `.agents/` và `apps/web/AGENTS.md`.
2. **Strict Reality vs Roadmap Separation:**
   - Các mục mô tả hệ thống hiện tại (`ARCHITECTURE.md` Mục 1–5, 6.1, 7; `PRD.md` Mục 1–4, 6) chỉ mô tả những gì đã triển khai và chạy thực tế qua **Phase 0 – Phase 4C**.
   - **Phase 5 (`Activities, Tours & Transfers`)** chỉ nằm ở `ARCHITECTURE.md` Mục 6.2 (*Extension Playbook*) và `PRD.md` Mục 5 (*Epic 9 — 📋 Planned*), khớp 1–1 với `docs/PLAN.md` `v3.0`.
3. **Truthfulness & Exact Counts (Verified from Repo):**
   - **Contracts (`packages/contracts/src/`):** 10 files (`auth.ts`, `availability.ts`, `booking.ts`, `catalog.ts`, `common.ts`, `deals.ts`, `endpoints.ts`, `host.ts`, `index.ts`, `payment.ts`); 10 `ErrorCode` (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `UNPROCESSABLE_ENTITY`, `INVALID_JSON`, `INTERNAL_ERROR`, `NETWORK_ERROR`, `CONTRACT_MISMATCH`); toàn bộ route trong `API_ENDPOINTS`.
   - **Domain (`packages/domain/src/`):** 10 pure domain modules (`amenities.ts`, `availability.ts`, `bookingSession.ts`, `catalogQuery.ts`, `deals.ts`, `host.ts`, `locale.ts`, `reviews.ts`, `utils.ts`, `vouchers.ts`) + modular `seed/` (`amenities.ts`, `categories.ts`, `destinations.ts`, `index.ts`, `promotions.ts`, `properties.ts`, `properties/{villas,resorts,homestays,hotels,glamping,types}.ts`, `retiredImages.ts`, `testimonials.ts`). Không tồn tại `pricing.ts` — logic tính giá nằm trong `availability.ts` + `bookingSession.ts` + `vouchers.ts`.
   - **Catalog Seed Scale:** `42` stays (`stay-01`..`stay-42`), `14` thành phố có chỗ nghỉ, `8` Trending Destinations (`DESTINATIONS`), `9` Categories (`CATEGORIES`), `6` Vouchers (`promotions`), `5` Campaigns (`promotion_campaigns`), `51` Amenities (`AMENITY_CATALOG`), `3` Testimonials, `141` media slots duy nhất (`138` remote HTTP 200 Pexels/Unsplash + `3` local AI `/images/stays/stay-{01,15,18}-hero.jpg`).
   - **API (`apps/api/src/modules/`):** 11 modules (`auth`, `availability`, `catalog`, `deals`, `favorites`, `health`, `host`, `notifications`, `payments`, `reservations`, `reviews`).
   - **Postgres Schema (`apps/api/src/db/schema/` & `migrations/`):** `21` bảng (`auth.ts`: `users`, `user_sessions`, `otp_challenges`, `user_favorites`; `catalog.ts`: `categories`, `destinations`, `promotions`, `promotion_campaigns`, `testimonials`, `amenity_categories`, `amenity_filter_options`, `amenity_catalog`, `properties`, `property_amenities`, `property_availability`, `reviews`; `payments.ts`: `payment_transactions`, `payment_webhook_events`, `notification_logs`; `reservations.ts`: `reservations`, `reservation_amenities`), `5` SQL migrations (`0000_initial.sql` – `0004_promotions_campaigns.sql`), startup/deploy prep `vercelPrepare.ts` (`backfillPromotionsIfNeeded`, `backfillMissingSeedProperties`, `repairRetiredSeedImages`).
   - **Web (`apps/web/src/`):** 9 App Router routes (`/`, `/bookings`, `/bookings/[bookingId]`, `/deals`, `/deals/[slug]`, `/host`, `/payments/[transactionId]`, `/stays/[id]`, `/_not-found` + `not-found.tsx`, `error.tsx`, `global-error.tsx`), `9` feature folders (`auth`, `booking`, `catalog`, `favorites`, `host`, `locale`, `payment`, `promotions`, `property`), `9` files trong `shared/ports/` (`authPort.ts`, `catalogPort.ts`, `dealsPort.ts`, `errors.ts`, `experiencePort.ts`, `hostPort.ts`, `paymentPort.ts`, `persistencePort.ts`, `types.ts`).
   - **Exact Pricing Formula (`bookingSession.ts` & `availability.ts`):**
     - `baseNightsTotal = pricePerNight * nights * rooms`
     - `nightsTotal = sum(nightlyBreakdown.effectivePrice) * rooms`
     - `seasonalSurcharge = nightsTotal - baseNightsTotal`
     - `subtotal = nightsTotal + CLEANING_FEE (150.000đ) + amenitiesFee`
     - `serviceFee = 0`
     - `discount = evaluatePromotionVoucher(...)` (0 nếu không hợp lệ)
     - `total = Math.max(0, subtotal - discount)`
   - **Verified Tests:** `117` unit/integration tests (`packages/contracts`: 8; `packages/domain`: 56 qua 8 test files; `apps/api`: 21; `apps/web`: 32 qua 3 test files) + `6` Playwright E2E flows (`e2e/luxestay.spec.ts`: `E2E-1`..`E2E-6`) + `scripts/verify-seed-images.mjs`.
4. **Diagram & Link Standards:** Mermaid chỉ dùng `flowchart TD` / `flowchart LR` / `sequenceDiagram`, quote mọi node label có ngoặc hoặc ký tự đặc biệt (`id["Label (Detail)"]`), không dùng HTML tags trong label. Toàn bộ markdown link trỏ tới file trong repo phải dùng đường dẫn chính xác đã xác minh.

---

## Review Focus

Khi review thành phẩm sau thực thi, kiểm tra trọng tâm 5 điểm sau:
1. **Zero stale numbers or phantom files:** Không còn `v0.1`–`v0.6`, `12` stays, `20` tables, `90` tests, `3 E2E`, hay `pricing.ts` ở phần hiện trạng; toàn bộ số liệu khớp 100% phần Global Constraints và `docs/PLAN.md v3.0`.
2. **Formula fidelity:** Công thức giá trong `PRD.md` (`FR-05`) phản ánh chính xác `nights`, `rooms`, `seasonalSurcharge`, `CLEANING_FEE = 150.000đ`, `serviceFee = 0`, `amenitiesFee`, `evaluatePromotionVoucher`, và `Math.max(0, subtotal - discount)`.
3. **Mermaid compatibility:** Mọi biểu đồ Mermaid trong `ARCHITECTURE.md` render sạch trên GitHub/VS Code (node label chứa `( ) /` được bọc ngoặc kép `["..."]`, không HTML tags).
4. **Phase 4A/4B/4C & Mobile Guardrail completeness:** Phản ánh đủ Promotions Hub 3 tầng + `/deals` + `/deals/[slug]`, Load More 12/lần, 4-axis/0%-duplicate media pipeline + `repairRetiredSeedImages`, và mobile overflow stabilization (`360×800` / `390×844`, `overflow-x: clip`, `min-w-0`, `E2E-6`).
5. **Valid repository links:** Tất cả relative Markdown links đều trỏ đúng path tồn tại trên disk.

---

## Task 1: Rewrite & Synchronize `docs/ARCHITECTURE.md` (`v2.4` -> `v3.0`)

**Files:**
- Modify: `d:\Tutorial-Vibe Coding\travel-service\docs\ARCHITECTURE.md`

- [ ] **Step 1: Viết lại toàn bộ cấu trúc 7 mục của `docs/ARCHITECTURE.md` từ `v2.4` lên `v3.0`**

Bố cục mục tiêu:
1. **Header & `## 1. Kiến trúc tổng thể & Triết lý (Version 3.0)`**
   - Metadata: `Version: 3.0`, `Last Updated: 2026-11-25`, Scope `Phase 0 – Phase 4C (Completed)` + `Phase 5 (Planned)`.
   - Giữ vững 4 nguyên lý cốt lõi: strict dependency layering (`@luxestay/contracts` -> `@luxestay/domain` -> `apps/api` & `apps/web` enforced bởi `eslint.boundaries.mjs`), Port-and-Adapter (`apps/web/src/shared/ports/*`), fail-fast `NEXT_PUBLIC_DATA_MODE=api` (không silently fall back về mock), server-authoritative pricing & atomic reservation locks (`SELECT ... FOR UPDATE`).
2. **`## 2. Sơ đồ hệ thống (System Topology)`**
   - Biểu đồ Mermaid `flowchart TD` mới phản ánh đúng: `Client (Desktop & Mobile 360px+)` -> `Vercel Edge / Services Rewrites` -> `apps/web (Next.js 16 SSR/CSR, 9 routes, 9 features, 9 shared/ports)` -> `apps/api (Hono, 11 modules)` -> `@luxestay/domain (10 pure modules + modular seed/)` & `@luxestay/contracts (10 contract files)` -> `Neon PostgreSQL (21 tables, 5 migrations, attachDatabasePool)` + `Sandbox Payment Provider & Webhook` + `Static/Verified Media Assets (141 unique slots)`.
   - Tuân thủ nghiêm ngặt quy tắc quote node label `id["..."]`.
3. **`## 3. Monorepo & Folder Structure`**
   - Cây thư mục thực tế cho `packages/contracts/src/`, `packages/domain/src/` (liệt kê `properties/*`, `retiredImages.ts`, 10 domain modules), `apps/api/src/` (`modules/` 11 modules, `db/schema/` 4 files, `db/migrations/0000`..`0004`, `db/vercelPrepare.ts`), `apps/web/src/` (`app/(main)/` 9 routes, `features/` 9 features, `shared/`), `e2e/luxestay.spec.ts`, `scripts/verify-seed-images.mjs`, `docs/` (`adr/0001`–`0012`, `PLAN.md v3.0`, `ARCHITECTURE.md`, `PRD.md`, `DEPLOYMENT.md`), `.agents/` & `vercel.json`.
4. **`## 4. Chi tiết từng Layer & Data Flows`**
   - **4.1 `@luxestay/contracts`:** 10 files, `API_ENDPOINTS`, 10 `ErrorCode`s, envelope `ApiSuccess<T>` / `ApiError`.
   - **4.2 `@luxestay/domain`:** 10 pure modules + modular `seed/` (42 stays, 14 cities, 8 trending destinations, 9 categories, 6 vouchers, 5 campaigns, 51 amenities, 3 testimonials); luồng `evaluatePropertyAvailability` + `deriveBookingQuote` + `evaluatePromotionVoucher`; 4-axis media alignment & `retiredImages.ts`.
   - **4.3 `apps/api` & Neon PostgreSQL:** Bảng tổng hợp 11 API modules + toàn bộ endpoints; bảng liệt kê chính xác 21 bảng PostgreSQL theo 4 schema files (`auth.ts`: 4, `catalog.ts`: 12, `payments.ts`: 3, `reservations.ts`: 2); 5 SQL migrations (`0000`–`0004`); luồng atomic reservation transaction (`SELECT ... FOR UPDATE`), HMAC payment webhook idempotency (`payment_webhook_events`), và `vercelPrepare.ts` (`backfillPromotionsIfNeeded`, `backfillMissingSeedProperties`, `repairRetiredSeedImages` conditional updates).
   - **4.4 `apps/web`:** 9 App Router routes (phân biệt Server/Client boundaries), 9 `shared/ports/*` + `shared/config/env.ts` (`NEXT_PUBLIC_API_BASE_URL=/` -> `""` + `API_BASE_URL` server binding), `OverlayContext` (`overlayStack.ts`), `PropertyList` progressive Load More (`12`/step), `PromotionsHub` 3 tầng + `/deals` + `/deals/[slug]` promo pre-fill, và mobile viewport guardrails (`overflow-x: clip`, `min-w-0`, popover width cap).
5. **`## 5. Deployment Architecture (Vercel Services + Neon)`**
   - Tổng hợp `vercel.json` (`services.frontend`, `services.backend` chạy `apps/api/dist` cleanup + `db:prepare`, service-targeted rewrites `/api/:path*` và `/health`), `@vercel/functions` `attachDatabasePool`, lý do `images.unoptimized: true` trong `apps/web/next.config.ts`, và `.github/workflows/ci.yml`.
6. **`## 6. Verification, Quality Gates & Extension Playbook`**
   - **6.1 Verification & Test Matrix:** Bảng chính xác `117` unit/integration tests (`8` contracts + `56` domain qua 8 files + `21` API + `32` web qua 3 files), `6` Playwright E2E flows (`E2E-1`..`E2E-6` kèm cổng cô lập `4100/3100`), `scripts/verify-seed-images.mjs` (`141` unique media slots, 0% trùng lặp, kiểm tra dung lượng local hero assets `5–350 KB`), cùng `npm run build`, `npm run typecheck`, `npm run lint`.
   - **6.2 Extension Playbook — Phase 5 Runway (`Activities, Tours & Transfers`):** Quy trình 7 bước chuẩn dọc monorepo từ `@luxestay/contracts` -> `@luxestay/domain` -> DB migration `0005+` -> `apps/api/src/modules/*` -> `apps/web/src/shared/ports/*` -> `features/` & App Router -> Seed image audit & `E2E-7`.
7. **`## 7. Known Architectural Boundaries & Guardrails`**
   - Tổng hợp các giới hạn và guardrails vận hành thực tế (Vercel Services Beta image optimization workaround, `apps/api/dist` CJS vs `.mjs` bundling, sandbox payment webhook behavior trên non-production, in-memory test lock vs Postgres row lock, tham chiếu `docs/adr/0001`–`0012`).

- [ ] **Step 2: Ghi đè `docs/ARCHITECTURE.md` sạch sẽ (`write_file` với `Overwrite: true`), sau đó đọc lướt/kiểm tra không còn ký tự lỗi hay broken syntax.**

---

## Task 2: Rewrite & Synchronize `docs/PRD.md` (`v1.5` -> `v2.0`)

**Files:**
- Modify: `d:\Tutorial-Vibe Coding\travel-service\docs\PRD.md`

- [ ] **Step 1: Viết lại toàn bộ cấu trúc 6 mục của `docs/PRD.md` từ `v1.5` lên `v2.0`**

Bố cục mục tiêu:
1. **Header & `## 1. Tầm nhìn & Phạm vi Sản phẩm (Version 2.0)`**
   - Metadata: `Version: 2.0`, `Last Updated: 2026-11-25`, Status `Phase 0 – Phase 4C Implemented; Phase 5 Planned`.
   - Mục tiêu cốt lõi, Value Props (42 stays / 14 cities curated 0%-duplication, Promotions Hub 3 tầng, transparent VND quote & seasonal calendar, sandbox payment gateway, Host Portal RBAC, mobile stability).
   - **Scope Matrix (In-Scope Implemented Phase 0–4C vs Out-of-Scope / Planned Phase 5)** đồng bộ 1–1 với `docs/PLAN.md v3.0`.
2. **`## 2. Personas & Hành trình Người dùng`**
   - 4 nhóm personas thực tế: (1) Khách du lịch / Guest Finder, (2) Thành viên đăng nhập / Loyalty Member (Favorites, Booking History, OTP/Auth, Voucher `NEW_USER_ONLY`), (3) Chủ nhà / Partner Host (RBAC `/host` portal, inventory/pricing overrides, analytics), (4) Admin / QA & Release Operations (`db:prepare`, media guardrails).
3. **`## 3. Functional Requirements (`FR-01` – `FR-16`)`**
   - `FR-01` **Catalog Discovery & Progressive Listing:** `42` stays (`stay-01`..`stay-42`), `14` cities, `8` Trending Destinations, `9` Categories, Load More `12` mục/lần (`PropertyList.tsx`), quy tắc địa chỉ đường phố tách biệt tên thành phố khác để tránh false-positive search.
   - `FR-02` **Multi-Faceted Search & Filter (`SearchBar`, `FilterModal`, `CatalogUrlSync`):** Điểm đến/từ khóa, ngày check-in/check-out, người lớn/trẻ em/phòng, khoảng giá, category, tiện ích lọc đa điều kiện, sắp xếp, đồng bộ query URL.
   - `FR-03` **Property Detail, Deep-Link `/stays/[id]` & 51 Amenities:** `PropertyModal` + trang riêng `/stays/[id]`, phân loại tiện ích chuẩn vs trả phí (`AMENITY_CATALOG`), chi tiết add-on `AmenityDetailPanel`.
   - `FR-04` **Availability Calendar & Seasonal Pricing:** `AvailabilityCalendar`, ngày bị khóa/hết phòng theo số lượng `rooms`, bảng giá theo đêm `nightlyBreakdown` (cuối tuần/mùa cao điểm/override).
   - `FR-05` **Server-Authoritative Quote & Pricing Engine:** Ghi chính xác công thức từ `availability.ts` & `bookingSession.ts`:
     - `baseNightsTotal = pricePerNight * nights * rooms`
     - `nightsTotal = sum(nightlyBreakdown.effectivePrice) * rooms`
     - `seasonalSurcharge = nightsTotal - baseNightsTotal`
     - `subtotal = nightsTotal + cleaningFee (150.000đ) + amenitiesFee`
     - `serviceFee = 0`
     - `discount = evaluatePromotionVoucher(...)` (`0` nếu không hợp lệ)
     - `total = Math.max(0, subtotal - discount)`
   - `FR-06` **Booking Checkout, Atomic Lock & Lookup (`/bookings`, `/bookings/[bookingId]`):** Tạo đơn giữ phòng có `SELECT ... FOR UPDATE`, hỗ trợ `?promo=` pre-fill từ `/deals/[slug]`, luồng `pending_payment` -> cổng thanh toán hoặc `confirmed`, tra cứu & hủy đơn kèm lý do hoàn/hủy.
   - `FR-07` **Promotions Hub, `/deals`, `/deals/[slug]` & Voucher Engine:**
     - Trang chủ 3 tầng trong `PromotionsHub`: Tầng 1 `CampaignHeroBanner` (banner nổi bật + countdown + sticky promo pill), Tầng 2 `VoucherCarousel` (`6` vouchers, điều kiện `VoucherTermsModal`, copy code), Tầng 3 `CampaignCarousel` (`5` campaigns).
     - `/deals`: Trung tâm ưu đãi với filter theo trạng thái/nhóm chiến dịch.
     - `/deals/[slug]`: Trang chi tiết chiến dịch kèm nút CTA điều hướng thẳng sang danh mục/chỗ nghỉ áp dụng với `?promo=` & `?category=` pre-fill.
     - Server validation qua `/api/v1/vouchers/validate` & 8 `VoucherErrorReason` (kèm kiểm tra `NEW_USER_ONLY` & `PROPERTY_NOT_ELIGIBLE`).
   - `FR-08` **Sandbox Payment Gateway & Idempotent Webhooks (`/payments/[transactionId]`):** Phương thức sandbox (MoMo, VNPay, Card), xác thực chữ ký HMAC, bảng `payment_webhook_events` chống xử lý lặp, ghi nhận `notification_logs`.
   - `FR-09` **Authentication, Sessions & OTP (`/api/v1/auth/*`):** Đăng ký, đăng nhập mật khẩu, OTP challenge/verify, session cookie, phân quyền `guest` / `member` / `host`, hỗ trợ tài khoản demo kiểm thử.
   - `FR-10` **Favorites Persistence:** Lưu & đồng bộ danh sách yêu thích (`user_favorites`, `FavoritesDrawer`).
   - `FR-11` **Verified Reviews & Ratings:** Hiển thị điểm tổng hợp & nhận xét theo chỗ nghỉ, gửi đánh giá (`/api/v1/properties/:id/reviews`).
   - `FR-12` **Host Portal & RBAC (`/host`):** Chỉ cấp phép role `host`; quản lý danh sách/chỉnh sửa chỗ nghỉ, ghi đè giá & tồn kho theo ngày (`property_availability`), xem danh sách đặt phòng & thống kê doanh thu.
   - `FR-13` **Localization & VND Currency (`LocaleContext`, `locale.ts`):** Hỗ trợ đa ngôn ngữ `vi`/`en`, định dạng tiền tệ VNĐ đồng nhất trên SSR/CSR.
   - `FR-14` **Overlay Stack & Keyboard Ergonomics (`OverlayContext`, `overlayStack.ts`):** Ngăn xếp modal/drawer đóng theo thứ tự LIFO với `Escape` / backdrop click.
   - `FR-15` **Seed Media Integrity & Authentic Visual Standards:** 141 ảnh duy nhất (0% trùng lặp toàn cục), căn chỉnh 4 trục (loại hình, vùng miền/cảnh quan, phân khúc giá, đúng `resortAmenities` thực tế), kiểm soát retired images (`retiredImages.ts` + `repairRetiredSeedImages`), kiểm chứng qua `scripts/verify-seed-images.mjs`.
   - `FR-16` **Mobile Responsive Stability (`360×800` & `390×844`):** Không tràn ngang (`scrollWidth <= innerWidth`), `overflow-x: clip` trên root, `w-full min-w-0` cho mọi section/carousel/grid trên trang chủ, popover `SearchBar` giới hạn theo viewport, bảo vệ bằng Playwright `E2E-6`.
4. **`## 4. Non-Functional Requirements (`NFR-01` – `NFR-06`)`**
   - Consistency & fail-fast API mode, Performance (Load More 12/lần, E2E target), Security (Zod boundary, RBAC, HMAC webhook, no secret commits), Accessibility & Mobile viewport stability, Idempotent DB lifecycle (`0000`–`0004` + `db:prepare`), Quality Gates (`117` tests + `6` E2E + `verify-seed-images`).
5. **`## 5. Roadmap Sync (`docs/PLAN.md v3.0`)`**
   - Bảng tổng hợp Milestones `M0`–`M15` & Phases `0`–`4C` (✅ Completed).
   - **Epic 9: Phase 5 — Activities, Tours & Transfers (📋 Planned):** Chi tiết `P5.1` (Activities & Transfers Catalog + Contracts + DB Schema), `P5.2` (Cross-sell Add-on Checkout Bundle + Payment Integration), `P5.3` (`E2E-7` Booking Bundle Flow + Multi-item Cancellation), giữ nguyên label 📋 Planned.
6. **`## 6. Traceability Matrix & Quality Gates`**
   - Bảng ánh xạ từ `FR-01`..`FR-16` & `Epic 9` -> Contracts/Domain/API/DB/Web -> Test suites (`contracts.test.ts`, `domain/tests/*`, `api.test.ts`, `web/tests/*`, `E2E-1`..`E2E-6`, `verify-seed-images.mjs`) -> PLAN Milestones.

- [ ] **Step 2: Ghi đè `docs/PRD.md` sạch sẽ (`write_file` với `Overwrite: true`).**

---

## Task 3: Cross-Reference Audit & Full Monorepo Verification

**Files:**
- Verify: `docs/ARCHITECTURE.md`, `docs/PRD.md`, `docs/PLAN.md`

- [ ] **Step 1: Audit toàn bộ relative links (tính từ thư mục `docs/`, ví dụ `../packages/...`, `../apps/...`, `./PLAN.md`, `./adr/...`), symbol names & counts trong `ARCHITECTURE.md` và `PRD.md`**
  Chạy script PowerShell/Node nhanh kiểm tra mọi Markdown link nội bộ `[...](...)` trỏ ra đường dẫn có thật trên đĩa, và `git grep` đảm bảo không sót số liệu cũ (`90 tests`, `20 tables`, `12 chỗ nghỉ` khi mô tả tổng quy mô hiện tại, `pricing.ts`, `v0.3.0`).
- [ ] **Step 2: Chạy full monorepo verification gates theo `.agents/rules/AGENTS.md`**
  ```powershell
  npm run build; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm run typecheck; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm run lint; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }; npm run test; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  ```
- [ ] **Step 3: Fresh verification check đối chiếu `docs/ARCHITECTURE.md` + `docs/PRD.md` với [2026-11-25-architecture-prd-sync-design.md](../specs/2026-11-25-architecture-prd-sync-design.md) và `docs/PLAN.md v3.0`.**
