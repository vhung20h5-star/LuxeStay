# ADR-0005: Điều phối ngăn xếp lớp phủ tập trung (`OverlayStack` & `OverlayContext`)

- **Status:** Accepted
- **Date:** 2026-11-21
- **Deciders:** Engineering Team (`travel-service`)
- **Related Docs:** [PRD](../PRD.md) | [ARCHITECTURE](../ARCHITECTURE.md) | [Spec gốc](../superpowers/specs/2026-11-21-overlay-stack-coordinator-design.md)
- **Supersedes / Superseded by:** None

---

## 1. Context (Bối cảnh & Vấn đề)

LuxeStay có 7 hộp thoại/ngăn kéo độc lập (`FilterModal`, `FavoritesDrawer`, `AuthModal`, `PropertyModal`, `PropertyAmenitiesModal`, `BookingCheckoutModal`, `BookingSuccessModal`), trong đó có modal lồng nhau (`PropertyAmenitiesModal` mở trên `PropertyModal`). Trước commit `f467d47`:
1. Chỉ `Modal.tsx` khóa cuộn nền và đặt cứng `overflow = "unset"` khi đóng (ghi đè trạng thái của các overlay khác); 6 overlay còn lại không khóa cuộn nền.
2. 4/7 overlay không hỗ trợ phím `Escape`; `PropertyAmenitiesModal` phải dùng mẹo capture-phase listener phối hợp thủ công với `PropertyModal`.
3. `z-index` bị hardcode rải rác (`z-50`, `z-[60]`), dễ chồng đè trong lúc animation thoát của Framer Motion.
4. 5/7 overlay thiếu thuộc tính trợ năng chuẩn (`role="dialog"`, `aria-modal="true"`).

---

## 2. Decision Drivers (Tiêu chí quyết định)

- **Độc lập quyền sở hữu state nghiệp vụ:** Bộ điều phối overlay chỉ quản lý *tầng hiển thị, Escape và scroll lock*, không kéo state nghiệp vụ (`BookingSession`, `filterModalOpen`, `authModalOpen`) ra khỏi chủ sở hữu của chúng.
- **Miễn nhiễm thứ tự `useEffect` của React:** Trong React, effect của component con (`PropertyAmenitiesModal`) chạy trước component cha (`PropertyModal`), nên LIFO thuần không đủ nếu không có `tier`.
- **Duy nhất 1 listener toàn cục & 1 bộ khóa cuộn có đếm tham chiếu.**

---

## 3. Considered Options (Các phương án đã cân nhắc)

1. **Option A (Đã chọn) — Pure `overlayStack.ts` (`tier` + LIFO) + Thin Host `OverlayContext.tsx` (`useOverlayLayer`):**
   - Công thức `zIndex = 50 + tier * 100 + depthWithinTier * 10` (`tier = 0` cho base overlays, `tier = 1` cho nested overlays).
   - `OverlayProvider` đặt ở ngoài cùng `src/app/layout.tsx`, đăng ký 1 `keydown` listener cho `Escape` (chỉ đóng phần tử trên đỉnh nếu `closeOnEscape === true`) và lưu/khôi phục `document.body.style.overflow` gốc.
   - `useOverlayLayer` lưu `onClose` trong `useRef` để tránh re-register liên tục và giữ `zIndex` không va chạm qua `fallbackTier` khi mount/unmount animation.
2. **Option B — Dùng thư viện dialog ngoài (Radix Dialog / Headless UI) thay thế toàn bộ 7 overlay:**
   - Phải viết lại cấu trúc markup/Framer Motion của toàn bộ 7 overlay hiện có; vẫn hữu ích khi cần focus trap nâng cao ở giai đoạn sau, nhưng không thay thế lợi ích kiểm soát tập trung bằng pure stack module.
3. **Option C — Gom state mở/đóng của cả 7 modal vào 1 ModalManager context duy nhất:**
   - Gây ràng buộc chặt giữa tầng hiển thị với state machine đặt phòng (`BookingSession`), làm vỡ locality.

---

## 4. Decision Outcome (Quyết định cuối cùng)

- Xây dựng module thuần `src/lib/overlayStack.ts` và host React mỏng `src/context/OverlayContext.tsx` (`OverlayProvider` + `useOverlayLayer`).
- Toàn bộ 7 overlay (cả trực tiếp lẫn gián tiếp qua `src/components/ui/Modal.tsx`) đăng ký qua `useOverlayLayer` và khai báo đầy đủ `role="dialog"`, `aria-modal="true"`, `aria-label`.
- Cấm các modal/drawer tự thêm `window.addEventListener("keydown")` cho `Escape` hoặc tự gán `document.body.style.overflow`.

---

## 5. Consequences (Hệ quả)

### Positive (Tích cực)
- Hành vi `Escape`, khóa cuộn nền và phân tầng `z-index` nhất quán 100% trên toàn bộ 7 overlay.
- Thêm modal hoặc drawer mới chỉ cần gọi `useOverlayLayer` (hoặc dùng `<Modal />`) với `overlayId` và `tier` thích hợp.
- Logic ngăn xếp kiểm thử hoàn toàn trên Node mà không cần DOM (`tests/overlay-stack.test.ts`).

### Negative & Trade-offs (Đánh đổi)
- Chưa bao gồm focus trap bàn phím (`Tab` cycling) và tự trả focus về phần tử kích hoạt sau khi đóng; đây là hạng mục accessibility có thể nâng cấp bổ sung vào `OverlayContext` hoặc khi chuẩn hóa sang Radix Dialog primitives.

### Risks & Follow-ups (Rủi ro & Hành động tiếp theo)
- Khi thêm bất kỳ overlay lồng cấp 2 mới nào, bắt buộc truyền `tier: 1` (và khai báo `OverlayKind` tương ứng trong `src/types/index.ts`).

---

## 6. Validation & References (Kiểm chứng & Tham chiếu)

- Files affected: `src/lib/overlayStack.ts`, `src/context/OverlayContext.tsx`, `src/app/layout.tsx`, `src/components/ui/Modal.tsx`, `src/components/layout/AuthModal.tsx`, `src/components/layout/FavoritesDrawer.tsx`, `src/components/home/FilterModal.tsx`, `src/components/property/PropertyModal.tsx`, `src/components/property/PropertyAmenitiesModal.tsx`, `src/components/booking/BookingCheckoutModal.tsx`, `src/components/booking/BookingSuccessModal.tsx`
- Tests: `tests/overlay-stack.test.ts` (7 test cases)
- Commit: `f467d47`
