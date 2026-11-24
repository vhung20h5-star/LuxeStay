# ADR-0002: Vòng đời `BookingSession`, Seeding một chiều & Tính giá chuẩn trên Server

- **Status:** Accepted
- **Date:** 2026-11-24 (khởi tạo `bookingSession` ngày 2026-11-21; mở rộng server API ngày 2026-11-24)
- **Deciders:** Engineering Team (`travel-service`)
- **Related Docs:** [PRD](../PRD.md) | [ARCHITECTURE](../ARCHITECTURE.md) | [Spec gốc](../superpowers/specs/2026-11-21-booking-session-deepening-design.md)
- **Supersedes / Superseded by:** None

---

## 1. Context (Bối cảnh & Vấn đề)

Trong luồng đặt phòng ban đầu:
1. `SearchBar` và `PropertyModal`/`BookingCheckoutModal` bị đứt gãy: chọn lịch 3 đêm và 4 khách ở `SearchBar` nhưng khi mở phòng vẫn bị ép về mặc định `2 đêm, 2 khách`, làm lệch ngày trả phòng ở bước checkout.
2. `PropertyModal` và `BookingCheckoutModal` phải tự lắp lại chuỗi 5 bước tính giá & kẹp sức chứa, gây lặp mã và sai lệch khi sửa công thức.
3. Khi chỉ có mock adapter phía trình duyệt, tổng tiền (`pricing.total`) do trình duyệt tự tính — không an toàn nếu nối thanh toán hoặc lưu đơn thật.

---

## 2. Decision Drivers (Tiêu chí quyết định)

- **Một nguồn chân lý báo giá (`BookingQuote`):** Mọi màn hình (`PropertyModal`, `BookingCheckoutModal`, `BookingSuccessModal`) và API server phải ra cùng một con số chính xác từng đồng.
- **Bảo toàn trải nghiệm nhưng không rò rỉ dữ liệu chéo:** Đóng rồi mở lại cùng một chỗ nghỉ phải giữ nguyên đêm/khách/tiện ích đã chọn; đổi chỗ nghỉ hoặc đổi lịch ở `SearchBar` phải tạo phiên mới sạch.
- **Authoritative Server Pricing:** Client chỉ gửi ý định đặt phòng (`ServerReservationIntent`), không tin tưởng `pricing` từ client.
- **An toàn hủy thao tác bất đồng bộ:** Đóng `BookingCheckoutModal` khi đang gửi đơn phải hủy sạch qua `AbortSignal`.

---

## 3. Considered Options (Các phương án đã cân nhắc)

1. **Option A (Đã chọn) — Pure `BookingSession` State Machine (`src/lib/bookingSession.ts`) + Shared Server Recalculation (`POST /api/reservations`):**
   - State machine rõ ràng `idle -> previewing -> checking-out -> confirmed -> idle`.
   - Seed một chiều qua `searchSeedKey` từ `SearchCriteria` (hỗ trợ `YYYY-MM-DD`, `dd/MM/yyyy`, `dd/MM` vắt qua năm).
   - Route Handler `src/app/api/reservations/route.ts` gọi `processServerReservationIntent(intent, PROPERTIES)` dùng lại chính `validateCheckoutGuestInput` và `deriveBookingQuote`.
2. **Option B — Đồng bộ 2 chiều giữa `BookingSession` và `SearchBar`:**
   - Gây nhiễu: sửa số đêm khi xem thử 1 phòng sẽ vô tình thay đổi kết quả lọc danh sách ngoài trang chủ.
3. **Option C — Cho phép Client gửi thẳng `BookingQuote` lên Server để lưu:**
   - Rủi ro bảo mật nghiêm trọng (client có thể sửa tổng tiền, số đêm hoặc giá tiện ích trong request body).

---

## 4. Decision Outcome (Quyết định cuối cùng)

- Tập trung toàn bộ vòng đời phiên đặt phòng, kẹp biên (`nights ∈ [1..30]`, `adults ∈ [1..property.maxGuests]`), lọc tiện ích hợp lệ (`paid` / `free-reservation`), công thức tính giá (`nightsTotal + 150.000 + amenitiesFee - 100.000`) và kiểm tra thông tin khách Việt Nam (`0/+84`, email) vào `src/lib/bookingSession.ts`.
- Cung cấp endpoint `POST /api/reservations` nhận `ServerReservationIntent` (chỉ chứa `propertyId`, `checkInSeed`, `nights`, `guests`, `selectedAmenityIds`, `guestInfo`, `paymentMethod`), tính lại toàn bộ báo giá từ `PROPERTIES` + `AMENITY_CATALOG` và trả về `BookingDetails` đóng băng kèm mã `LX-XXXXXX` sinh bằng `node:crypto` (`randomUUID`).

---

## 5. Consequences (Hệ quả)

### Positive (Tích cực)
- Báo giá đồng nhất tuyệt đối giữa Client preview, Checkout và Server receipt.
- Đảm bảo bất biến đầu vào ở cả client lẫn server (kể cả khi request gửi trực tiếp qua `curl`/API).
- Hủy request giữa chừng qua `AbortSignal` không bao giờ làm mở nhầm `BookingSuccessModal` sau khi người dùng đã đóng checkout.

### Negative & Trade-offs (Đánh đổi)
- Nếu sau này đổi công thức giá (như áp mã voucher động hoặc giá theo mùa), cần đảm bảo dữ liệu giá mới khả dụng trên cả server (Phase 1–2).
- `POST /api/reservations` hiện đang stateless (chưa ghi Database); cần bổ sung persistence ở Phase 1.

### Risks & Follow-ups (Rủi ro & Hành động tiếp theo)
- Cần hoàn thiện **P0.2** trong [PLAN.md](../PLAN.md) để `BookingContext` không fallback sang mock browser adapter khi server trả lỗi `400`/`404`/`422`.

---

## 6. Validation & References (Kiểm chứng & Tham chiếu)

- Files affected: `src/lib/bookingSession.ts`, `src/app/api/reservations/route.ts`, `src/context/BookingContext.tsx`, `src/components/property/PropertyModal.tsx`, `src/components/booking/BookingCheckoutModal.tsx`, `src/components/booking/BookingSuccessModal.tsx`
- Tests: `tests/booking-session.test.ts` (11 test cases)
- Commits: `61cf2d6`, `abedd20`
