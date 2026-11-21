# Thiết kế Đào sâu Kiến trúc (Ứng viên #1): Booking Session, Quote & Checkout Module

**Ngày tạo:** 2026-11-21  
**Dự án:** LuxeStay (`travel-service`)  
**Tham chiếu từ vựng:** [GLOSSARY.md](file:///d:/Tutorial-Vibe%20Coding/travel-service/GLOSSARY.md) & [.agents/skills/codebase-design/SKILL.md](file:///d:/Tutorial-Vibe%20Coding/travel-service/.agents/skills/codebase-design/SKILL.md)  
**Trạng thái:** Chờ phê duyệt thiết kế

---

## 1. Mục tiêu & Lý do (Intent & Why)

Qua đánh giá bằng `improve-codebase-architecture`, luồng đặt phòng hiện tại bị phân mảnh qua 5 tệp (`BookingContext.tsx`, `bookingDraft.ts`, `amenities.ts`, `PropertyModal.tsx`, `BookingCheckoutModal.tsx`):
- `BookingContext` là một **shallow module** phơi bày 10+ state và setter thô của phiên đặt phòng, đẩy trách nhiệm phối hợp cho các UI caller.
- `PropertyModal` và `BookingCheckoutModal` tự lắp lại cùng một chuỗi 5 bước để tính báo giá (`resolvePropertyAmenities` → kiểm tra `propertyId` → `buildSelectedBookingAmenities` → `Math.min(adults, maxGuests)` → `calculateBookingPricing`).
- Thiếu **locality** dẫn đến các lỗi thực tế:
  1. Chọn lịch 3 đêm (`"25/12 → 28/12"`) hoặc `4 khách` ở `SearchBar` bị ép cứng về `2 đêm, 2 khách` khi mở chỗ nghỉ, khiến bước Checkout tính sai ngày trả phòng (`25/12 → 27/12`).
  2. `Math.min(bookingDraft.adults, property.maxGuests)` ở 2 modal bỏ qua hàm kẹp biên dưới `clampDraftAdults`.
  3. Khi hoàn tất đặt phòng, chỉ `selectedAmenityIds` được xóa còn `nights` và `adults` bị giữ lại sang chỗ nghỉ tiếp theo.
  4. Toàn bộ bước kiểm tra hợp lệ thông tin khách, đóng gói `BookingDetails` và hủy timer khi đóng modal giữa lúc đang gửi đơn chưa có bất kỳ bài test nào.

Đợt tái cấu trúc này gộp toàn bộ vòng đời phiên đặt phòng, đồng bộ một chiều từ `SearchBar`, tính toán `BookingQuote` và bước nộp đơn qua seam `ReservationSubmitter` vào một **deep module** duy nhất: `src/lib/bookingSession.ts`.

### Mục tiêu (Goals)
- Thay thế `src/lib/bookingDraft.ts` và phần hàm tính giá/chọn dịch vụ trong `src/lib/amenities.ts` bằng một deep module `src/lib/bookingSession.ts`.
- Khởi tạo một chiều (one-way seeding) từ `SearchCriteria` khi mở một `Property` mới: tự suy ra `nights = checkOut - checkIn` khi lịch hợp lệ (mặc định `2` đêm nếu chưa có), kế thừa `adults`, `children`, `rooms` và tự động kẹp `adults` theo `property.maxGuests`.
- Cung cấp một `BookingQuote` dẫn xuất duy nhất để `PropertyModal` và `BookingCheckoutModal` chỉ đọc kết quả, không bao giờ tự gọi chuỗi tính giá hay kẹp biên thủ công.
- Đặt seam `ReservationSubmitter` với 2 adapter thật:
  - `BrowserReservationAdapter`: mô phỏng độ trễ xác nhận trên trình duyệt, hỗ trợ `AbortSignal` để tự hủy nếu khách đóng modal giữa chừng, và sẵn sàng thay bằng HTTP/Database adapter sau này.
  - `InMemoryReservationAdapter`: chạy tức thì, tất định (`0ms`) phục vụ kiểm thử toàn trình.
- Áp dụng chiến lược test **"Replace, don't layer"** từ `codebase-design/DEEPENING.md`: thay thế các bài test rời rạc trên helper cũ bằng bộ test đi qua interface của `bookingSession` từ lúc mở chỗ nghỉ → chỉnh đêm/khách/dịch vụ → xuất `BookingQuote` → kiểm tra form → nộp đơn qua `InMemoryReservationAdapter`.

### Không thuộc phạm vi (Non-goals)
- Không thay đổi giao diện trực quan hay bảng màu/bố cục của `PropertyModal`, `BookingCheckoutModal`, `BookingSuccessModal`.
- Không lưu trạng thái phiên đặt phòng vào `localStorage` hay kết nối cơ sở dữ liệu thật trong phạm vi ứng viên này.
- Chưa đụng tới bộ lọc trang chủ của Ứng viên #2 (`PropertyList`/`FilterModal`) ngoài việc đọc `searchCriteria` để seed phiên đặt phòng.

---

## 2. Phương án Kiến trúc & Vị trí Seam (Approaches)

### Các phương án đã cân nhắc
1. **Phương án A (ĐÃ CHỌN) — Pure In-process `BookingSession` Module + `ReservationSubmitter` Seam (2 Adapters) + Thin React Context Integration:**
   - Toàn bộ state machine của phiên đặt phòng (`BookingSessionState`), quy tắc seed từ `SearchCriteria`, đạo hàm `BookingQuote` và kiểm tra hợp lệ form khách nằm gọn trong module thuần `src/lib/bookingSession.ts`.
   - Bước gửi đơn đi qua seam `ReservationSubmitter` (với `createBrowserReservationAdapter` và `createInMemoryReservationAdapter`).
   - `BookingContext` chỉ giữ `session` + `bookingQuote` dẫn xuất và ủy quyền các thao tác cho `bookingSession.ts` (vẫn giữ các bí danh tương thích trên `useBooking()` nếu caller cũ cần, đồng thời thu gọn logic trong `PropertyModal` và `BookingCheckoutModal`).
2. **Phương án B — Class/Store có trạng thái đột biến (Mutable OOP Store) bên ngoài React:**
   - Khó tích hợp tự nhiên với React 19 concurrent rendering và đòi hỏi viết thêm `useSyncExternalStore` boilerplate không cần thiết.

---

## 3. Thiết kế Interface của Deep Module (`src/lib/bookingSession.ts`)

### 3.1. Kiểu dữ liệu miền (`src/types/index.ts` & `src/lib/bookingSession.ts`)

```ts
export type BookingSessionStep = "idle" | "previewing" | "checking-out" | "confirmed";

export interface BookingSessionState {
  step: BookingSessionStep;
  property: Property | null;
  checkInSeed: string;          // Chuỗi ngày gốc từ SearchBar (nếu có)
  nights: number;               // Luôn nằm trong [1..30]
  guests: {
    adults: number;             // Luôn nằm trong [1..property.maxGuests]
    children: number;
    rooms: number;
  };
  selectedAmenityIds: string[]; // Chỉ chứa tiện ích paid / free-reservation hợp lệ của property
  confirmedBooking: BookingDetails | null;
}

export interface BookingQuote {
  property: Property;
  nights: number;
  checkIn: string;              // dd/MM/yyyy
  checkOut: string;             // dd/MM/yyyy (= checkIn + nights)
  guests: {
    adults: number;
    children: number;
    rooms: number;
  };
  resolvedAmenities: ResolvedPropertyAmenity[];
  selectedAmenityIds: string[];
  selectedAmenities: SelectedBookingAmenity[];
  pricing: {
    basePrice: number;
    nightsTotal: number;
    cleaningFee: number;
    serviceFee: number;
    amenitiesFee: number;
    discount: number;
    total: number;
  };
}

export interface CheckoutGuestInput {
  fullName: string;
  phone: string;
  email: string;
  note?: string;
  paymentMethod: "momo" | "vnpay" | "card" | "hotel";
}

export interface ReservationSubmissionRequest {
  quote: BookingQuote;
  guestInfo: {
    fullName: string;
    phone: string;
    email: string;
    note?: string;
  };
  paymentMethod: "momo" | "vnpay" | "card" | "hotel";
}

export interface ReservationSubmitter {
  submit(
    request: ReservationSubmissionRequest,
    options?: { signal?: AbortSignal }
  ): Promise<BookingDetails>;
}
```

### 3.2. Các điểm vào (Entry Points) của `src/lib/bookingSession.ts`

1. **Quản lý vòng đời & thay đổi trong phiên (In-process transitions):**
   - `createIdleBookingSession(): BookingSessionState`
   - `openPropertySession(current: BookingSessionState, property: Property, searchCriteria?: SearchCriteria): BookingSessionState` (mở `PropertyModal`; nếu cùng `property.id` đang active thì giữ nguyên lựa chọn, nếu khác `property.id` thì seed mới từ `searchCriteria`).
   - `startCheckoutSession(current: BookingSessionState, property: Property, searchCriteria?: SearchCriteria): BookingSessionState` (chuyển từ `PropertyModal` sang `BookingCheckoutModal` giữ nguyên draft, hoặc bấm `"Đặt ngay"` từ `PropertyCard` cho chỗ nghỉ khác sẽ seed mới rồi vào thẳng `"checking-out"`).
   - `closePreviewSession(current: BookingSessionState): BookingSessionState` (đóng `PropertyModal` nhưng giữ draft cho cùng `property.id` phòng khi khách mở lại).
   - `closeCheckoutSession(current: BookingSessionState): BookingSessionState` (đóng `BookingCheckoutModal`).
   - `dismissConfirmedBooking(current: BookingSessionState): BookingSessionState` (đóng `BookingSuccessModal`).
   - `updateSessionNights(current: BookingSessionState, nights: number): BookingSessionState`
   - `updateSessionAdults(current: BookingSessionState, adults: number): BookingSessionState` (tự lấy `maxGuests` từ `current.property`, không bắt caller phải truyền `maxGuests` thủ công!).
   - `toggleSessionAmenity(current: BookingSessionState, amenityId: string): BookingSessionState` (tự kiểm tra trên `current.property`, không bắt caller truyền lại `property`!).
   - `removeSessionAmenity(current: BookingSessionState, amenityId: string): BookingSessionState`

2. **Đạo hàm báo giá duy nhất (Quote Derivation):**
   - `deriveBookingQuote(session: BookingSessionState, fallbackBaseDate?: Date): BookingQuote | null`

3. **Kiểm tra hợp lệ & Gửi đơn qua Seam (`ReservationSubmitter`):**
   - `validateCheckoutGuestInput(input: CheckoutGuestInput): { ok: true; value: CheckoutGuestInput } | { ok: false; error: string }`
   - `submitBookingSession(session: BookingSessionState, input: CheckoutGuestInput, submitter: ReservationSubmitter, options?: { signal?: AbortSignal; fallbackBaseDate?: Date }): Promise<{ ok: true; booking: BookingDetails; nextSession: BookingSessionState } | { ok: false; error: string }>`
   - `createBrowserReservationAdapter(delayMs?: number): ReservationSubmitter`
   - `createInMemoryReservationAdapter(overrides?: { bookingId?: string; createdAt?: string }): ReservationSubmitter`

---

## 4. Tác động lên các Module xung quanh

- **`src/lib/amenities.ts`**: Xóa `CLEANING_FEE`, `SERVICE_DISCOUNT`, `buildSelectedBookingAmenities`, `calculateBookingPricing` (chuyển hẳn sang `src/lib/bookingSession.ts` — có thể re-export tạm nếu cần hoặc cập nhật trực tiếp `tests/amenities.test.ts`).
- **`src/lib/bookingDraft.ts` & `tests/booking-draft.test.ts`**: Xóa bỏ và thay thế bằng `src/lib/bookingSession.ts` & `tests/booking-session.test.ts` (*Replace, don't layer*).
- **`src/context/BookingContext.tsx`**:
  - Thay 4 state rời (`selectedProperty`, `checkoutProperty`, `bookingSuccess`, `bookingDraft`) bằng 1 state duy nhất `bookingSession: BookingSessionState` + `bookingQuote: BookingQuote | null` dẫn xuất.
  - Giữ các thuộc tính tương thích (`selectedProperty`, `checkoutProperty`, `bookingSuccess`, `setSelectedProperty`, `setCheckoutProperty`, `setBookingSuccess`) được ánh xạ trực tiếp vào `bookingSession` để `PropertyCard` và `FavoritesDrawer` không phải sửa một dòng nào!
  - Cung cấp `bookingQuote`, `setDraftNights`, `setDraftAdults(adults)`, `toggleBookingAmenity(amenityId)`, `removeBookingAmenity(amenityId)`, `proceedToCheckout()`, và `submitCheckout(input, signal)` gọn sạch.
- **`src/components/property/PropertyModal.tsx`**:
  - Xóa toàn bộ các lệnh gọi `resolvePropertyAmenities`, `buildSelectedBookingAmenities`, `calculateBookingPricing`, `Math.min(bookingDraft.adults, property.maxGuests)`. Chỉ đọc trực tiếp từ `bookingQuote`!
- **`src/components/booking/BookingCheckoutModal.tsx` & `BookingSuccessModal.tsx`**:
  - `BookingCheckoutModal` đọc trực tiếp `bookingQuote`, hiển thị lỗi form rõ ràng, gọi `submitCheckout` kèm `AbortController` (tự hủy nếu modal đóng hoặc unmount giữa chừng), và hiển thị đầy đủ cả `children` (khi `> 0`) và `rooms` trên thẻ tóm tắt & vé xác nhận `BookingSuccessModal`.
