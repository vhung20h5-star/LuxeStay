# Product Requirements Document (PRD) — LuxeStay

> **Version:** `2.0`  
> **Last Updated:** `2026-11-25`  
> **Trạng thái Scope:** `Phase 0 – Phase 4C (Completed)` · `Epic 9 / Phase 5 (Planned)`  
> **Tài liệu liên quan:** [ARCHITECTURE.md](./ARCHITECTURE.md) (`v3.0`) · [PLAN.md](./PLAN.md) (`v3.0`) · [DEPLOYMENT.md](./DEPLOYMENT.md) · [GLOSSARY.md](../GLOSSARY.md)

---

## 1. Tầm nhìn & Phạm vi Sản phẩm

### 1.1 Tổng quan
**LuxeStay** là nền tảng đặt phòng khách sạn, villa, resort, homestay và glamping nghỉ dưỡng tại Việt Nam với triết lý minh bạch chi phí, kiểm soát tồn kho nguyên tử theo ngày, trải nghiệm ưu đãi tập trung và khả năng vận hành ổn định trên cả desktop lẫn thiết bị di động (`360px+`).

### 1.2 Giá trị cốt lõi (Value Proposition)
- **Kho chỗ nghỉ tuyển chọn & xác thực hình ảnh:** **42 chỗ nghỉ** (`stay-01`..`stay-42`) phủ **14 thành phố** du lịch trọng điểm, phân tách **141 media slots** duy nhất (0% trùng lặp toàn cục) căn chỉnh theo 4 trục chất lượng.
- **Minh bạch tài chính 100% (Server-Authoritative):** Tách bạch giá cơ bản, phụ phí cuối tuần/mùa cao điểm theo từng đêm (`nightlyBreakdown`), phí dọn phòng (`150.000đ`), tiện ích trả phí đính kèm, và giảm giá voucher hợp lệ được kiểm chứng trực tiếp trên server.
- **Promotions Hub & Deep-Link Campaign:** Trải nghiệm ưu đãi 3 tầng ngay trang chủ kèm trung tâm `/deals` và landing page `/deals/[slug]` truyền thẳng mã ưu đãi qua `BookingContext` vào modal chi tiết/giỏ đặt phòng.
- **Khép kín giao dịch & Quản trị Chủ nhà:** Hỗ trợ thanh toán trực tuyến mô phỏng (`pending_payment` -> webhook HMAC), giữ chỗ không cần trả trước (`confirmed`), hủy đơn có kiểm soát chính sách, cùng Cổng Chủ nhà/Quản trị `/host` (RBAC).

### 1.3 Phạm vi Hệ thống (Implemented vs Planned — Khớp `PLAN.md v3.0`)

| Hạng mục / Phân hệ | Trạng thái | Chi tiết thực tế |
| :--- | :--- | :--- |
| **Discovery Catalog & Filter** | ✅ **Implemented (Phase 0–4B)** | **42 stays**, **14 cities**, **8 Trending Destinations**, **9 Categories**, `SearchBar`, `FilterModal`, `CatalogUrlSync`, Load More **12/lần** |
| **Detail, 51 Amenities & Availability** | ✅ **Implemented (Phase 0–3A)** | `PropertyModal` + `/stays/[id]`, **51 tiện ích** (`AMENITY_CATALOG`), `AvailabilityCalendar`, phụ phí mùa/cuối tuần, Reviews xác thực |
| **Booking, Vouchers & Sandbox Payment** | ✅ **Implemented (Phase 0–2)** | Atomic lock (`SELECT ... FOR UPDATE`), `deriveBookingQuote`, `/bookings`, `/bookings/[bookingId]`, `/payments/[transactionId]` + HMAC webhook |
| **Auth, OTP, Favorites & Locale** | ✅ **Implemented (Phase 2 & 3B)** | Email/password + OTP challenges, cookie session (`guest`/`host`/`admin`), `user_favorites`, `vi`/`en` & `VND`/`USD` currency |
| **Host Portal (RBAC `/host`)** | ✅ **Implemented (Phase 3B)** | Tạo/sửa/xóa chỗ nghỉ (`host`/`admin`), ghi đè tồn kho/giá theo ngày, theo dõi booking & thống kê doanh thu |
| **Promotions Hub, `/deals`, Media & Mobile** | ✅ **Implemented (Phase 4A–4C)** | 3-tier `PromotionsHub`, `/deals`, `/deals/[slug]`, **141/141 ảnh duy nhất**, `retiredImages.ts`, Mobile `360px+` `overflow-x: clip` & `E2E-6` |
| **Activities, Tours & Transfers** | 📋 **Planned (Phase 5 / Epic 9)** | Mở rộng cross-sell trải nghiệm/đưa đón (`/activities`, `0005_travel_activities.sql`, `activitiesPort.ts`) kèm bundle checkout & `E2E-7` (chưa kích hoạt ở production hiện tại) |

---

## 2. Personas & Hành trình Người dùng

1. **Khách du lịch / Guest Finder:**
   - Truy cập `/`, khám phá 8 điểm đến nổi bật, lọc theo 9 danh mục hoặc từ khóa/ngày/khách, xem chi tiết tại modal hoặc `/stays/[id]`, tạo booking nhanh (họ tên, SĐT Việt Nam `VN_PHONE_REGEX`, email) và tra cứu qua `/bookings/[bookingId]`.
2. **Thành viên đăng nhập / Loyalty Member:**
   - Đăng ký/đăng nhập (mật khẩu hoặc OTP), lưu danh sách yêu thích vào `user_favorites` (`FavoritesDrawer`), đủ điều kiện sử dụng voucher giới hạn như `NEW_USER_ONLY`, và quản lý lịch sử đơn trong `/bookings`.
3. **Chủ nhà / Partner Host (`role = "host"`):**
   - Truy cập `/host` (bảo vệ bằng RBAC), thêm mới hoặc cập nhật thông tin chỗ nghỉ, thiết lập block ngày / phụ phí mùa tại `property_availability`, xem đơn đặt phòng đến và tổng quan doanh thu.
4. **Admin / Release & QA Operations:**
   - Vận hành `db:prepare` (`vercelPrepare.ts`) không ghi đè dữ liệu host/user, kiểm định 0% trùng lặp ảnh qua `scripts/verify-seed-images.mjs`, và giữ bộ kiểm thử `117` tests + `6` E2E flows xanh trước mỗi lần release.

---

## 3. Functional Requirements (`FR-01` – `FR-16`)

### `FR-01`: Catalog Discovery & Progressive Listing
- Hiển thị **42 chỗ nghỉ** trên **14 thành phố** cùng **8 Trending Destinations**, **9 Categories**, và **3 Testimonials**.
- Component [`PropertyList.tsx`](../apps/web/src/features/catalog/PropertyList.tsx) mặc định hiển thị 12 kết quả đầu và nạp thêm **12 chỗ nghỉ mỗi lần** (*Load More*) để tối ưu tốc độ render trên mobile và desktop.
- Địa chỉ đường phố của từng chỗ nghỉ tách biệt với tên các điểm đến khác để tránh lọc nhầm kết quả theo substring.

### `FR-02`: Multi-Faceted Search & Filter
- [`SearchBar.tsx`](../apps/web/src/features/catalog/SearchBar.tsx) và [`FilterModal.tsx`](../apps/web/src/features/catalog/FilterModal.tsx) hỗ trợ tìm theo điểm đến/từ khóa, ngày nhận/trả phòng, số người lớn/trẻ em/phòng, khoảng giá, danh mục (`CategoryId`), và đa tiện ích (`AmenityFilterKey`).
- Toàn bộ trạng thái tìm kiếm đồng bộ với URL query thông qua [`CatalogUrlSync.tsx`](../apps/web/src/features/catalog/CatalogUrlSync.tsx) và xử lý thống nhất tại [`catalogQuery.ts`](../packages/domain/src/catalogQuery.ts).

### `FR-03`: Property Detail, Deep-Link `/stays/[id]` & 51 Amenities
- Cho phép xem nhanh qua [`PropertyModal.tsx`](../apps/web/src/features/property/PropertyModal.tsx) hoặc mở trực tiếp tuyến SEO/chia sẻ `/stays/[id]` ([`StayDetailView.tsx`](../apps/web/src/features/property/StayDetailView.tsx)).
- Hiển thị **51 tiện ích chuẩn hóa** (`AMENITY_CATALOG`), phân tách rõ 3 nhóm `AmenityPricingTypeSchema` (`included`, `free-reservation`, và dịch vụ bổ sung trả phí `paid`) với chi tiết từng hạng mục trong [`AmenityDetailPanel.tsx`](../apps/web/src/features/property/AmenityDetailPanel.tsx).

### `FR-04`: Availability Calendar & Seasonal Pricing
- [`AvailabilityCalendar.tsx`](../apps/web/src/features/property/AvailabilityCalendar.tsx) và API `/api/v1/properties/:id/availability` đọc bảng `property_availability` kết hợp booking còn hiệu lực (`confirmed` và `pending_payment` chưa quá `paymentExpiresAt`).
- Hiển thị rõ từng đêm bị chặn (`isBlocked`), số phòng còn trống (`remainingUnitsByDate`), và giá hiệu lực theo đêm (`nightlyBreakdown`).

### `FR-05`: Server-Authoritative Quote & Pricing Engine
- Mọi tính toán chi phí tại [`availability.ts`](../packages/domain/src/availability.ts) và [`bookingSession.ts`](../packages/domain/src/bookingSession.ts) tuân theo đúng công thức sau trên cả preview lẫn server checkout:
  - `baseNightsTotal = pricePerNight * nights * rooms`
  - `nightsTotal = sum(nightlyBreakdown.effectivePrice) * rooms`
  - `seasonalSurcharge = nightsTotal - baseNightsTotal`
  - `subtotal = nightsTotal + CLEANING_FEE (150.000đ) + amenitiesFee`
  - `serviceFee = 0`
  - `discount = evaluatePromotionVoucher(...)` (`0` nếu mã không hợp lệ hoặc không đủ điều kiện)
  - `total = Math.max(0, subtotal - discount)`

### `FR-06`: Booking Checkout, Atomic Lock & Order Lookup
- [`POST /api/v1/reservations`](../apps/api/src/modules/reservations/routes.ts) thực hiện kiểm tra tồn kho và chèn dữ liệu nguyên tử bằng transaction (`SELECT ... FOR UPDATE` trên PostgreSQL) đồng thời tính lại toàn bộ báo giá phía server.
- Trạng thái khởi tạo phân nhánh theo phương thức thanh toán: thanh toán trực tuyến tạo trạng thái `pending_payment` (giữ chỗ đến `paymentExpiresAt`), phương thức không trực tuyến tạo trạng thái `confirmed`.
- Trang `/bookings` và `/bookings/[bookingId]` cho phép tra cứu đơn, hủy đơn (`pending_payment` luôn được phép hủy; `confirmed` kiểm tra chính sách `freeCancellation`), và xem nhật ký thông báo.

### `FR-07`: Promotions Hub, `/deals`, `/deals/[slug]` & Voucher Engine
- [`PromotionsHub.tsx`](../apps/web/src/features/promotions/PromotionsHub.tsx) trên trang chủ tổ chức thành 3 tầng rõ rệt:
  1. **Tier 1 (`VoucherCarousel`):** Danh sách ưu đãi trang chủ gồm **5 voucher** active không giới hạn thành viên (`buildHomepageTier1Vouchers` lọc bỏ `memberOnly`/`audience === "member"` như `VIPRESORT1M`; toàn bộ **6 voucher** hiển thị tại `/deals`), hỗ trợ sao chép nhanh và mở `VoucherTermsModal`.
  2. **Tier 2 (`CampaignHeroBanner`):** **1 chiến dịch nổi bật** (`placement: "hero"`) kèm đồng hồ đếm ngược (`CampaignCountdown`), pill sao chép mã và CTA dẫn vào trang chiến dịch.
  3. **Tier 3 (`CampaignCarousel`):** Thẻ trượt ngang **4 chiến dịch** (`placement: "carousel"`, tổng cộng **5 chiến dịch** toàn cục) dẫn tới `/deals/[slug]`.
- Tuyến `/deals` hiển thị toàn bộ ưu đãi và voucher kèm bộ lọc đối tượng; tuyến `/deals/[slug]` ([`DealDetailView.tsx`](../apps/web/src/features/promotions/DealDetailView.tsx)) hiển thị chi tiết chiến dịch và các chỗ nghỉ hợp lệ ngay trên trang, bấm xem/đặt sẽ gọi `BookingContext.openPropertyWithPromo` / `startCheckoutWithPromo` (lưu `BookingSession.promoCode` trong bộ nhớ).
- Server xác thực mã qua `POST /api/v1/vouchers/validate` với **8 `VoucherErrorReason`** (bao gồm kiểm tra `NEW_USER_ONLY` theo tài khoản chưa từng hoàn tất đơn và `PROPERTY_NOT_ELIGIBLE` theo loại hình/danh mục chỗ nghỉ).

### `FR-08`: Sandbox Payment Gateway & Idempotent Webhooks
- Khi đơn hàng mang trạng thái `pending_payment`, người dùng được chuyển đến tuyến `/payments/[transactionId]` ([`PaymentGatewayView.tsx`](../apps/web/src/features/payment/PaymentGatewayView.tsx)) để giả lập kết quả thanh toán (MoMo / VNPay / Card).
- Webhook `POST /api/v1/payments/webhook/:provider` kiểm tra chữ ký HMAC ([`signature.ts`](../apps/api/src/modules/payments/signature.ts)) và chống xử lý trùng lặp qua bảng `payment_webhook_events`, sau đó cập nhật đơn hàng và ghi log vào `notification_logs`.

### `FR-09`: Authentication, Sessions & OTP
- [`auth`](../apps/api/src/modules/auth/routes.ts) hỗ trợ đăng ký, đăng nhập mật khẩu, phát hành/xác thực mã OTP (`otp_challenges`), phiên làm việc cookie (`user_sessions`), phân quyền theo `UserRoleSchema` (`guest`, `host`, `admin`; trong đó `"member"` chỉ là nhãn `VoucherAudience` cho voucher ưu đãi thành viên đã đăng nhập), và tài khoản demo phục vụ kiểm thử nhanh.

### `FR-10`: Favorites Persistence
- Thành viên đã xác thực có thể lưu/bỏ lưu hoặc đồng bộ danh sách yêu thích qua `GET/PUT /api/v1/favorites` và `POST /api/v1/favorites/:propertyId/toggle` (`user_favorites`), xem lại danh sách tại [`FavoritesDrawer.tsx`](../apps/web/src/features/favorites/FavoritesDrawer.tsx).

### `FR-11`: Verified Reviews & Ratings
- Mỗi chỗ nghỉ hiển thị điểm trung bình và chi tiết đánh giá lưu tại bảng `reviews` (được trả về trong `Property.reviews` qua `GET /api/v1/catalog` và `GET /api/v1/properties/:id`), cho phép gửi đánh giá đã xác thực đơn đặt phòng qua `POST /api/v1/properties/:id/reviews` ([`reviews.ts`](../packages/domain/src/reviews.ts)).

### `FR-12`: Host Portal & RBAC (`/host`)
- Giới hạn truy cập theo role `host` hoặc `admin`; hỗ trợ xem thống kê doanh thu/công suất (`GET /api/v1/host/analytics`), tạo mới (`POST`), chỉnh sửa (`PATCH`) hoặc xóa (`DELETE`) chỗ nghỉ, cập nhật giá/tồn kho/chặn ngày theo lịch (`PUT /api/v1/host/properties/:id/availability`), và theo dõi danh sách reservation của chủ nhà (`GET /api/v1/host/reservations`).

### `FR-13`: Localization & Multi-Currency (`VND` / `USD`)
- [`LocaleContext.tsx`](../apps/web/src/features/locale/LocaleContext.tsx) và [`locale.ts`](../packages/domain/src/locale.ts) hỗ trợ chuyển đổi ngôn ngữ `vi`/`en` cùng công cụ quy đổi tiền tệ `VND`/`USD` (`CurrencyCodeSchema`, mặc định `DEFAULT_USD_EXCHANGE_RATE = 25_000`) nhất quán giữa SSR và CSR.

### `FR-14`: Overlay Stack & Keyboard Ergonomics
- [`OverlayContext.tsx`](../apps/web/src/shared/overlay/OverlayContext.tsx) điều phối ngăn xếp các modal/drawer (chi tiết chỗ nghỉ, tiện ích, checkout, auth, voucher terms, filter) theo nguyên tắc LIFO bằng phím `Escape` hoặc bấm nền mờ.

### `FR-15`: Seed Media Integrity & Authentic Visual Standards
- Toàn bộ **141 media slots** (ảnh chính + gallery của 42 chỗ nghỉ, 8 điểm đến, 5 campaigns) không được trùng lặp trên phạm vi toàn hệ thống (0% duplicate).
- Mọi ảnh chỗ nghỉ phải đúng theo **4 trục kiểm định**: (1) đúng loại hình lưu trú, (2) đúng đặc trưng địa lý/vùng miền, (3) đúng phân khúc giá, và (4) phản ánh trung thực `resortAmenities` hiện có (không minh họa hồ bơi/biển khi chỗ nghỉ không sở hữu).
- Ảnh thay thế cũ được ghi sổ tại [`retiredImages.ts`](../packages/domain/src/seed/retiredImages.ts) để `repairRetiredSeedImages(db)` sửa dữ liệu trên Neon có điều kiện an toàn; quy trình kiểm chứng tự động qua [`verify-seed-images.mjs`](../scripts/verify-seed-images.mjs).

### `FR-16`: Mobile Responsive Stability (`360×800` & `390×844`)
- Giao diện trang chủ và luồng đặt phòng phải duy trì `document.documentElement.scrollWidth <= window.innerWidth` ở các kích thước màn hình hẹp (`360×800`, `390×844`).
- Áp dụng `overflow-x: clip` trên `html, body` tại [`globals.css`](../apps/web/src/app/globals.css), `w-full min-w-0` cho mọi section/grid/carousel (`PromotionsHub`, `HorizontalCarouselShell`, `PropertyList`, `TestimonialsSection`), giới hạn chiều rộng popover `SearchBar` theo viewport, và khóa chống hồi quy bằng Playwright `E2E-6`.

---

## 4. Non-Functional Requirements (`NFR-01` – `NFR-06`)

1. **`NFR-01` Data Consistency & Fail-Fast:** Trong `NEXT_PUBLIC_DATA_MODE=api`, UI không âm thầm fallback sang mock khi API lỗi; mọi thao tác giữ/đặt phòng có tranh chấp đồng thời phải được giải quyết bằng row lock DB.
2. **`NFR-02` Performance & Progressive Loading:** Trang chủ chia lô hiển thị 12 chỗ nghỉ mỗi bước (*Load More*); toàn bộ suite 6 kịch bản E2E Playwright hoàn tất trong ngưỡng ~20s trên môi trường cục bộ.
3. **`NFR-03` Security & Boundary Validation:** Mọi đầu vào API kiểm tra qua Zod schemas của `@luxestay/contracts`; API Host kiểm tra role `host`; webhook thanh toán xác thực chữ ký HMAC; `.env*` và `.vercel/` tuyệt đối không lọt vào Git.
4. **`NFR-04` Viewport & Responsive Ergonomics:** Không bị cắt lệch nội dung, không phát sinh cuộn ngang ngoài ý muốn khi zoom hoặc mở trang trên điện thoại màn hình nhỏ (`360px`–`390px`).
5. **`NFR-05` Idempotent Schema & Data Evolution:** Hệ thống migration `0000`–`0004` + `vercelPrepare.ts` (`db:prepare`) có thể chạy lặp lại nhiều lần trên môi trường Neon production mà không phá vỡ dữ liệu vận hành hiện có.
6. **`NFR-06` Continuous Quality Verification:** Mọi thay đổi trước khi merge phải vượt qua `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test` (`117` tests), `verify-seed-images.mjs` (khi chạm media/seed), và `npm run test:e2e` (`E2E-1`–`E2E-6`).

---

## 5. Roadmap Sync ([`PLAN.md v3.0`](./PLAN.md))

### 5.1 Các Phase đã hoàn thành (✅ Completed)
- **Phase 0 – Phase 1 (`M0`–`M8`):** Khởi tạo Monorepo, Contracts + Domain seams, Overlay stack, Hono API + Postgres/Drizzle + Ports.
- **Phase 2 (`M9`–`M10`):** Custom Session Auth + OTP, Favorites sync, Payment Sandbox + HMAC Webhooks + Notification logs.
- **Phase 3A – 3B (`M11`–`M12`):** Availability Engine, Seasonal Pricing, Verified Reviews, `/stays/[id]`, Host Portal RBAC `/host`, i18n `vi`/`en` & Playwright E2E nền tảng.
- **Phase 4A – 4C (`M13`–`M15`) & Mobile Polish:** Promotions Hub 3 tầng + `/deals` + `/deals/[slug]` (`E2E-4`), mở rộng 42 chỗ nghỉ + Load More 12/lần (`E2E-5`), audit 141/141 ảnh duy nhất chuẩn 4 trục + `repairRetiredSeedImages`, và sửa triệt để lỗi tràn ngang mobile (`E2E-6`).

### 5.2 Roadmap tiếp theo — Epic 9: Phase 5 — Activities, Tours & Transfers (📋 Planned)

> *Mục tiêu: Mở rộng từ nền tảng đặt phòng thuần túy sang mô hình cross-sell trải nghiệm địa phương & đưa đón sân bay đồng bộ trực tiếp với [`PLAN.md v3.0`](./PLAN.md).*

- **`P5.1` — Experiences & Transfers Catalog (`📋 Planned`):**
  - Định nghĩa contracts cho trải nghiệm/tour/đưa đón trong `@luxestay/contracts` và seed dữ liệu tại `packages/domain/src/seed/activities/*` (giữ chuẩn 0% trùng ảnh).
  - Mở rộng schema DB với migration `0005_travel_activities.sql` lưu danh mục hoạt động, khung giờ & liên kết dịch vụ đính kèm.
  - Thêm module `apps/api/src/modules/activities/*`, port mới `activitiesPort.ts` (độc lập với `experiencePort.ts` đang dùng cho `PropertyExperiencePort` từ Phase 3A), và trang `/activities`, `/activities/[slug]`.
- **`P5.2` — Cross-sell Checkout Bundle & Payments (`📋 Planned`):**
  - Bổ sung gợi ý trải nghiệm/đưa đón theo điểm đến ngay trong `/stays/[id]` và bước Checkout.
  - Tính tổng đơn gói gộp server-authoritative và hỗ trợ thanh toán/hủy riêng từng hạng mục trong `/bookings/[bookingId]`.
- **`P5.3` — Bundle E2E Verification (`📋 Planned`):**
  - Triển khai kịch bản Playwright **`E2E-7`** kiểm chứng trọn vẹn luồng đặt phòng + đặt kèm đưa đón sân bay -> thanh toán sandbox -> hủy một phần dịch vụ.

---

## 6. Traceability Matrix & Quality Gates

| Nhóm yêu cầu | Modules / Layer chính | Kiểm chứng tự động (`Test` / `E2E` / `Script`) | Milestones (`PLAN.md`) |
| :--- | :--- | :--- | :--- |
| **`FR-01` – `FR-04` (Discovery, Filter, Detail, Availability)** | `@luxestay/domain` (`catalogQuery`, `amenities`, `availability`), `catalog` & `availability` API, `experiencePort.ts`, `features/catalog`, `features/property` | `catalog-query.test.ts`, `amenities*.test.ts`, [`properties-amenities.test.ts`](../packages/domain/tests/properties-amenities.test.ts), `availability-reviews.test.ts`, `E2E-1`, `E2E-5` | `M0`–`M6`, `M11`, `M14` |
| **`FR-05` – `FR-06` (Quote & Atomic Booking)** | `bookingSession.ts`, `reservations` API (`SELECT ... FOR UPDATE`), `features/booking` | `booking-session.test.ts`, `api.test.ts`, `persistence-port.test.ts`, `E2E-1`, `E2E-2` | `M2`, `M5`, `M7`, `M8` |
| **`FR-07` (Promotions Hub & Deals)** | `deals.ts`, `vouchers.ts`, `deals` & `catalog` API, `features/promotions`, `/deals`, `/deals/[slug]` | `deals.test.ts`, `promotions-hub.test.ts`, `api.test.ts`, `E2E-4` | `M13` |
| **`FR-08` – `FR-11` (Payment, Auth, Favorites, Reviews)** | `auth`, `payments`, `favorites`, `reviews`, `notifications` API + web features tương ứng | `api.test.ts`, `availability-reviews.test.ts`, `E2E-2`, `E2E-3` | `M9`, `M10`, `M11` |
| **`FR-12` – `FR-14` (Host Portal, Locale, Overlays)** | `host.ts`, `locale.ts`, `host` API, `/host`, `OverlayContext` (`overlayStack.ts`) | `host-locale.test.ts`, `overlay-stack.test.ts`, `api.test.ts`, `E2E-1`, `E2E-3` | `M4`, `M12` |
| **`FR-15` – `FR-16` (4-Axis Media & Mobile Viewport)** | `seed/properties/*`, `retiredImages.ts`, `vercelPrepare.ts`, `globals.css`, home layout grids | [`properties-amenities.test.ts`](../packages/domain/tests/properties-amenities.test.ts), `verify-seed-images.mjs` (141 slots), `E2E-5`, `E2E-6` (`390×844` & `360×800`) | `M15` + Mobile Hotfix |
| **Epic 9 / Phase 5 (`P5.1`–`P5.3`)** | `@luxestay/contracts`, `seed/activities/*`, `0005_travel_activities.sql`, `activitiesPort.ts`, `/activities`, `/activities/[slug]`, bundle checkout | **`E2E-7`** *(📋 Planned)* | Phase 5 (`PLAN.md`) |
