# ADR-0011: Availability Engine theo Ngày, Khóa Chống Double-Booking, Giá Mùa vụ & Đánh giá Xác thực (`P3.1` & `P3.2`)

- **Status:** Accepted
- **Date:** 2026-11-24
- **Deciders:** Engineering Team (`travel-service`)
- **Related Docs:** [PRD](../PRD.md) | [ARCHITECTURE](../ARCHITECTURE.md) | [PLAN](../PLAN.md) | [ADR-0008](./0008-postgresql-drizzle-database-layer.md) | [ADR-0010](./0010-payment-sandbox-webhook-and-notifications.md)
- **Supersedes / Superseded by:** None

---

## 1. Context (Bối cảnh & Vấn đề)

Đến hết Phase 2 (`v0.4.0`), LuxeStay đã hoàn thiện PostgreSQL 16 + Drizzle ORM, xác thực phiên `HttpOnly`, mã giảm giá động và cổng thanh toán Sandbox có webhook `HMAC-SHA256`. Tuy nhiên, hai lỗ hổng nghiệp vụ OTA cốt lõi vẫn còn tồn tại:
1. **Chưa kiểm soát tồn kho theo ngày & chống đặt trùng (double-booking):** Hai khách có thể đồng thời đặt cùng một villa nguyên căn cho cùng khoảng ngày; giá phòng đang phẳng theo đêm không phân biệt ngày thường, cuối tuần hay lễ Tết, và chủ nhà chưa có bảng ghi đè giá/khóa ngày.
2. **Đánh giá khách hàng mới chỉ là dữ liệu tĩnh từ seed:** Chưa có luồng cho khách đã hoàn tất lưu trú gửi đánh giá xác thực (`Verified Review`) gắn chặt với `booking_id` và tự tính lại điểm trung bình `rating` / `review_count`.

---

## 2. Decision Drivers (Tiêu chí quyết định)

- **Hỗ trợ cả Villa nguyên căn lẫn Hotel/Resort nhiều phòng:** Tôn trọng `guests.rooms` đã có trên hệ thống thay vì ép mọi chỗ nghỉ chỉ có 1 đơn vị.
- **Chống race-condition ở tầng Database:** Hai yêu cầu `POST /api/v1/reservations` đồng thời trên cùng `property_id` phải được tuần tự hóa bằng khóa giao dịch PostgreSQL (`SELECT ... FOR UPDATE`) hoặc khóa tương đương trong chế độ `memory`.
- **Giá mùa vụ minh bạch, thuần túy, dùng chung FE ↔ BE:** Toàn bộ quy tắc giá cuối tuần/ngày lễ/ghi đè theo ngày nằm trong deep module thuần `@luxestay/domain/availability`, đảm bảo báo giá hiển thị trên UI và giá tính chuẩn phía server khớp nhau 100%.
- **Đánh giá xác thực chuẩn OTA nhưng dễ kiểm thử:** Chỉ cho phép gửi 1 đánh giá cho mỗi đơn đã `completed` (hoặc `confirmed` đã qua ngày `checkOut`), đồng thời có endpoint hoàn tất lưu trú (dành cho Chủ nhà ở `P3.3` và Dev Sandbox ở môi trường dev/test).

---

## 3. Considered Options (Các phương án đã cân nhắc)

1. **Option A (Đã chọn) — Tồn kho theo ngày (`properties.inventory_count` + `property_availability`) + Khóa giao dịch `FOR UPDATE` theo `property_id` + Quy tắc giá phân tầng + Trạng thái `completed` cho Verified Review:**
   - Hỗ trợ đồng thời `inventoryCount = 1` (villa/homestay/glamping) và `inventoryCount > 1` (hotel/resort nhiều phòng).
   - Khóa `SELECT id FROM properties WHERE id = $1 FOR UPDATE` trong transaction đặt phòng giúp kiểm tra tổng số phòng đang giữ (`confirmed` + `pending_payment` còn hạn `payment_expires_at > NOW()`) và ghi đơn mới nguyên tử.
   - Quy tắc giá theo từng đêm theo thứ tự ưu tiên: `(1) overridePrice` → `(2) Lễ Việt Nam cố định (+30%)` → `(3) Đêm cuối tuần T6/T7 (+20%)` → `(4) pricePerNight`.
2. **Option B — PostgreSQL `EXCLUDE USING gist` với `daterange`:**
   - Gọn cho mô hình nguyên căn 1 đơn vị nhưng không mở rộng được cho hotel/resort đặt nhiều phòng song song.
3. **Option C — Cho phép đánh giá ngay khi `confirmed` mà không kiểm tra hoàn tất lưu trú:**
   - Đơn giản nhưng làm suy giảm độ tin cậy của huy hiệu "Đánh giá xác thực".

---

## 4. Decision Outcome (Quyết định cuối cùng)

- **Migration `0002_phase3a_availability_reviews.sql`:**
  - Thêm `properties.inventory_count` (`integer NOT NULL DEFAULT 1`).
  - Tạo bảng `property_availability(property_id, date, is_blocked, override_price, inventory_override, note, updated_at)` khóa chính `(property_id, date)`.
  - Mở rộng bảng `reviews` với `booking_id` (`UNIQUE` tham chiếu `reservations.booking_id`), `user_id`, `is_verified`, `created_at`.
- **Deep Modules thuần mới trong `@luxestay/domain`:**
  - `availability.ts`: `enumerateStayDates`, `computeNightlyPrice`, `isReservationHoldingInventory`, `evaluatePropertyAvailability`, `buildAvailabilityCalendar`.
  - `reviews.ts`: `evaluateReviewEligibility`, `recalculatePropertyRating`.
- **Endpoints mới trên `@luxestay/api`:**
  - `GET /api/v1/properties/:id/availability?from=YYYY-MM-DD&to=YYYY-MM-DD`
  - `POST /api/v1/reservations/:bookingId/complete`
  - `POST /api/v1/properties/:id/reviews`
- **Cập nhật `POST /api/v1/reservations`:** Thực thi kiểm tra tồn kho + tính giá mùa vụ + lưu đơn trong khóa giao dịch nguyên tử; trả `409 CONFLICT` nếu ngày bị khóa hoặc không đủ số phòng.

---

## 5. Consequences (Hệ quả)

### Positive (Tích cực)
- Triệt tiêu double-booking kể cả dưới tải đồng thời, tự động giải phóng phòng ngay khi đơn bị hủy, thất bại hoặc hết hạn thanh toán 15 phút.
- Đặt nền tảng sẵn sàng 100% cho lịch quản trị giá/khóa ngày của Chủ nhà ở **Phase 3B (`P3.3`)**.
- Điểm đánh giá và số lượng review luôn nhất quán nguyên tử với dữ liệu thực tế.

### Negative & Trade-offs (Đánh đổi)
- Quy tắc ngày lễ cố định theo dương lịch (`01/01`, `30/04–01/05`, `02/09`, `24–25/12`, `31/12`); các dịp lễ âm lịch (Tết Nguyên Đán, Giỗ Tổ) sẽ được chủ nhà thiết lập linh hoạt qua `overridePrice` theo từng năm.

---

## 6. Validation & References (Kiểm chứng & Tham chiếu)

- Files affected: `packages/contracts/src/availability.ts`, `packages/domain/src/availability.ts`, `packages/domain/src/reviews.ts`, `apps/api/src/db/migrations/0002_phase3a_availability_reviews.sql`, `apps/api/src/modules/availability/*`, `apps/api/src/modules/reviews/*`, `apps/web/src/features/property/AvailabilityCalendar.tsx`, `apps/web/src/features/booking/BookingDetailView.tsx`.
- Verification: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` + kiểm chứng đồng thời (concurrent double-booking test) trực tiếp trên PostgreSQL 16 Docker.
