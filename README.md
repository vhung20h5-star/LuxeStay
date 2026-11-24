# ✨ LuxeStay — Nền Tảng Đặt Phòng Khách Sạn & Homestay Du Lịch

**LuxeStay (`travel-service`)** là ứng dụng đặt phòng khách sạn, resort ven biển, villa biệt thự, homestay và glamping nghỉ dưỡng tại Việt Nam, được tổ chức theo kiến trúc **TypeScript Monorepo** (`npm workspaces` + `Turborepo`) giúp đồng bộ chặt chẽ 100% hợp đồng dữ liệu và logic nghiệp vụ giữa Frontend và Backend.

## 🏗️ Cấu trúc Monorepo

| Workspace | Tên gói | Vai trò |
| :--- | :--- | :--- |
| `packages/contracts` | `@luxestay/contracts` | Nguồn chân lý duy nhất cho Zod schemas, DTOs, API envelope (`ApiSuccess`/`ApiError`) và `API_ENDPOINTS` |
| `packages/domain` | `@luxestay/domain` | 9 deep module nghiệp vụ thuần (`bookingSession`, `availability`, `reviews`, `host`, `locale`, `vouchers`, `catalogQuery`, `amenities`, `utils`) và seed data (`@luxestay/domain/seed`) |
| `apps/api` | `@luxestay/api` | Backend API bằng **Hono** + **PostgreSQL 16 / Drizzle ORM** (port `4000`): Catalog, Availability & Anti-Double-Booking Lock, Verified Reviews, RBAC Host/Admin Portal (`/api/v1/host/*`), Auth (`scrypt`/OTP/HttpOnly Cookie), Favorites Sync, Dynamic Vouchers, Reservations, Payment Sandbox & HMAC-SHA256 Webhook, Email Notifications |
| `apps/web` | `@luxestay/web` | Frontend **Next.js 16** (App Router, Tailwind CSS v4, Framer Motion, port `3000`) với `/`, `/stays/[id]` (SEO/OG + `AvailabilityCalendar`), `/bookings`, `/bookings/[bookingId]` (Verified Reviews), `/host` (Host/Admin Portal), `/payments/[transactionId]`, `LocaleContext` (`VI`/`EN`, `VNĐ`/`USD`) & `AuthContext` |

## 🚀 Công nghệ sử dụng

- **Monorepo & Toolchain**: `npm workspaces`, Turborepo, TypeScript 5 (`strict: true`), Node.js `24` (`.nvmrc`)
- **Frontend (`apps/web`)**: Next.js `16.4.6` (App Router), React `19.3.0`, Tailwind CSS v4, Framer Motion, Lucide React, Canvas Confetti
- **Backend (`apps/api`)**: Hono `4`, `@hono/node-server`, `tsx`, Node native `crypto` (`scrypt`, `HMAC-SHA256`)
- **Database (`apps/api/src/db`)**: PostgreSQL 16 (`docker-compose.yml` `:5434->5432`) + Drizzle ORM (20 bảng chuẩn hóa, 4 migrations `0000`–`0003`), hỗ trợ song song `STORAGE_DRIVER=memory|database`
- **Contracts & Validation**: Zod `3`
- **Testing & CI**: Node native `node:test` (90 tests / 4 tầng), **Playwright Chromium E2E** (`npm run test:e2e`), ESLint 9 + import boundary rules toàn repo, GitHub Actions CI

## 🛠️ Cài đặt & Khởi chạy

```bash
# 1. Cài đặt dependencies cho toàn bộ workspaces
npm install

# 2. (Tùy chọn) Tạo file biến môi trường từ mẫu
#    - apps/api/.env   (tham khảo apps/api/.env.example)
#    - apps/web/.env.local (tham khảo apps/web/.env.example)

# 3a. Chạy nhanh với in-memory/seed (không cần Docker):
npm run dev

# 3b. Hoặc chạy với PostgreSQL 16 (Docker Desktop):
docker compose up -d
npm run db:migrate
npm run db:seed
# Đặt STORAGE_DRIVER=database và DATABASE_URL=postgresql://postgres:postgres@localhost:5434/luxestay trong apps/api/.env
npm run dev

# 3c. Hoặc chạy riêng Frontend ở chế độ Mock độc lập (không cần bật apps/api):
# PowerShell:
$env:NEXT_PUBLIC_DATA_MODE="mock"; npm run dev:web
```

- Frontend Web: [http://localhost:3000](http://localhost:3000) (Trang chủ `/`, Chi tiết `/stays/[id]`, Đơn đặt phòng `/bookings`, Cổng Chủ nhà `/host`, Cổng thanh toán Sandbox `/payments/[transactionId]`)
- Backend API Health: [http://localhost:4000/health](http://localhost:4000/health)

## ✅ Kiểm chứng chất lượng (Quality Gates)

```bash
# Build toàn bộ packages & apps theo đồ thị phụ thuộc
npm run build

# Kiểm tra TypeScript strict trên cả 4 workspaces
npm run typecheck

# Kiểm tra ESLint & quy tắc ranh giới import FE/BE
npm run lint

# Chạy toàn bộ 90 bài kiểm thử tự động trên 4 tầng
npm run test

# Chạy bộ kiểm thử End-to-End bằng Playwright trên Chromium thật
npm run test:e2e
```

## 📚 Tài liệu Quản trị & Mở rộng

- Yêu cầu sản phẩm: [docs/PRD.md](./docs/PRD.md)
- Kiến trúc hệ thống: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- Lộ trình bảo trì & mở rộng: [docs/PLAN.md](./docs/PLAN.md)
- Nhật ký quyết định kiến trúc: [docs/adr/README.md](./docs/adr/README.md)
- Từ vựng miền chuẩn: [GLOSSARY.md](./GLOSSARY.md)
