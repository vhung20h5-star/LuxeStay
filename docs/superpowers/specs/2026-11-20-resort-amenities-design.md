# Thiết kế tính năng: Hệ thống Tiện ích & Dịch vụ Khu nghỉ dưỡng (Resort Amenities)

**Ngày tạo:** 2026-11-20  
**Dự án:** LuxeStay (`travel-service` — Next.js App Router, TypeScript, Tailwind CSS v4, Framer Motion, Lucide React)  
**Trạng thái:** Chờ phê duyệt thiết kế

---

## 1. Mục tiêu & Lý do (Intent & Why)

Hiện tại trong LuxeStay, thông tin tiện ích của mỗi chỗ nghỉ chỉ là một mảng 5–7 chuỗi text phẳng (`Property.amenities: string[]`) hiển thị tĩnh trong [PropertyModal.tsx](file:///d:/Tutorial-Vibe%20Coding/travel-service/src/components/property/PropertyModal.tsx), không phân nhóm, không thể bấm vào để xem chi tiết (giờ mở cửa, miễn phí hay có phụ phí, vị trí, quy định đặt trước), và bộ lọc tiện ích ở [FilterModal.tsx](file:///d:/Tutorial-Vibe%20Coding/travel-service/src/components/home/FilterModal.tsx) bị lỗi so khớp chuỗi cứng.

Tính năng này nâng cấp toàn bộ trải nghiệm khám phá tiện ích khu nghỉ dưỡng để:
- Khách hàng nắm nhanh tiện ích chính ngay từ danh sách chỗ nghỉ ngoài trang chủ (`PropertyCard` & `FilterModal`).
- Khi xem chi tiết chỗ nghỉ (`PropertyModal`), khách có thể bấm trực tiếp vào tiện nghi nổi bật hoặc mở giao diện **"Tất cả tiện ích & dịch vụ"** được phân loại khoa học theo **7 nhóm chuẩn** (Hồ bơi & Bãi biển, Thể thao & Giải trí, Ẩm thực & Đồ uống, Dịch vụ khách sạn & Spa, Đưa đón & Di chuyển, Tiện nghi phòng & Gia đình, An ninh & Tiện ích chung).
- Khi bấm vào từng tiện ích, khách xem được thông tin trực quan đầy đủ (ảnh minh họa, mô tả, giờ hoạt động, vị trí, mức phí/miễn phí, lưu ý) và có thể **bật/tắt 1-click để yêu cầu thêm dịch vụ đi kèm** nối thẳng vào bảng giá và luồng đặt phòng (`PropertyModal` → `BookingCheckoutModal` → `BookingSuccessModal`).

### Mục tiêu (Goals)
- Áp dụng đồng bộ cho **cả 12 chỗ nghỉ** trong [properties.ts](file:///d:/Tutorial-Vibe%20Coding/travel-service/src/data/properties.ts) với dữ liệu tùy biến sát thực tế từng loại hình (`resort`, `hotel`, `villa`, `homestay`, `glamping`), ẩn nhóm không có.
- Trải nghiệm **Master–Detail 2 cột trên desktop** và **chuyển màn hình danh sách ↔ chi tiết trên mobile**, kèm ảnh minh họa thực tế, thanh tìm kiếm nhanh, tab danh mục và bộ lọc theo trạng thái phí/đã chọn.
- Kết nối liền mạch các tiện ích/dịch vụ đã chọn (cả dịch vụ miễn phí cần đặt trước lẫn dịch vụ có phụ phí cố định theo kỳ nghỉ) vào bảng giá và vé xác nhận đặt phòng, đồng thời đồng bộ `nights` và `adults` giữa `PropertyModal` và `BookingCheckoutModal`.
- Nâng cấp bộ lọc tiện ích tại `FilterModal` theo danh sách khóa chuẩn hóa và hiển thị badge/icon nhóm tiện ích nhanh trên `PropertyCard`.

### Không thuộc phạm vi (Non-goals)
- Không xây dựng backend/database thật hoặc thanh toán cổng thật (giữ mô hình client-side state & mock data của ứng dụng hiện tại).
- Không chuyển `PropertyModal` sang route trang riêng `/properties/[id]` (giữ nguyên kiến trúc modal đang hoạt động).
- Không tùy chỉnh số lượng (quantity) hay chọn khung giờ cụ thể cho từng dịch vụ add-on (chọn bật/tắt 1-click theo gói cố định mỗi kỳ nghỉ).
- Không cài thêm thư viện UI ngoài (tái sử dụng Tailwind CSS v4, Framer Motion, Lucide React và các component trong `src/components/ui/`).

### Điều cần tránh (Anti-goals)
- Nhồi nhét tiện ích phi thực tế vào homestay nhỏ (ví dụ gắn sân tennis hay quản gia 24/7 vào cottage rừng thông).
- Ảnh minh họa lỗi/vỡ khung khi ảnh từ Unsplash chậm tải hoặc thất bại.
- Bấm phím `Escape` khi đang mở modal "Tất cả tiện ích" lại đóng luôn cả `PropertyModal` bên dưới.
- Giữ lại tiện ích đã chọn của chỗ nghỉ A khi khách đóng đi và mở sang chỗ nghỉ B.

---

## 2. Ràng buộc kỹ thuật (Constraints)

- **Tech stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion 12, Lucide React (`package.json`).
- **Hình ảnh:** `next.config.ts` cho phép `images.unsplash.com` và `plus.unsplash.com`. Toàn bộ ảnh minh họa tiện ích phải dùng URL hợp lệ từ `images.unsplash.com` và có cơ chế fallback an toàn nếu ảnh lỗi tải.
- **Ngôn ngữ & Định dạng:** 100% giao diện tiếng Việt nhất quán với LuxeStay; tiền tệ dùng `formatVND` từ `src/lib/utils.ts`.
- **Tương thích dữ liệu:** Giữ nguyên trường `Property.amenities: string[]` để không phá vỡ bất kỳ tham chiếu cũ nào, bổ sung cấu trúc tiện ích chuyên sâu song song.

---

## 3. Phương án kiến trúc đã chọn (Approaches)

### Các phương án đã cân nhắc
1. **Phương án A — Master Catalog chuẩn hóa + Override theo từng chỗ nghỉ (ĐÃ CHỌN):**  
   Xây dựng danh mục mẫu chuẩn (`src/data/amenities.ts`) gồm 7 nhóm và ~42 tiện ích/dịch vụ chuẩn (kèm icon, ảnh, mô tả, giờ, loại phí mặc định, `filterKeys`). Mỗi trong 12 chỗ nghỉ trong `properties.ts` chỉ tham chiếu `amenityId` kèm các trường ghi đè riêng (tên đặc thù, giá, giờ, vị trí, lưu ý, cờ `featured`). Một helper (`src/lib/amenities.ts`) gộp dữ liệu và phục vụ UI + bộ lọc.
   - *Trade-off:* Thêm một tầng resolver nhẹ, đổi lại `properties.ts` gọn gàng, không lặp dữ liệu chung, bộ lọc ở `FilterModal` & badge ở `PropertyCard` chính xác 100%, dễ bảo trì và mở rộng.
2. **Phương án B — Nhúng toàn bộ object tiện ích chi tiết trực tiếp vào từng chỗ nghỉ trong `properties.ts`:**  
   Không cần tầng resolver nhưng làm `properties.ts` phình lên hàng nghìn dòng, lặp lại URL ảnh/icon và dễ lệch khóa lọc.

**Lý do chọn Phương án A:** Người dùng đã chọn Phương án A vì cần áp dụng cho cả 12 chỗ nghỉ, nâng cấp đồng bộ cả `FilterModal`, `PropertyCard`, `PropertyModal` và luồng `Checkout` với độ chính xác cao và mã nguồn modular.

---

## 4. Thiết kế chi tiết

### 4.1. Mô hình dữ liệu (`src/types/index.ts`)

```ts
export type AmenityCategoryId =
  | "pool-beach"
  | "sports-recreation"
  | "dining"
  | "hotel-spa"
  | "transport"
  | "room-family"
  | "security-general";

export type AmenityPricingType = "included" | "free-reservation" | "paid";

export type AmenityFilterKey =
  | "pool"
  | "beach"
  | "sports-gym"
  | "dining"
  | "spa-wellness"
  | "transport-shuttle"
  | "bbq-campfire"
  | "bath-fireplace"
  | "family-pet";

export interface AmenityCategoryMeta {
  id: AmenityCategoryId;
  label: string;
  shortLabel: string;
  iconName: string;
  description: string;
}

export interface AmenityCatalogItem {
  id: string;
  category: AmenityCategoryId;
  name: string;
  shortLabel: string;
  iconName: string;
  description: string;
  image: string;
  hours: string;
  location: string;
  pricingType: AmenityPricingType;
  price?: number;        // Bắt buộc khi pricingType === "paid"
  priceUnit?: string;    // VD: "chuyến 2 chiều", "gói / kỳ nghỉ", "suất 60 phút"
  notes?: string;
  filterKeys: AmenityFilterKey[];
}

export interface PropertyAmenityOverride {
  amenityId: string;
  featured?: boolean;
  name?: string;
  shortLabel?: string;
  description?: string;
  image?: string;
  hours?: string;
  location?: string;
  pricingType?: AmenityPricingType;
  price?: number;
  priceUnit?: string;
  notes?: string;
}

export interface ResolvedPropertyAmenity extends AmenityCatalogItem {
  featured: boolean;
}

export interface SelectedBookingAmenity {
  id: string;
  name: string;
  category: AmenityCategoryId;
  pricingType: "free-reservation" | "paid";
  price: number;         // 0 nếu là free-reservation
  priceUnit?: string;
}
```

Cập nhật các type hiện có:
- `Property`: bổ sung `resortAmenities: PropertyAmenityOverride[]`.
- `FilterState`: trường `amenities: AmenityFilterKey[]` (thay cho mảng chuỗi tự do trước đây).
- `BookingDetails`:
  - `pricing`: thêm `amenitiesFee: number`.
  - thêm `selectedAmenities: SelectedBookingAmenity[]`.

### 4.2. Danh mục 7 nhóm chuẩn & độ phủ 12 chỗ nghỉ (`src/data/amenities.ts` & `src/data/properties.ts`)

**7 nhóm danh mục (`AMENITY_CATEGORIES`):**
1. `pool-beach` — **Hồ bơi & Bãi biển** (Hồ bơi vô cực, hồ bơi nước ấm 4 mùa, hồ bơi lọc sinh học, bãi biển riêng, bồn tắm gỗ ngoài trời, ghế tắm nắng/cabana...)
2. `sports-recreation` — **Thể thao & Giải trí** (Phòng gym view núi/biển, lớp Yoga buổi sáng, sân Tennis/Pickleball, chèo SUP & lặn san hô, thuyền gỗ chèo hồ, xe đạp địa hình/dạo phố, trekking có hướng dẫn, rạp chiếu phim ngoài trời/Netflix, góc đọc sách...)
3. `dining` — **Ẩm thực & Đồ uống** (Bữa sáng buffet Á-Âu, bữa sáng tại phòng, Floating Breakfast, nhà hàng đặc sản địa phương, quầy bar/Sky Lounge, tiệc BBQ sân vườn, bữa tối thắp nến riêng tư, lớp học nấu ăn, trà chiều & cà phê hạt...)
4. `hotel-spa` — **Dịch vụ khách sạn & Spa** (Lễ tân 24/7, quản gia riêng Private Butler, Spa trị liệu/tắm lá thuốc Dao Đỏ, xông hơi khô/ướt, dọn phòng hằng ngày, giặt ủi lấy nhanh, dịch vụ phòng 24/7...)
5. `transport` — **Đưa đón & Di chuyển** (Đưa đón sân bay riêng, xe điện nội khu/vào Phố Cổ, tàu cao tốc riêng, thuê xe máy/ô tô tự lái, bãi đỗ xe hầm thông minh, tour du thuyền/câu mực...)
6. `room-family` — **Tiện nghi phòng & Gia đình** (Wifi cáp quang, Smart Home, bếp nấu đầy đủ, lò sưởi củi/sưởi sàn, máy giặt sấy, khu vui chơi trẻ em, cũi em bé, cho phép thú cưng...)
7. `security-general` — **An ninh & Tiện ích chung** (An ninh & camera 24/7, khóa từ thông minh, két sắt cá nhân, hỗ trợ y tế 24/7, giữ hành lý miễn phí, nhận/trả phòng linh hoạt...)

**Phân bổ thực tế cho 12 chỗ nghỉ:**
- **Resort & Villa cao cấp** (`stay-02`, `stay-05`, `stay-08`, `stay-10`): đầy đủ 6–7 nhóm, mỗi nơi ~16–20 tiện ích chi tiết, gồm cả tiện ích miễn phí bao gồm sẵn, miễn phí cần đặt trước (xe điện Phố Cổ, tàu cao tốc đón, Floating Breakfast nếu đi kèm...) và dịch vụ nâng cao có phụ phí (Spa trị liệu, bữa tối lãng mạn, tour du thuyền, đưa đón sân bay riêng...).
- **Khách sạn 5 sao / Penthouse** (`stay-03`, `stay-07`): 6–7 nhóm, mỗi nơi ~14–18 tiện ích sát đặc thù (Sa Pa có bể bơi nước ấm, spa Dao Đỏ, gym view núi, đưa đón bến xe/ga Lào Cai; Đà Nẵng có Sky Lounge, bể bơi tầng thượng, hầm đỗ xe, đưa đón sân bay Đà Nẵng...).
- **Homestay & Glamping** (`stay-01`, `stay-04`, `stay-06`, `stay-09`, `stay-11`, `stay-12`): 4–6 nhóm phù hợp (ẩn hoàn toàn nhóm không có, ví dụ `stay-09` Phố Cổ không có `pool-beach`), mỗi nơi ~10–14 tiện ích chân thật (lửa trại, tiệc BBQ, trekking, thuê xe máy, đưa đón sân bay/bến xe, bếp tự nấu, máy chiếu Netflix, tour ẩm thực...).

### 4.3. Quản lý State & Luồng Đặt phòng (`src/context/BookingContext.tsx`)

Bổ sung `bookingDraft` dùng chung giữa `PropertyModal` và `BookingCheckoutModal`:
```ts
export interface BookingDraft {
  propertyId: string | null;
  nights: number;
  adults: number;
  selectedAmenityIds: string[];
}
```

**Quy tắc chuyển trạng thái (State Transitions):**
1. Khi gọi `openProperty(property)` (hoặc `setSelectedProperty(property)` với `property !== null`):
   - Nếu `property.id !== bookingDraft.propertyId`: khởi tạo draft mới `{ propertyId: property.id, nights: 2, adults: Math.min(2, property.maxGuests), selectedAmenityIds: [] }`.
   - Nếu trùng `property.id`: giữ nguyên draft hiện tại (tránh mất lựa chọn nếu lỡ đóng/mở lại cùng chỗ nghỉ).
2. Khi bấm `"Đặt ngay"` trực tiếp từ `PropertyCard` (`setCheckoutProperty(property)`):
   - Nếu `property.id !== bookingDraft.propertyId`: reset draft mới tương tự như trên trước khi mở Checkout.
   - Nếu trùng `property.id` (đi từ `PropertyModal` → `BookingCheckoutModal`): giữ nguyên `nights`, `adults`, `selectedAmenityIds`.
3. `toggleBookingAmenity(amenityId: string)`: thêm/bỏ `amenityId` trong `bookingDraft.selectedAmenityIds`.
4. `setDraftNights(n)` và `setDraftAdults(n)`: cập nhật trực tiếp draft (đảm bảo `nights >= 1`, `1 <= adults <= maxGuests`).
5. Khi hoàn tất đặt phòng tại `BookingCheckoutModal`:
   - Tạo snapshot `selectedAmenities: SelectedBookingAmenity[]` từ `bookingDraft.selectedAmenityIds` và đưa vào `BookingDetails` truyền cho `BookingSuccessModal`.
   - Reset `selectedAmenityIds: []` sau khi chuyển sang `BookingSuccessModal`.

**Công thức tính giá thống nhất (`src/lib/amenities.ts`):**
- `baseTotal = property.pricePerNight * nights`
- `cleaningFee = 150000`
- `serviceDiscount = 100000`
- `amenitiesFee = sum(selected.price for selected in selectedAmenities where pricingType === "paid")`
- `grandTotal = baseTotal + cleaningFee + amenitiesFee - serviceDiscount`

### 4.4. Thiết kế giao diện & Tương tác từng màn hình

#### A. `PropertyCard.tsx` (Trang chủ)
- Dưới phần tag `Hủy miễn phí` / `Bao gồm bữa sáng`, bổ sung một hàng **chip nhóm tiện ích nhanh** (tối đa 3 nhóm nổi bật có icon nhỏ + nhãn ngắn, ví dụ: `Hồ bơi`, `Thể thao`, `Ẩm thực` hoặc `Đưa đón`) kèm pill `+N tiện ích` (hiển thị tổng số tiện ích của chỗ nghỉ).
- Giữ card gọn, không làm tăng chiều cao quá mức hay vỡ lưới 4 cột.

#### B. `FilterModal.tsx` & `PropertyList.tsx` (Bộ lọc trang chủ)
- Thay thế mảng 7 chuỗi cứng trong `FilterModal` bằng `AMENITY_FILTER_OPTIONS` (9 tùy chọn chuẩn hóa kèm icon Lucide):
  1. `Hồ bơi` (`pool`)
  2. `Bãi biển riêng` (`beach`)
  3. `Thể thao & Gym` (`sports-gym`)
  4. `Nhà hàng & Ẩm thực` (`dining`)
  5. `Spa & Thư giãn` (`spa-wellness`)
  6. `Đưa đón & Di chuyển` (`transport-shuttle`)
  7. `BBQ & Lửa trại` (`bbq-campfire`)
  8. `Bồn tắm & Lò sưởi` (`bath-fireplace`)
  9. `Gia đình & Thú cưng` (`family-pet`)
- Trong `PropertyList.tsx`: lọc dựa trên `propertyHasAmenityFilters(prop, filterState.amenities)` (kiểm tra mỗi `filterKey` đã chọn đều xuất hiện trong `filterKeys` của ít nhất 1 tiện ích đã resolve của chỗ nghỉ).

#### C. `PropertyModal.tsx` (Chi tiết chỗ nghỉ)
- **Mục Tiện nghi & dịch vụ nổi bật (cột trái):**
  - Hiển thị hàng pill tóm tắt các nhóm tiện ích hiện có kèm số lượng (VD: `Hồ bơi & Bãi biển (3)`, `Thể thao (3)`, `Ẩm thực (4)`, `Đưa đón (2)`). Bấm vào pill nhóm nào sẽ mở modal "Tất cả tiện ích" đã lọc sẵn đúng nhóm đó.
  - Hiển thị lưới 2 cột gồm **6 tiện ích nổi bật** (`featured: true`, fallback lấy 6 mục đầu). Mỗi thẻ là một `<button>` tương tác được: hiển thị icon, tên tiện ích, nhãn trạng thái ngắn (`Miễn phí` / `Đặt trước` / `+XXX.000đ` / `✓ Đã chọn`) và mũi tên nhỏ. Bấm vào thẻ nào sẽ mở modal "Tất cả tiện ích" và chọn sẵn đúng tiện ích đó để xem chi tiết.
  - Nút toàn chiều rộng rõ ràng bên dưới: **"Xem tất cả {total} tiện ích & dịch vụ"** (kèm badge xanh nếu khách đã chọn sẵn dịch vụ).
- **Cột tính giá bên phải (Sticky Booking Card):**
  - Đồng bộ `nights` và `adults` với `bookingDraft` trong `BookingContext`.
  - Khi `selectedAmenities.length > 0`, hiển thị khối gọn **"Dịch vụ đi kèm đã chọn (N)"** với từng dòng tên + giá (`Miễn phí • Đặt trước` hoặc `+XXX.000đ`) và nút `×` gỡ nhanh.
  - Dòng `Dịch vụ & tiện ích đi kèm` hiển thị rõ trong bảng tổng tiền nếu `amenitiesFee > 0` (hoặc hiện số dịch vụ miễn phí đã đăng ký).

#### D. `PropertyAmenitiesModal.tsx` & `AmenityDetailPanel.tsx` (Modal Tất cả tiện ích)
- **Z-index & Phím tắt:** Render ở `z-[60]` (trên `PropertyModal` `z-50`). Phím `Escape` đóng riêng `PropertyAmenitiesModal` mà không đóng `PropertyModal`. Click backdrop đóng riêng `PropertyAmenitiesModal`.
- **Phần Header cố định:**
  - Tiêu đề: **"Tất cả tiện ích & dịch vụ"** + phụ đề tên chỗ nghỉ + tổng số tiện ích.
  - Thanh tìm kiếm nhanh theo tên/mô tả tiện ích (tìm không phân biệt hoa thường, hỗ trợ tìm không dấu hoặc khớp trực tiếp tiếng Việt).
  - Hàng chip lọc nhanh: `Tất cả`, `Miễn phí`, `Có phụ phí`, `Đã chọn (N)`.
  - Hàng tab danh mục cuộn ngang: `Tất cả (N)` + chỉ những nhóm có trong chỗ nghỉ hiện tại kèm số lượng.
- **Phần thân Master–Detail:**
  - **Desktop (`md:grid md:grid-cols-12`):**
    - **Cột trái (5 cột — Danh sách):** Cuộn độc lập, gom nhóm theo danh mục (khi tab là `Tất cả`) hoặc liệt kê nhóm đang chọn. Mỗi dòng hiển thị icon, tên tiện ích, nhãn phí (`Miễn phí`, `Đặt trước`, `+350.000đ`) và chấm/badge `Đã chọn` nếu đang nằm trong `selectedAmenityIds`. Mục đang xem được highlight viền emerald. Nếu tìm kiếm/lọc ra 0 kết quả, hiện trạng thái trống kèm nút **"Đặt lại bộ lọc"**.
    - **Cột phải (7 cột — `AmenityDetailPanel`):** Cuộn độc lập, luôn hiển thị chi tiết tiện ích đang chọn (tự động chọn tiện ích đầu tiên khớp bộ lọc nếu mục cũ bị lọc ẩn):
      1. Ảnh minh họa tỷ lệ 16:9 (`next/image` + `onError` fallback sang nền gradient + icon danh mục nếu tải lỗi), gắn badge danh mục và badge phí góc ảnh.
      2. Tiêu đề tiện ích + mô tả chi tiết (2–3 câu rõ ràng, hữu ích cho khách du lịch).
      3. Lưới thông tin 2×2: **Giờ hoạt động**, **Vị trí / Khu vực**, **Chi phí**, **Trạng thái / Đặt trước**.
      4. Khối **Lưu ý cho khách** (nếu tiện ích có `notes`).
      5. Khu vực hành động:
         - `included`: thẻ thông báo nền emerald nhạt — *"Đã bao gồm sẵn trong kỳ nghỉ — bạn có thể sử dụng tự do không cần đăng ký thêm."*
         - `free-reservation`: nút bật/tắt **"Đăng ký sử dụng miễn phí khi đặt phòng"** ↔ **"✓ Đã đăng ký vào chuyến đi (Miễn phí) — Bấm để hủy"**.
         - `paid`: nút bật/tắt **"Yêu cầu thêm khi đặt phòng (+{formatVND(price)})"** ↔ **"✓ Đã thêm vào đặt phòng (+{formatVND(price)}) — Bấm để gỡ"**.
  - **Mobile (`< md`):**
    - Hiển thị danh sách đầy đủ; khi bấm vào 1 tiện ích (hoặc khi mở từ 1 thẻ nổi bật trên `PropertyModal`), chuyển mượt sang chế độ xem chi tiết với thanh **"← Quay lại danh sách tiện ích"** ở đầu panel.
- **Footer cố định dưới cùng:**
  - Trái: tóm tắt dịch vụ đã chọn (`Đã chọn N dịch vụ • +XXX.000đ` hoặc gợi ý bấm xem chi tiết).
  - Phải: nút **"Xong & quay lại đặt phòng"** đóng modal trở về `PropertyModal`.

#### E. `BookingCheckoutModal.tsx` & `BookingSuccessModal.tsx`
- **`BookingCheckoutModal`:**
  - Đọc `nights`, `adults`, `selectedAmenityIds` từ `BookingContext` thay vì hardcode `2 đêm / 2 người lớn`.
  - Hiển thị khối **"Tiện ích & dịch vụ đi kèm đã chọn"** (nếu có) ngay dưới Stay Summary Card, cho phép gỡ bỏ từng mục nếu khách đổi ý, tự động cập nhật bảng tổng tiền.
  - Bảng giá hiển thị rõ `Tiện ích & dịch vụ đi kèm` (nếu `amenitiesFee > 0`).
- **`BookingSuccessModal`:**
  - Hiển thị đúng số đêm/số khách đã đặt.
  - Nếu đơn có dịch vụ đi kèm (`selectedAmenities.length > 0`), hiển thị khối **"Tiện ích & dịch vụ đã đăng ký"** liệt kê từng dịch vụ (kèm nhãn `Miễn phí • Đã đăng ký` hoặc số tiền) trong vé xác nhận.

---

## 5. Cấu trúc tệp dự kiến & Phần giao quyền cho người triển khai

### Tệp tạo mới
- `src/data/amenities.ts` — Metadata 7 danh mục, 9 tùy chọn lọc chuẩn hóa, và Master Catalog (~42 tiện ích có ảnh Unsplash, mô tả, giờ, vị trí, giá, lưu ý).
- `src/lib/amenities.ts` — Helper `resolvePropertyAmenities`, `groupAmenitiesByCategory`, `getPropertyAmenityCategories`, `propertyHasAmenityFilters`, `calculateBookingPricing`, và hàm chuẩn hóa tìm kiếm tiếng Việt không dấu.
- `src/components/property/AmenityIcon.tsx` — Component map `iconName` sang icon `lucide-react` nhất quán.
- `src/components/property/AmenityDetailPanel.tsx` — Panel chi tiết 1 tiện ích (ảnh có fallback, 4 ô thông tin, lưu ý, nút chọn/gỡ).
- `src/components/property/PropertyAmenitiesModal.tsx` — Modal Master–Detail toàn bộ tiện ích (tìm kiếm, lọc phí, tab danh mục, responsive desktop/mobile, footer tổng hợp).

### Tệp chỉnh sửa
- `src/types/index.ts`
- `src/data/properties.ts` (bổ sung `resortAmenities` tùy biến sát thực tế cho cả 12 chỗ nghỉ)
- `src/context/BookingContext.tsx` (thêm `bookingDraft` đồng bộ `nights`, `adults`, `selectedAmenityIds`)
- `src/components/home/PropertyCard.tsx`
- `src/components/home/FilterModal.tsx`
- `src/components/home/PropertyList.tsx`
- `src/components/property/PropertyModal.tsx`
- `src/components/booking/BookingCheckoutModal.tsx`
- `src/components/booking/BookingSuccessModal.tsx`

### Phần giao cho người triển khai tự quyết (Left to the Builder)
- Bộ ảnh Unsplash cụ thể cho từng mục trong `AMENITY_CATALOG` (đảm bảo toàn bộ dùng domain `images.unsplash.com` hợp lệ và có UI fallback đẹp nếu lỗi tải).
- Bộ ánh xạ icon `lucide-react` cụ thể cho từng tiện ích (chỉ dùng các icon thực sự tồn tại trong `lucide-react` v1.16.0).
- Chi tiết micro-animation (`framer-motion`), spacing, và style trạng thái active/hover sao cho hài hòa với bảng màu emerald/slate/amber của LuxeStay.
- Nội dung tiếng Việt chi tiết cho từng tiện ích của 12 chỗ nghỉ (đảm bảo tự nhiên, đúng đặc trưng vùng miền và loại hình chỗ nghỉ).

### Các quyết định kỹ thuật bổ sung (Builder Calls)
- **Chuẩn hóa override giá trong `resolvePropertyAmenities`**: Nếu override của một chỗ nghỉ chuyển `pricingType` từ `"paid"` sang `"included"` hoặc `"free-reservation"`, helper sẽ tự động xóa `price` (hoặc ép về `undefined`/0) để tránh kế thừa nhầm giá từ catalog mẫu.
- **Chip lọc `"Miễn phí"` trong `PropertyAmenitiesModal`**: Bao gồm cả tiện ích `"included"` lẫn `"free-reservation"` (vì cả hai đều không mất phí).
- **Ưu tiên 3 chip nhóm trên `PropertyCard`**: Hiển thị tối đa 3 nhóm có mặt ở chỗ nghỉ theo thứ tự trải nghiệm nghỉ dưỡng (`pool-beach`, `sports-recreation`, `dining`, `hotel-spa`, `transport`, `room-family`, `security-general`) kèm `+N tiện ích`.
- **Đồng bộ ngày `checkOut` với `nights` trong `BookingCheckoutModal`**: Tự động tính ngày trả phòng từ ngày nhận phòng (ưu tiên `searchCriteria.checkIn` nếu khách đã chọn, mặc định từ ngày hiện tại + 1 ngày) cộng với số đêm `nights` đã đồng bộ từ `bookingDraft`.
