# Architecture Decision Records (ADR) — LuxeStay (`travel-service`)

Thư mục này lưu trữ toàn bộ **Architecture Decision Records (ADR)** của dự án **LuxeStay (`travel-service`)**. Mỗi ADR ghi lại **bối cảnh**, **các phương án đã cân nhắc**, **quyết định được chọn** và **hệ quả** cho một quyết định kiến trúc quan trọng, giúp chủ dự án, kỹ sư và AI agent hiểu rõ *tại sao* hệ thống được thiết kế như hiện tại trước khi thay đổi hoặc mở rộng.

---

## 1. Mục lục ADR (Decision Log)

| ID | Tiêu đề | Trạng thái | Ngày quyết định | Liên kết Commit / Spec |
| :---: | :--- | :---: | :---: | :--- |
| [0001](./0001-deep-module-architecture-and-domain-seams.md) | Kiến trúc Deep Modules thuần trong `src/lib` & Seams tường minh | **Accepted** | 2026-11-21 | `61cf2d6`..`0f26b7b`, [codebase-design](../../.agents/skills/codebase-design/SKILL.md) |
| [0002](./0002-booking-session-and-authoritative-server-pricing.md) | Vòng đời `BookingSession`, Seeding một chiều & Tính giá chuẩn trên Server (`/api/reservations`) | **Accepted** | 2026-11-24 | `61cf2d6`, `abedd20`, [Spec](../superpowers/specs/2026-11-21-booking-session-deepening-design.md) |
| [0003](./0003-stay-catalog-query-single-source-of-truth.md) | `StayCatalogQuery` làm nguồn chân lý duy nhất cho tìm kiếm, lọc và sắp xếp | **Accepted** | 2026-11-21 | `0476330`, `abedd20`, [Spec](../superpowers/specs/2026-11-21-stay-catalog-query-design.md) |
| [0004](./0004-amenity-projection-explorer-and-pricing-descriptors.md) | `PropertyAmenityProjection` cache `WeakMap`, Master–Detail Explorer & Pricing Descriptors | **Accepted** | 2026-11-21 | `96a3216`, `dc9d3a7`, [Spec](../superpowers/specs/2026-11-21-amenity-projection-explorer-design.md) |
| [0005](./0005-centralized-overlay-stack-coordinator.md) | Điều phối ngăn xếp lớp phủ tập trung (`OverlayStack` & `OverlayContext`) | **Accepted** | 2026-11-21 | `f467d47`, [Spec](../superpowers/specs/2026-11-21-overlay-stack-coordinator-design.md) |
| [0006](./0006-app-ports-persistence-and-split-domain-contexts.md) | Cô lập I/O qua `AppPorts` (`useSyncExternalStore`) & Tách Domain Contexts | **Accepted** | 2026-11-24 | `0f26b7b`, `abedd20`, [Spec](../superpowers/specs/2026-11-21-persistence-reservation-port-design.md) |
| [0007](./0007-monorepo-hono-zod-contracts.md) | Tái cấu trúc sang TypeScript Monorepo (`npm workspaces` + `Turborepo`), Hono API & Zod Contracts | **Accepted** | 2026-11-24 | Monorepo v0.2.0, [ARCHITECTURE](../ARCHITECTURE.md) |
| [0008](./0008-postgresql-drizzle-database-layer.md) | Chọn PostgreSQL 16 + Drizzle ORM cho Tầng Cơ sở Dữ liệu Phase 1 (`apps/api/src/db`) | **Accepted** | 2026-11-24 | Phase 1 (`P1.1`), [DB README](../../apps/api/src/db/README.md) |
| [0009](./0009-custom-session-auth-and-wishlist-sync.md) | Custom Session Auth (`scrypt` + OTP) & Đồng bộ Wishlist trên `@luxestay/api` | **Accepted** | 2026-11-24 | Phase 2 (`P2.1`), [PLAN](../PLAN.md) |
| [0010](./0010-payment-sandbox-webhook-and-notifications.md) | Cổng thanh toán Sandbox chuẩn HMAC-SHA256 Webhook, Idempotency & Notification Log | **Accepted** | 2026-11-24 | Phase 2 (`P2.3`), [PLAN](../PLAN.md) |
| [0011](./0011-availability-engine-seasonal-pricing-and-verified-reviews.md) | Availability Engine theo Ngày, Khóa Chống Double-Booking, Giá Mùa vụ & Đánh giá Xác thực (`P3.1` & `P3.2`) | **Accepted** | 2026-11-24 | Phase 3A (`P3.1`, `P3.2`), [PLAN](../PLAN.md) |
| [0012](./0012-rbac-host-portal-i18n-and-playwright-e2e.md) | RBAC Host/Admin Portal (`/host`), `LocaleContext` (`vi`/`en`, `VND`/`USD`) & Playwright E2E (`P3.3` & `P3.4`) | **Accepted** | 2026-11-24 | Phase 3B (`P3.3`, `P3.4`), [PLAN](../PLAN.md) |

---

## 2. Quy tắc tạo & cập nhật ADR

1. **Đánh số tăng dần 4 chữ số:** `NNNN-short-kebab-title.md` (ví dụ `0007-postgresql-drizzle-persistence.md`).
2. **Sử dụng template chuẩn:** Sao chép từ [0000-template.md](./0000-template.md).
3. **Vòng đời trạng thái:**
   - `Proposed`: Đang đề xuất, chờ rà soát.
   - `Accepted`: Đã phê duyệt và đang áp dụng trong mã nguồn.
   - `Deprecated`: Không còn áp dụng do tính năng bị gỡ bỏ.
   - `Superseded by ADR-XXXX`: Đã được thay thế bởi quyết định mới hơn.
4. **Bất biến lịch sử (Immutable History):** Không xóa hoặc viết đè nội dung quyết định cũ khi đổi hướng kiến trúc. Thay vào đó, tạo ADR mới (ghi `Supersedes ADR-XXXX`) và cập nhật trường `Status` của ADR cũ thành `Superseded by ADR-YYYY`.
5. **Đồng bộ mục lục:** Khi thêm hoặc đổi trạng thái ADR, cập nhật bảng Mục lục ở mục `1` của tệp này và liên kết chéo từ [ARCHITECTURE.md](../ARCHITECTURE.md) / [PLAN.md](../PLAN.md) nếu cần.
