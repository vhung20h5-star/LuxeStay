# Database Layer — `@luxestay/api` (PostgreSQL 16 + Drizzle ORM)

Quyết định kiến trúc: [ADR-0008](../../../../docs/adr/0008-postgresql-drizzle-database-layer.md).

## Cấu trúc

```text
apps/api/src/db/
├── client.ts                  # pg.Pool + Drizzle ORM client handle
├── migrate.ts                 # Drizzle SQL migration runner (npm run db:migrate)
├── seed.ts                    # Idempotent seeder từ @luxestay/domain/seed (npm run db:seed)
├── schema/
│   ├── catalog.ts             # categories, destinations, promotions, testimonials, amenity_*, properties, property_amenities, reviews
│   ├── reservations.ts        # reservations, reservation_amenities
│   └── index.ts
└── migrations/
    ├── 0000_initial.sql
    └── meta/_journal.json
```

## Khởi chạy PostgreSQL cục bộ (Docker Compose)

```bash
# 1. Bật PostgreSQL 16 (host port 5434 -> container 5432, db=luxestay)
docker compose up -d

# 2. Chạy SQL migrations
npm run db:migrate

# 3. Đổ dữ liệu mẫu chuẩn (an toàn chạy lặp nhiều lần)
npm run db:seed

# 4. Chạy API ở chế độ PostgreSQL thật
# PowerShell:
$env:STORAGE_DRIVER="database"
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5434/luxestay"
npm run dev
```

*Lưu ý: Chế độ `STORAGE_DRIVER=memory` (mặc định) vẫn hoạt động độc lập cho unit/integration tests và CI không cần Docker.*
