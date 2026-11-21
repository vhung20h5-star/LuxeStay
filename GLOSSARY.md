# LuxeStay Domain Glossary

Tài liệu này định nghĩa ngôn ngữ miền (domain vocabulary) chuẩn của dự án **LuxeStay (`travel-service`)**. Các module, interface, tài liệu thiết kế và bài test sử dụng thống nhất các thuật ngữ dưới đây.

---

## Core Domain Terms

### Property (Chỗ nghỉ)
Một địa điểm lưu trú có thể đặt phòng (`hotel`, `homestay`, `villa`, `resort`, `glamping`), có giới hạn sức chứa tối đa (`maxGuests`), đơn giá mỗi đêm (`pricePerNight`) và danh sách tiện ích tùy biến (`resortAmenities`).

### Resort Amenity (Tiện ích & Dịch vụ khu nghỉ dưỡng)
Một tiện nghi hoặc dịch vụ trải nghiệm tại chỗ nghỉ được hợp nhất từ danh mục chuẩn (`AMENITY_CATALOG`) và cấu hình riêng của từng `Property`. Mỗi tiện ích thuộc một trong 7 nhóm chuẩn và có `pricingType`:
- `included`: Đã bao gồm sẵn trong giá phòng, sử dụng tự do.
- `free-reservation`: Miễn phí (`0đ`) nhưng cần hoặc khuyến nghị đăng ký giữ chỗ trước khi đặt phòng.
- `paid`: Dịch vụ chọn thêm có phụ phí cố định theo kỳ nghỉ, cộng trực tiếp vào báo giá.

### Booking Session (Phiên đặt phòng)
Trạng thái vòng đời đặt phòng đang hoạt động cho một `Property` duy nhất (từ lúc mở xem tại `PropertyModal`, chuyển sang `BookingCheckoutModal` đến khi nhận vé xác nhận tại `BookingSuccessModal`).
- Được khởi tạo (seed) một chiều từ `SearchCriteria` (tự suy ra `nights = checkOut - checkIn` nếu lịch hợp lệ, ngược lại mặc định `2` đêm; kế thừa số khách và tự động kẹp `adults <= property.maxGuests`).
- Sở hữu toàn bộ các bất biến (invariants) của phiên: số đêm (`1..30`), số khách hợp lệ, danh sách `selectedAmenityIds` (chỉ nhận các tiện ích `free-reservation` hoặc `paid` thuộc đúng `Property` hiện tại), bước luồng hiện tại, và tự động làm sạch khi chuyển sang `Property` khác hoặc khi hoàn tất đơn.

### Booking Quote (Báo giá đặt phòng)
Bản tính giá và lịch trình dẫn xuất tất định từ một `BookingSession`, bao gồm:
- Ngày `checkIn` và `checkOut` định dạng `dd/MM/yyyy` (luôn khớp `checkOut = checkIn + nights`).
- Số lượng khách (`adults`, `children`, `rooms`) đã chuẩn hóa theo sức chứa của `Property`.
- Danh sách `selectedAmenities` đã giải nghĩa kèm mức phí từng mục.
- Chi tiết cấu thành giá: `basePrice`, `nightsTotal`, `cleaningFee` (`150.000đ`), `amenitiesFee`, `discount` (`100.000đ`) và `total` (`nightsTotal + cleaningFee + amenitiesFee - discount`).

### Reservation Submitter (Seam xác nhận đặt phòng)
Seam xử lý bước gửi yêu cầu đặt phòng đã qua kiểm tra hợp lệ thông tin khách (`guestInfo`) và phương thức thanh toán (`paymentMethod`) để trả về vé xác nhận `BookingDetails`:
- **`BrowserReservationAdapter`**: Adapter mặc định trên trình duyệt (mô phỏng độ trễ xác nhận bất đồng bộ có hỗ trợ hủy khi đóng hộp thoại, sẵn sàng thay bằng HTTP/Database adapter khi nối backend).
- **`InMemoryReservationAdapter`**: Adapter phục vụ kiểm thử tự động chạy tức thì, tất định, không dùng `setTimeout`.

### Stay Catalog Query (Truy vấn danh mục chỗ nghỉ)
Nguồn chân lý duy nhất quản lý toàn bộ điều kiện tìm kiếm, lọc và sắp xếp danh mục chỗ nghỉ (`destination`, `checkIn`/`checkOut`, `guests`, `category`, `minPrice`..`maxPrice`, `propertyTypes`, `minRating`, `amenities`, `freeCancellationOnly`, `sortBy`). Mọi caller trang chủ (`SearchBar`, `CategoryBar`, `FilterModal`, `PropertyList`, `TrendingDestinations`) đều đi qua cùng một interface, bảo đảm `reset` đặt lại trọn vẹn kể cả `sortBy` và tab loại hình.

### Active Filter Chip (Thẻ bộ lọc đang bật)
Mô tả có cấu trúc do `Stay Catalog Query` sinh ra cho từng tiêu chí lọc đang kích hoạt (điểm đến, danh mục, khoảng giá, loại hình, đánh giá, tiện ích, hủy miễn phí) để `PropertyList` hiển thị và cho phép gỡ nhanh từng tiêu chí mà không tự đọc lại cấu trúc lọc bên trong.

### Quick Search Trend (Xu hướng tìm kiếm nhanh)
Bộ gợi ý tìm kiếm có cấu trúc (`label`, `destination`, tùy chọn `category` / `propertyType`) giúp áp dụng chính xác thành phố và bộ lọc phù hợp chỉ bằng 1 chạm (đồng thời xóa bộ lọc danh mục/loại hình xung đột từ lượt tìm trước), thay cho cách cắt chuỗi thủ công dễ sai.
