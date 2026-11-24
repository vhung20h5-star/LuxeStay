# ADR-0006: Cô lập I/O qua `AppPorts` (`useSyncExternalStore`) & Tách Domain Contexts

- **Status:** Accepted
- **Date:** 2026-11-24 (`AppPorts` triển khai ngày 2026-11-21; `HttpReservationAdapter` & tách Domain Contexts ngày 2026-11-24)
- **Deciders:** Engineering Team (`travel-service`)
- **Related Docs:** [PRD](../PRD.md) | [ARCHITECTURE](../ARCHITECTURE.md) | [PLAN](../PLAN.md) | [Spec gốc](../superpowers/specs/2026-11-21-persistence-reservation-port-design.md)
- **Supersedes / Superseded by:** None

---

## 1. Context (Bối cảnh & Vấn đề)

1. **Rủi ro SSR/Hydration & rò rỉ I/O:** Trước commit `0f26b7b`, `BookingContext.tsx` đọc `window.localStorage` trực tiếp trong `useState` initializer và gọi `localStorage.setItem` bên trong `setState` updater (vi phạm React StrictMode), chưa sanitize JSON hỏng hay mã phòng cũ, và chưa đồng bộ danh sách yêu thích giữa nhiều tab trình duyệt.
2. **Lẫn ranh giới thuần và bất đồng bộ:** Các adapter đặt phòng (`setTimeout`, `Math.random`) trước đây nằm chung trong `src/lib/bookingSession.ts`.
3. **Nút cổ chai re-render của Monolithic Context:** Trước commit `abedd20`, mọi component (`Navbar`, `SearchBar`, `PropertyCard`, `PropertyModal`, `BookingCheckoutModal`) cùng subscribe vào một `BookingContext` duy nhất — chỉ cần gõ 1 ký tự tìm kiếm cũng làm re-render cả `Navbar` và các modal không liên quan.

---

## 2. Decision Drivers (Tiêu chí quyết định)

- **An toàn SSR/Hydration chuẩn React 19:** Không lệch HTML server/client, không dùng `setState` trong `useEffect`, tương thích StrictMode.
- **Một điểm thay thế I/O duy nhất (`AppPorts`):** Thay đổi nơi lưu yêu thích (từ `localStorage` sang API tài khoản) hoặc kênh nộp đơn đặt phòng (từ mock sang HTTP/DB) chỉ cần viết adapter mới và tiêm vào `BookingProvider`.
- **Cô lập phạm vi re-render:** Component nào chỉ dùng Yêu thích / Danh mục / Phiên đặt phòng thì chỉ subscribe đúng miền đó.
- **Tương thích ngược nhẹ nhàng:** Không phá vỡ các caller cũ nếu còn gọi `useBooking()`.

---

## 3. Considered Options (Các phương án đã cân nhắc)

1. **Option A (Đã chọn) — `AppPorts` (`src/lib/persistencePort.ts`) + `useSyncExternalStore` + 3 Split Contexts trong `BookingContext.tsx`:**
   - Tách toàn bộ adapter I/O vào `src/lib/persistencePort.ts`: `FavoritesRepository` (`Browser` / `InMemory`) và `ReservationSubmitter` (`Http` / `Browser` / `InMemory`).
   - `BookingProvider` nhận `ports?: Partial<AppPorts>`, đọc favorites bằng `useSyncExternalStore`, và cung cấp 3 provider con (`FavoritesContext`, `CatalogContext`, `BookingSessionContext`) kèm 3 hook chuyên biệt (`useFavorites`, `useCatalog`, `useBookingSession`) + facade `useBooking`.
2. **Option B — Tách thành 3 tệp Provider độc lập hoàn toàn (`FavoritesProvider`, `CatalogProvider`, `BookingSessionProvider`):**
   - Hợp lý về dài hạn nếu ứng dụng phình lớn thêm nhiều miền; tuy nhiên hiện tại `BookingSession` cần đọc `searchCriteria` từ `Catalog` để seed phiên đặt phòng và cả 2 dùng chung `AppPorts`, nên giữ chung dưới 1 `BookingProvider` host với 3 Context nội bộ giúp tránh lồng nhiều tầng provider trong `layout.tsx` mà vẫn đạt trọn lợi ích tách re-render.
3. **Option C — Giữ nguyên `useState` + `useEffect` đọc `localStorage` sau mount:**
   - Gây nháy badge yêu thích sau hydration và thiếu đồng bộ đa tab sạch như `useSyncExternalStore`.

---

## 4. Decision Outcome (Quyết định cuối cùng)

- Tập trung toàn bộ I/O seam vào `src/lib/persistencePort.ts`:
  - `FavoritesRepository`: `createBrowserFavoritesAdapter` (có `sanitizeFavoriteIds`, phân biệt `null` vs `"[]"`, chịu lỗi `QuotaExceededError`/`SecurityError`, lắng nghe sự kiện `storage`) và `createInMemoryFavoritesAdapter`.
  - `ReservationSubmitter`: `createHttpReservationAdapter` (gọi `POST /api/reservations`), `createBrowserReservationAdapter` (delay + `AbortSignal`), `createInMemoryReservationAdapter` (tất định + `getSubmittedBookings()`).
  - Factories: `createBrowserAppPorts`, `createInMemoryAppPorts`.
- Chia `BookingContext.tsx` thành 3 domain context (`useFavorites`, `useCatalog`, `useBookingSession`), giữ `useBooking()` làm facade tương thích ngược, và chuyển toàn bộ UI components sang dùng đúng hook chuyên biệt.

---

## 5. Consequences (Hệ quả)

### Positive (Tích cực)
- Loại bỏ hoàn toàn SSR hydration mismatch cho Wishlist và đồng bộ tức thì giữa nhiều tab trình duyệt.
- `src/lib/bookingSession.ts` trở thành module nghiệp vụ 100% thuần.
- Thay đổi bộ lọc trang chủ không còn kích hoạt re-render các component chỉ dùng `useFavorites()` hoặc `useBookingSession()`.
- Dễ dàng mở rộng `RemoteFavoritesAdapter` ở Phase 2 (khi có Auth) mà không sửa bất kỳ UI component nào.

### Negative & Trade-offs (Đánh đổi)
- Trong `BookingProvider` (lines 161–169), mặc định gọi `defaultHttpReservationAdapter` và fallback sang `defaultBrowserPorts.reservations` khi bắt bất kỳ lỗi nào ngoài `AbortError`. Cơ chế này thuận tiện cho bản static/offline preview nhưng quá rộng cho production vì có thể che giấu lỗi validation `400`/`422` từ server.

### Risks & Follow-ups (Rủi ro & Hành động tiếp theo)
- **Follow-up ưu tiên (P0.2 trong [PLAN.md](../PLAN.md)):** Phân biệt rõ lỗi HTTP nghiệp vụ (`4xx`/`5xx`) với lỗi kết nối mạng trước khi fallback, hoặc bật fallback bằng cờ môi trường tường minh.
- Nếu thêm miền mới độc lập (như `AuthContext`), tạo tệp Context riêng thay vì tiếp tục mở rộng `BookingContext.tsx`.

---

## 6. Validation & References (Kiểm chứng & Tham chiếu)

- Files affected: `src/lib/persistencePort.ts`, `src/context/BookingContext.tsx`, `src/types/index.ts`, toàn bộ UI consumers trong `src/components/*`
- Tests: `tests/persistence-port.test.ts` (6 test cases)
- Commits: `0f26b7b`, `abedd20`
