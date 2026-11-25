# Design Spec: Đồng bộ Toàn diện `docs/ARCHITECTURE.md` & `docs/PRD.md` (Baseline Phase 4C)

- **Ngày thiết kế:** 2026-11-25
- **Nhánh áp dụng:** `feat/catalog-expansion-30-stays`
- **Tài liệu nguồn tham chiếu:** [PLAN.md](../../PLAN.md) (`v3.0`), mã nguồn thực tế trên `@luxestay/contracts`, `@luxestay/domain`, `@luxestay/api`, `@luxestay/web`, `e2e/` và `scripts/verify-seed-images.mjs`.

---

## 1. Mục tiêu & Lý do (Intent & Why)

`docs/ARCHITECTURE.md` (`v2.4`) và `docs/PRD.md` (`v1.5`) đang bị lệch nghiêm trọng so với trạng thái sản phẩm thực tế đã hoàn thành tới **Phase 4C** (`11` module API, `21` bảng PostgreSQL, `42` chỗ nghỉ tại `14` điểm đến, trung tâm ưu đãi 3 tầng `/deals`, `141` ảnh sạch không trùng lặp, giao diện mobile ổn định từ `360px`+) và chưa đồng bộ với lộ trình **Phase 5** trong [PLAN.md](../../PLAN.md) (`v3.0`).

Mục tiêu là làm mới toàn diện hai tài liệu này thành **tài liệu sống (living specs) chính xác 100%** với mã nguồn đang chạy, để đội ngũ phát triển và các AI agent có điểm tựa đáng tin cậy trước khi tách nhánh triển khai **Phase 5 (Activities, Tours & Transfers)**.

### Ràng buộc & Phi mục tiêu (Non-Goals & Anti-Goals)
- **Không** sửa mã nguồn ứng dụng, hợp đồng, schema DB, hay test trong đợt đồng bộ tài liệu này.
- **Không** tự chế số liệu, tên symbol, đường dẫn tệp hay biến môi trường chưa tồn tại trong repo.
- **Không** viết lại `PLAN.md` (đã là `v3.0`), không chỉnh sửa lịch sử bất biến trong `docs/adr/*`.

---

## 2. Phương án Cân nhắc (Approaches Considered)

| Phương án | Đánh đổi (Trade-offs) | Quyết định |
| :--- | :--- | :---: |
| **A. Chèn thêm mục Phase 4 ở cuối file** | Nhanh, ít diff; nhưng giữ lại thông tin sai ở Mục 2–7 của `ARCHITECTURE.md` (`v0.3.0`, `12` bảng, `PromotionBanner` cũ) và `FR-01/05/07` trong `PRD.md` (`12` stays, giảm giá cố định `100.000đ`), gây mâu thuẫn ngay trong cùng tệp. | Loại |
| **B. Đồng bộ toàn diện từ gốc (Comprehensive Sync)** | Khớp 1–1 toàn bộ sơ đồ, cây thư mục, 21 bảng DB, danh sách endpoints, toàn bộ FR-01..FR-16, NFRs và số liệu kiểm thử mới nhất; đồng thời giữ bảng Phân biệt Đã hoàn thành (`0–4C`) vs Lộ trình kế tiếp (`Phase 5`) đồng bộ với `PLAN.md v3.0`. | **Đã chọn** (người dùng duyệt hướng tiếp cận) |

---

## 3. Thiết kế Chi tiết Sửa đổi

### 3.1. Cập nhật [ARCHITECTURE.md](../../ARCHITECTURE.md) (`v2.4` → **`v3.0`**, ngày `2026-11-25`)

1. **Header & Mục 1 (Tech Stack & Nguyên tắc thiết kế):**
   - Nâng phiên bản lên `3.0 (Phase 0–4C Completed · Runway to Phase 5)`.
   - Cập nhật bảng Tech Stack chính xác theo mã nguồn hiện hành:
     - `@luxestay/contracts`: `10` source files (`common`, `catalog`, `booking`, `availability`, `auth`, `deals`, `host`, `payment`, `endpoints`, `index`), đầy đủ `ErrorCode` (`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `UNPROCESSABLE_ENTITY`, `INVALID_JSON`, `INTERNAL_ERROR`, `NETWORK_ERROR`, `CONTRACT_MISMATCH`).
     - `@luxestay/domain`: `10` domain modules thuần (`utils`, `amenities`, `catalogQuery`, `vouchers`, `deals`, `availability`, `reviews`, `host`, `locale`, `bookingSession`) + `@luxestay/domain/seed` tách module (`properties/*` `42` stays, `8` destinations, `6` vouchers, `5` campaigns, `51` amenities, `3` testimonials, `retiredImages.ts`).
     - `@luxestay/api`: `11` backend modules (`health`, `catalog`, `availability`, `reviews`, `deals`, `auth`, `favorites`, `reservations`, `payments`, `notifications`, `host`), `src/server.ts` Vercel Services entrypoint (`attachDatabasePool`), `STORAGE_DRIVER=memory|database`.
     - Database (`apps/api/src/db`): **21 bảng PostgreSQL 16** qua **5 migrations** (`0000`–`0004`), cộng `vercelPrepare.ts` (`backfillPromotionsIfNeeded`, `backfillMissingSeedProperties`, `repairRetiredSeedImages`).
     - `@luxestay/web`: Next.js `16.4.6` App Router, `9` feature folders (`auth`, `booking`, `catalog`, `favorites`, `host`, `locale`, `payment`, `promotions`, `property`), `7` domain ports + `types`/`errors` (`catalogPort`, `dealsPort`, `persistencePort`, `experiencePort`, `authPort`, `paymentPort`, `hostPort`), responsive `w-full min-w-0` + `overflow-x: clip`, `images.unoptimized: true` + `remotePatterns` (`images.unsplash.com`, `plus.unsplash.com`, `images.pexels.com`) + local `/images/stays/*`.
     - Testing & Audit: **`117` unit/integration tests** + **`6` Playwright Chromium E2E** (`E2E-1`–`E2E-6`) + `node scripts/verify-seed-images.mjs` (`141/141` unique media check).
2. **Mục 2 (Sơ đồ Kiến trúc Tổng thể — cập nhật từ `v0.3.0` lên `Phase 4C`):**
   - Vẽ lại Mermaid `flowchart TD` phản ánh đủ 4 workspaces, tất cả 11 modules API, 9 features & 7 ports phía Web, `dealsPort` ↔ `/deals`, `vercelPrepare.ts` ↔ 21 bảng PostgreSQL 16 (Neon / Docker), và service binding Vercel (`services.frontend` ↔ `services.backend`).
3. **Mục 3 (Cấu trúc Thư mục & Bản đồ Workspace):**
   - Cập nhật toàn bộ cây thư mục theo cấu trúc thật (`scripts/verify-seed-images.mjs`, `e2e/luxestay.spec.ts`, `vercel.json`, `packages/domain/src/seed/properties/*` & `retiredImages.ts`, `apps/api/src/db/{schema,migrations,vercelPrepare.ts}` + 11 modules + `server.ts`, `apps/web/public/images/stays/*` + 9 routes + 9 features + 7 ports).
4. **Mục 4 (Kiến trúc Chi tiết từng Tầng & Module):**
   - **4.1 Contracts:** Liệt kê thêm schemas `deals.ts`, `auth.ts`, `availability.ts`, `host.ts`, `payment.ts` và tất cả endpoints phiên bản `/api/v1/*` theo `packages/contracts/src/endpoints.ts`.
   - **4.2 Domain:** Mô tả bổ sung `vouchers.ts` (`evaluatePromotionVoucher`, `NEW_USER_ONLY`, `PROPERTY_NOT_ELIGIBLE`), `deals.ts`, `availability.ts`, `reviews.ts`, `host.ts`, `locale.ts`, cùng luồng state machine `BookingSession` (kèm `initialPromoCode` từ `/deals/[slug]`).
   - **4.3 API & Database + Vercel Services:** Bổ sung đủ bảng endpoint (Auth/Favorites, Deals, Vouchers, Availability, Reviews, Payments+Webhook, Host RBAC), mô tả khóa `SELECT ... FOR UPDATE`, kiểm tra `hasSuccessfulBookingByUserId` trong lock, và cơ chế Neon `db:prepare` (`backfillPromotionsIfNeeded`, `backfillMissingSeedProperties` `ON CONFLICT DO NOTHING`, `repairRetiredSeedImages` bảo toàn sửa đổi của Host/Admin). Tham chiếu thêm [DEPLOYMENT.md](../DEPLOYMENT.md).
   - **4.4 Frontend Web App:** Đủ `9` App Router routes (`/`, `/_not-found`, `/deals`, `/deals/[slug]`, `/stays/[id]`, `/bookings`, `/bookings/[bookingId]`, `/payments/[transactionId]`, `/host`), `PromotionsHub` 3 tầng + `PropertyList` phân trang 12/lượt, kiến trúc `w-full min-w-0` + `overflow-x: clip` bảo toàn sticky `Navbar`/`CategoryBar`, và `next.config.ts`.
5. **Mục 5 (Luồng Dữ liệu End-to-End):**
   - Giữ sequence diagram luồng đặt phòng cập nhật kèm bước chọn mã từ `/deals/[slug]` → `validateVoucher` → `POST /api/v1/reservations` (tính giá chuẩn + lock kho phòng) → chuyển hướng `/payments/[transactionId]` hoặc xác nhận `hotel`.
6. **Mục 6 (Chiến lược Kiểm thử 4 Tầng + Media/E2E & Cẩm nang Mở rộng cho Phase 5):**
   - Cập nhật bảng đúng số lượng thực tế:
     - `@luxestay/contracts`: `1` file (`8` tests)
     - `@luxestay/domain`: `8` files (`56` tests, gồm kiểm tra 42 stays & `0%` trùng 141 ảnh)
     - `@luxestay/api`: `1` file (`21` tests, gồm `backfillMissingSeedProperties` & `repairRetiredSeedImages`)
     - `@luxestay/web`: `3` files (`32` tests, gồm `promotions-hub.test.ts` & `dealsPort`)
     - Media Audit (`scripts/verify-seed-images.mjs`) + Playwright E2E (`e2e/luxestay.spec.ts` — `6` luồng `E2E-1`–`E2E-6`).
   - Trong **Extension Playbook (Mục 6.2):** Thêm dòng hướng dẫn mở rộng đa dịch vụ (chuẩn bị cho **Phase 5 — `activities` / `transfers`**: tạo domain/seed tách biệt dưới `packages/domain/src/seed/<service>/`, module API cô lập `apps/api/src/modules/<service>/`, port `apps/web/src/shared/ports/<service>Port.ts`, migration mới `0005`, kiểm định media & mobile `E2E`).
7. **Mục 7 (Trạng thái Trưởng thành & Giới hạn Hiện tại — cập nhật từ `v0.3.0` lên `Phase 4C`):**
   - Thay toàn bộ mục 7 cũ (vốn nói "chưa có Auth / chưa có voucher động").
   - Liệt kê các ranh giới thực tế hiện tại trước Phase 5:
     - Cổng thanh toán chạy chế độ Sandbox mô phỏng (`PAYMENT_SANDBOX_ENABLED`, chưa nối cổng thanh toán thật doanh nghiệp).
     - Email vé điện tử ghi nhật ký qua `notification_logs` (chưa nối SMTP/Resend gửi thư ra ngoài).
     - Chưa có sản phẩm phi lưu trú (`activities`, `tours`, `transfers` — mục tiêu **Phase 5** trong `PLAN.md`).
     - Tài sản media hiện gồm `138` URL stock đã kiểm định `HTTP 200` + `3` ảnh local (`apps/web/public/images/stays/`) — cần chạy định kỳ `node scripts/verify-seed-images.mjs` để phát hiện sớm ảnh ngoài bị gỡ.

---

### 3.2. Cập nhật [PRD.md](../../PRD.md) (`v1.5` → **`v2.0`**, ngày `2026-11-25`)

1. **Header & Mục 1 (Tổng quan & Ma trận phạm vi hiện trạng):**
   - Nâng phiên bản lên `2.0 (Phase 0–4C Completed — Catalog 42 Stays, Promotions Hub & Mobile-Stable)`.
   - Cập nhật **Mục 1.3 (Ma trận phạm vi)**: Phản ánh đầy đủ trạng thái đến Phase 4C:
     - `42` chỗ nghỉ (`14` thành phố, `5` loại hình, giá `590.000đ – 7.200.000đ/đêm`), phân trang Xem thêm `12/lượt`.
     - **Trung tâm Ưu đãi 3 tầng & `/deals`, `/deals/[slug]`** (`6` vouchers, `5` chiến dịch, ràng buộc `NEW_USER_ONLY` / `PROPERTY_NOT_ELIGIBLE`).
     - **Bộ 141 ảnh chân thực `0%` trùng lặp 4 trục** + script kiểm định `verify-seed-images.mjs`.
     - **Ổn định giao diện Mobile (`360–390px`)** + Playwright `E2E-6` (`6/6` luồng).
2. **Mục 2 (Target Personas):**
   - Bỏ nhãn "(Tương lai — Phase 3 / chưa triển khai trong v0.1)" ở dòng **Chủ nhà / Quản trị viên**, cập nhật đúng thực tế `/host` RBAC đang hoạt động.
3. **Mục 3 (Functional Requirements):**
   - Sửa tiêu đề bỏ `(Baseline v0.1)`.
   - **`FR-01` & `FR-02`:** Cập nhật `42` chỗ nghỉ phủ **14 thành phố** (8 điểm đến nổi bật + `Hạ Long`, `Huế`, `Quy Nhơn`, `Mộc Châu`, `Vũng Tàu`, `TP. Hồ Chí Minh`); bổ sung **phân trang tiến triển Xem thêm / Thu gọn (`12` mục/lượt)**, giữ nguyên thứ tự mặc định (`stay-08` dẫn đầu), tự reset trang về `12` khi đổi bộ lọc/sắp xếp và không trùng kết quả do địa chỉ đường trùng tên thành phố khác.
   - **`FR-05`:** Xóa dòng sai `discount = 100.000đ cố định`; cập nhật công thức chuẩn phản ánh **phụ thu theo mùa (`seasonalSurcharge`)** và **giảm giá động từ Voucher Engine** (`total = max(0, nightsTotal + seasonalSurcharge + cleaningFee + amenitiesFee - discount)`).
   - **`FR-06`:** Cập nhật luồng `BookCheckoutModal` có áp/chọn mã giảm giá (`POST /api/v1/vouchers/validate`), tự động điền `initialPromoCode` khi đi từ `/deals/[slug]`, hỗ trợ `hotel` xác nhận ngay và `vnpay`/`momo`/`card` qua cổng Sandbox `/payments/[transactionId]` (HMAC-SHA256 webhook + idempotency + `notification_logs`).
   - **`FR-07` → Cập nhật & Mở rộng thành `FR-07` (`TrendingDestinations` & `TestimonialsSection`) + `FR-15` (Trung tâm Ưu đãi Promotions Hub `/deals` & `/deals/[slug]`):**
     - Mô tả đầy đủ 3 tầng trên trang chủ (`VoucherCarousel` Bạn mới + `CampaignHeroBanner` đếm ngược + `CampaignCarousel`), trang `/deals` lọc theo đối tượng (`Tất cả`, `Bạn mới`, `Thành viên`), trang `/deals/[slug]` chi tiết chiến dịch kèm chỗ nghỉ đủ điều kiện & logic tự động chọn/chuyển đổi mã tương thích (`NEW_USER_ONLY`, `PROPERTY_NOT_ELIGIBLE`).
   - **`FR-16` (Chất lượng Hình ảnh Chân thực `0%` Trùng lặp & Trải nghiệm Di động):**
     - Quy định mọi chỗ nghỉ (`3–4` ảnh/chỗ), `8` Điểm đến và `5` Banner chiến dịch sở hữu **141/141** ảnh riêng biệt (`0%` trùng lặp), khớp chặt **4 trục chân thực** (Loại hình × Vùng miền × Phân khúc giá × Tiện ích `resortAmenities`, không hiển thị hồ bơi/bãi biển khi chỗ nghỉ không có).
     - Quy định ổn định khung nhìn Mobile (`360px`–`430px`): không tràn ngang (`scrollWidth <= innerWidth`), popover `SearchBar` gọn trong màn hình nhỏ và thanh `Navbar` / `CategoryBar` sticky không bị hỏng khi cuộn.
4. **Mục 4 (Non-Functional Requirements):**
   - Cập nhật `remotePatterns` gồm `images.unsplash.com`, `plus.unsplash.com`, `images.pexels.com` + ảnh tối ưu cục bộ `/images/stays/*` (`images.unoptimized: true` cho Vercel Services).
   - Nâng mục **Khả năng kiểm thử** lên `117` unit/integration tests + `6` Playwright E2E + `scripts/verify-seed-images.mjs`.
   - Nâng mục **Responsive & UX**: bổ sung ràng buộc zero-overflow trên `360–390px` kiểm chứng tự động qua `E2E-6` và hỗ trợ `VI/EN` + `VNĐ/USD`.
5. **Mục 5 (Product Epics & Lộ trình Phase 5):**
   - Bổ sung `Epic 7` (Promotions Hub & Deals Center — Phase 4A ✅), `Epic 8` (+30 Chỗ nghỉ Modular, Phân trang Xem thêm, 141 ảnh chân thực & Mobile Stability — Phase 4B–4C ✅), và đặt **`Epic 9` (Mở rộng Dịch vụ Du lịch Đa mảng: Activities, Tours & Transfers — Phase 5 📋)** làm tiền đề đồng bộ 1–1 với `PLAN.md v3.0`.

---

## 4. Phần Để lại Cho Người Thực Thi (Left to Builder)
- Kiểm tra chéo 100% số đếm (endpoints, migration filenames, file paths, test counts) trực tiếp trước và sau khi chỉnh sửa để không sót lệch nhỏ.
- Chạy `npm run lint`, `npm run typecheck`, `npm run build` để đảm bảo repo vẫn sạch 100% trước khi hoàn tất.
