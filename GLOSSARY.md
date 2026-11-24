# LuxeStay Domain Glossary

Tài liệu này định nghĩa ngôn ngữ miền (domain vocabulary) chuẩn của dự án **LuxeStay (`travel-service` Monorepo v0.4.0)**. Các workspace (`@luxestay/contracts`, `@luxestay/domain`, `@luxestay/api`, `@luxestay/web`), tài liệu thiết kế và bài test sử dụng thống nhất các thuật ngữ dưới đây.

---

## Core Domain Terms

### Property (Chỗ nghỉ)
Một địa điểm lưu trú có thể đặt phòng (`hotel`, `homestay`, `villa`, `resort`, `glamping`), có giới hạn sức chứa tối đa (`maxGuests`), đơn giá mỗi đêm (`pricePerNight`) và danh sách tiện ích tùy biến (`resortAmenities`).

### Resort Amenity (Tiện ích & Dịch vụ khu nghỉ dưỡng)
Một tiện nghi hoặc dịch vụ trải nghiệm tại chỗ nghỉ được hợp nhất từ danh mục chuẩn (`AMENITY_CATALOG`) và cấu hình riêng của từng `Property`. Mỗi tiện ích thuộc một trong 7 nhóm chuẩn và có `pricingType`:
- `included`: Đã bao gồm sẵn trong giá phòng, sử dụng tự do.
- `free-reservation`: Miễn phí (`0đ`) nhưng cần hoặc khuyến nghị đăng ký giữ chỗ trước khi đặt phòng.
- `paid`: Dịch vụ chọn thêm có phụ phí cố định theo kỳ nghỉ, cộng trực tiếp vào báo giá.

### Contracts Package (`@luxestay/contracts`)
Gói dùng chung chứa nguồn chân lý duy nhất cho hợp đồng giao tiếp giữa `@luxestay/web` và `@luxestay/api`: các **Zod schemas**, TypeScript types suy ra từ schema, envelope phản hồi chuẩn (`ApiSuccessResponse<T>`, `ApiErrorResponse`), mã lỗi chuẩn (`ErrorCode`), và hằng số đường dẫn phiên bản (`API_ENDPOINTS`).

### Catalog Snapshot (Ảnh chụp danh mục)
Gói dữ liệu đọc chuẩn hóa (`CatalogSnapshot`, xác thực bằng `CatalogSnapshotSchema`) trả về từ `GET /api/v1/catalog` (hoặc `SEED_CATALOG_SNAPSHOT` khi ở `mock` mode), gồm `properties`, `categories`, `destinations`, `amenityCategories`, `amenityFilterOptions`, `amenityCatalog`, `promotions` và `testimonials`. Toàn bộ giao diện `@luxestay/web` đọc dữ liệu từ snapshot này qua `CatalogContext`, không import trực tiếp seed data.

### Booking Session (Phiên đặt phòng)
Trạng thái vòng đời đặt phòng đang hoạt động cho một `Property` duy nhất (`idle` → `previewing` → `checking-out` → `confirmed` → `idle`), nằm tại `packages/domain/src/bookingSession.ts`.
- Được khởi tạo (seed) một chiều từ `SearchCriteria` (tự suy ra `nights = checkOut - checkIn` nếu lịch hợp lệ, ngược lại mặc định `2` đêm; kế thừa số khách và tự động kẹp `adults <= property.maxGuests`).
- Sở hữu toàn bộ bất biến: `nights ∈ [1..30]`, số khách hợp lệ, `selectedAmenityIds` chỉ nhận tiện ích `free-reservation`/`paid` thuộc đúng `Property`, và tự làm sạch khi đổi chỗ nghỉ hoặc hoàn tất đơn.

### Booking Quote (Báo giá đặt phòng)
Bản tính giá và lịch trình dẫn xuất tất định từ một `BookingSession` (`deriveBookingQuote`):
- Ngày `checkIn` / `checkOut` định dạng `dd/MM/yyyy` (luôn khớp `checkOut = checkIn + nights`).
- Số khách (`adults`, `children`, `rooms`) đã chuẩn hóa theo sức chứa.
- Danh sách `selectedAmenities` đã giải nghĩa kèm mức phí từng mục.
- Chi tiết cấu thành giá: `basePrice`, `nightsTotal`, `cleaningFee` (`150.000đ`), `amenitiesFee`, `discount` (`100.000đ`) và `total = max(0, nightsTotal + cleaningFee + amenitiesFee - discount)`.

### Server Reservation Intent (Ý định đặt phòng gửi lên Server)
Payload tối giản (`ServerReservationIntent`, xác thực bằng `ServerReservationIntentSchema`) mà client gửi tới `POST /api/v1/reservations` — chỉ chứa `propertyId`, `checkInSeed`, `nights`, `guests`, `selectedAmenityIds`, `guestInfo` và `paymentMethod` (tuyệt đối không gửi `pricing`). Backend dùng `processServerReservationIntent` để tự tính lại toàn bộ báo giá chuẩn (authoritative server pricing).

### Reservation Submitter (Seam xác nhận đặt phòng)
Seam tại `apps/web/src/shared/ports/persistencePort.ts` xử lý bước gửi yêu cầu đặt phòng và trả về `BookingDetails` đóng băng:
- **`HttpReservationAdapter`**: Gọi `POST /api/v1/reservations` tại `@luxestay/api`, xác thực response bằng Zod, hỗ trợ `AbortSignal`, và ném `HttpApiError` trung thực khi gặp lỗi `4xx`/`5xx`/mạng.
- **`BrowserReservationAdapter`**: Adapter mô phỏng độ trễ có hỗ trợ `AbortSignal`, chỉ kích hoạt khi đặt tường minh `NEXT_PUBLIC_DATA_MODE=mock`.
- **`InMemoryReservationAdapter`**: Adapter tất định `0ms` phục vụ kiểm thử tự động, có `getSubmittedBookings()`.

### Data Mode (`api` | `mock`) & `HttpApiError`
- **`Data Mode`**: Biến môi trường tường minh `NEXT_PUBLIC_DATA_MODE` quy định `@luxestay/web` kết nối thật tới `@luxestay/api` (`api` — mặc định, tuyệt đối không âm thầm fallback) hay dùng seed adapter độc lập (`mock`).
- **`HttpApiError`**: Lớp lỗi chuẩn hóa phía web (`status`, `code: ErrorCode`, `message`, `details?`, `requestId?`) để hiển thị lỗi nghiệp vụ/mạng trung thực trên UI và Error Boundary.

### Stay Catalog Query (Truy vấn danh mục chỗ nghỉ)
Nguồn chân lý duy nhất tại `packages/domain/src/catalogQuery.ts` quản lý toàn bộ điều kiện tìm kiếm, lọc và sắp xếp (`destination`, `checkIn`/`checkOut`, `guests`, `category`, `minPrice`..`maxPrice`, `propertyTypes`, `minRating`, `amenities`, `freeCancellationOnly`, `sortBy`).

### Active Filter Chip (Thẻ bộ lọc đang bật)
Mô tả có cấu trúc do `Stay Catalog Query` sinh ra cho từng tiêu chí lọc đang kích hoạt để `PropertyList` hiển thị và cho phép gỡ nhanh từng tiêu chí.

### Quick Search Trend (Xu hướng tìm kiếm nhanh)
Bộ gợi ý tìm kiếm có cấu trúc (`label`, `destination`, tùy chọn `category` / `propertyType`) giúp áp dụng chính xác thành phố và bộ lọc phù hợp chỉ bằng 1 chạm đồng thời xóa bộ lọc xung đột cũ.

### Property Amenity Projection (Bản chiếu tiện ích chỗ nghỉ)
Cấu trúc dẫn xuất có cache `WeakMap` theo tham chiếu `property.resortAmenities` tại `packages/domain/src/amenities.ts`: `all`, tra cứu $O(1)$ `byId`, `groups`, `categories`, top 3 `cardHighlights`, top 6 `featured` và tập `filterKeys`.

### Amenity Explorer (Trình duyệt tiện ích Master–Detail)
Bộ máy trạng thái và hàm dẫn xuất view model thuần (`createAmenityExplorerState`, `reduceAmenityExplorerState`, `deriveAmenityExplorerView`) cho `PropertyAmenitiesModal`.

### Amenity Pricing Descriptor (Bộ mô tả hiển thị giá tiện ích)
Nguồn chân lý duy nhất (`describeAmenityPricing`, `describeSelectedAmenity`, `formatAmenitiesFeeSummary`) chuyển `pricingType` và phụ phí thành nhãn ngắn, trạng thái, câu chữ hành động và `tone` thống nhất cho 5 màn hình UI.

### Overlay Stack Coordinator (Bộ điều phối ngăn xếp lớp phủ)
Module thuần `apps/web/src/shared/overlay/overlayStack.ts` kết hợp React host mỏng `OverlayContext.tsx` điều phối tập trung toàn bộ 7 modal/drawer: phân tầng theo `tier`, cấp `z-index` động, phím `Escape` duy nhất cho lớp trên cùng và khóa cuộn nền có đếm tham chiếu.

### Favorites Repository & Split Domain Contexts
- **`FavoritesRepository`**: Seam tại `apps/web/src/shared/ports/persistencePort.ts` tách `localStorage` + sự kiện `storage` đa tab khỏi React context qua `useSyncExternalStore` (`BrowserFavoritesAdapter` & `InMemoryFavoritesAdapter`).
- **`Split Domain Contexts`**: `BookingProvider` (`apps/web/src/features/booking/BookingContext.tsx`) chia 3 context chuyên biệt (`useFavorites`, `useCatalog`, `useBookingSession`) để cô lập re-render, đồng thời giữ `useBooking()` làm facade tương thích ngược.

### App Ports (Cổng tích hợp ứng dụng)
Gói seam I/O của `@luxestay/web` (`AppPorts`: `favorites`, `reservations`, `reservationManager`; cùng `CatalogRepository` cho read-side `getSnapshot` & `getPropertyById`) được khởi tạo theo `DataMode` qua `createWebAppPorts` / `createCatalogRepositoryForMode` hoặc `createInMemoryAppPorts` (test).

### Reservation Manager Port (Seam tra cứu & hủy đơn)
Seam tại `apps/web/src/shared/ports/persistencePort.ts` cung cấp `lookup(bookingId, contact)` và `cancel(bookingId, input)` đồng bộ qua 3 adapter:
- **`HttpReservationManagerAdapter`**: Gọi `GET /api/v1/reservations/:bookingId?contact=...` và `PATCH /api/v1/reservations/:bookingId/cancel`, giữ nguyên mã lỗi `403 FORBIDDEN` / `404 NOT_FOUND` / `409 CONFLICT`.
- **`BrowserReservationManagerAdapter`**: Tra cứu và cập nhật trạng thái đơn mock trong `localStorage` (`luxestay_mock_bookings`) dùng chung quy tắc thuần `matchesReservationContact` và `evaluateReservationCancellation` của `@luxestay/domain`.
- **`InMemoryReservationManager`**: Adapter trong bộ nhớ cho kiểm thử tự động.

### URL Catalog Sync (Đồng bộ truy vấn URL)
Cặp hàm thuần `serializeCatalogQueryToSearchParams` & `parseCatalogQueryFromSearchParams` (`packages/domain/src/catalogQuery.ts`) kết hợp component `CatalogUrlSync` (`apps/web/src/features/catalog/CatalogUrlSync.tsx`) giúp đồng bộ 2 chiều giữa bộ lọc trang chủ `/` và query string URL (tự loại bỏ giá trị mặc định và sanitize tham số sai lệch).

### Storage Driver (`memory` | `database`)
Biến môi trường `STORAGE_DRIVER` trên `@luxestay/api` điều khiển lớp lưu trữ của Backend: `memory` chạy in-memory/seed (mặc định cho test & CI không cần Docker), còn `database` kích hoạt PostgreSQL 16 + Drizzle ORM (`apps/api/src/db/`, 19 bảng chuẩn hóa) theo [ADR-0008](./docs/adr/0008-postgresql-drizzle-database-layer.md).

### Auth Session & Remote Wishlist Sync (`AuthContext`, `AuthPort`)
Hệ thống xác thực tự chủ của LuxeStay ([ADR-0009](./docs/adr/0009-custom-session-auth-and-wishlist-sync.md)): băm mật khẩu bằng `crypto.scrypt`, hỗ trợ đăng nhập OTP 6 số, lưu phiên bằng `HttpOnly` cookie `luxestay_session` (hash SHA-256 trong `user_sessions`), tự động hợp nhất Wishlist từ `localStorage` lên `user_favorites` khi đăng nhập, và gắn `userId` vào đơn đặt phòng mới.

### Dynamic Voucher Engine (`evaluatePromotionVoucher`)
Module thuần tại `packages/domain/src/vouchers.ts` thay thế mức giảm giá cố định cũ bằng quy tắc mã giảm giá động (`fixed` hoặc `percent` có `minOrderTotal`, `maxDiscount`, `expiresAt`, `isActive`, `memberOnly`), dùng chung cho cả preview tại `BookingCheckoutModal`, endpoint `POST /api/v1/vouchers/validate` và tính giá chuẩn phía server trong `processServerReservationIntent`.

### Payment Gateway Sandbox & Webhook Idempotency
Quy trình thanh toán trực tuyến chuẩn thực tế ([ADR-0010](./docs/adr/0010-payment-sandbox-webhook-and-notifications.md)): đơn thanh toán qua `vnpay`/`momo`/`card` khởi tạo ở trạng thái `pending_payment` kèm `PaymentTransaction` (`TXN-XXXXXX`), chuyển sang `/payments/[transactionId]`, và chỉ chuyển sang `confirmed` / `payment_failed` / `expired` thông qua webhook `POST /api/v1/payments/webhook/:provider` được ký `HMAC-SHA256` (`x-luxestay-signature`) với kiểm tra chống xử lý trùng (`payment_webhook_events`) và ghi email vé điện tử vào `notification_logs`.
