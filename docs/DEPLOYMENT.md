# Hướng Dẫn Vận Hành Local & Triển Khai Full-Stack Lên Vercel (`v0.6.0`)

Tài liệu này mô tả đầy đủ cách chạy ổn định monorepo **LuxeStay** trên máy local (tránh lỗi không kết nối được `http://localhost:4000`) và cách triển khai lại **Full-Stack (`@luxestay/web` + `@luxestay/api` + Neon Serverless Postgres)** trong **1 Vercel Project duy nhất** bằng **Vercel Services**.

> **Lưu ý:** Tính năng **Vercel Services** (`services` trong `vercel.json`) hiện đang ở trạng thái **Beta** trên tất cả các gói Vercel (Hobby / Pro / Enterprise).

---

## 1. Xử Lý Lỗi `Không thể kết nối máy chủ LuxeStay API (http://localhost:4000)` Ở Local

Khi mở `http://localhost:3000`, nếu thấy thông báo:
> *Không thể kết nối máy chủ LuxeStay API (http://localhost:4000). Vui lòng kiểm tra dịch vụ Backend hoặc chuyển sang NEXT_PUBLIC_DATA_MODE=mock.*

Nguyên nhân là `@luxestay/web` mặc định chạy `NEXT_PUBLIC_DATA_MODE=api` và yêu cầu `@luxestay/api` (port `4000`) đang chạy song song.

### Cách chạy Local chuẩn (Full-Stack)

1. **Chế độ nhanh (In-memory/seed, không cần Docker):**
   Chạy ở **thư mục gốc monorepo** (`d:\Tutorial-Vibe Coding\travel-service`):
   ```powershell
   npm run dev
   ```
   Turborepo sẽ khởi động đồng thời `@luxestay/api` (`http://localhost:4000`) và `@luxestay/web` (`http://localhost:3000`).

2. **Chế độ lưu bền vững với Docker PostgreSQL 16 (`:5434`):**
   ```powershell
   docker compose up -d
   npm run db:migrate
   npm run db:seed

   # PowerShell (tsx không tự đọc apps/api/.env, truyền thẳng qua biến môi trường phiên hiện tại):
   $env:STORAGE_DRIVER="database"
   $env:DATABASE_URL="postgresql://postgres:postgres@localhost:5434/luxestay"
   npm run dev
   ```

3. **Chế độ chỉ chạy Frontend Mock (không cần Backend/DB):**
   ```powershell
   $env:NEXT_PUBLIC_DATA_MODE="mock"
   npm run dev:web
   ```

---

## 2. Kiến Trúc Triển Khai 1 Vercel Project (Vercel Services + Neon Postgres)

File cấu hình [vercel.json](../vercel.json) ở thư mục gốc chia 1 Vercel Project thành 2 service build độc lập nhưng deploy nguyên tử (atomic) chung 1 domain:

- **`frontend` (`apps/web`, Next.js 16):**
  - Build: `cd ../.. && npx turbo run build --filter=@luxestay/web...`
  - Nhận **Service Binding** `API_BASE_URL` (URL nội bộ trỏ thẳng sang service `backend` khi SSR — không đi qua CDN/Firewall).
  - Trình duyệt gọi API cùng domain với `NEXT_PUBLIC_API_BASE_URL=/` -> mọi request tới `/api/v1/*` dùng chung origin nên cookie `luxestay_session` (`HttpOnly; SameSite=Lax; Secure`) hoạt động đồng nhất trên cả Production và Preview URLs.
- **`backend` (`apps/api`, Hono 4 trên Vercel Functions / Fluid Compute):**
  - Entrypoint: `src/server.ts` (lazy-init an toàn lúc build, tái sử dụng `pg.Pool` kết hợp `attachDatabasePool` từ `@vercel/functions`).
  - Build: `cd ../.. && node -e "require('node:fs').rmSync('apps/api/dist',{recursive:true,force:true})" && npx turbo run build --filter=@luxestay/contracts --filter=@luxestay/domain && npm run db:prepare --workspace=@luxestay/api`
    - *Lưu ý:* Xóa `apps/api/dist` trước khi `@vercel/backends` đóng gói để Vercel luôn compile `src/server.ts` qua Rolldown sang `.mjs` (ESM sạch), không load nhầm `dist/app.js` theo chế độ CommonJS.
    - Tự động chạy `db:prepare` (idempotent migrate + seed lần đầu nếu DB chưa có dữ liệu) ngay trong bước build của Vercel khi `STORAGE_DRIVER=database`.
  - Nhận toàn bộ traffic công khai khớp `/api/v1/(.*)` và `/health`.
- **Database:** **Neon Serverless Postgres** (Marketplace native trên Vercel), giữ nguyên driver `pg` + `drizzle-orm/node-postgres` để hỗ trợ đầy đủ interactive transaction và khóa hàng `SELECT ... FOR UPDATE` chống đặt trùng phòng (Phase 3A).

---

## 3. Các Bước Tạo Lại Project Trên Vercel & Kết Nối Neon Postgres

### Bước 1: Tạo lại Project từ GitHub trên Vercel
- **Qua Vercel Dashboard:**
  1. Vào [vercel.com/new](https://vercel.com/new) -> chọn Import repo `vhung20h5-star/LuxeStay`.
  2. **QUAN TRỌNG:** Giữ **Root Directory** là **`.` (thư mục gốc monorepo)** — *không* chọn `apps/web`, vì `vercel.json` ở gốc sẽ tự điều phối cả `frontend` và `backend`.
- **Hoặc qua Vercel CLI:**
  ```powershell
  npx vercel login
  npx vercel link
  ```

### Bước 2: Tạo Database Neon Postgres qua Vercel Marketplace
- **Qua Vercel Dashboard:** Trong Project vừa tạo -> tab **Storage** -> **Create Database** -> chọn **Neon (Serverless Postgres)** -> tạo gói Free và chọn region gần Functions (ví dụ `iad1` hoặc `sin1`).
- **Hoặc qua Vercel CLI:**
  ```powershell
  npx vercel install neon
  ```
- Vercel Marketplace sẽ tự động gắn các biến `DATABASE_URL` (pooled) và `DATABASE_URL_UNPOOLED` (direct) vào Production & Preview environments.

### Bước 3: Khai báo Environment Variables trên Vercel Project
Vào **Project Settings -> Environment Variables** (áp dụng cho cả **Production** và **Preview**):

| Biến môi trường | Giá trị khuyến nghị | Bắt buộc? | Ghi chú |
| :--- | :--- | :---: | :--- |
| `NEXT_PUBLIC_DATA_MODE` | `api` | Có | Bật chế độ kết nối backend thật |
| `NEXT_PUBLIC_API_BASE_URL` | `/` | Có | Gọi API same-origin `/api/v1/*` |
| `API_BASE_URL` | *(Không set tay)* | Tự động | Được cấp bởi Vercel Service Binding trong `vercel.json` |
| `STORAGE_DRIVER` | `database` | Có | Dùng Neon Postgres thay vì RAM |
| `DATABASE_URL` | *(Đã có từ Neon)* | Có | Connection string pooled (`?sslmode=require`) |
| `PAYMENT_WEBHOOK_SECRET` | Chuỗi random >= 32 ký tự | Có | Bắt buộc khi `NODE_ENV=production` |
| `PAYMENT_SANDBOX_ENABLED` | `true` *(demo)* / `false` *(live)* | Tùy chọn | Bật `true` để test trang thanh toán mô phỏng `/payments/[txId]` |
| `SESSION_TTL_DAYS` | `7` | Tùy chọn | Thời hạn cookie phiên đăng nhập |

> Gợi ý tạo `PAYMENT_WEBHOOK_SECRET` nhanh bằng Node.js:
> ```powershell
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### Bước 4: Migration & Seed vào Neon Database
- **Tự động khi deploy Vercel:** `vercel.json` đã gắn `npm run db:prepare --workspace=@luxestay/api` trong `buildCommand` của `backend`. Khi Vercel build với `STORAGE_DRIVER=database`, các biến Neon Secret (`DATABASE_URL_UNPOOLED`, `DATABASE_URL`) được inject sẵn trong build container để tự động chạy Drizzle migrations (`0000`–`0003`) và seed dữ liệu mẫu **1 lần đầu** khi bảng `properties` chưa có bản ghi (an toàn 100%, không ghi đè dữ liệu Host đã chỉnh sửa về sau).
- **Hoặc chạy thủ công từ máy local:** *(Lưu ý: Các biến Neon do Marketplace tạo có kiểu **Secret/Sensitive**, nên `vercel env pull` sẽ ghi `[SENSITIVE]` thay vì chuỗi thật. Hãy vào Vercel Project -> **Storage** -> Neon DB -> **Open in Neon Console / Show secret** để copy `DATABASE_URL_UNPOOLED`)*:

```powershell
$env:DATABASE_URL_UNPOOLED="postgresql://<user>:<password>@<ep-host>.neon.tech/neondb?sslmode=require"
npm run db:migrate
npm run db:seed
```

> Lưu ý: [apps/api/src/db/migrate.ts](../apps/api/src/db/migrate.ts) tự động ưu tiên `DATABASE_URL_UNPOOLED` (kết nối trực tiếp của Neon) khi chạy DDL migration và fallback sang `DATABASE_URL`. Script `db:seed` hoàn toàn idempotent — tạo 12 chỗ nghỉ, 51 tiện ích, 2 voucher, 3 đánh giá mẫu và 2 tài khoản quản trị:
> - **Host:** `host@luxestay.vn` / `host1234`
> - **Admin:** `admin@luxestay.vn` / `admin1234`

### Bước 5: Deploy & Kiểm Chứng Live URL
Push code lên nhánh `main` (hoặc chạy `npx vercel --prod`), sau đó kiểm tra:
1. `GET https://<your-domain>/health` -> HTTP `200`, `{ "ok": true, "data": { "status": "ok", "service": "luxestay-api" } }`
2. `GET https://<your-domain>/api/v1/catalog` -> HTTP `200`, đủ 12 chỗ nghỉ từ Neon Postgres
3. Mở `https://<your-domain>/` -> tải SSR đầy đủ giao diện, ảnh, bộ lọc, chuyển đổi `VI/EN` & `VNĐ/USD`
4. Đăng nhập `host@luxestay.vn` -> truy cập `/host` kiểm tra cookie phiên `luxestay_session` hoạt động ổn định
5. Thử đặt phòng, tra cứu tại `/bookings` và mở trang chi tiết `/stays/stay-01`

---

## 4. Phương Án Dự Phòng (2 Vercel Projects Chuẩn GA)

Nếu cần tách hoàn toàn chu kỳ deploy giữa Frontend và Backend (hoặc gặp giới hạn Beta của Vercel Services):
1. **Project 1 (`luxestay-api`):** Root Directory `apps/api`, bật *"Include files outside of the Root Directory in the Build Step"*, Build Command `cd ../.. && npx turbo run build --filter=@luxestay/api...`, gắn Neon Postgres + `STORAGE_DRIVER=database` + `CORS_ORIGINS=https://<web-domain>`.
2. **Project 2 (`luxestay-web`):** Root Directory `apps/web`, Build Command `cd ../.. && npx turbo run build --filter=@luxestay/web...`, cấu hình `NEXT_PUBLIC_DATA_MODE=api`, `NEXT_PUBLIC_API_BASE_URL=https://<api-domain>` (hoặc thêm Next.js `rewrites` proxy `/api/v1/:path*` trong `next.config.ts` để giữ cookie cùng domain).
