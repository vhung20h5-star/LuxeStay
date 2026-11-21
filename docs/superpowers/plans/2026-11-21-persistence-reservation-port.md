# Kế hoạch Triển khai Phase 5: Persistence & Reservation Port

**Spec:** [2026-11-21-persistence-reservation-port-design.md](file:///d:/Tutorial-Vibe%20Coding/travel-service/docs/superpowers/specs/2026-11-21-persistence-reservation-port-design.md)  
**Nhánh làm việc:** `feat/persistence-reservation-port`  
**Chiến lược:** Thực thi Native + TDD (`RED → GREEN`), kiểm chứng đầy đủ (`node:test`, `tsc`, `eslint`, `next build`), và đánh giá độc lập toàn nhánh trước khi hoàn tất.

---

## Task 1 (TDD — RED → GREEN): Seam & Adapters `src/lib/persistencePort.ts` & Kiểu miền trong `src/types/index.ts`

1. **Cập nhật kiểu (`src/types/index.ts`):**
   - Bổ sung `StorageLike`, `StorageEventLike`, `StorageEventTargetLike`, `FavoritesRepository`, `InMemoryReservationAdapter`, `AppPorts`.
2. **Viết test trước (`tests/persistence-port.test.ts` — RED):**
   - Kiểm thử đầy đủ qua interface công khai của `src/lib/persistencePort.ts`:
     - `sanitizeFavoriteIds`: phân biệt non-array (`null` → báo dữ liệu hỏng), mảng rỗng hợp lệ (`[]`), lọc phần tử không phải chuỗi/rỗng, trim & khử trùng giữ thứ tự, lọc theo `validPropertyIds`, đóng băng kết quả.
     - `toggleFavoriteId`: thêm mã hợp lệ, gỡ mã đang có, bỏ qua mã rỗng hoặc không thuộc `validPropertyIds` (trả nguyên tham chiếu khi no-op).
     - `createBrowserFavoritesAdapter`:
       - Khi `storage` chưa có khóa (`null`) → trả `defaultIds`; khi đã lưu `"[]"` → tôn trọng mảng rỗng `[]`.
       - Khi `storage` chứa JSON hỏng (`"{broken"`) hoặc kiểu sai (`"{}"`, `"null"`, `"42"`) → fallback an toàn về `defaultIds`.
       - Ổn định tham chiếu `getSnapshot()` bắt buộc cho `useSyncExternalStore` (2 lần đọc liên tiếp khi storage không đổi trả cùng tham chiếu `===`).
       - `getServerSnapshot()` luôn trả tham chiếu `defaultIds` ổn định, không truy cập `storage`.
       - `toggle` & `setAll` cập nhật `storage`, thông báo `subscribe` listeners, và bỏ qua no-op (không thông báo thừa).
       - Khi `storage.setItem` ném `QuotaExceededError`/`SecurityError` → vẫn giữ trạng thái mới trong bộ nhớ và không bị giật ngược ở lần `getSnapshot()` kế tiếp.
       - Khi `storage.getItem` ném `SecurityError` → trả snapshot an toàn, không crash.
       - Đồng bộ đa tab qua `eventTarget` (`storage` event khớp `storageKey` hoặc `key === null` làm mới snapshot & gọi listener; khóa khác bị bỏ qua; hủy đăng ký listener cuối gỡ bỏ event listener trên `eventTarget`).
     - `createInMemoryFavoritesAdapter`: chuẩn hóa khởi tạo, `toggle`, `setAll`, `subscribe`/`unsubscribe`, `getServerSnapshot`.
     - `createBrowserReservationAdapter` & `createInMemoryReservationAdapter`: hoàn tất trả `BookingDetails` bất biến, hủy sạch với `AbortSignal` (cả trước và giữa chừng), và `getSubmittedBookings()` ghi nhận đầy đủ đơn đã gửi.
     - `createBrowserAppPorts` & `createInMemoryAppPorts`: tạo đủ 2 cổng `favorites` + `reservations` hoạt động liên thông.
   - Chạy `tests/persistence-port.test.ts` để xác nhận **RED**.
3. **Triển khai `src/lib/persistencePort.ts` (GREEN):**
   - Triển khai đầy đủ `FavoritesRepository` adapters, `ReservationSubmitter` adapters, và `AppPorts` factories.
   - Chạy `tests/persistence-port.test.ts` để xác nhận **GREEN**.

---

## Task 2: Làm thuần `src/lib/bookingSession.ts` & Chuyển `BookingContext.tsx` sang `AppPorts` + `useSyncExternalStore`

1. **`src/lib/bookingSession.ts`:**
   - Gỡ bỏ `createBrowserReservationAdapter`, `createInMemoryReservationAdapter` và `buildBookingDetails` (giữ `bookingSession.ts` 100% thuần, không `setTimeout`, không `Math.random`).
2. **`src/context/BookingContext.tsx`:**
   - Xóa hoàn toàn `localStorage`, `JSON.parse`, `try/catch` khỏi context.
   - Thay `reservationSubmitter?: ReservationSubmitter` bằng `ports?: Partial<AppPorts>` mặc định `createBrowserAppPorts({ validPropertyIds: VALID_PROPERTY_IDS })`.
   - Dùng `useSyncExternalStore(favoritesRepo.subscribe, favoritesRepo.getSnapshot, favoritesRepo.getServerSnapshot)` cho `favorites: readonly string[]`.
   - Bọc `toggleFavorite` và `isFavorite` bằng `useCallback`.
3. **`tests/booking-session.test.ts`:**
   - Cập nhật import `createBrowserReservationAdapter` và `createInMemoryReservationAdapter` từ `@/lib/persistencePort`.

---

## Task 3: Kiểm chứng toàn diện & Đánh giá độc lập (Final Review)

1. Chạy toàn bộ 7 bộ test `node:test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
2. Gửi subagent `research` (`Model: "pro"`) đánh giá độc lập toàn nhánh với trọng tâm:
   - **Review Focus:**
     - Bảo đảm `useSyncExternalStore` tuân thủ chặt bất biến ổn định tham chiếu (`Object.is(getSnapshot(), getSnapshot())`) trong mọi nhánh (absent, valid JSON, corrupted JSON, read error, write error, storage event, SSR).
     - Kiểm tra không còn bất kỳ truy cập `localStorage` trực tiếp hoặc `setTimeout`/`Math.random` I/O nào ngoài `src/lib/persistencePort.ts`.
     - Kiểm tra xử lý biên của `BrowserFavoritesAdapter` (VD: `storage.setItem` lỗi ở lần đầu rồi lần sau tab khác ghi `storage` event, `defaultIds` chứa mã không hợp lệ/trùng, `setAll` với mảng giống hệt hiện tại không thông báo thừa, hoặc `event.key` khác `storageKey`).
     - Kiểm tra `BookingContext` tương thích trọn vẹn với `Navbar`, `FavoritesDrawer`, `PropertyCard`, `PropertyModal`, `BookingCheckoutModal` (không gây hydration warning hay ESLint `react-hooks` error).
3. Nếu có phát hiện Critical/Important, chạy đúng 1 lượt sửa theo TDD + kiểm chứng lại trước khi commit và trình menu hoàn tất nhánh.
