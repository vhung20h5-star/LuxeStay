# System & Software Architecture — LuxeStay (`travel-service`)

- **Phiên bản kiến trúc:** 2.4 (Phase 3 Completed — Baseline v0.6.0)
- **Ngày cập nhật:** 2026-11-24
- **Từ vựng thiết kế & miền:** [GLOSSARY.md](../GLOSSARY.md) & [.agents/skills/codebase-design/SKILL.md](../.agents/skills/codebase-design/SKILL.md)
- **Tài liệu liên quan:** [PRD.md](./PRD.md) | [PLAN.md](./PLAN.md) | [ADR Index](./adr/README.md) | [ADR-0008](./adr/0008-postgresql-drizzle-database-layer.md) | [ADR-0009](./adr/0009-custom-session-auth-and-wishlist-sync.md) | [ADR-0010](./adr/0010-payment-sandbox-webhook-and-notifications.md) | [ADR-0011](./adr/0011-availability-engine-seasonal-pricing-and-verified-reviews.md) | [ADR-0012](./adr/0012-rbac-host-portal-i18n-and-playwright-e2e.md)

---

## 1. Triết lý Kiến trúc & Ngăn xếp Công nghệ

### 1.1. Ngăn xếp công nghệ (Tech Stack)
| Thành phần | Công nghệ / Phiên bản | Ghi chú |
| :--- | :--- | :--- |
| **Monorepo Toolchain** | `npm workspaces` (`npm 11.9`) + `Turborepo` (`turbo`) | Quản lý 4 workspace (`packages/*`, `apps/*`), cache & dependency graph |
| **Shared Contracts** | `@luxestay/contracts` + `Zod 3` + TypeScript 5 (`strict: true`) | Nguồn chân lý duy nhất cho Zod schemas (catalog, booking, auth+RBAC, payment, notifications, availability, verified reviews, host CRUD/analytics), `ApiSuccess`/`ApiError`, `API_ENDPOINTS` |
| **Shared Domain** | `@luxestay/domain` (100% pure ESM TypeScript) | 9 deep modules thuần (`bookingSession`, `availability`, `reviews`, `host`, `locale`, `vouchers`, `catalogQuery`, `amenities`, `utils`) + `@luxestay/domain/seed` |
| **Backend API (`apps/api`)** | `Hono 4` + `@hono/node-server` + `tsx` (port `4000`) | Thuần ESM, 10 modules (`health`, `catalog`, `availability`, `reviews`, `host`, `auth`, `favorites`, `reservations`, `payments`, `notifications`), RBAC (`guest|host|admin`), khóa chống đặt trùng (`SELECT ... FOR UPDATE` / mutex), `scrypt` + HttpOnly Cookie + HMAC-SHA256 webhook |
| **Database Layer (`apps/api/src/db`)** | **PostgreSQL 16** (`docker-compose.yml` `:5434->5432`) + **Drizzle ORM** (`drizzle-orm`, `pg`, `drizzle-kit`) | Cô lập trong `apps/api`; **20 bảng chuẩn hóa**, 4 migrations (`0000`–`0003`), seed idempotent (kèm Host/Admin demo), chuyển đổi qua `STORAGE_DRIVER=memory|database` |
| **Frontend Web (`apps/web`)** | Next.js `16.4.6` (App Router, `--webpack`), React `19.3.0`, Tailwind CSS `v4`, Framer Motion `12.4.7`, Lucide React `1.16.0` (port `3000`) | Feature-based đối xứng với Backend, `/stays/[id]` SSR+SEO + `AvailabilityCalendar`, `/bookings` + Verified Review, `/host` RBAC Portal, `/payments/[transactionId]` Sandbox, `LocaleContext` + `AuthContext` + split Booking Contexts, Error Boundaries |
| **Testing & CI** | Node.js `24` (`.nvmrc`) native `node:test`, **Playwright Chromium E2E** (`e2e/`), ESLint `9` (`eslint.boundaries.mjs` cho toàn repo), GitHub Actions CI | **90/90 unit/integration tests** trên 4 tầng + **3/3 Playwright E2E**, **0 errors / 0 warnings** |

### 1.2. Nguyên tắc thiết kế cốt lõi
1. **Shared Contracts First (`@luxestay/contracts`):** Mọi payload qua mạng đều định nghĩa bằng Zod schema, dùng chung để validate đầu vào trên `apps/api` và xác thực phản hồi trên `apps/web`.
2. **Pure In-Process Deep Modules (`@luxestay/domain`):** Toàn bộ quy tắc tìm kiếm/lọc, đồng bộ URL query, chiếu & duyệt tiện ích, máy trạng thái phiên đặt phòng, xác thực quyền tra cứu/hủy đơn và tính báo giá chuẩn là hàm thuần không phụ thuộc React, DOM hay HTTP.
3. **Explicit Seams & Data Modes (`apps/web/src/shared/ports`):** Tách sạch đọc (`CatalogRepository`), ghi (`ReservationSubmitter`), tra cứu/hủy đơn (`ReservationManagerPort`) và lưu cục bộ (`FavoritesRepository`). Chế độ `NEXT_PUBLIC_DATA_MODE=api|mock` tường minh — ở `api` mode **tuyệt đối không âm thầm fallback**, mọi lỗi `4xx`/`5xx`/mạng hiển thị trung thực qua `HttpApiError`.
4. **Symmetric Domain Layout & Import Boundaries:** `apps/web/src/features/*` đối xứng 1–1 với `apps/api/src/modules/*`; ESLint `no-restricted-imports` chặn mọi vi phạm ranh giới giữa FE, BE và seed data; mọi gói DB (`drizzle-orm`, `pg`) chỉ tồn tại trong `apps/api`.

---

## 2. Sơ đồ Kiến trúc Tổng thể (Baseline v0.3.0)

```mermaid
flowchart TD
    subgraph Shared["Shared Packages (packages/*)"]
        Contracts["@luxestay/contracts\n(Zod schemas, DTOs, ApiSuccess/ApiError, Endpoints)"]
        Domain["@luxestay/domain\n(bookingSession, catalogQuery+URL, amenities, utils)"]
        Seed["@luxestay/domain/seed\n(properties, amenities, categories, destinations, promotions, testimonials)"]
        Domain --> Contracts
        Seed --> Contracts
    end

    subgraph Web["Frontend App: @luxestay/web (Next.js 16 :3000)"]
        WebApp["App Router (/, /stays/[id], /bookings, /bookings/[bookingId], error, not-found)"]
        Features["features/* (catalog+UrlSync, property+StayDetailView, booking+Lookup/Detail, favorites, auth)"]
        Overlay["shared/overlay (OverlayContext + overlayStack)"]
        Ports["shared/ports (CatalogRepository, ReservationSubmitter, ReservationManagerPort, FavoritesRepository)"]
        WebApp --> Features
        WebApp --> Overlay
        WebApp --> Ports
        Features --> Overlay
        Features --> Ports
    end

    subgraph Api["Backend Service: @luxestay/api (Hono :4000)"]
        ApiEntry["app.ts + middleware (requestId, cors, errorHandler)"]
        HealthMod["modules/health (GET /health)"]
        CatMod["modules/catalog (GET /api/v1/catalog, /api/v1/properties/:id)"]
        ResMod["modules/reservations (POST /, GET /:id, PATCH /:id/cancel)"]
        DbLayer["src/db (Drizzle ORM + pg Pool + 12 tables + migrations + seed)"]
        ApiEntry --> HealthMod
        ApiEntry --> CatMod
        ApiEntry --> ResMod
        CatMod -. "STORAGE_DRIVER=database" .-> DbLayer
        ResMod -. "STORAGE_DRIVER=database" .-> DbLayer
    end

    PG[("PostgreSQL 16\n(docker-compose.yml)")]
    DbLayer --> PG

    Features --> Domain
    Features --> Contracts
    Ports --> Contracts
    Ports -. "DATA_MODE=mock" .-> Seed
    Ports -- "DATA_MODE=api (HTTP /api/v1/*)" --> ApiEntry

    CatMod -. "STORAGE_DRIVER=memory" .-> Seed
    CatMod --> Contracts
    ResMod --> Domain
    ResMod --> Contracts
    HealthMod --> Contracts
```

---

## 3. Cấu trúc Thư mục & Bản đồ Workspace

```text
travel-service/
├── .nvmrc                                      # Ghim Node 24 đồng bộ local & CI
├── docker-compose.yml                          # PostgreSQL 16 local (luxestay-postgres, host 127.0.0.1:5434 -> 5432)
├── package.json                                # Root npm workspaces + turbo + db:migrate/db:seed
├── turbo.json                                  # Build/lint/typecheck/test/dev pipeline
├── tsconfig.base.json                          # Shared TS strict + NodeNext ESM base
├── eslint.boundaries.mjs                       # Quy tắc ranh giới import dùng chung cho cả 4 workspaces
├── .env.example                                # Tổng hợp biến môi trường FE & BE
├── .github/workflows/ci.yml                    # CI: lint -> typecheck -> test -> build (dùng .nvmrc)
├── GLOSSARY.md                                 # Từ vựng miền chuẩn
├── docs/                                       # PRD, ARCHITECTURE, PLAN, adr/ (0001..0008), superpowers/
├── packages/
│   ├── contracts/                              # @luxestay/contracts (+ eslint.config.mjs)
│   │   ├── src/{common,catalog,booking,endpoints,index}.ts
│   │   └── tests/contracts.test.ts             # 4 tests
│   └── domain/                                 # @luxestay/domain (+ eslint.config.mjs)
│       ├── src/{utils,amenities,catalogQuery,bookingSession,index}.ts
│       ├── src/seed/{amenities,categories,destinations,promotions,properties,testimonials,index}.ts
│       └── tests/*.test.ts                     # 39 tests (5 files)
└── apps/
    ├── api/                                    # @luxestay/api (Hono :4000)
    │   ├── AGENTS.md                           # Quy tắc cục bộ cho Backend
    │   ├── drizzle.config.ts                   # Cấu hình Drizzle Kit (dialect: postgresql)
    │   ├── eslint.config.mjs                   # Kế thừa eslint.boundaries.mjs
    │   ├── .env.example
    │   ├── src/
    │   │   ├── config/env.ts                   # Zod env validation (PORT, CORS_ORIGINS, STORAGE_DRIVER, DATABASE_URL)
    │   │   ├── db/
    │   │   │   ├── client.ts                   # pg.Pool + drizzle() factory & graceful close()
    │   │   │   ├── migrate.ts / seed.ts        # Drizzle migrator & idempotent seed từ @luxestay/domain/seed
    │   │   │   ├── schema/{catalog,reservations,index}.ts  # 12 bảng PostgreSQL chuẩn hóa
    │   │   │   └── migrations/0000_initial.sql # Migration SQL ban đầu + meta/_journal.json
    │   │   ├── middleware/{requestId,errorHandler}.ts
    │   │   ├── modules/
    │   │   │   ├── health/routes.ts
    │   │   │   ├── catalog/{repository,postgresRepository,service,routes}.ts
    │   │   │   └── reservations/{repository,postgresRepository,service,routes}.ts
    │   │   ├── app.ts                          # In-process testable Hono factory
    │   │   └── index.ts                        # @hono/node-server + STORAGE_DRIVER switch + SIGINT/SIGTERM cleanup
    │   └── tests/api.test.ts                   # 7 integration, env & Postgres mapper tests
    └── web/                                    # @luxestay/web (Next.js 16 :3000)
        ├── AGENTS.md                           # Quy tắc cục bộ cho Frontend
        ├── .env.example
        ├── next.config.ts                      # transpilePackages + Unsplash remotePatterns
        ├── eslint.config.mjs                   # Next Core Web Vitals + kế thừa eslint.boundaries.mjs
        ├── public/*
        ├── src/
        │   ├── app/
        │   │   ├── layout.tsx                  # Root shell + OverlayProvider
        │   │   ├── error.tsx / global-error.tsx / not-found.tsx
        │   │   └── (main)/
        │   │       ├── layout.tsx              # force-dynamic SSR CatalogSnapshot loader
        │   │       ├── page.tsx                # Trang chủ + <CatalogUrlSync />
        │   │       ├── stays/[id]/page.tsx     # Chi tiết chỗ nghỉ SSR + generateMetadata SEO/OG + notFound()
        │   │       └── bookings/{page,[bookingId]/page}.tsx  # Tra cứu, xem & hủy đơn đặt phòng
        │   ├── features/
        │   │   ├── catalog/*                   # SearchBar, CatalogUrlSync, CategoryBar, PropertyList, PropertyCard, FilterModal, Hero, PromotionBanner, TrendingDestinations, Testimonials
        │   │   ├── property/*                  # StayDetailView, PropertyModal, PropertyAmenitiesModal, AmenityDetailPanel, AmenityIcon
        │   │   ├── booking/*                   # BookingContext (split 3 contexts), BookingCheckoutModal, BookingSuccessModal, BookingLookupView, BookingDetailView
        │   │   ├── favorites/FavoritesDrawer.tsx
        │   │   └── auth/AuthModal.tsx
        │   └── shared/
        │       ├── config/env.ts               # Zod validation (NEXT_PUBLIC_DATA_MODE, API URLs)
        │       ├── overlay/{types,overlayStack,OverlayContext}.ts(x)
        │       ├── ports/{types,errors,catalogPort,persistencePort}.ts
        │       ├── ui/{Badge,Button,Input,Modal}.tsx
        │       ├── layout/{Navbar,Footer}.tsx
        │       └── utils/cn.ts
        └── tests/{register-alias.mjs,overlay-stack.test.ts,persistence-port.test.ts}  # 17 tests
```

---

## 4. Kiến trúc Chi tiết từng Tầng & Module

### 4.1. Shared Contracts (`packages/contracts`)
- **Response Envelope chuẩn hóa:**
  - Thành công: `{ ok: true, data: T, meta?: { requestId, timestamp } }`
  - Lỗi: `{ ok: false, error: { code, message, details? }, meta?: { requestId, timestamp } }`
- **Mã lỗi chuẩn (`ErrorCode`):** `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `UNPROCESSABLE_ENTITY`, `INVALID_JSON`, `INTERNAL_ERROR`, `NETWORK_ERROR`, `CONTRACT_MISMATCH`.
- **Zod Schemas cốt lõi:** `CatalogSnapshotSchema`, `PropertySchema`, `GuestInfoSchema` (kèm `VN_PHONE_REGEX` & `EMAIL_REGEX`), `ServerReservationIntentSchema` (strip mọi trường lạ như `pricing`), `ReservationStatusSchema` (`confirmed` | `cancelled`), `ReservationLookupInputSchema`, `CancelReservationInputSchema`, `BookingDetailsSchema`, `HealthDataSchema`.

### 4.2. Pure Domain Deep Modules (`packages/domain`)
- **`catalogQuery.ts`:** Nguồn chân lý duy nhất `StayCatalogQueryState` + `executeCatalogQuery` (hỗ trợ truyền `categories` & `amenityFilterOptions` từ snapshot), tìm kiếm không dấu tiếng Việt, `ActiveFilterChip`, `QuickSearchTrend`, `getQuickDatePresets`, cùng `serializeCatalogQueryToSearchParams` & `parseCatalogQueryFromSearchParams` cho đồng bộ URL 2 chiều.
- **`amenities.ts`:** `WeakMap`-cached `PropertyAmenityProjection`, Master–Detail `AmenityExplorer` reducer/view model, `AmenityPricingDescriptor`.
- **`bookingSession.ts`:** State machine vòng đời phiên đặt phòng (`idle → previewing → checking-out → confirmed → idle`), one-way seeding từ `SearchCriteria`, `deriveBookingQuote`, `processServerReservationIntent`, cùng `matchesReservationContact` (email case-insensitive & chuẩn hóa SĐT VN `0`/`+84`/`84`) và `evaluateReservationCancellation` (kiểm tra quyền sở hữu, chống hủy trùng, tuân thủ chính sách `freeCancellation`).

```mermaid
stateDiagram-v2
    [*] --> idle
    idle --> previewing : openPropertySession(property, searchCriteria)
    idle --> checkingOut : startCheckoutSession(property, searchCriteria)
    previewing --> idle : closePreviewSession()
    previewing --> checkingOut : startCheckoutSession(sameProperty)
    checkingOut --> idle : closeCheckoutSession()
    checkingOut --> confirmed : submitBookingSession() succeeds
    confirmed --> idle : dismissConfirmedBooking()
    confirmed --> previewing : openPropertySession(nextProperty)

    state checkingOut as "checking-out"
```

### 4.3. Backend API Service & Database Layer (`apps/api` — Hono + PostgreSQL 16 / Drizzle ORM)
- **Kiến trúc mỗi module:** `routes.ts` (HTTP + Zod validation) → `service.ts` (use-case orchestration) → `repository.ts` / `postgresRepository.ts` (seam persistence).
- **Endpoints hiện hành:**
  - `GET /health` → `200 ApiSuccess<HealthData>`
  - `GET /api/v1/catalog` → `200 ApiSuccess<CatalogSnapshot>`
  - `GET /api/v1/properties/:id` → `200 ApiSuccess<Property>` | `404 NOT_FOUND`
  - `POST /api/v1/reservations` → `201 ApiSuccess<BookingDetails>` | `400 INVALID_JSON / VALIDATION_ERROR` | `404 NOT_FOUND` | `422 UNPROCESSABLE_ENTITY`
  - `GET /api/v1/reservations/:bookingId?contact=...` → `200 ApiSuccess<BookingDetails>` | `400 VALIDATION_ERROR` | `403 FORBIDDEN` | `404 NOT_FOUND`
  - `PATCH /api/v1/reservations/:bookingId/cancel` → `200 ApiSuccess<BookingDetails>` (`status: "cancelled"`) | `400 INVALID_JSON / VALIDATION_ERROR` | `403 FORBIDDEN` | `404 NOT_FOUND` | `409 CONFLICT` (đã hủy hoặc không áp dụng `freeCancellation`)
- **Dual Storage Driver (`STORAGE_DRIVER`):**
  - `memory` (mặc định cho unit/integration tests & CI không cần Docker): dùng `createSeedCatalogRepository` + `createInMemoryReservationRepository`.
  - `database` (production/local Docker PostgreSQL 16): bật `createDbClient(DATABASE_URL)` + `createPostgresCatalogRepository` + `createPostgresReservationRepository` trên 12 bảng Drizzle ORM chuẩn hóa ([ADR-0008](./adr/0008-postgresql-drizzle-database-layer.md)).

### 4.4. Frontend Web App (`apps/web` — Next.js 16)
- **App Router & SSR Build Safety:**
  - `src/app/layout.tsx` chỉ giữ vỏ HTML + `OverlayProvider` (giúp `/_not-found` prerender tĩnh sạch sẽ).
  - `src/app/(main)/layout.tsx` đặt `export const dynamic = "force-dynamic"`, gọi `await loadInitialCatalog()` và nạp `initialCatalog` + `dataMode` + `publicApiBaseUrl` vào `BookingProvider`.
  - `src/app/(main)/page.tsx` gắn `<CatalogUrlSync />` (trong `<Suspense>`) đồng bộ 2 chiều giữa bộ lọc trang chủ và query string URL.
  - `src/app/(main)/stays/[id]/page.tsx` nạp chi tiết chỗ nghỉ qua `loadPropertyById`, sinh `generateMetadata` (title, description, OpenGraph image) và trả `notFound()` nếu không tồn tại.
  - `src/app/(main)/bookings/page.tsx` và `bookings/[bookingId]/page.tsx` cho phép tra cứu, xem vé điện tử (hỗ trợ in PDF) và hủy đơn có xác nhận chính sách.
  - `error.tsx`, `global-error.tsx`, `not-found.tsx` xử lý lỗi API/runtime và 404 thân thiện bằng tiếng Việt.
- **Ports & Data Modes (`src/shared/ports/`):**
  - `CatalogRepository`: `getSnapshot()` + `getPropertyById(id)` — `createHttpCatalogRepository` (`api` mode) vs `createMockCatalogRepository` (`mock` mode).
  - `ReservationSubmitter`: `createHttpReservationAdapter` (`api` mode, ném `HttpApiError` trung thực cho mọi `4xx`/`5xx`/mạng) vs `createBrowserReservationAdapter` (`mock` mode, lưu thêm vào `localStorage` để tra cứu/hủy hoạt động trọn vẹn) vs `createInMemoryReservationAdapter` (tests).
  - `ReservationManagerPort`: `lookup(bookingId, contact)` + `cancel(bookingId, input)` — `createHttpReservationManagerAdapter` (`api` mode) vs `createBrowserReservationManagerAdapter` (`mock` mode) vs `createInMemoryReservationManager` (tests).
  - `FavoritesRepository`: `createBrowserFavoritesAdapter` (`localStorage` + `storage` cross-tab + `useSyncExternalStore`) vs `createInMemoryFavoritesAdapter`.
- **Overlay Stack Coordinator (`src/shared/overlay/`):** Điều phối 7 lớp phủ (`tier = 0` cho 6 base overlays `z-index: 50+`, `tier = 1` cho `PropertyAmenitiesModal` `z-index: 150+`), duy nhất 1 listener `Escape`, ref-counted body scroll lock và ARIA dialog.

---

## 5. Luồng Dữ liệu End-to-End (FE ↔ Contracts ↔ BE)

```mermaid
sequenceDiagram
    actor User
    participant Browser as @luxestay/web (Client)
    participant SSR as @luxestay/web (SSR Layout)
    participant API as @luxestay/api (Hono :4000)
    participant Domain as @luxestay/domain

    User->>SSR: GET /
    SSR->>API: GET /api/v1/catalog (cache: no-store)
    API-->>SSR: 200 ApiSuccess<CatalogSnapshot>
    SSR->>SSR: Validate CatalogSnapshotSchema (Zod)
    SSR-->>Browser: HTML + initialCatalog -> BookingProvider

    User->>Browser: Xem chỗ nghỉ, chọn tiện ích, điền thông tin đặt phòng
    Browser->>API: POST /api/v1/reservations (ServerReservationIntent)
    API->>API: Validate ServerReservationIntentSchema (Zod)
    API->>Domain: processServerReservationIntent(intent, properties)
    Domain-->>API: Authoritative BookingDetails (LX-XXXXXX)
    API-->>Browser: 201 ApiSuccess<BookingDetails> (or 4xx ApiError)
    Browser->>Browser: Validate BookingDetailsSchema -> BookingSuccessModal
```

---

## 6. Chiến lược Kiểm thử 4 Tầng & Cẩm nang Mở rộng

### 6.1. Bộ kiểm thử tự động (`npm run test` — 90 tests & `npm run test:e2e` — 3 Playwright E2E)

| Tầng | Workspace | Tệp test | Số test | Phạm vi |
| :---: | :--- | :--- | :---: | :--- |
| **1** | `@luxestay/contracts` | `packages/contracts/tests/contracts.test.ts` | **5** | Zod schemas (`catalog`, `booking`, `auth`, `payment`, `notifications`), `ApiSuccess`/`ApiError`, strip trường giả mạo, `API_ENDPOINTS` |
| **2** | `@luxestay/domain` | `packages/domain/tests/*.test.ts` (5 files) | **41** | Seed catalog (51 amenities / 12 properties), `WeakMap` projection, Explorer, Pricing Descriptors, `StayCatalogQuery` + URL sync, `BookingSession`, `evaluatePromotionVoucher`, `evaluatePaymentWebhookTransition`, ownership & cancellation |
| **3** | `@luxestay/api` | `apps/api/tests/api.test.ts` | **10** | In-process Hono routes (`health`, `catalog`, `properties/:id`, `auth` password+OTP+cookie, `favorites` merge/toggle, `vouchers/validate`, `reservations` + `/my` + `/notifications`, `payments` sandbox + HMAC-SHA256 webhook + idempotency) & `STORAGE_DRIVER` + Postgres mappers |
| **4** | `@luxestay/web` | `apps/web/tests/*.test.ts` (2 files) | **19** | Overlay stack (7), `FavoritesRepository` & `useSyncExternalStore` (5), `ReservationSubmitter` / `ReservationManagerPort` / `CatalogRepository` / `AuthPort` / `PaymentGatewayPort` / strict `HttpApiError` (7) |

### 6.2. Cẩm nang Mở rộng (Extension Playbook)

| Nhu cầu mở rộng | Điểm chạm kiến trúc chuẩn (Locality) |
| :--- | :--- |
| **Thêm endpoint / tính năng mới đồng bộ FE ↔ BE** | 1. Định nghĩa Zod request/response schema + path trong `packages/contracts/src/`<br>2. Viết logic nghiệp vụ thuần trong `packages/domain/src/` (nếu có)<br>3. Cài đặt `repository` / `postgresRepository` / `service` / `routes` trong `apps/api/src/modules/<domain>/` + test in-process<br>4. Thêm/cập nhật adapter trong `apps/web/src/shared/ports/` và UI trong `apps/web/src/features/<domain>/`<br>5. Chạy `npm run lint && npm run typecheck && npm run test && npm run build` |
| **Thay đổi lược đồ Database PostgreSQL** | 1. Cập nhật bảng trong `apps/api/src/db/schema/`<br>2. Sinh migration với `npm run db:generate --workspace=@luxestay/api` và áp dụng qua `npm run db:migrate`<br>3. Cập nhật mapper trong `apps/api/src/modules/*/postgresRepository.ts` + unit test mapper |
| **Thêm tiêu chí lọc / tiện ích mới** | 1. Cập nhật schema ở `packages/contracts`<br>2. Cập nhật `packages/domain/src/catalogQuery.ts` (kèm URL serializer/parser) hoặc `packages/domain/src/seed/amenities.ts`<br>3. Nối UI ở `apps/web/src/features/catalog/` |
| **Thêm Modal / Drawer mới** | 1. Thêm `OverlayKind` ở `apps/web/src/shared/overlay/types.ts`<br>2. Dùng `<Modal />` hoặc `useOverlayLayer({ id, kind, isOpen, onClose, tier })` |

---

## 7. Giới hạn Hiện tại (Sau Phase 1 — Baseline v0.3.0)

1. **Chưa có xác thực tài khoản thật (`AuthModal`):** Quyền tra cứu/hủy đơn hiện xác thực bằng cặp `bookingId` + `contact` (email/SĐT VN); `FavoritesRepository` vẫn lưu ở `localStorage` (mục tiêu **P2.1**).
2. **Các luồng thương mại nâng cao vẫn ở mức UI prototype:** Mã giảm giá động `PromotionBanner` (đang cố định `100.000đ`), cổng thanh toán & webhook thực tế (`MoMo`/`VNPAY`/`Card`), lịch trống chống đặt trùng, đánh giá xác thực và đa ngôn ngữ (mục tiêu **Phase 2–3** trong [PLAN.md](./PLAN.md)).
