# ✨ LuxeStay — Nền Tảng Đặt Phòng Khách Sạn & Homestay Du Lịch

**LuxeStay (`travel-service`)** là ứng dụng đặt phòng khách sạn, resort ven biển, villa biệt thự, homestay và glamping nghỉ dưỡng tại Việt Nam, được tổ chức theo kiến trúc **TypeScript Monorepo** (`npm workspaces` + `Turborepo`) giúp đồng bộ chặt chẽ 100% hợp đồng dữ liệu và logic nghiệp vụ giữa Frontend và Backend.

## 🏗️ Cấu trúc Monorepo

| Workspace | Tên gói | Vai trò |
| :--- | :--- | :--- |
| `packages/contracts` | `@luxestay/contracts` | Nguồn chân lý duy nhất cho Zod schemas, DTOs, API envelope (`ApiSuccess`/`ApiError`) và `API_ENDPOINTS` |
| `packages/domain` | `@luxestay/domain` | 4 deep module nghiệp vụ thuần (`bookingSession`, `catalogQuery`, `amenities`, `utils`) và seed data (`@luxestay/domain/seed`) |
| `apps/api` | `@luxestay/api` | Backend API bằng **Hono** (Node.js + TS + Zod, port `4000`): `GET /health`, `GET /api/v1/catalog`, `GET /api/v1/properties/:id`, `POST /api/v1/reservations` |
| `apps/web` | `@luxestay/web` | Frontend **Next.js 16** (App Router, Tailwind CSS v4, Framer Motion, port `3000`) tổ chức feature-based đối xứng với Backend |

## 🚀 Công nghệ sử dụng

- **Monorepo & Toolchain**: `npm workspaces`, Turborepo, TypeScript 5 (`strict: true`), Node.js `>=22` (verified on `24.14.0`)
- **Frontend (`apps/web`)**: Next.js `16.4.6` (App Router), React `19.3.0`, Tailwind CSS v4, Framer Motion, Lucide React, Canvas Confetti
- **Backend (`apps/api`)**: Hono `4`, `@hono/node-server`, `tsx`
- **Contracts & Validation**: Zod `3`
- **Testing & CI**: Node native `node:test` (60 tests / 4 tầng), ESLint 9 + import boundary rules, GitHub Actions CI

## 🛠️ Cài đặt & Khởi chạy

```bash
# 1. Cài đặt dependencies cho toàn bộ workspaces
npm install

# 2. (Tùy chọn) Tạo file biến môi trường từ mẫu
#    - apps/api/.env   (tham khảo apps/api/.env.example)
#    - apps/web/.env.local (tham khảo apps/web/.env.example)

# 3. Chạy song song cả Backend (4000) & Frontend (3000) ở chế độ API thật
npm run dev

# Hoặc chạy riêng Frontend ở chế độ Mock độc lập (không cần bật apps/api):
# PowerShell:
$env:NEXT_PUBLIC_DATA_MODE="mock"; npm run dev:web
```

- Frontend Web: [http://localhost:3000](http://localhost:3000)
- Backend API Health: [http://localhost:4000/health](http://localhost:4000/health)

## ✅ Kiểm chứng chất lượng (Quality Gates)

```bash
# Build toàn bộ packages & apps theo đồ thị phụ thuộc
npm run build

# Kiểm tra TypeScript strict trên cả 4 workspaces
npm run typecheck

# Kiểm tra ESLint & quy tắc ranh giới import FE/BE
npm run lint

# Chạy toàn bộ 60 bài kiểm thử tự động trên 4 tầng
npm run test
```

## 📚 Tài liệu Quản trị & Mở rộng

- Yêu cầu sản phẩm: [docs/PRD.md](./docs/PRD.md)
- Kiến trúc hệ thống: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- Lộ trình bảo trì & mở rộng: [docs/PLAN.md](./docs/PLAN.md)
- Nhật ký quyết định kiến trúc: [docs/adr/README.md](./docs/adr/README.md)
- Từ vựng miền chuẩn: [GLOSSARY.md](./GLOSSARY.md)
