# ADR-0007: Tái cấu trúc sang TypeScript Monorepo (`npm workspaces` + `Turborepo`), Hono API & Zod Contracts

- **Status:** Accepted
- **Date:** 2026-11-24
- **Deciders:** Engineering Team (`travel-service`)
- **Related Docs:** [PRD](../PRD.md) | [ARCHITECTURE](../ARCHITECTURE.md) | [PLAN](../PLAN.md) | [GLOSSARY](../../GLOSSARY.md)
- **Supersedes / Superseded by:** Mở rộng & kế thừa [ADR-0001](./0001-deep-module-architecture-and-domain-seams.md), [ADR-0002](./0002-booking-session-and-authoritative-server-pricing.md), [ADR-0006](./0006-app-ports-persistence-and-split-domain-contexts.md)

---

## 1. Context (Bối cảnh & Vấn đề)

Sau khi hoàn thiện 5 deep module nền tảng và `POST /api/reservations` trong Next.js App Router (v0.1.0), dự án bước vào giai đoạn vừa phát triển tiếp Frontend, vừa chuẩn bị xây dựng Backend độc lập và cần đồng bộ chặt chẽ cả hai phía. Cấu trúc single-app cũ bộc lộ 4 giới hạn:
1. **Không tách tiến trình FE & BE:** Route Handler `src/app/api/reservations/route.ts` nằm dính trong Next.js nên khó vận hành, scale hoặc phát triển Backend độc lập.
2. **Thiếu runtime contract đồng bộ:** `src/types/index.ts` chỉ có TypeScript interface tĩnh (compile-time), không có runtime schema (Zod) hay response envelope chuẩn để chặn lệch dữ liệu giữa FE và BE.
3. **UI import trực tiếp dữ liệu tĩnh (`src/data/*`):** `BookingContext`, `FilterModal`, `PromotionBanner`, `TestimonialsSection` gọi thẳng hằng số tĩnh nên chưa tách sạch tầng truy cập dữ liệu đọc (read-side).
4. **Fallback HTTP quá rộng (P0.2):** `BookingContext` âm thầm fallback sang `BrowserReservationAdapter` khi `fetch` lỗi, che giấu cả lỗi validation `400`/`422` từ server; đồng thời thiếu CI workflow và quy tắc ESLint ngăn import chéo.

---

## 2. Decision Drivers (Tiêu chí quyết định)

- **Một nguồn chân lý duy nhất cho Contract & Domain:** FE và BE dùng chung 100% Zod schemas, DTOs, error codes và pure deep modules trong cùng repository.
- **Thuần ESM & tối thiểu ma sát công cụ:** Khớp sẵn với Node 24, `npm 11.9`, Next.js 16 và TypeScript 5 mà không cần cài thêm package manager global.
- **Đối xứng kiến trúc giữa FE và BE:** Dễ điều hướng, dễ thêm module/feature mới mà không làm phình thư mục phẳng.
- **Không bao giờ che giấu lỗi thật ở `api` mode**, đồng thời vẫn cho phép phát triển/preview FE độc lập bằng `mock` mode tường minh.

---

## 3. Considered Options (Các phương án đã cân nhắc)

1. **Option A (Đã chọn) — TypeScript Monorepo (`npm workspaces` + `Turborepo`) + `Hono` (`apps/api`) + 2 gói dùng chung (`@luxestay/contracts` dùng Zod + `@luxestay/domain`) + Feature-based `apps/web`:**
   - `packages/contracts`: Zod schemas, DTOs, `ApiSuccess`/`ApiError`, `ErrorCode`, `API_ENDPOINTS`.
   - `packages/domain`: Deep modules thuần (`bookingSession`, `catalogQuery`, `amenities`, `utils`) + `@luxestay/domain/seed`.
   - `apps/api`: Hono (ESM-first, modular `health`/`catalog`/`reservations`, test in-process qua `app.request()`).
   - `apps/web`: Next.js 16 feature-based (`features/{catalog,property,booking,favorites,auth}` + `shared/{ui,layout,overlay,ports,config,utils}`), chế độ `NEXT_PUBLIC_DATA_MODE=api|mock` tường minh, ESLint boundary rules.
2. **Option B — Giữ Next.js Fullstack trong 1 app duy nhất:**
   - Nhanh ban đầu nhưng không đáp ứng yêu cầu tách tiến trình Backend độc lập khi mở rộng hệ thống.
3. **Option C — Monorepo với NestJS + pnpm:**
   - NestJS có ma sát CJS/decorators với ESM packages dùng chung cùng Next.js 16 & Node 24 native test; `pnpm` chưa được cài trên môi trường hiện tại.

---

## 4. Decision Outcome (Quyết định cuối cùng)

Chuyển đổi toàn bộ dự án sang **Monorepo v0.2.0** với 4 workspaces (`@luxestay/contracts`, `@luxestay/domain`, `@luxestay/api`, `@luxestay/web`):
- Quản lý bằng **`npm workspaces` + `Turborepo`** (`turbo.json` tự build `packages/*` trước khi `apps/*` chạy `build`/`typecheck`/`lint`/`test`/`dev`, và tách `@luxestay/web#test` chỉ phụ thuộc `^build` để chạy toàn bộ 60 tests dưới 3 giây).
- Chuẩn hóa envelope API duy nhất: `{ ok: true, data, meta }` và `{ ok: false, error: { code, message, details? }, meta }`.
- Di chuyển `POST /api/reservations` từ Next.js sang `POST /api/v1/reservations` tại `apps/api`, bổ sung `GET /health`, `GET /api/v1/catalog`, `GET /api/v1/properties/:id`.
- `apps/web` tải `CatalogSnapshot` qua `CatalogRepository` trong `src/app/(main)/layout.tsx` (`export const dynamic = "force-dynamic"`), bảo đảm `next build` luôn pass kể cả khi `apps/api` chưa bật, và cung cấp `error.tsx` / `global-error.tsx` / `not-found.tsx`.
- Thiết lập chế độ `NEXT_PUBLIC_DATA_MODE=api|mock`: chế độ `api` ném `HttpApiError` trung thực (0 silent fallback); chế độ `mock` dùng `@luxestay/domain/seed` qua `shared/ports`.
- Thiết lập ESLint boundary toàn repo tại `eslint.boundaries.mjs` (áp dụng trên cả 4 workspaces: cấm `contracts` phụ thuộc `domain`/apps/frameworks; cấm `domain` phụ thuộc apps/frameworks; cấm `api` import `web`/React/Next và cấm `routes.ts`/`service.ts` đọc thẳng `@luxestay/domain/seed`; cấm `web` import `api`/Hono và cấm `features/*`/`app/*` đọc thẳng `@luxestay/domain/seed`).
- Bổ sung `.nvmrc` (Node 24, đồng bộ vào `.github/workflows/ci.yml`), quy tắc cục bộ `apps/web/AGENTS.md` + `apps/api/AGENTS.md`, và khung chuẩn bị DB Phase 1 tại `apps/api/src/db/` (`README.md`, `client.ts`, `schema/`, `migrations/` + `STORAGE_DRIVER`/`DATABASE_URL`).

---

## 5. Consequences (Hệ quả)

### Positive (Tích cực)
- Đồng bộ 100% cả compile-time (TypeScript) lẫn runtime (Zod) giữa FE và BE; sửa 1 field trong `@luxestay/contracts` lập tức báo lỗi ở mọi caller FE/BE bị lệch.
- Đạt **60/60 tests pass** trên 4 tầng (`contracts`: 3, `domain`: 37, `api`: 5, `web`: 15) trong `~2.7s`, **0 lỗi & 0 cảnh báo** ESLint, loại bỏ sạch cảnh báo `MODULE_TYPELESS_PACKAGE_JSON`.
- Triệt tiêu hoàn toàn nợ kỹ thuật P0 (`P0.1` CI/scripts, `P0.2` strict HTTP fallback, `P0.3` error boundaries & dọn file thừa `tailwind.config.mjs` / `date-fns`).
- Sẵn sàng thay `createSeedCatalogRepository` và `createInMemoryReservationRepository` trong `apps/api` bằng PostgreSQL/Drizzle/Prisma ở Phase 1 mà không chạm một dòng UI hay contract nào.

### Negative & Trade-offs (Đánh đổi)
- Cần chạy `npm run dev` ở thư mục gốc để bật song song `apps/api` (`:4000`) và `apps/web` (`:3000`) khi làm việc ở `api` mode (hoặc đặt `NEXT_PUBLIC_DATA_MODE=mock` khi muốn chạy riêng `apps/web`).
- Khi chỉnh sửa `packages/contracts` hoặc `packages/domain`, cần chạy `npm run dev` (có `tsc --watch`) hoặc `npm run build` để cập nhật `dist/`.

### Risks & Follow-ups (Rủi ro & Hành động tiếp theo)
- Khi triển khai Database thật ở Phase 1, cần tạo ADR-0008 cho lựa chọn DB/ORM và bổ sung migration + seed scripts trong `apps/api`.
- Giữ `CORS_ORIGINS` đồng bộ với domain production của `apps/web` khi deploy 2 dịch vụ lên hạ tầng riêng.

---

## 6. Validation & References (Kiểm chứng & Tham chiếu)

- Workspaces: `packages/contracts`, `packages/domain`, `apps/api`, `apps/web`
- Root configs: `package.json`, `turbo.json`, `tsconfig.base.json`, `.github/workflows/ci.yml`, `.env.example`
- Verification gates: `npm run build` (4/4), `npm run typecheck` (6/6), `npm run lint` (0 errors, 0 warnings), `npm run test` (60/60 pass) + live E2E smoke tests (`api` online, `api` offline strict error, `mock` standalone).
