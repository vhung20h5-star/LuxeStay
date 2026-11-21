# Kế hoạch Triển khai Phase 4: Overlay Stack Coordinator

**Spec:** [2026-11-21-overlay-stack-coordinator-design.md](file:///d:/Tutorial-Vibe%20Coding/travel-service/docs/superpowers/specs/2026-11-21-overlay-stack-coordinator-design.md)  
**Nhánh làm việc:** `feat/overlay-stack-coordinator`  
**Chiến lược:** Thực thi Native + TDD (`RED → GREEN`), kiểm chứng đầy đủ (`node:test`, `tsc`, `eslint`, `next build`), và đánh giá độc lập toàn nhánh trước khi hoàn tất.

---

## Task 1 (TDD — RED → GREEN): Deep Module `src/lib/overlayStack.ts` & Kiểu miền trong `src/types/index.ts`

1. **Cập nhật kiểu (`src/types/index.ts`):**
   - Bổ sung `OverlayKind`, `OverlayEntry`, `OverlayStackState`, `OverlayLayerPresentation`, `OverlayStackSnapshot`.
2. **Viết test trước (`tests/overlay-stack.test.ts` — RED):**
   - Kiểm thử đầy đủ qua interface công khai của `src/lib/overlayStack.ts`:
     - `createEmptyOverlayStack` & `deriveOverlayStackSnapshot` (ngăn xếp rỗng → `shouldLockBodyScroll: false`, `topmostId: null`, `count: 0`, `resolveEscapeDismissTarget: null`).
     - Đăng ký nhiều lớp cùng `tier` (LIFO), cấp `zIndex` tất định (`50`, `60`, `70`), `isTopmost`, `depth`, và `unregisterOverlay` từng lớp (chỉ mở khóa `shouldLockBodyScroll` khi lớp cuối cùng gỡ xong; gỡ ID không tồn tại trả nguyên tham chiếu state).
     - Phân tầng `tier`: lớp `tier: 1` (như `PropertyAmenitiesModal`) luôn nằm trên lớp `tier: 0` (như `PropertyModal`) kể cả khi đăng ký ngược thứ tự (mô phỏng React `useEffect` bottom-up / StrictMode), và chuẩn hóa `tier` âm / số thực / `NaN` về số nguyên `>= 0`.
     - Đăng ký lại cùng `id`: giữ nguyên vị trí ngăn xếp nếu cùng `tier` (không đẩy cha lên trên con khi re-render), cập nhật `kind`/`closeOnEscape` tại chỗ, trả nguyên tham chiếu state nếu không đổi gì; và di chuyển đúng nhóm khi `tier` thay đổi.
     - `resolveEscapeDismissTarget`: chỉ trả về lớp trên cùng khi `closeOnEscape: true`; khi lớp trên cùng có `closeOnEscape: false`, trả `null` và không rò rỉ xuống lớp dưới.
     - `getOverlayLayerPresentation`: với lớp chưa đăng ký (khung hình 0 trước `useEffect` hoặc đang chạy exit animation), tính `zIndex` theo `fallbackTier` (`50 + fallbackTier * 10`).
   - Chạy `tests/overlay-stack.test.ts` để xác nhận **RED**.
3. **Triển khai `src/lib/overlayStack.ts` (GREEN):**
   - Viết implementation thuần, bất biến (`Object.freeze`) và không phụ thuộc DOM/React.
   - Chạy `tests/overlay-stack.test.ts` để xác nhận **GREEN**.

---

## Task 2: React Host mỏng `src/context/OverlayContext.tsx` & Bọc `src/app/layout.tsx`

1. **Tạo `src/context/OverlayContext.tsx`:**
   - `OverlayProvider`: giữ `OverlayStackState`, `Map<string, () => void>` cho callback đóng mới nhất (ref), 1 trình lắng nghe `window` `keydown` (`Escape`, bỏ qua nếu `e.defaultPrevented` hoặc `e.isComposing`), và 1 `useEffect` khóa/khôi phục chính xác `document.body.style.overflow` gốc theo `snapshot.shouldLockBodyScroll`.
   - `useOverlayLayer({ id, kind, isOpen, onClose, tier?, closeOnEscape? })`: đồng bộ `onClose` qua ref, đăng ký/cập nhật khi `isOpen === true`, gỡ ngay lập tức khi `isOpen === false` hoặc unmount, trả về `getOverlayLayerPresentation(stack, id, tier)`.
2. **Cập nhật `src/app/layout.tsx`:**
   - Bọc `<OverlayProvider>` bên ngoài `<BookingProvider>`.

---

## Task 3: Chuẩn hóa toàn bộ 7 Overlay qua `useOverlayLayer` & Trợ năng chuẩn

1. **`src/components/ui/Modal.tsx` & `src/components/home/FilterModal.tsx`:**
   - Xóa `useEffect` `Escape` + `document.body.style.overflow` khỏi `Modal.tsx`; dùng `useOverlayLayer` với `overlayId` (mặc định `useId()`) và `overlayKind` (mặc định `"dialog"`); đặt `style={{ zIndex: layer.zIndex }}`.
   - Truyền `overlayId="filter-modal"` và `overlayKind="filter-modal"` từ `FilterModal.tsx`.
2. **`src/components/layout/FavoritesDrawer.tsx`:**
   - Gắn `useOverlayLayer`, áp dụng `style={{ zIndex: layer.zIndex }}`, thêm `role="dialog" aria-modal="true" aria-label="Danh sách yêu thích"`.
3. **`src/components/layout/Navbar.tsx` (`AuthModal`):**
   - Gắn `useOverlayLayer` cho hộp thoại đăng nhập, áp dụng `style={{ zIndex: layer.zIndex }}`, thêm `role="dialog" aria-modal="true" aria-label="Đăng nhập LuxeStay"`.
4. **`src/components/property/PropertyModal.tsx` & `src/components/property/PropertyAmenitiesModal.tsx`:**
   - Xóa `useEffect` `Escape` thủ công ở cả hai tệp (kể cả thủ thuật capture-phase).
   - `PropertyModal`: gắn `useOverlayLayer` (`tier: 0`), `style={{ zIndex: layer.zIndex }}`, `role="dialog" aria-modal="true" aria-label={property.title}`.
   - `PropertyAmenitiesModal`: gắn `useOverlayLayer` (`tier: 1`, `isOpen`) ở component ngoài trước `<AnimatePresence>`, truyền `zIndex={layer.zIndex}` xuống nội dung.
5. **`src/components/booking/BookingCheckoutModal.tsx` & `src/components/booking/BookingSuccessModal.tsx`:**
   - Gắn `useOverlayLayer` (`BookingCheckoutModal` nối vào `handleClose` để hủy request đang gửi khi bấm `Escape`; `BookingSuccessModal` dùng `isOpen: Boolean(bookingSuccess)`), áp dụng `style={{ zIndex: layer.zIndex }}`, thêm `role="dialog" aria-modal="true"` và `aria-label`.

---

## Task 4: Kiểm chứng toàn diện & Đánh giá độc lập (Final Review)

1. Chạy toàn bộ 6 bộ test `node:test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
2. Gửi subagent `research` (`Model: "pro"`) đánh giá độc lập toàn nhánh với trọng tâm:
   - **Review Focus:**
     - Bảo đảm không còn `document.body.style.overflow` hoặc `Escape` listener thủ công rải rác ở bất kỳ overlay nào ngoài `OverlayContext.tsx`.
     - Kiểm tra thứ tự `useEffect`, React StrictMode, `AnimatePresence` exit animation (`zIndex` theo `fallbackTier`), và stale closure của `onClose` (đặc biệt `handleClose` + `AbortController` trong `BookingCheckoutModal` và `PropertyAmenitiesModal`).
     - Kiểm tra khóa/khôi phục `document.body.style.overflow` khi chuyển tiếp trực tiếp giữa 2 overlay (`FavoritesDrawer → PropertyModal`, `PropertyModal → BookingCheckoutModal → BookingSuccessModal`, `PropertyModal + PropertyAmenitiesModal`).
     - Kiểm tra trợ năng `role="dialog"`, `aria-modal="true"`, `aria-label` trên cả 7 overlay và kiểm tra `Escape` bỏ qua sự kiện khi đang gõ IME (`isComposing`) hoặc `defaultPrevented`.
3. Nếu có phát hiện Critical/Important, chạy đúng 1 lượt sửa theo TDD + kiểm chứng lại trước khi commit và trình menu hoàn tất nhánh.
