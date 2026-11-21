# Thiết kế Đào sâu Kiến trúc (Ứng viên #4): Overlay Stack Coordinator

**Ngày tạo:** 2026-11-21  
**Dự án:** LuxeStay (`travel-service`)  
**Tham chiếu từ vựng:** [GLOSSARY.md](file:///d:/Tutorial-Vibe%20Coding/travel-service/GLOSSARY.md) & [.agents/skills/codebase-design/SKILL.md](file:///d:/Tutorial-Vibe%20Coding/travel-service/.agents/skills/codebase-design/SKILL.md)  
**Trạng thái:** Đã hoàn thành (đã kiểm chứng và xử lý toàn bộ phát hiện review)

---

## 1. Mục tiêu & Lý do (Intent & Why)

Ứng dụng hiện có **7 overlay độc lập** (`FilterModal`, `FavoritesDrawer`, `AuthModal` trong `Navbar`, `PropertyModal`, `PropertyAmenitiesModal`, `BookingCheckoutModal`, `BookingSuccessModal`), mỗi nơi tự xử lý hoặc bỏ trống các quy tắc tương tác lớp phủ, gây ra 4 nhóm lỗi và thiếu **locality** rõ rệt:

1. **Rò rỉ khóa cuộn trang (body scroll lock) và ghi đè nhau:**
   - Chỉ `src/components/ui/Modal.tsx` (dùng bởi `FilterModal`) đặt `document.body.style.overflow = "hidden"` / `"unset"`.
   - 6 overlay còn lại (`FavoritesDrawer`, `AuthModal`, `PropertyModal`, `PropertyAmenitiesModal`, `BookingCheckoutModal`, `BookingSuccessModal`) hoàn toàn không khóa cuộn nền — người dùng cuộn trong hộp thoại vẫn kéo theo trang chủ phía sau.
   - Khi `Modal.tsx` đóng, nó đặt thẳng `overflow = "unset"` bất kể còn overlay khác đang mở.
2. **Xử lý phím `Escape` phân mảnh và thiếu ở 4/7 overlay:**
   - `FavoritesDrawer`, `AuthModal`, `BookingCheckoutModal` và `BookingSuccessModal` hoàn toàn không đóng được bằng phím `Escape`.
   - `PropertyAmenitiesModal` phải dùng thủ thuật capture-phase (`window.addEventListener("keydown", ..., true)` + `stopPropagation()`) phối hợp thủ công với điều kiện `!amenitiesModal.isOpen` trong `PropertyModal` — rất mong manh nếu thêm modal lồng mới.
3. **`z-index` cứng rải rác (`z-50`, `z-[60]`):**
   - 6 overlay cùng cứng `z-50`, riêng `PropertyAmenitiesModal` cứng `z-[60]`, không có cơ chế phân tầng tất định khi 2 overlay cùng mở hoặc trong lúc exit animation của Framer Motion.
4. **Thiếu thuộc tính trợ năng chuẩn trên 5/7 overlay:**
   - `FavoritesDrawer`, `AuthModal`, `PropertyModal`, `BookingCheckoutModal` và `BookingSuccessModal` chưa có `role="dialog"` và `aria-modal="true"`.

Đợt đào sâu này tách một **deep module** thuần `in-process` là `src/lib/overlayStack.ts` (quản lý ngăn xếp lớp phủ, phân tầng theo `tier`, cấp `z-index` tất định, chọn mục tiêu đóng bằng `Escape` chỉ ở lớp trên cùng, và trạng thái khóa cuộn nền) kèm một React host mỏng `src/context/OverlayContext.tsx` (`OverlayProvider` + `useOverlayLayer`) mà toàn bộ 7 overlay đều đi qua.

### Mục tiêu (Goals)
- Giữ nguyên quyền sở hữu trạng thái nghiệp vụ ở các module hiện tại (`BookingSession` sở hữu 3 bước đặt phòng, `BookingContext` sở hữu `filterModalOpen` & `favoritesDrawerOpen`, `Navbar` sở hữu `authModalOpen`, `PropertyModal` sở hữu tham số mở `PropertyAmenitiesModal`) — không nhân bản trạng thái nghiệp vụ vào Overlay Coordinator.
- Xây dựng deep module thuần `src/lib/overlayStack.ts` kiểm thử đầy đủ bằng Node 24 `node:test`, miễn nhiễm với thứ tự `useEffect` bottom-up của React nhờ phân tầng `tier` (`base = 0`, `nested = 1`).
- Xây dựng host mỏng `src/context/OverlayContext.tsx` gắn tại `src/app/layout.tsx`:
  - **1 trình lắng nghe `Escape` duy nhất** cho toàn ứng dụng (chỉ kích hoạt khi ngăn xếp không rỗng, chỉ đóng lớp trên cùng nếu `closeOnEscape !== false`, không bao giờ rò rỉ xuống lớp dưới).
  - **1 cơ chế khóa cuộn nền có đếm tham chiếu** (`shouldLockBodyScroll`), lưu và khôi phục chính xác giá trị `document.body.style.overflow` ban đầu chỉ khi lớp phủ cuối cùng đóng.
  - `useOverlayLayer` giữ `onClose` trong ref để tránh re-register khi hàm callback đổi tham chiếu, đồng thời giữ đúng `zIndex` theo `fallbackTier` cả ở khung hình đầu tiên lẫn trong suốt thời gian exit animation của `AnimatePresence`.
- Đưa toàn bộ 7 overlay đi qua `useOverlayLayer`, xóa sạch toàn bộ listener `Escape` và `document.body.style.overflow` rải rác, đồng thời bổ sung `role="dialog"` + `aria-modal="true"` + `aria-label` đầy đủ cho cả 7 overlay.

### Không thuộc phạm vi (Non-goals)
- Không di chuyển state `filterModalOpen`, `favoritesDrawerOpen`, `authModalOpen` hay `BookingSession` sang `OverlayContext`.
- Không thay đổi giao diện trực quan, hiệu ứng Framer Motion hay luồng nghiệp vụ đặt phòng.
- Không xử lý lưu trữ yêu thích (`localStorage` — phạm vi Ứng viên #5).

---

## 2. Phương án Kiến trúc (`in-process` Deep Module + Thin React Host)

**Nhóm phụ thuộc (`codebase-design/DEEPENING.md`):**
- `src/lib/overlayStack.ts`: 100% **`In-process`** — toàn bộ ngăn xếp, sắp xếp theo `tier`, tính `zIndex`, giải quyết mục tiêu `Escape` và tính cờ khóa cuộn là hàm thuần không phụ thuộc DOM/React.
- `src/context/OverlayContext.tsx`: Host trình duyệt mỏng nối `window` (`keydown`) và `document.body.style.overflow` vào `src/lib/overlayStack.ts`.

### Interface đề xuất của `src/lib/overlayStack.ts`

```ts
export const OVERLAY_BASE_Z_INDEX = 50;
export const OVERLAY_Z_STEP = 10;
export const OVERLAY_TIER_Z_STRIDE = 100;

export type OverlayKind =
  | "dialog"
  | "favorites-drawer"
  | "filter-modal"
  | "auth-modal"
  | "property-modal"
  | "property-amenities-modal"
  | "checkout-modal"
  | "booking-success-modal";

export interface OverlayEntry {
  id: string;
  kind: OverlayKind;
  tier: number;
  closeOnEscape: boolean;
}

export interface OverlayStackState {
  entries: readonly OverlayEntry[];
}

export interface OverlayLayerPresentation {
  isRegistered: boolean;
  isTopmost: boolean;
  depth: number;
  zIndex: number;
}

export interface OverlayStackSnapshot {
  entries: readonly OverlayEntry[];
  topmostId: string | null;
  shouldLockBodyScroll: boolean;
  count: number;
}
```

### Các điểm vào (Entry Points) & Bất biến (Invariants)

1. **`createEmptyOverlayStack(): OverlayStackState`**
   - Tạo trạng thái ngăn xếp rỗng bất biến (`entries: []`).
2. **`registerOverlay(state, input: { id: string; kind: OverlayKind; tier?: number; closeOnEscape?: boolean }): OverlayStackState`**
   - Chuẩn hóa `tier` thành số nguyên không âm (`Math.max(0, Math.floor(tier))`, mặc định `0`) và `closeOnEscape` mặc định `true`.
   - **Bất biến thứ tự phân tầng (`tier`):** Các lớp có `tier` cao hơn (VD: `PropertyAmenitiesModal` dùng `tier: 1`) **luôn nằm trên** các lớp có `tier` thấp hơn (`tier: 0`), bất kể thứ tự gọi `registerOverlay` (loại bỏ hoàn toàn lỗi React child-before-parent `useEffect` và StrictMode). Trong cùng một `tier`, lớp đăng ký mới nằm trên lớp cũ.
   - **Bất biến chống trùng & chống nhảy lớp khi re-render:** Nếu `id` đã có trong ngăn xếp với cùng `tier`, chỉ cập nhật `kind`/`closeOnEscape` tại chỗ (giữ nguyên vị trí ngăn xếp; nếu không đổi gì trả về chính `state` cũ). Nếu `tier` thay đổi, định vị lại đúng nhóm `tier` mới.
3. **`unregisterOverlay(state, id: string): OverlayStackState`**
   - Gỡ đúng `id` khỏi ngăn xếp; nếu không tồn tại trả về chính `state` cũ.
4. **`resolveEscapeDismissTarget(state): string | null`**
   - Chỉ xét phần tử trên cùng (`entries[entries.length - 1]`).
   - Trả về `topmost.id` nếu `topmost.closeOnEscape === true`; ngược lại (ngăn xếp rỗng hoặc lớp trên cùng có `closeOnEscape === false`) trả về `null` — bảo đảm `Escape` không bao giờ xuyên xuống đóng lớp bên dưới.
5. **`deriveOverlayStackSnapshot(state): OverlayStackSnapshot`**
   - Trả về `{ entries, topmostId, shouldLockBodyScroll: entries.length > 0, count: entries.length }`.
6. **`getOverlayLayerPresentation(state, id: string, fallbackTier = 0): OverlayLayerPresentation`**
   - Chuẩn hóa `id.trim()` nhất quán với `registerOverlay` và `unregisterOverlay`.
   - Cấp `z-index` theo dải `tier` tách biệt: `OVERLAY_BASE_Z_INDEX + tier * OVERLAY_TIER_Z_STRIDE + depthWithinTier * OVERLAY_Z_STEP` (`tier 0`: `50, 60, 70...`; `tier 1`: `150, 160...`), loại bỏ hoàn toàn va chạm giữa các `tier`.
   - Nếu chưa đăng ký (khung hình đầu trước `useEffect` hoặc đang chạy exit animation `AnimatePresence`): dùng `sameTierCount` của `safeFallbackTier` để giữ `zIndex` nằm trên các lớp cùng `tier` còn đang mở, không bao giờ tụt ra sau lớp dưới khi fade-out.

### Interface của React Host `src/context/OverlayContext.tsx`

```ts
export interface UseOverlayLayerOptions {
  id: string;
  kind: OverlayKind;
  isOpen: boolean;
  onClose: () => void;
  tier?: number;
  closeOnEscape?: boolean;
}

export function OverlayProvider({ children }: { children: React.ReactNode }): React.JSX.Element;
export function useOverlayLayer(options: UseOverlayLayerOptions): OverlayLayerPresentation;
```

---

## 3. Tác động lên các Module xung quanh

- **`GLOSSARY.md`:** Bổ sung thuật ngữ miền `Overlay Stack Coordinator`.
- **`src/types/index.ts`:** Thêm các kiểu `OverlayKind`, `OverlayEntry`, `OverlayStackState`, `OverlayLayerPresentation`, `OverlayStackSnapshot`.
- **`src/lib/overlayStack.ts` (mới):** Triển khai deep module thuần ở Mục 2.
- **`src/context/OverlayContext.tsx` (mới):** Triển khai `OverlayProvider` (1 listener `Escape` duy nhất + khóa `document.body.style.overflow` khôi phục đúng giá trị gốc) và hook `useOverlayLayer`.
- **`src/app/layout.tsx`:** Bọc `<OverlayProvider>` ngoài `<BookingProvider>`.
- **`src/components/ui/Modal.tsx`:** Thay `useEffect` `Escape` + `document.body.style.overflow` bằng `useOverlayLayer`; thêm prop tùy chọn `overlayId` và `overlayKind` (mặc định `useId()` và `"dialog"`); áp dụng `style={{ zIndex: layer.zIndex }}`.
- **`src/components/home/FilterModal.tsx`:** Truyền `overlayId="filter-modal"` và `overlayKind="filter-modal"` vào `<Modal>`.
- **`src/components/layout/FavoritesDrawer.tsx`:** Gắn `useOverlayLayer({ id: "favorites-drawer", kind: "favorites-drawer", isOpen: favoritesDrawerOpen, onClose: () => setFavoritesDrawerOpen(false) })`, áp dụng `style={{ zIndex: layer.zIndex }}`, bổ sung `role="dialog" aria-modal="true" aria-label="Danh sách yêu thích"`.
- **`src/components/layout/Navbar.tsx`:** Gắn `useOverlayLayer({ id: "auth-modal", kind: "auth-modal", isOpen: authModalOpen, onClose: () => setAuthModalOpen(false) })` cho hộp thoại đăng nhập, áp dụng `style={{ zIndex: layer.zIndex }}`, bổ sung `role="dialog" aria-modal="true" aria-label="Đăng nhập LuxeStay"`.
- **`src/components/property/PropertyModal.tsx`:** Xóa `useEffect` `Escape` thủ công; gắn `useOverlayLayer({ id: "property-modal", kind: "property-modal", isOpen: true, onClose: () => setSelectedProperty(null) })`, áp dụng `style={{ zIndex: layer.zIndex }}`, bổ sung `role="dialog" aria-modal="true" aria-label={property.title}`.
- **`src/components/property/PropertyAmenitiesModal.tsx`:** Xóa `useEffect` capture-phase `Escape`; gắn `useOverlayLayer({ id: "property-amenities-modal", kind: "property-amenities-modal", isOpen, tier: 1, onClose })` ở lớp ngoài (trước `AnimatePresence`) và truyền `zIndex={layer.zIndex}` xuống nội dung.
- **`src/components/booking/BookingCheckoutModal.tsx`:** Gắn `useOverlayLayer({ id: "checkout-modal", kind: "checkout-modal", isOpen: true, onClose: handleClose })`, áp dụng `style={{ zIndex: layer.zIndex }}`, bổ sung `role="dialog" aria-modal="true" aria-label="Xác nhận đặt phòng"`.
- **`src/components/booking/BookingSuccessModal.tsx`:** Gắn `useOverlayLayer({ id: "booking-success-modal", kind: "booking-success-modal", isOpen: Boolean(bookingSuccess), onClose: () => setBookingSuccess(null) })`, áp dụng `style={{ zIndex: layer.zIndex }}`, bổ sung `role="dialog" aria-modal="true" aria-label="Đặt phòng thành công"`.
- **Kiểm thử (`tests/overlay-stack.test.ts` — mới):** Kiểm thử toàn bộ hành vi qua interface công khai của `src/lib/overlayStack.ts`: đăng ký/hủy đăng ký LIFO, bảo toàn bất biến `tier` khi con đăng ký trước cha (mô phỏng React `useEffect` bottom-up), cập nhật tại chỗ không làm nhảy tầng, chặn `Escape` xuyên lớp khi `closeOnEscape: false`, khóa/mở khóa `shouldLockBodyScroll` theo số lớp mở, và `zIndex` tất định kể cả `fallbackTier` khi mount/fade-out.
