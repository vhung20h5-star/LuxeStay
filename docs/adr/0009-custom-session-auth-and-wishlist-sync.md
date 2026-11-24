# ADR-0009: Custom Session Auth (`scrypt` + OTP) & Đồng bộ Wishlist trên `@luxestay/api`

- **Status:** Accepted
- **Date:** 2026-11-24
- **Deciders:** Engineering Team (`travel-service`)
- **Related Docs:** [PRD](../PRD.md) | [ARCHITECTURE](../ARCHITECTURE.md) | [PLAN](../PLAN.md) | [ADR-0006](./0006-app-ports-persistence-and-split-domain-contexts.md) | [ADR-0008](./0008-postgresql-drizzle-database-layer.md)
- **Supersedes / Superseded by:** None

---

## 1. Context (Bối cảnh & Vấn đề)

Sau Phase 1 (`v0.3.0`), `AuthModal` trên `@luxestay/web` vẫn là prototype UI-only và `FavoritesRepository` chỉ lưu danh sách yêu thích ở `localStorage`. Ngoài ra, việc tra cứu đơn đặt phòng ở `/bookings` đang yêu cầu nhập thủ công `bookingId` + `contact` mỗi lần mở.

Phase 2 (`P2.1`) cần một cơ chế xác thực thật đáp ứng:
- Chạy ngay được ở môi trường local và CI **không bắt buộc khóa API bên thứ ba** (Google OAuth / SMS gateway), nhưng vẫn có seam mở rộng rõ ràng để gắn OAuth/SMS thật khi deploy production.
- Bảo mật tốt theo chuẩn hiện đại: không lưu mật khẩu dạng thô, không lưu JWT nhạy cảm trong `localStorage` dễ bị XSS đọc trực tiếp, có khả năng thu hồi phiên (revocation) tức thì phía server.
- Đồng bộ mượt Wishlist giữa khách chưa đăng nhập (`localStorage`) và tài khoản đã đăng nhập (`user_favorites` trong PostgreSQL), đồng thời gắn chủ sở hữu (`user_id`) vào các đơn đặt phòng mới.

---

## 2. Decision Drivers (Tiêu chí quyết định)

- **Zero External Secret Blockers:** Đăng ký/đăng nhập Email+Mật khẩu và OTP hoạt động 100% cục bộ không cần dịch vụ ngoài.
- **Native Crypto, Zero Native Addons:** Dùng `node:crypto` (`scrypt`, `randomBytes`, `createHash`, `timingSafeEqual`) — không cần cài `bcrypt` native binary hay thư viện nặng.
- **Revocable HttpOnly Session Cookie:** Lưu hash SHA-256 của session token trong bảng `user_sessions` (PostgreSQL hoặc in-memory repository khi `STORAGE_DRIVER=memory`), cấp qua cookie `HttpOnly; SameSite=Lax; Path=/` (và `Secure` khi `NODE_ENV=production`).
- **Context Isolation:** Tách `AuthContext` riêng trong `apps/web/src/features/auth/AuthContext.tsx`, không nhồi auth state vào `BookingContext`.

---

## 3. Considered Options (Các phương án đã cân nhắc)

1. **Option A (Đã chọn) — Custom Auth tự chủ trên `@luxestay/api` với `scrypt` + OTP + HttpOnly Session Cookie + OAuth Seam:**
   - Hỗ trợ đầy đủ `register`, `login`, `otp/request`, `otp/verify`, `me`, `logout`.
   - Khi `NODE_ENV !== "production"`, `POST /api/v1/auth/otp/request` trả kèm `devCode` giúp thử nghiệm và kiểm thử tự động trực tiếp không cần SMS/SMTP provider.
   - Bổ sung bảng `users`, `user_sessions`, `otp_challenges`, `user_favorites` và cột nullable `reservations.user_id`.
2. **Option B — JWT Bearer lưu trong `localStorage`:**
   - Khó thu hồi phiên ngay khi đăng xuất/đổi mật khẩu và phơi token trước rủi ro XSS.
3. **Option C — Bên thứ ba (Clerk / Auth0 / Google OAuth bắt buộc):**
   - Phụ thuộc khóa API ngoài, cản trở quá trình phát triển và chạy test tự động khép kín trên monorepo.

---

## 4. Decision Outcome (Quyết định cuối cùng)

- Thêm module `apps/api/src/modules/auth/` và `apps/api/src/modules/favorites/` với cặp repository song song (`memory` + `postgres` trên Drizzle ORM, migration `0001_phase2_commercialization.sql`).
- CORS trên `apps/api` bật `credentials: true` với danh sách origin tường minh từ `CORS_ORIGINS`; phía `@luxestay/web` gửi `credentials: "include"` cho các request API.
- Khi người dùng đăng nhập trên `@luxestay/web`:
  - `AuthContext` gọi `GET /api/v1/auth/me` khi mount để khôi phục phiên an toàn SSR.
  - Sau khi đăng nhập/đăng ký thành công, frontend gọi `PUT /api/v1/favorites` để hợp nhất (merge union) các ID yêu thích từ `localStorage` với danh sách trên server, rồi đồng bộ 2 chiều qua `POST /api/v1/favorites/:propertyId/toggle`.
  - Khi đặt phòng lúc đã đăng nhập, `apps/api` tự động gắn `userId` từ session middleware vào đơn, mở khóa danh sách **"Đơn đặt phòng của tôi"** (`GET /api/v1/reservations/my`) tại `/bookings` và cho phép chủ tài khoản xem/hủy trực tiếp đơn của mình.

---

## 5. Consequences (Hệ quả)

### Positive (Tích cực)
- Hoàn toàn tự chủ, không phụ thuộc secret bên thứ ba khi dev/test; hỗ trợ cả `STORAGE_DRIVER=memory` lẫn `STORAGE_DRIVER=database`.
- Phiên đăng nhập có thể thu hồi tức thì (`DELETE FROM user_sessions`), chống XSS đọc token.
- Seam `OAuthProviderSeam` sẵn sàng để cắm Google OAuth thật khi có `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

### Negative & Trade-offs (Đánh đổi)
- Cần cấu hình `CORS_ORIGINS` chính xác (không dùng `*`) để trình duyệt gửi cookie giữa `:3000` và `:4000`.
- `devCode` trong luồng OTP **bắt buộc** chỉ trả về khi `NODE_ENV !== "production"`; ở production phải cấu hình kênh gửi SMS/Email thật.

---

## 6. Validation & References (Kiểm chứng & Tham chiếu)

- Files affected: `packages/contracts/src/auth.ts`, `apps/api/src/db/schema/auth.ts`, `apps/api/src/db/migrations/0001_phase2_commercialization.sql`, `apps/api/src/middleware/auth.ts`, `apps/api/src/modules/auth/*`, `apps/api/src/modules/favorites/*`, `apps/web/src/features/auth/*`, `apps/web/src/shared/ports/authPort.ts`
- Verification: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` + kiểm chứng sống trên PostgreSQL 16 Docker.
