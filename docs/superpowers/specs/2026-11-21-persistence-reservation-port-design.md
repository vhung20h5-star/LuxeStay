# Thiết kế Đào sâu Kiến trúc (Ứng viên #5): Persistence & Reservation Port

**Ngày tạo:** 2026-11-21  
**Dự án:** LuxeStay (`travel-service`)  
**Tham chiếu từ vựng:** [GLOSSARY.md](file:///d:/Tutorial-Vibe%20Coding/travel-service/GLOSSARY.md) & [.agents/skills/codebase-design/SKILL.md](file:///d:/Tutorial-Vibe%20Coding/travel-service/.agents/skills/codebase-design/SKILL.md)  
**Trạng thái:** Đã hoàn thành (đã kiểm chứng và xử lý toàn bộ phát hiện review)

---

## 1. Mục tiêu & Lý do (Intent & Why)

Sau 4 đợt đào sâu trước, toàn bộ logic nghiệp vụ đã nằm gọn trong các deep module thuần, nhưng phần giao tiếp với I/O trình duyệt và cổng gửi đơn vẫn còn 4 điểm yếu thực tế:

1. **Lỗi lệch SSR/Hydration và tác dụng phụ không thuần trong `BookingContext.tsx`:**
   - `BookingContext.tsx` đọc `localStorage.getItem("travel_favorites")` trực tiếp trong initializer của `useState`, khiến server SSR render mặc định `["stay-01", "stay-02"]` trong khi trình duyệt đã có dữ liệu lưu khác sẽ render giá trị khác ngay ở lần khớp hydration đầu tiên.
   - `toggleFavorite` gọi trực tiếp `localStorage.setItem(...)` ngay bên trong updater `setFavorites(prev => ...)` — vi phạm tính thuần của React updater (bị gọi 2 lần trong StrictMode).
2. **Thiếu chuẩn hóa dữ liệu từ `localStorage`:**
   - `JSON.parse(saved)` chưa kiểm tra kiểu dữ liệu, trùng lặp hay mã chỗ nghỉ không tồn tại. Dữ liệu hỏng (`"null"`, `"{}"`, `[123]`) có thể gây lỗi runtime, còn mã chỗ nghỉ cũ làm lệch số đếm trên badge `Navbar` so với danh sách hiển thị trong `FavoritesDrawer`.
   - Chưa đồng bộ danh sách yêu thích giữa các tab trình duyệt (`storage` event) và chưa có fallback an toàn khi `localStorage` bị chặn hoặc đầy bộ nhớ (`QuotaExceededError`/`SecurityError`).
3. **Lẫn ranh giới giữa logic thuần và adapter I/O:**
   - `src/lib/bookingSession.ts` vẫn chứa `createBrowserReservationAdapter` (`setTimeout`, `Math.random`, `new Date`) và `createInMemoryReservationAdapter` cùng tệp với các hàm tính báo giá và chuyển trạng thái thuần.
4. **Chưa có điểm tiêm cổng I/O thống nhất (`AppPorts`):**
   - `BookingProvider` mới chỉ cho phép tiêm riêng `reservationSubmitter`, còn lưu trữ yêu thích bị dính cứng vào `window.localStorage` nên khó kiểm thử độc lập và khó thay bằng API/Database thật sau này.

Đợt đào sâu cuối cùng này tách toàn bộ seam I/O thực tế hiện có vào một module cổng thống nhất `src/lib/persistencePort.ts` gồm **`FavoritesRepository`** (chuẩn `useSyncExternalStore` an toàn SSR/hydration + đồng bộ đa tab) và **`ReservationSubmitter`** (tách hẳn khỏi `bookingSession.ts`), gom lại qua **`AppPorts`** (`createBrowserAppPorts` / `createInMemoryAppPorts`).

### Mục tiêu (Goals)
- Tách sạch toàn bộ thao tác `localStorage`, chuẩn hóa dữ liệu yêu thích và đồng bộ đa tab ra khỏi `BookingContext.tsx` vào seam `FavoritesRepository` với 2 adapter:
  - **`BrowserFavoritesAdapter`**: dùng `StorageLike` (`window.localStorage`) + `storage` event, lưu đệm snapshot bất biến cho `useSyncExternalStore`, an toàn khi `localStorage` lỗi đọc/ghi hoặc chứa JSON hỏng, phân biệt rõ `"chưa từng lưu"` (`null` → mặc định `["stay-01", "stay-02"]`) với `"người dùng đã bỏ hết"` (`"[]"` → `[]`).
  - **`InMemoryFavoritesAdapter`**: adapter tất định trong bộ nhớ cho kiểm thử và môi trường không có trình duyệt.
- Dùng `React.useSyncExternalStore` trong `BookingContext.tsx`: loại bỏ 100% lỗi hydration mismatch, không dùng `setState` trong `useEffect`, không gọi side-effect trong `setState` updater, và tự động cập nhật khi tab khác thay đổi danh sách yêu thích.
- Di chuyển `createBrowserReservationAdapter` và `createInMemoryReservationAdapter` (kèm khả năng kiểm tra danh sách đơn đã gửi trong test) từ `src/lib/bookingSession.ts` sang `src/lib/persistencePort.ts`, giúp `src/lib/bookingSession.ts` trở thành module nghiệp vụ **100% thuần** (không `setTimeout`, không `Math.random`).
- Định nghĩa bundle cổng `AppPorts` (`{ favorites: FavoritesRepository; reservations: ReservationSubmitter }`) với `createBrowserAppPorts` và `createInMemoryAppPorts`, tiêm vào `BookingProvider` qua prop tùy chọn `ports?: Partial<AppPorts>`.
- Đảm bảo 0 tính năng suy đoán (không thêm UI hay kho lưu trữ lịch sử đặt phòng chưa có caller).

### Không thuộc phạm vi (Non-goals)
- Không dựng API server-side hay kết nối cơ sở dữ liệu thật trong đợt này (chỉ hoàn thiện seam/adapter sẵn sàng để thay thế bằng 1 adapter HTTP/DB duy nhất sau này).
- Không thay đổi giao diện của `Navbar`, `FavoritesDrawer`, `PropertyCard`, `PropertyModal` hay luồng đặt phòng.

---

## 2. Phương án Kiến trúc (Seam + Adapters)

**Nhóm phụ thuộc (`codebase-design/DEEPENING.md`):** **`External / I/O`** — 2 nguồn I/O thực tế hiện hữu là `window.localStorage` (kèm `storage` event) và thao tác gửi đơn bất đồng bộ (`setTimeout`/HTTP tương lai). Cả hai được ẩn sau interface rõ ràng tại `src/lib/persistencePort.ts` kèm adapter trình duyệt và adapter trong bộ nhớ.

### Interface đề xuất trong `src/types/index.ts` & `src/lib/persistencePort.ts`

```ts
export interface FavoritesRepository {
  getSnapshot(): readonly string[];
  getServerSnapshot(): readonly string[];
  toggle(propertyId: string): readonly string[];
  setAll(propertyIds: readonly string[]): readonly string[];
  subscribe(listener: () => void): () => void;
}

export interface InMemoryReservationAdapter extends ReservationSubmitter {
  getSubmittedBookings(): readonly BookingDetails[];
}

export interface AppPorts {
  favorites: FavoritesRepository;
  reservations: ReservationSubmitter;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface StorageEventLike {
  key: string | null;
}

export interface StorageEventTargetLike {
  addEventListener(type: "storage", listener: (event: StorageEventLike) => void): void;
  removeEventListener(type: "storage", listener: (event: StorageEventLike) => void): void;
}
```

### Các điểm vào (Entry Points) & Bất biến (Invariants) trong `src/lib/persistencePort.ts`

1. **Hằng số & hàm miền thuần cho Favorites:**
   - `FAVORITES_STORAGE_KEY = "travel_favorites"`
   - `DEFAULT_FAVORITE_IDS: readonly string[] = Object.freeze(["stay-01", "stay-02"])`
   - `sanitizeFavoriteIds(raw: unknown, validPropertyIds?: ReadonlySet<string>): readonly string[] | null`
     - Trả `null` nếu `raw` không phải mảng (giúp phân biệt dữ liệu hỏng để fallback về mặc định, khác với mảng rỗng hợp lệ `[]`).
     - Bỏ qua phần tử không phải chuỗi / rỗng, chuẩn hóa `trim()`, khử trùng lặp giữ nguyên thứ tự, và lọc theo `validPropertyIds` (nếu có); trả về mảng đóng băng `Object.freeze`.
   - `toggleFavoriteId(current: readonly string[], propertyId: string, validPropertyIds?: ReadonlySet<string>): readonly string[]`
     - Chuẩn hóa `propertyId.trim()`; nếu đang có → trả mảng mới đã gỡ; nếu chưa có và hợp lệ (thuộc `validPropertyIds` nếu truyền vào) → thêm vào cuối; nếu không hợp lệ → trả nguyên tham chiếu `current`.
2. **Favorites Adapters:**
   - `createBrowserFavoritesAdapter(options?)`:
     - Không truy cập `window` tại thời điểm khởi tạo (an toàn SSR).
     - `getServerSnapshot()` luôn trả về cùng một tham chiếu đóng băng `defaultIds` (không bao giờ gây lỗi hydration).
     - `getSnapshot()` đọc lười từ `storage` (hoặc `window.localStorage`), lưu đệm `(lastRaw, cachedSnapshot)` bảo đảm tính ổn định tham chiếu bắt buộc của `useSyncExternalStore`.
     - Khi `storage.setItem` ném lỗi (`QuotaExceededError`/`SecurityError`), vẫn cập nhật `cachedSnapshot` trong bộ nhớ và đánh dấu fallback để thao tác tim trên UI không bị giật ngược về trạng thái cũ.
     - `subscribe(listener)` chỉ gắn listener `storage` trên `eventTarget` (mặc định `window`) khi có ít nhất 1 subscriber và gỡ sạch khi subscriber cuối cùng hủy đăng ký; chỉ phản ứng khi `event.key === null || event.key === storageKey`.
   - `createInMemoryFavoritesAdapter(options?)`:
     - Lưu snapshot đóng băng trong bộ nhớ, hỗ trợ `toggle`, `setAll`, `subscribe`, `getSnapshot`, `getServerSnapshot` nhất quán với adapter trình duyệt.
3. **Reservation Adapters (chuyển từ `src/lib/bookingSession.ts`):**
   - `createBrowserReservationAdapter(delayMs = 1200): ReservationSubmitter` (hỗ trợ `AbortSignal` hủy sạch `setTimeout`).
   - `createInMemoryReservationAdapter(overrides?): InMemoryReservationAdapter` (tất định, hỗ trợ `AbortSignal`, bổ sung `getSubmittedBookings()` phục vụ kiểm thử).
4. **Cổng tổng hợp (`AppPorts`):**
   - `createBrowserAppPorts(options?): AppPorts`
   - `createInMemoryAppPorts(options?): { favorites: FavoritesRepository; reservations: InMemoryReservationAdapter }`

---

## 3. Tác động lên các Module xung quanh

- **`GLOSSARY.md`:** Bổ sung thuật ngữ miền `Favorites Repository` và `App Ports`; cập nhật mô tả `Reservation Submitter` trỏ về `src/lib/persistencePort.ts`.
- **`src/types/index.ts`:** Thêm `FavoritesRepository`, `InMemoryReservationAdapter`, `AppPorts`, `StorageLike`, `StorageEventLike`, `StorageEventTargetLike`.
- **`src/lib/persistencePort.ts` (mới):** Triển khai toàn bộ seam & adapters ở Mục 2.
- **`src/lib/bookingSession.ts`:** Gỡ bỏ `createBrowserReservationAdapter`, `createInMemoryReservationAdapter` và `buildBookingDetails` (đã chuyển sang `src/lib/persistencePort.ts`), giữ module thuần 100%.
- **`src/context/BookingContext.tsx`:**
  - Xóa hoàn toàn `localStorage.getItem`/`setItem`, `JSON.parse`, `try/catch` khỏi context.
  - Thay prop `reservationSubmitter?: ReservationSubmitter` bằng `ports?: Partial<AppPorts>` (mặc định `createBrowserAppPorts({ validPropertyIds })`).
  - Dùng `useSyncExternalStore` cho `favorites`, bọc `toggleFavorite` và `isFavorite` bằng `useCallback`.
- **Kiểm thử:**
  - `tests/persistence-port.test.ts` (mới): Kiểm thử toàn diện `sanitizeFavoriteIds`, `toggleFavoriteId`, `createBrowserFavoritesAdapter` (absent `null` vs empty `"[]"`, JSON hỏng, ID không hợp lệ/trùng, referential stability của `getSnapshot`, lỗi `QuotaExceededError`/`SecurityError`, đồng bộ sự kiện `storage` đa tab & hủy đăng ký), `createInMemoryFavoritesAdapter`, `createBrowserReservationAdapter` (abort & hoàn tất), `createInMemoryReservationAdapter` (`getSubmittedBookings`), và `createBrowserAppPorts`/`createInMemoryAppPorts`.
  - `tests/booking-session.test.ts`: Cập nhật import `createBrowserReservationAdapter` & `createInMemoryReservationAdapter` từ `@/lib/persistencePort`.
