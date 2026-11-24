# ADR-0010: Cổng thanh toán Sandbox chuẩn HMAC-SHA256 Webhook, Idempotency & Notification Log

- **Status:** Accepted
- **Date:** 2026-11-24
- **Deciders:** Engineering Team (`travel-service`)
- **Related Docs:** [PRD](../PRD.md) | [ARCHITECTURE](../ARCHITECTURE.md) | [PLAN](../PLAN.md) | [ADR-0002](./0002-booking-session-and-authoritative-server-pricing.md) | [ADR-0008](./0008-postgresql-drizzle-database-layer.md)
- **Supersedes / Superseded by:** None

---

## 1. Context (Bối cảnh & Vấn đề)

Ở Phase 1 (`v0.3.0`), mọi phương thức thanh toán (`momo`, `vnpay`, `card`, `hotel`) đều lập tức chuyển đơn đặt phòng sang trạng thái `confirmed` mà không qua bước thanh toán trực tuyến, không có giao dịch thanh toán, không xác thực webhook và không lưu/gửi email xác nhận vé điện tử.

Phase 2 (`P2.3`) yêu cầu chuyển sang quy trình thương mại chuẩn thực tế:
- Phân biệt rõ luồng trả sau tại chỗ nghỉ (`hotel` → `confirmed` ngay) với luồng thanh toán trực tuyến (`vnpay`, `momo`, `card` → `pending_payment` → cổng thanh toán → webhook cập nhật trạng thái).
- Chạy kiểm chứng toàn bộ vòng đời (thành công, thất bại, hết hạn, webhook gửi trùng) ngay trên máy local/CI mà không cần merchant secret thật từ VNPAY/MoMo/Stripe, nhưng giữ **đúng 100% kiến trúc bảo mật webhook** (chữ ký `HMAC-SHA256` + idempotency key).

---

## 2. Decision Drivers (Tiêu chí quyết định)

- **Authoritative State Transitions:** Client không bao giờ tự gọi API "đánh dấu đã thanh toán"; trạng thái đơn chỉ chuyển từ `pending_payment` sang `confirmed` / `payment_failed` / `expired` thông qua Webhook được ký `HMAC-SHA256`.
- **Idempotency by Design:** Mọi webhook mang `eventId` duy nhất lưu vào bảng `payment_webhook_events`; gửi lại cùng `eventId` nhiều lần phải trả `200 OK` (`deduplicated: true`) và tuyệt đối không đổi trạng thái hay gửi email lần 2.
- **Pluggable Notification Delivery:** Mọi email vé điện tử / xác nhận hủy đơn được tạo qua domain template chuẩn, lưu bền vững vào `notification_logs` (cho phép xem trực tiếp bản xem trước email trên `/bookings/[bookingId]`) và sẵn sàng chuyển tiếp ra webhook/SMTP ngoài khi cấu hình `NOTIFICATION_WEBHOOK_URL`.

---

## 3. Considered Options (Các phương án đã cân nhắc)

1. **Option A (Đã chọn) — Built-in Payment Gateway Sandbox chuẩn Production Flow:**
   - Mở rộng `ReservationStatusSchema`: `pending_payment | confirmed | payment_failed | expired | cancelled`.
   - Bảng mới: `payment_transactions`, `payment_webhook_events`, `notification_logs`.
   - Route web `/payments/[transactionId]` hiển thị giao diện cổng thanh toán mô phỏng VNPAY QR / MoMo / Thẻ quốc tế kèm đồng hồ đếm ngược 15 phút và 3 nút mô phỏng kết quả (thành công / thất bại / hết hạn).
   - Endpoint `POST /api/v1/payments/:transactionId/simulate` (chỉ bật khi `PAYMENT_SANDBOX_ENABLED=true`) tự ký payload bằng `HMAC-SHA256` (`PAYMENT_WEBHOOK_SECRET`) và gọi đúng bộ xử lý webhook `POST /api/v1/payments/webhook/:provider` (kiểm tra header `x-luxestay-signature` bằng `crypto.timingSafeEqual`).
2. **Option B — Đổi trạng thái trực tiếp không qua webhook:**
   - Thiếu xác thực chữ ký và idempotency, phải viết lại gần như toàn bộ khi nối cổng thật.
3. **Option C — Kết nối trực tiếp VNPAY/MoMo/Stripe sandbox thật ngay:**
   - Yêu cầu tài khoản merchant, callback URL public (`ngrok`/domain thật), không thể chạy khép kín trong CI.

---

## 4. Decision Outcome (Quyết định cuối cùng)

- Mở rộng `ReservationStatusSchema` trong `@luxestay/contracts` và hàm chuyển trạng thái thuần `evaluatePaymentWebhookTransition` trong `@luxestay/domain`.
- `POST /api/v1/reservations`:
  - `paymentMethod === "hotel"`: tạo đơn `status: "confirmed"` và gửi ngay email xác nhận vé điện tử vào `notification_logs`.
  - `paymentMethod ∈ {"vnpay", "momo", "card"}`: tạo đơn `status: "pending_payment"` (hết hạn sau 15 phút) + tạo bản ghi `payment_transactions` (`TXN-XXXXXX`), trả về kèm trường `payment` trên `BookingDetails` để Frontend chuyển sang `/payments/[transactionId]`.
- `POST /api/v1/payments/webhook/:provider`:
  - Bắt buộc xác thực chữ ký `HMAC-SHA256` từ raw JSON body với `PAYMENT_WEBHOOK_SECRET` (`401 UNAUTHORIZED` nếu sai chữ ký).
  - Kiểm tra `eventId` chống xử lý trùng (idempotency).
  - Cập nhật `payment_transactions` & `reservations` (`succeeded → confirmed`, `failed → payment_failed`, `expired → expired`); khi chuyển sang `confirmed`, tự động ghi email vé điện tử vào `notification_logs`.
- Khi hủy đơn (`PATCH /api/v1/reservations/:bookingId/cancel`): hỗ trợ hủy đơn ở trạng thái `pending_payment` (không cần `freeCancellation` vì chưa thu tiền) hoặc `confirmed` (có kiểm tra `freeCancellation`), và gửi email thông báo hủy vào `notification_logs`.

---

## 5. Consequences (Hệ quả)

### Positive (Tích cực)
- Khi tích hợp VNPAY/MoMo/Stripe production sau này, chỉ cần viết thêm provider adapter tạo redirect URL và ánh xạ payload sang `PaymentWebhookPayload`; toàn bộ máy trạng thái, idempotency, và notification pipeline giữ nguyên 100%.
- Người dùng và QA có thể kiểm thử trọn vẹn các kịch bản thành công, thất bại, hết hạn và xem email vé điện tử ngay trong ứng dụng.

### Negative & Trade-offs (Đánh đổi)
- Endpoint `/simulate` chỉ dành cho sandbox/dev và phải tắt (`PAYMENT_SANDBOX_ENABLED=false`) ở môi trường production thật.

---

## 6. Validation & References (Kiểm chứng & Tham chiếu)

- Files affected: `packages/contracts/src/payment.ts`, `packages/domain/src/bookingSession.ts`, `apps/api/src/db/schema/payments.ts`, `apps/api/src/modules/payments/*`, `apps/api/src/modules/notifications/*`, `apps/web/src/app/(main)/payments/[transactionId]/page.tsx`, `apps/web/src/features/payment/PaymentGatewayView.tsx`
- Verification: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` + kiểm chứng webhook HMAC hợp lệ/sai chữ ký, idempotency gửi trùng, và PostgreSQL 16 Docker E2E.
