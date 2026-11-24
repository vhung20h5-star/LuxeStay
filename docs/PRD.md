# Product Requirements Document (PRD) — LuxeStay (`travel-service`)

- **Phiên bản tài liệu:** 1.5 (Phase 3 Completed — Baseline v0.6.0)
- **Ngày cập nhật:** 2026-11-24
- **Trạng thái:** Living Document (Active)
- **Tài liệu liên quan:**
  - Kiến trúc hệ thống: [ARCHITECTURE.md](./ARCHITECTURE.md)
  - Kế hoạch bảo trì & mở rộng: [PLAN.md](./PLAN.md)
  - Nhật ký quyết định kiến trúc: [docs/adr/README.md](./adr/README.md)
  - Từ vựng miền chuẩn: [GLOSSARY.md](../GLOSSARY.md)

---

## 1. Tổng quan sản phẩm & Tầm nhìn

### 1.1. Bối cảnh & Mục tiêu
**LuxeStay** là nền tảng web khám phá và đặt phòng khách sạn, resort ven biển, villa biệt thự, homestay và glamping nghỉ dưỡng tại Việt Nam. Sản phẩm hướng tới trải nghiệm hiện đại, minh bạch chi phí ngay từ bước xem phòng và làm nổi bật hệ thống **tiện ích & dịch vụ khu nghỉ dưỡng (Resort Amenities)** — thứ thường bị ẩn hoặc mô tả sơ sài ở các nền tảng OTA thông thường.

### 1.2. Đề xuất giá trị cốt lõi (Core Value Proposition)
1. **Tìm kiếm thông minh cho người dùng Việt:** Hỗ trợ tìm điểm đến không dấu tiếng Việt, chọn nhanh xu hướng du lịch, gợi ý ngày cuối tuần/lễ, đồng bộ URL chia sẻ và lọc kết hợp nhiều tiêu chí mà không làm mất ngữ cảnh.
2. **Minh bạch tiện ích & dịch vụ đi kèm:** Chuẩn hóa 51 tiện ích theo 7 nhóm khoa học, phân rõ 3 nhóm chi phí (`Miễn phí bao gồm sẵn`, `Miễn phí cần đặt trước`, `Có phụ phí`) và đồng bộ 1-click trực tiếp vào báo giá đặt phòng.
3. **Trải nghiệm thương mại khép kín từ tài khoản tới thanh toán & vé điện tử:** Đăng nhập tài khoản (Email/Mật khẩu hoặc OTP) đồng bộ Wishlist và lịch sử đơn đặt phòng, áp mã giảm giá động kiểm tra chuẩn trên server, thanh toán qua cổng Sandbox có xác thực webhook HMAC-SHA256 và nhận email vé điện tử.
4. **Trải nghiệm mượt mà trên mọi thiết bị:** Giao diện Glassmorphism, điều phối ngăn xếp hộp thoại nhất quán (phím `Escape`, khóa cuộn nền, hỗ trợ màn hình di động).

### 1.3. Ma trận phạm vi hiện trạng (Baseline v0.4.0)

| Nhóm tính năng | Trạng thái hiện tại | Ghi chú kiểm soát |
| :--- | :--- | :--- |
| Tìm kiếm, lọc đa tiêu chí, sắp xếp, thẻ lọc nhanh & URL Query Sync | **Đã triển khai đầy đủ** | 12 chỗ nghỉ, 8 thành phố, 5 loại hình, giá 790k–6.5tr VNĐ/đêm; đồng bộ 2 chiều query string trên `/` |
| Trang chi tiết chỗ nghỉ riêng (`/stays/[id]`) & SEO/OpenGraph | **Đã triển khai đầy đủ** | SSR gọi `GET /api/v1/properties/:id`, `generateMetadata`, liên kết từ `PropertyCard` & `PropertyModal`, `404` khi không tồn tại |
| Đăng nhập / Đăng ký / OTP & Đồng bộ Wishlist (`AuthModal`, `AuthContext`) | **Đã triển khai đầy đủ** | Mật khẩu `scrypt`, OTP 6 số (dev sandbox có mã thử), phiên `HttpOnly` Cookie lưu PostgreSQL, merge Wishlist `localStorage ↔ user_favorites`, seam Google OAuth |
| Hệ thống Mã giảm giá động (Voucher Engine) | **Đã triển khai đầy đủ** | `evaluatePromotionVoucher` + `POST /api/v1/vouchers/validate` + kiểm tra đơn tối thiểu/trần giảm/hạn dùng trên cả FE & BE (`LUXESTAY250`, `SUMMERVIBE`) |
| Cổng thanh toán Sandbox, Webhook HMAC-SHA256 & Email vé điện tử | **Đã triển khai đầy đủ (Sandbox)** | `hotel` xác nhận ngay; `vnpay`/`momo`/`card` đi qua `pending_payment` → `/payments/[transactionId]` → webhook ký `HMAC-SHA256` + chống trùng idempotency + lưu & xem trước email trong `notification_logs` |
| Hệ thống Tiện ích khu nghỉ dưỡng (51 mục / 7 nhóm) | **Đã triển khai đầy đủ** | Master–Detail Explorer + đồng bộ dịch vụ chọn thêm vào báo giá |
| Quản lý, Lịch sử & Hủy Đơn đặt phòng (`/bookings`, `/bookings/[bookingId]`) | **Đã triển khai đầy đủ** | Hiển thị **"Đơn đặt phòng của tôi"** khi đăng nhập, tra cứu khách vãng lai bằng `bookingId` + email/SĐT VN, hủy theo chính sách `freeCancellation`, xem email vé điện tử & in PDF |
| Điều phối lớp phủ (7 Modal/Drawer) & ARIA Dialog | **Đã triển khai đầy đủ** | Quản lý `z-index`, `Escape`, scroll lock tập trung |
| Lịch trống phòng, Chống đặt trùng & Giá theo mùa | **Đã triển khai đầy đủ** | `GET /api/v1/properties/:id/availability`, khóa `SELECT ... FOR UPDATE` chống đặt trùng (`409 CONFLICT`), phụ thu cuối tuần T6–T7 (+20%) & lễ VN (+30%), `AvailabilityCalendar` & `SeasonalPricingSummary` |
| Đánh giá xác thực lưu trú (Verified Reviews) | **Đã triển khai đầy đủ** | Chỉ khách đã hoàn tất lưu trú (`completed` hoặc qua 12:00 `checkOut`) được gửi review qua `POST /api/v1/properties/:id/reviews` (chặn gửi trùng `booking_id UNIQUE`), tự tính lại `rating`/`reviewCount` atomic & hiện badge **"Đã xác thực lưu trú"** |
| Cổng Chủ nhà & Quản trị (Host/Admin Portal `/host`) | **Đã triển khai đầy đủ** | RBAC `guest \| host \| admin`, `properties.owner_user_id`, CRUD chỗ nghỉ, khóa ngày & ghi đè giá `property_availability`, quản lý đơn khách & báo cáo doanh thu (`GET /api/v1/host/analytics`) |
| Đa ngôn ngữ (`VI`/`EN`), Đa tiền tệ (`VNĐ`/`USD`) & Playwright E2E | **Đã triển khai đầy đủ** | `LocaleContext` lưu `localStorage` qua `useSyncExternalStore` không đổi URL, nút chuyển đổi trên `Navbar`, và bộ Playwright Chromium E2E (`e2e/`, `npm run test:e2e`) chạy trong CI |

---

## 2. Đối tượng người dùng (Target Personas)

| Persona | Nhu cầu chính | Luồng sử dụng trọng tâm |
| :--- | :--- | :--- |
| **Du khách nghỉ dưỡng cuối tuần** (Cặp đôi / Nhóm bạn) | Tìm nhanh homestay săn mây, resort sát biển theo ngân sách và tiện ích nổi bật | Quick Trend / CategoryBar → Filter → PropertyModal → Checkout nhanh |
| **Gia đình đi nghỉ dưỡng dài ngày** | Kiểm tra kỹ sức chứa (`maxGuests`), tiện nghi gia đình/hồ bơi, đăng ký dịch vụ đưa đón/spa kèm theo | SearchBar (ngày + người lớn + trẻ em) → PropertyAmenitiesModal → So sánh tổng phí → Đặt phòng |
| **Người dùng săn ưu đãi / so sánh nhiều chỗ nghỉ** | Lưu nhiều chỗ nghỉ yêu thích để so sánh qua lại giữa các tab trình duyệt trước khi chốt | PropertyCard Wishlist → FavoritesDrawer → Mở lại chỗ nghỉ giữ nguyên cấu hình |
| **Chủ nhà / Quản trị viên (Tương lai — Phase 3)** | Quản lý danh sách phòng, lịch trống, giá theo mùa, cấu hình tiện ích và duyệt đơn | Host Portal / Admin CMS (chưa triển khai trong v0.1) |

---

## 3. Yêu cầu chức năng (Functional Requirements — Baseline v0.1)

### FR-01: Tìm kiếm & Khám phá Chỗ nghỉ
- **Mục đích:** Giúp người dùng thu hẹp nhanh chỗ nghỉ theo điểm đến, lịch trình, số lượng khách và loại hình.
- **Hành vi chuẩn:**
  - Nhập điểm đến tự do hoặc chọn từ 8 điểm đến nổi bật (`Đà Lạt`, `Phú Quốc`, `Sa Pa`, `Đà Nẵng`, `Hội An`, `Ninh Bình`, `Nha Trang`, `Hà Nội`); so khớp **không phân biệt dấu tiếng Việt và hoa/thường** trên thành phố, tỉnh, địa chỉ, tiêu đề và mô tả ngắn.
  - Chọn lịch nhận/trả phòng bằng date picker ISO (`YYYY-MM-DD`) hoặc 4 preset ngày động tính theo ngày hiện tại (`Cuối tuần này`, `3 ngày 2 đêm`, `Giữa tuần thư giãn`, `Kỳ nghỉ cuối năm`). Tự động xóa ngày trả phòng nếu ngày nhận mới lớn hơn hoặc bằng ngày trả cũ.
  - Tùy chỉnh số `người lớn` (tối thiểu 1), `trẻ em` (tối thiểu 0), `phòng` (tối thiểu 1); lọc ra các chỗ nghỉ có `maxGuests >= adults + children`.
  - 6 tab loại hình trên `SearchBar` (`Tất cả`, `Homestay`, `Khách sạn`, `Villa biệt thự`, `Resort`, `Glamping`) đồng bộ 2 chiều với bộ lọc nâng cao.
  - 5 nút **Xu hướng tìm kiếm nhanh** (`QuickSearchTrend`) áp đúng cặp điểm đến + danh mục/loại hình và xóa bộ lọc xung đột từ lượt tìm trước.
  - Thanh danh mục sticky (`CategoryBar`) gồm 9 danh mục trải nghiệm (`all`, `mountain-view`, `beachfront`, `vintage-homestay`, `infinity-pool`, `ecolodge`, `pine-forest`, `city-center`, `luxury-resort`).

### FR-02: Lọc đa tiêu chí, Sắp xếp & Thẻ bộ lọc đang bật
- **Hành vi chuẩn:**
  - `FilterModal` hỗ trợ lọc theo:
    - Khoảng giá `minPrice..maxPrice` trong biên `0đ` đến `10.000.000đ` (bước trượt `250.000đ`) kèm 5 mức giá chọn nhanh (`Mọi mức giá`, `Dưới 1 triệu`, `1 – 2.5 triệu`, `2.5 – 5 triệu`, `Trên 5 triệu`).
    - Loại hình chỗ nghỉ (chọn nhiều).
    - Đánh giá tối thiểu (`minRating` từ `0` đến `5`).
    - 9 nhóm tiện nghi (`pool`, `beach`, `sports-gym`, `dining`, `spa-wellness`, `transport-shuttle`, `bbq-campfire`, `bath-fireplace`, `family-pet`) theo ngữ nghĩa **AND** (chỗ nghỉ phải đáp ứng đủ mọi tiện nghi được chọn).
    - Chính sách hủy miễn phí (`freeCancellationOnly`).
  - 4 chế độ sắp xếp tất định: `Phổ biến nhất` (ưu tiên `isFeatured` → `rating` → `reviewCount`), `Giá thấp đến cao`, `Giá cao đến thấp`, `Đánh giá cao nhất`.
  - Hiển thị danh sách **Active Filter Chips** trên `PropertyList` để gỡ từng điều kiện riêng lẻ; nút **"Xóa tất cả bộ lọc"** đặt lại trọn vẹn cả điểm đến, bộ lọc, tab loại hình và `sortBy`.

### FR-03: Danh sách Yêu thích (Wishlist)
- **Hành vi chuẩn:**
  - Người dùng bấm biểu tượng trái tim trên `PropertyCard` hoặc `PropertyModal` để thêm/gỡ chỗ nghỉ yêu thích.
  - Mở `FavoritesDrawer` từ thanh `Navbar` (có badge số lượng); bấm vào từng mục để mở trực tiếp `PropertyModal`.
  - Khi chưa từng có dữ liệu trong `localStorage`, khởi tạo mặc định `["stay-01", "stay-02"]`. Khi người dùng chủ động bỏ hết yêu thích, giữ trạng thái rỗng `[]` (không tự phục hồi mặc định).
  - Loại bỏ mã chỗ nghỉ không hợp lệ/trùng lặp, tự đồng bộ giữa các tab trình duyệt cùng origin, và không làm crash ứng dụng khi `localStorage` bị chặn hoặc hỏng JSON.

### FR-04: Hệ thống Tiện ích & Dịch vụ Khu nghỉ dưỡng (Resort Amenities)
- **Hành vi chuẩn:**
  - Mỗi chỗ nghỉ khai báo danh sách `resortAmenities` tham chiếu tới danh mục chuẩn 51 tiện ích (`AMENITY_CATALOG`) chia theo 7 nhóm ưu tiên (`Hồ bơi & Bãi biển`, `Thể thao & Giải trí`, `Ẩm thực & Đồ uống`, `Dịch vụ khách sạn & Spa`, `Đưa đón & Di chuyển`, `Tiện nghi phòng & Gia đình`, `An ninh & Tiện ích chung`) và có thể ghi đè chi tiết riêng (tên, giờ mở cửa, vị trí, mức phí, ảnh, ghi chú).
  - 3 loại phí chuẩn hóa nhất quán trên toàn ứng dụng:
    - `included`: Đã bao gồm trong giá phòng, chỉ xem thông tin, không chọn thêm.
    - `free-reservation`: Miễn phí (`0đ`), cho phép bật/tắt để đăng ký giữ chỗ trước.
    - `paid`: Dịch vụ có phụ phí cố định theo kỳ nghỉ, cho phép bật/tắt và cộng trực tiếp vào báo giá.
  - `PropertyCard` hiển thị tối đa 3 nhóm tiện ích nổi bật; `PropertyModal` hiển thị tối đa 6 tiện ích nổi bật kèm nút mở cửa sổ **Tất cả tiện ích & dịch vụ** (`PropertyAmenitiesModal`).
  - `PropertyAmenitiesModal` hoạt động theo mô hình Master–Detail: tìm kiếm tiếng Việt không dấu, lọc theo nhóm, lọc theo mức phí (`Tất cả`, `Miễn phí`, `Có phụ phí`, `Đã chọn (N)`), xem chi tiết kèm ảnh/giờ/vị trí/lưu ý, bật/tắt 1-click và hỗ trợ chuyển qua lại danh sách ↔ chi tiết trên màn hình di động.

### FR-05: Chi tiết Chỗ nghỉ, Phiên đặt phòng & Báo giá (`BookingSession` & `BookingQuote`)
- **Hành vi chuẩn:**
  - `PropertyModal` hiển thị thư viện ảnh, thông số phòng (`maxGuests`, `bedrooms`, `beds`, `bathrooms`), thông tin chủ nhà (`Superhost`, tỷ lệ phản hồi), mô tả, tiện ích, đánh giá khách hàng và bảng đặt phòng.
  - **Khởi tạo một chiều (One-way Seeding):** Khi mở một chỗ nghỉ, phiên tự suy ra số đêm từ `SearchBar` (nếu ngày hợp lệ; hỗ trợ vắt qua năm với định dạng `dd/MM`; mặc định `2` đêm nếu trống hoặc không hợp lệ), kế thừa `adults`, `children`, `rooms` và tự động kẹp `adults` trong biên `[1..property.maxGuests]`, số đêm trong `[1..30]`.
  - **Bảo toàn & Làm sạch phiên:** Đóng rồi mở lại cùng một chỗ nghỉ (khi `SearchBar` không đổi) sẽ giữ nguyên số đêm, số khách và tiện ích đã chọn; đổi chỗ nghỉ hoặc đổi lịch tìm kiếm sẽ tạo phiên mới sạch; hoàn tất đặt phòng sẽ tự xóa bản nháp.
  - **Công thức tính giá chuẩn (`BookingQuote`):**
    - `nightsTotal = pricePerNight * nights`
    - `cleaningFee = 150.000đ`
    - `amenitiesFee = tổng price của các tiện ích paid đã chọn`
    - `discount = 100.000đ` (ưu đãi cố định hiện hành)
    - `total = max(0, nightsTotal + cleaningFee + amenitiesFee - discount)`

### FR-06: Quy trình Thanh toán, Xác nhận Server & Vé điện tử
- **Hành vi chuẩn:**
  - `BookingCheckoutModal` hiển thị tóm tắt kỳ nghỉ, danh sách tiện ích đã chọn (cho phép gỡ nhanh từng mục và cập nhật tổng tiền ngay lập tức), form thông tin khách (`fullName`, `phone`, `email`, `note` tùy chọn), nút **"Điền nhanh thông tin mẫu"** phục vụ trải nghiệm thử, và 4 lựa chọn phương thức thanh toán (`momo`, `vnpay`, `card`, `hotel`).
  - Kiểm tra hợp lệ bắt buộc: không được để trống họ tên/SĐT/email; SĐT hợp lệ chuẩn Việt Nam (`0...` hoặc `+84...`, 9–11 chữ số sau tiền tố); email đúng định dạng.
- **FR-06 (cập nhật v0.2.0):** Khi xác nhận ở chế độ `api`, client gửi `ServerReservationIntent` tới `POST /api/v1/reservations` tại `@luxestay/api` (Hono); server validate bằng `ServerReservationIntentSchema` và tính lại toàn bộ báo giá chuẩn (`201 Created` trả mã `LX-XXXXXX`, lỗi `4xx`/`5xx`/mạng hiển thị trung thực qua `HttpApiError`, không fallback ngầm). Ở chế độ `mock` độc lập (`NEXT_PUBLIC_DATA_MODE=mock`), ứng dụng dùng seed adapter nội bộ.
  - Nếu người dùng đóng modal trong lúc đang gửi yêu cầu, request bị hủy sạch thông qua `AbortSignal` để tránh chuyển trạng thái ngoài ý muốn.
  - `BookingSuccessModal` hiển thị mã đặt phòng, pháo hoa chúc mừng, chi tiết check-in (`14:00`) / check-out (`12:00`), danh sách tiện ích đã đăng ký, hướng dẫn liên hệ chủ nhà và nút **"Lưu vé xác nhận PDF"** (`window.print()`).

### FR-07: Khuyến mãi & Bằng chứng xã hội
- `PromotionBanner`: Hiển thị đồng hồ đếm ngược, hạn sử dụng (`30/11/2026`), danh sách mã voucher (`LUXESTAY250`, `SUMMERVIBE`) với nút sao chép 1 chạm và nút cuộn tới danh sách phòng.
- `TrendingDestinations`: 8 thẻ điểm đến phổ biến; bấm vào sẽ đặt `destination` trong bộ lọc và cuộn mượt xuống danh sách chỗ nghỉ.
- `TestimonialsSection`: Hiển thị đánh giá thực tế từ khách hàng trải nghiệm.

### FR-08: Điều phối Lớp phủ & Trợ năng
- Toàn bộ 7 lớp phủ (`FilterModal`, `FavoritesDrawer`, `AuthModal`, `PropertyModal`, `PropertyAmenitiesModal`, `BookingCheckoutModal`, `BookingSuccessModal`) đều đăng ký qua hệ thống ngăn xếp tập trung:
  - Phân tầng `z-index` không chồng chéo (hỗ trợ modal lồng nhau như `PropertyAmenitiesModal` mở trên `PropertyModal`).
  - Phím `Escape` chỉ đóng duy nhất lớp phủ trên cùng.
  - Khóa cuộn nền (`body overflow: hidden`) khi có ít nhất 1 lớp phủ mở và khôi phục chính xác khi lớp cuối cùng đóng.
  - Đầy đủ thuộc tính trợ năng `role="dialog"`, `aria-modal="true"`, `aria-label`.

### FR-09: Tra cứu & Hủy Đơn đặt phòng (`/bookings`, `/bookings/[bookingId]`)
- **Mục đích:** Cho phép khách đã đặt phòng chủ động tra cứu vé điện tử, in/lưu PDF và hủy phòng theo đúng chính sách hủy của chỗ nghỉ mà chưa cần đăng nhập tài khoản.
- **Hành vi chuẩn:**
  - Người dùng mở **"Tra cứu đơn"** trên `Navbar` (`/bookings`) hoặc bấm **"Quản lý / Tra cứu đơn đặt phòng"** ngay sau khi đặt thành công trong `BookingSuccessModal`.
  - Bắt buộc cung cấp đồng thời **Mã đặt phòng** (`LX-XXXXXX`, không phân biệt hoa/thường) và **Email hoặc SĐT đặt phòng** (email không phân biệt hoa/thường; SĐT VN tự chuẩn hóa `0...` / `84...` / `+84...`). Sai thông tin liên hệ trả lỗi `403 FORBIDDEN`; không tồn tại mã trả `404 NOT_FOUND`.
  - Màn hình `/bookings/[bookingId]` hiển thị trạng thái đơn (`confirmed` / `cancelled`), chi tiết chỗ nghỉ, lịch nhận/trả phòng, tiện ích đã đăng ký, cấu thành giá và hỗ trợ in vé PDF.
  - Khi đơn ở trạng thái `confirmed` và chỗ nghỉ hỗ trợ `freeCancellation`, khách có thể hủy đơn (kèm lý do tùy chọn) qua `PATCH /api/v1/reservations/:bookingId/cancel`; hệ thống cập nhật bền vững `status = "cancelled"`, `cancelledAt`, `cancellationReason`. Nếu chỗ nghỉ không hỗ trợ hủy miễn phí hoặc đơn đã hủy trước đó, API trả `409 CONFLICT`.

### FR-10: Trang Chi tiết Chỗ nghỉ độc lập (`/stays/[id]`) & Đồng bộ URL Tìm kiếm
- **Mục đích:** Mở khóa SEO, chia sẻ liên kết trực tiếp cho từng chỗ nghỉ và từng trạng thái lọc/tìm kiếm trên trang chủ.
- **Hành vi chuẩn:**
  - Route `/stays/[id]` render SSR từ `GET /api/v1/properties/:id` (hoặc seed ở `mock` mode), tạo metadata SEO/OpenGraph động (`title`, `description`, `og:image`), trả trang `404` khi mã chỗ nghỉ không tồn tại.
  - Giao diện `/stays/[id]` hiển thị đầy đủ thư viện ảnh, thông số, chủ nhà, đánh giá, danh mục tiện ích tích hợp chọn thêm add-on, bảng tính giá trực tiếp và nút đặt phòng chuyển thẳng sang `BookingCheckoutModal`.
  - `PropertyCard` có liên kết trực tiếp trên tiêu đề dẫn tới `/stays/[id]`; `PropertyModal` có nút **"Trang chi tiết"** và nút **"Chia sẻ"** sao chép URL `/stays/[id]`.
  - Trang chủ `/` đồng bộ 2 chiều trạng thái `StayCatalogQueryState` với URL query string (`dest`, `in`, `out`, `adults`, `children`, `rooms`, `cat`, `min`, `max`, `types`, `rating`, `amenities`, `freeCancel`, `sort`), bỏ qua giá trị mặc định để URL gọn và tự sanitize mọi tham số không hợp lệ.

### FR-11: Lịch phòng trống, Chống đặt trùng & Giá theo mùa
- **Mục đích:** Đảm bảo tồn kho phòng chính xác theo từng đêm, ngăn tuyệt đối 2 khách đặt trùng cùng một căn/phòng và minh bạch phụ thu cuối tuần/ngày lễ ngay từ bước chọn ngày.
- **Hành vi chuẩn:**
  - `GET /api/v1/properties/:id/availability?from=YYYY-MM-DD&to=YYYY-MM-DD` trả về lịch 45 ngày gồm tồn kho còn lại (`remainingUnits`), trạng thái khóa ngày (`isBlocked`), và giá hiệu lực theo đêm (`effectivePrice`, `priceReason`: `base | weekend | holiday | override`).
  - Quy tắc giá theo mùa: ưu tiên `overridePrice` > ngày lễ cố định VN (`+30%`: `01-01`, `04-30`, `05-01`, `09-02`, `12-24`, `12-25`, `12-31`) > đêm cuối tuần Thứ 6 & Thứ 7 (`+20%`) > giá gốc, nhân theo `guests.rooms` và hiển thị rõ dòng **"Phụ thu cuối tuần / ngày lễ"** kèm bảng chi tiết từng đêm (`SeasonalPricingSummary`).
  - Khi gửi `POST /api/v1/reservations`, server khóa giao dịch hàng `SELECT ... FOR UPDATE` (PostgreSQL) hoặc mutex theo `propertyId` (`memory`), tính tổng phòng đang giữ bởi đơn `confirmed` và `pending_payment` chưa hết hạn; nếu thiếu phòng hoặc trùng ngày khóa trả `409 CONFLICT`. Hủy đơn, thanh toán thất bại, hết hạn hoặc hoàn tất lưu trú sẽ giải phóng phòng ngay lập tức.
  - Component `AvailabilityCalendar` trên `/stays/[id]` và `PropertyModal` cho phép xem giá từng đêm, cảnh báo xung đột phòng trống và bấm chọn ngày nhận phòng trực tiếp.

### FR-12: Hoàn tất Lưu trú & Đánh giá Xác thực (Verified Reviews)
- **Mục đích:** Chỉ cho phép khách hàng thực sự đã lưu trú gửi đánh giá, ngăn chặn đánh giá ảo và giữ điểm số trung bình trung thực.
- **Hành vi chuẩn:**
  - Bổ sung trạng thái đơn `completed` và endpoint `POST /api/v1/reservations/:bookingId/complete` (khả dụng ở chế độ Sandbox để kiểm thử tức thì và dành cho Host/Admin ở Phase 3B); đơn đã `completed` không thể hủy (`409 CONFLICT`).
  - Endpoint `POST /api/v1/properties/:id/reviews` chỉ chấp nhận khi người gửi là chủ đơn hợp lệ (`403 FORBIDDEN` nếu sai), đơn đã `completed` hoặc `confirmed` quá `12:00` ngày `checkOut` (`409 CONFLICT` nếu chưa lưu trú xong), và đơn chưa từng gửi đánh giá (`reviews.booking_id UNIQUE`, `409 CONFLICT` nếu gửi trùng).
  - Server chèn review với `isVerified = true` và tính lại `properties.rating` + `properties.review_count` trong cùng transaction DB; UI hiển thị badge **"Đã xác thực lưu trú"** trên `/stays/[id]` & `PropertyModal`, cùng biểu mẫu đánh giá 1–5 sao ngay trên `/bookings/[bookingId]`.

### FR-13: Phân quyền RBAC & Cổng Chủ nhà / Quản trị (`/host`)
- **Mục đích:** Cung cấp công cụ tự vận hành cho Chủ nhà (`host`) và Quản trị viên (`admin`) ngay trên cùng nền tảng mà vẫn cách ly chặt chẽ quyền truy cập theo chủ sở hữu.
- **Hành vi chuẩn:**
  - Người dùng mang 1 trong 3 vai trò `guest | host | admin`; mỗi chỗ nghỉ gắn `ownerUserId`. API `/api/v1/host/*` trả `401 UNAUTHORIZED` nếu chưa đăng nhập và `403 FORBIDDEN` nếu là `guest` hoặc `host` cố thao tác trên chỗ nghỉ không thuộc sở hữu.
  - Giao diện `/host` cung cấp 4 phân hệ: **Tổng quan & Doanh thu** (KPI + biểu đồ doanh thu theo tháng + hiệu suất từng chỗ nghỉ), **Chỗ nghỉ** (tạo/sửa/xóa — chặn xóa `409` nếu còn đơn hoạt động), **Lịch phòng & Giá đặc biệt** (khóa ngày / ghi đè giá cập nhật tức thì vào `property_availability`), và **Đơn đặt phòng khách** (hỗ trợ đánh dấu hoàn tất lưu trú kể cả ngoài chế độ Sandbox).

### FR-14: Đa ngôn ngữ (`VI`/`EN`) & Đa tiền tệ (`VNĐ`/`USD`)
- **Mục đích:** Hỗ trợ du khách quốc tế và nội địa chuyển đổi ngôn ngữ/đơn vị tiền tệ tức thì mà không làm gián đoạn đường dẫn chia sẻ.
- **Hành vi chuẩn:**
  - `Navbar` cung cấp nút chuyển trực tiếp `VNĐ ↔ USD` và `VI ↔ EN`, lưu bền vững trong `localStorage` qua `LocaleContext` (`useSyncExternalStore`) không gây lệch SSR Hydration.
  - Giá hiển thị tự động quy đổi từ đơn vị chuẩn `VND` sang `USD` theo tỷ giá tham khảo `25.000 VNĐ/USD` (ví dụ `6.500.000 ₫` → `$260` ở `en-US`).

---

## 4. Yêu cầu phi chức năng (Non-Functional Requirements)

| Hạng mục | Yêu cầu cụ thể |
| :--- | :--- |
| **Hiệu năng UI** | Chia tách domain context (`Favorites`, `Catalog`, `BookingSession`) để giảm re-render chéo; cache bản chiếu tiện ích theo tham chiếu (`WeakMap`); dùng `next/image` với `remotePatterns` kiểm soát domain ảnh (`images.unsplash.com`, `plus.unsplash.com`). |
| **Toàn vẹn giá & Dữ liệu** | Server không bao giờ tin tưởng `pricing` gửi từ trình duyệt; toàn bộ dữ liệu đọc từ `localStorage` phải được sanitize (lọc kiểu, trùng lặp, ID không tồn tại). |
| **An toàn SSR / Hydration** | Không đọc trực tiếp `window.localStorage` trong render/useState initializer; sử dụng `useSyncExternalStore` với `getServerSnapshot` nhất quán. |
| **Khả năng kiểm thử** | Toàn bộ logic miền cốt lõi nằm trong `@luxestay/domain` thuần, có thể kiểm thử tự động 4 tầng (`contracts`, `domain`, `api`, `web`) bằng Node test runner không cần trình duyệt hay Docker. |
| **Responsive & UX** | Hoạt động trơn tru trên mobile (`< 640px`), tablet và desktop; ngôn ngữ giao diện `vi-VN`, đơn vị tiền tệ `VNĐ`. |
| **Chất lượng mã nguồn** | TypeScript `strict: true`, tuân thủ ESLint 9 + quy tắc import boundaries toàn repo (`eslint.boundaries.mjs`), giữ kiến trúc Deep Module và thuật ngữ nhất quán với [GLOSSARY.md](../GLOSSARY.md). |

---

## 5. Danh mục Tính năng Mở rộng (Future Product Epics)

Chi tiết phân kỳ triển khai xem tại [PLAN.md](./PLAN.md). Tóm tắt trạng thái các nhóm tính năng mở rộng:

1. ~~**Epic 1 — Lưu trữ Cơ sở dữ liệu & Quản lý Đơn đặt phòng:**~~ **Đã hoàn thành ở Phase 1 (`v0.3.0`)** — PostgreSQL 16 + Drizzle ORM, tra cứu & hủy đơn tại `/bookings` & `/bookings/[bookingId]`.
2. ~~**Epic 2 — Đường dẫn Chỗ nghỉ riêng & Đồng bộ URL (SEO & Deep-linking):**~~ **Đã hoàn thành ở Phase 1 (`v0.3.0`)** — `/stays/[id]` SSR + OpenGraph & URL query sync trên `/`.
3. ~~**Epic 3 — Xác thực Người dùng & Đồng bộ Yêu thích Đa thiết bị:**~~ **Đã hoàn thành ở Phase 2 (`v0.4.0`)** — Custom Session Auth (`scrypt` + OTP + `HttpOnly` Cookie), `AuthContext` + `AuthModal`, merge Wishlist `localStorage ↔ user_favorites` và **"Đơn đặt phòng của bạn"**.
4. ~~**Epic 4 — Hệ thống Mã giảm giá động (Voucher Engine):**~~ **Đã hoàn thành ở Phase 2 (`v0.4.0`)** — `evaluatePromotionVoucher`, `POST /api/v1/vouchers/validate`, áp mã `LUXESTAY250` / `SUMMERVIBE` trên `BookingCheckoutModal` & xác thực chuẩn phía server.
5. ~~**Epic 5 — Tích hợp Thanh toán & Thông báo:**~~ **Đã hoàn thành ở Phase 2 (`v0.4.0`, Sandbox Production-flow)** — `pending_payment` → `/payments/[transactionId]` → Webhook ký `HMAC-SHA256` + Idempotency + nhật ký email vé điện tử `notification_logs`.
6. ~~**Epic 6 — Lịch trống phòng, Đánh giá xác thực & Cổng Chủ nhà:**~~ **Đã hoàn thành ở Phase 3A & 3B (`v0.5.0` → `v0.6.0`)** — Availability Engine + khóa chống đặt trùng `SELECT ... FOR UPDATE`, giá cuối tuần/lễ, Verified Reviews, RBAC Host/Admin Portal `/host`, `LocaleContext` (`vi`/`en`, `VND`/`USD`) và Playwright Chromium E2E.

---

## 6. Quy tắc quản trị tài liệu PRD

- Mọi tính năng mới hoặc thay đổi hành vi người dùng **phải cập nhật mục FR tương ứng** trong `docs/PRD.md` trước hoặc cùng lúc với PR triển khai.
- Khi chuyển một tính năng từ **Prototype UI-only** sang **Đã triển khai đầy đủ**, phải cập nhật bảng ở mục `1.3` và đối chiếu trạng thái với [PLAN.md](./PLAN.md).
- Các quyết định kỹ thuật phát sinh từ thay đổi yêu cầu phải được ghi nhận trong [docs/adr/](./adr/README.md).
