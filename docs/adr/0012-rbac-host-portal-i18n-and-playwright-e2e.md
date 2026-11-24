# ADR-0012: RBAC Host/Admin Portal, Client Locale/Currency Context & Playwright E2E

- **Trạng thái:** Accepted (Implemented in Phase 3B — `v0.6.0`)
- **Ngày:** 2026-11-24
- **Liên quan:** [ADR-0009](./0009-custom-session-auth-and-wishlist-sync.md) | [ADR-0011](./0011-availability-engine-seasonal-pricing-and-verified-reviews.md) | [PLAN.md](../PLAN.md)

---

## 1. Bối cảnh (Context)

Sau Phase 3A (`v0.5.0`), LuxeStay đã có đầy đủ luồng khách đặt phòng, lịch phòng trống chống đặt trùng, giá theo mùa và đánh giá xác thực. Để hoàn thiện nền tảng thương mại hai phía (two-sided hospitality platform) và kiểm chứng đầu-cuối trên trình duyệt thật, hệ thống cần giải quyết 3 bài toán còn lại của Phase 3 (`P3.3` & `P3.4`):

1. **Phân quyền & Cổng Chủ nhà/Quản trị (RBAC & Host Portal):** Hiện chưa có vai trò phân biệt khách lưu trú (`guest`), chủ nhà (`host`) và quản trị viên (`admin`), cũng chưa có giao diện quản trị danh sách chỗ nghỉ, khóa ngày / ghi đè giá `property_availability`, hoàn tất lưu trú của khách và theo dõi doanh thu.
2. **Đa ngôn ngữ (`vi`/`en`) & Đa tiền tệ (`VND`/`USD`):** Nút `VNĐ • Tiếng Việt` trên `Navbar` đang là nhãn tĩnh. Cần cơ chế chuyển đổi mượt mà không gây gián đoạn URL routing (`/stays/[id]`, `/bookings`, `/host`) và không gây lỗi SSR Hydration trên Next.js 16.
3. **Kiểm thử End-to-End trình duyệt thật:** Bộ `node:test` hiện bao phủ tốt unit & in-process integration tests, nhưng cần bộ **Playwright E2E** chạy xuyên suốt Frontend Next.js ↔ Backend Hono API trên Chromium để bảo đảm không hồi quy UI/Cookie/Routing trong CI.

---

## 2. Quyết định Kiến trúc (Decisions)

### 2.1. RBAC (`guest | host | admin`) & Quyền sở hữu Chỗ nghỉ (`properties.owner_user_id`)
- Bổ sung cột `users.role` (`text`, mặc định `'guest'`, hợp lệ `'guest' | 'host' | 'admin'`) và `properties.owner_user_id` (`text`, FK → `users.id ON DELETE SET NULL`) qua **Migration `0003` (`0003_phase3b_rbac_host_portal.sql`)**.
- **Seed tài khoản mẫu idempotent** (cả PostgreSQL lẫn In-Memory cho dev/QA/E2E):
  - `host@luxestay.vn` / `host1234` (`id: USR-HOST-01`, `role: "host"`) sở hữu `stay-01` → `stay-06`.
  - `admin@luxestay.vn` / `admin1234` (`id: USR-ADMIN-01`, `role: "admin"`) có toàn quyền trên tất cả chỗ nghỉ & đơn đặt phòng.
- **Quy tắc phân quyền máy chủ (server-enforced):**
  - Mọi endpoint `/api/v1/host/*` yêu cầu phiên đăng nhập hợp lệ (`401 UNAUTHORIZED` nếu chưa đăng nhập) và `role ∈ { "host", "admin" }` (`403 FORBIDDEN` nếu là `guest`).
  - Với mọi thao tác theo `propertyId` (sửa/xóa chỗ nghỉ, cập nhật `property_availability`, xem hoặc hoàn tất đơn thuộc chỗ nghỉ đó), `host` chỉ được phép thao tác khi `property.ownerUserId === authUser.id`; `admin` được phép trên toàn bộ hệ thống.
  - Không cho phép xóa chỗ nghỉ đang có đơn `confirmed` hoặc `pending_payment` chưa hết hạn (`409 CONFLICT`).
  - Endpoint `POST /api/v1/reservations/:bookingId/complete` cho phép `host` (đúng chủ chỗ nghỉ) và `admin` đánh dấu hoàn tất lưu trú ngay cả khi `PAYMENT_SANDBOX_ENABLED=false` (production mode).
- **Báo cáo doanh thu thuần (`computeHostAnalytics`):** Tính toán doanh thu xác nhận, doanh thu hoàn tất, tỷ lệ hủy, giá trị trung bình đơn, phân bổ theo chỗ nghỉ và theo tháng nằm hoàn toàn trong `@luxestay/domain/src/host.ts`.

### 2.2. Đa ngôn ngữ & Đa tiền tệ không đổi URL (`LocaleContext`)
- Tách riêng module thuần `packages/domain/src/locale.ts` chứa bộ từ điển `vi` / `en`, hàm `translate(locale, key, params?)` và `formatMoney(amountVnd, currency, locale)` (quy đổi `VND` ↔ `USD` theo tỷ giá chuẩn `25.000 VNĐ / 1 USD`).
- Tạo **`LocaleContext`** tách biệt hoàn toàn khỏi `BookingContext` và `AuthContext` (`apps/web/src/features/locale/LocaleContext.tsx`), lưu cấu hình `locale` & `currency` vào `localStorage` qua **`useSyncExternalStore`** với `getServerSnapshot` cố định (`vi`, `VND`) để đảm bảo **0 SSR hydration mismatch** và **không làm thay đổi cấu trúc URL** hiện có.
- Thay nhãn tĩnh trên `Navbar` bằng bộ chọn trực quan `VI / EN` và `VNĐ / USD`, tự động cập nhật ngữ cảnh hiển thị giá và câu chữ trên toàn bộ giao diện chính.

### 2.3. Kiểm thử End-to-End bằng Playwright (`e2e/`)
- Cài đặt `@playwright/test` ở root monorepo, cấu hình `playwright.config.ts` khởi động tự động đồng thời `@luxestay/api` (`:4000`) và `@luxestay/web` (`:3000`, `NEXT_PUBLIC_DATA_MODE=api`).
- Bao phủ 3 luồng E2E trọng yếu trong `e2e/luxestay.spec.ts`:
  1. Tìm kiếm, lọc, chuyển ngôn ngữ/tiền tệ (`VI/VNĐ` ↔ `EN/USD`) và đồng bộ URL.
  2. Đặt phòng trên `/stays/[id]` có phụ thu mùa, tra cứu vé `/bookings/[bookingId]`, hoàn tất lưu trú & gửi đánh giá xác thực hiển thị badge **"Đã xác thực lưu trú"**.
  3. RBAC & Cổng Chủ nhà `/host`: chặn khách chưa đăng nhập → đăng nhập Host → xem doanh thu & chỗ nghỉ sở hữu → khóa ngày/ghi đè giá trên lịch phòng → xác nhận lịch trống trên `/stays/[id]` cập nhật tức thì.
- Bổ sung lệnh `npm run test:e2e` và tích hợp job `e2e` vào `.github/workflows/ci.yml`.

---

## 3. Hệ quả & Đánh đổi (Consequences)

- **Ưu điểm:**
  - Kiến trúc 3 Context độc lập (`AuthContext`, `LocaleContext`, `BookingProvider`) giữ hiệu năng render sạch sẽ và tách biệt trách nhiệm rõ ràng.
  - RBAC được kiểm tra chặt chẽ ở tầng API service/route (không chỉ ẩn nút trên UI), sẵn sàng mở rộng đa chủ nhà trong tương lai.
  - Playwright E2E xác thực trọn vẹn hợp đồng FE ↔ BE, Cookie `HttpOnly`, SSR và luồng người dùng thật.
- **Đánh đổi & giới hạn có chủ đích:**
  - Tỷ giá `USD` sử dụng hằng số tham khảo (`25.000 VNĐ/USD`) cho hiển thị; mọi giao dịch lưu trữ trong PostgreSQL vẫn giữ nguyên đơn vị chuẩn `VND` để tránh sai lệch làm tròn kế toán.
  - Mô tả từng chỗ nghỉ trong seed catalog vẫn giữ nội dung tiếng Việt nguyên bản; khung giao diện (chrome, điều hướng, bộ lọc, nhãn giá, đặt phòng, cổng chủ nhà) được dịch đầy đủ `vi`/`en`.
