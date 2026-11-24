# ADR-0008: Chọn PostgreSQL 16 + Drizzle ORM cho Tầng Cơ sở Dữ liệu Phase 1 (`apps/api/src/db`)

- **Status:** Accepted
- **Date:** 2026-11-24
- **Deciders:** Engineering Team (`travel-service`)
- **Related Docs:** [PRD](../PRD.md) | [ARCHITECTURE](../ARCHITECTURE.md) | [PLAN](../PLAN.md) | [ADR-0007](./0007-monorepo-hono-zod-contracts.md) | [DB README](../../apps/api/src/db/README.md)
- **Supersedes / Superseded by:** None

---

## 1. Context (Bối cảnh & Vấn đề)

Ở Monorepo `v0.2.0` (`ADR-0007`), dịch vụ Backend `@luxestay/api` đã tách sạch tầng lưu trữ sau hai seam `ApiCatalogRepository` và `ApiReservationRepository`, nhưng hiện chỉ dùng adapter trong bộ nhớ (`createSeedCatalogRepository`, `createInMemoryReservationRepository`). Khi khởi động lại tiến trình API, toàn bộ đơn đặt phòng bị mất và không thể hỗ trợ tra cứu/hủy đơn bền vững hoặc quản lý dữ liệu chỗ nghỉ thực tế.

Phase 1 (`P1.1`) yêu cầu xây dựng tầng cơ sở dữ liệu thật trong `apps/api/src/db/` sao cho:
- Chạy thuận tiện ở môi trường phát triển cục bộ (đã có Docker cài sẵn, chưa cài PostgreSQL native) và sẵn sàng deploy lên các dịch vụ PostgreSQL managed (Neon, Supabase, Railway, RDS).
- Giữ nguyên chế độ `STORAGE_DRIVER=memory` hoạt động song song cho unit/integration tests tốc độ cao và CI không cần dựng DB container.
- Khớp hoàn toàn với kiến trúc thuần ESM (`NodeNext`, Node 24, Hono 4, Zod 3) của Monorepo.

---

## 2. Decision Drivers (Tiêu chí quyết định)

- **TypeScript & ESM Native:** Không phát sinh bước binary codegen nặng trong build pipeline, chạy mượt trên Node 24 + `tsx` + `tsc`.
- **SQL-first & Migration minh bạch:** Sinh SQL migrations chuẩn vào `apps/api/src/db/migrations/` để dễ review, kiểm toán và vận hành production.
- **Cô lập hoàn toàn trong `apps/api`:** Chỉ cài driver/ORM trong `apps/api/package.json`; tuyệt đối không rò rỉ dependency DB sang `@luxestay/contracts`, `@luxestay/domain` hay `@luxestay/web`.
- **Dual-driver Seam:** Chuyển đổi tường minh qua `STORAGE_DRIVER=memory|database` + `DATABASE_URL` mà không thay đổi bất kỳ route Hono hay hợp đồng API nào.

---

## 3. Considered Options (Các phương án đã cân nhắc)

1. **Option A (Đã chọn) — PostgreSQL 16 (qua `docker-compose.yml` local) + Drizzle ORM (`drizzle-orm` + `pg` + `drizzle-kit`):**
   - Schema viết trực tiếp bằng TypeScript trong `apps/api/src/db/schema/`, tương thích 100% ESM, khởi động nhanh, SQL migrations tường minh, dễ nối Neon/Supabase/RDS sau này.
2. **Option B — PostgreSQL 16 + Prisma ORM:**
   - Hệ sinh thái mạnh nhưng đòi hỏi bước `prisma generate` + query engine binary trong mọi pipeline CI/build, tăng độ phức tạp trong Turborepo.
3. **Option C — SQLite local + Drizzle ORM:**
   - Nhanh không cần Docker nhưng thiếu kiểu dữ liệu & ràng buộc PostgreSQL (`jsonb`, `timestamptz`, exclusion constraints chống double-booking ở Phase 3), gây chi phí chuyển đổi dialect về sau.

---

## 4. Decision Outcome (Quyết định cuối cùng)

- Sử dụng **PostgreSQL 16** (cung cấp `docker-compose.yml` tại root cho phát triển local) kết hợp **Drizzle ORM** (`drizzle-orm`, `pg`, `drizzle-kit`) nằm gọn trong `@luxestay/api`:
  - `apps/api/drizzle.config.ts`: Cấu hình Drizzle Kit trỏ tới `src/db/schema/` và xuất migrations vào `src/db/migrations/`.
  - `apps/api/src/db/schema/`: Chuẩn hóa các bảng quan hệ cho danh mục (`categories`, `destinations`, `promotions`, `testimonials`, `amenity_categories`, `amenity_filter_options`, `amenity_catalog`, `properties`, `property_amenities`, `reviews`) và đặt phòng (`reservations`, `reservation_amenities`).
  - `apps/api/src/db/migrations/0000_initial.sql`: Migration SQL khởi tạo có thể chạy lặp an toàn cùng script `db:migrate` và `db:seed` idempotent từ `@luxestay/domain/seed`.
  - `apps/api/src/db/client.ts`: Khởi tạo `pg.Pool` + Drizzle instance có hỗ trợ đóng kết nối sạch (`close()`).
  - Cài đặt `createPostgresCatalogRepository(db)` và `createPostgresReservationRepository(db)` thỏa đúng 2 seam `ApiCatalogRepository` và `ApiReservationRepository`.
- Giữ `STORAGE_DRIVER=memory` là mặc định trong unit test và CI, còn `STORAGE_DRIVER=database` + `DATABASE_URL` kích hoạt PostgreSQL thực tế.

---

## 5. Consequences (Hệ quả)

### Positive (Tích cực)
- Đơn đặt phòng, trạng thái hủy (`confirmed` / `cancelled`) và toàn bộ danh mục chỗ nghỉ/tiện ích được lưu bền vững trong PostgreSQL.
- Toàn bộ `routes.ts` và `service.ts` giữ nguyên 100% không phụ thuộc SQL hay Drizzle (bảo vệ bằng ESLint boundary & seam repository).
- Sẵn sàng mở rộng sang Phase 2 (Auth/Users, Vouchers, Payment webhooks) và Phase 3 (Availability exclusion constraints chống double-booking) ngay trên cùng schema PostgreSQL.

### Negative & Trade-offs (Đánh đổi)
- Phát triển cục bộ với `STORAGE_DRIVER=database` yêu cầu bật Docker Desktop và chạy `docker compose up -d`.
- Cần duy trì sự đồng bộ giữa `PostgresCatalogRepository` (map dòng SQL sang `CatalogSnapshot` / `Property`) và `@luxestay/contracts`.

### Risks & Follow-ups (Rủi ro & Hành động tiếp theo)
- Khi thêm cột hoặc bảng mới ở Phase 2–3, luôn tạo migration mới trong `apps/api/src/db/migrations/` thay vì sửa đè `0000_initial.sql`.

---

## 6. Validation & References (Kiểm chứng & Tham chiếu)

- Files affected: `docker-compose.yml`, `apps/api/drizzle.config.ts`, `apps/api/src/db/*`, `apps/api/src/modules/catalog/postgresRepository.ts`, `apps/api/src/modules/reservations/postgresRepository.ts`, `apps/api/src/index.ts`
- Verification: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` + đã kiểm chứng thực tế trên PostgreSQL 16 Docker (`127.0.0.1:5434->5432`): `db:migrate`, `db:seed` x2 (idempotent, 12 bảng chuẩn hóa), 13/13 kiểm tra E2E durability qua 2 lần khởi động lại tiến trình `@luxestay/api`, và `ON DELETE CASCADE`.
