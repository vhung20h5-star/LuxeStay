# Database Layer — `@luxestay/api` (Phase 1 Readiness)

Thư mục này là **vị trí chuẩn bị cho tầng cơ sở dữ liệu Phase 1** của dịch vụ Backend `@luxestay/api`.

## Cấu trúc quy ước

```text
apps/api/src/db/
├── README.md        # Tài liệu quy ước tầng DB (tệp này)
├── client.ts        # Cấu hình & điểm khởi tạo kết nối DB (seam chờ nối ORM ở Phase 1)
├── schema/          # Định nghĩa bảng (Drizzle/Prisma schema): properties, amenities, reservations, reviews
└── migrations/      # SQL migration files có kiểm soát phiên bản
```

*(Ở Phase 1 sẽ bổ sung thêm `seed.ts` để đổ dữ liệu chuẩn từ `@luxestay/domain/seed` vào DB.)*

## Quy trình kích hoạt Phase 1

1. **Tạo ADR-0008** trong `docs/adr/` để chốt công nghệ DB + ORM (ví dụ PostgreSQL + Drizzle ORM hoặc Prisma).
2. Cài đặt driver/ORM chỉ trong `apps/api/package.json` (không đưa dependency DB vào `@luxestay/contracts`, `@luxestay/domain` hay `@luxestay/web`).
3. Định nghĩa schema trong `schema/` và sinh migration vào `migrations/` cho các bảng cốt lõi:
   - `properties`, `amenity_catalog`, `property_amenities`
   - `reservations`, `reservation_amenities`
   - `reviews` (Phase 3)
4. Cài đặt `PostgresCatalogRepository` và `PostgresReservationRepository` thỏa các seam đã có (`ApiCatalogRepository`, `ApiReservationRepository`) rồi chọn theo `env.storageDriver` (`memory` vs `database`) trong `apps/api/src/index.ts`.
5. Đặt `STORAGE_DRIVER=database` và `DATABASE_URL=postgresql://...` trong `apps/api/.env`.
