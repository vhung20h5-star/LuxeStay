# ADR-0004: `PropertyAmenityProjection` cache `WeakMap`, Master–Detail Explorer & Pricing Descriptors

- **Status:** Accepted
- **Date:** 2026-11-21
- **Deciders:** Engineering Team (`travel-service`)
- **Related Docs:** [PRD](../PRD.md) | [ARCHITECTURE](../ARCHITECTURE.md) | [Spec gốc](../superpowers/specs/2026-11-21-amenity-projection-explorer-design.md)
- **Supersedes / Superseded by:** None

---

## 1. Context (Bối cảnh & Vấn đề)

Sau khi giới thiệu danh mục 51 tiện ích khu nghỉ dưỡng (`96a3216`), tầng xử lý tiện ích phát sinh 4 điểm ma sát kiến trúc:
1. Tồn tại song song schema cũ chết (`interface Amenity` và `Property.amenities: string[]`) bên cạnh `Property.resortAmenities`, dễ gây lệch dữ liệu.
2. `PropertyCard`, `catalogQuery.ts` và `bookingSession.ts` lặp lại việc giải nghĩa `resortAmenities` và dựng `Set`/`Map` ở mọi lần render hoặc lọc.
3. `PropertyAmenitiesModal.tsx` phải tự quản lý 7 khối `useMemo` thủ công để lọc, gom nhóm, fallback mục đang xem và tính tổng phí, đồng thời không kiểm tra hợp lệ `initialAmenityId`/`initialCategory`.
4. Câu chữ và ngữ nghĩa hiển thị cho 3 mức phí (`included`, `free-reservation`, `paid`) bị nhân bản ở 5 component khác nhau (`PropertyModal`, `PropertyAmenitiesModal`, `AmenityDetailPanel`, `BookingCheckoutModal`, `BookingSuccessModal`).

---

## 2. Decision Drivers (Tiêu chí quyết định)

- **Single Source of Truth cho dữ liệu & câu chữ:** Một nguồn dữ liệu tiện ích duy nhất (`resortAmenities` + `AMENITY_CATALOG`) và một nguồn mô tả hiển thị giá duy nhất.
- **Hiệu năng tra cứu $O(1)$ không rò rỉ bộ nhớ:** Tránh giải nghĩa lặp lại trong vòng lặp lọc danh mục và render danh sách thẻ.
- **Tách thuần UI khỏi logic Explorer:** `PropertyAmenitiesModal` chỉ render theo view model dẫn xuất, không chứa thuật toán lọc hay fallback.

---

## 3. Considered Options (Các phương án đã cân nhắc)

1. **Option A (Đã chọn) — 3 cụm Interface sâu trong `src/lib/amenities.ts` (`WeakMap` Projection + Explorer Reducer/View + Pricing Descriptors):**
   - `projectPropertyAmenities(property)` cache bất biến bằng `WeakMap` theo tham chiếu mảng `property.resortAmenities`.
   - `createAmenityExplorerState`, `reduceAmenityExplorerState`, `deriveAmenityExplorerView` gom toàn bộ trạng thái và view model của cửa sổ Master–Detail.
   - `describeAmenityPricing`, `describeSelectedAmenity`, `formatAmenitiesFeeSummary` trả về dữ liệu mô tả & `tone` ngữ nghĩa (không chứa Tailwind class).
2. **Option B — Pre-compute tiện ích ngay trong `src/data/properties.ts`:**
   - Buộc mọi nguồn dữ liệu tương lai (ví dụ JSON trả từ API/DB) phải tự dựng sẵn cấu trúc chiếu, mất tính độc lập khi chuyển sang backend.
3. **Option C — Cache bằng `Map<propertyId, ...>` toàn cục:**
   - Gây rủi ro rò rỉ bộ nhớ nếu dữ liệu chỗ nghỉ thay đổi động hoặc dùng trong kiểm thử với object tạo mới liên tục; `WeakMap` tự động giải phóng theo Garbage Collector.

---

## 4. Decision Outcome (Quyết định cuối cùng)

- Xóa hoàn toàn `Property.amenities: string[]` và `interface Amenity`; chỉ giữ `Property.resortAmenities` tham chiếu `AMENITY_CATALOG` (51 mục / 7 nhóm ưu tiên / 9 filter keys).
- Gom toàn bộ xử lý tiện ích vào `src/lib/amenities.ts` với:
  1. `projectPropertyAmenities`, `propertyHasAmenityFilters`, `getAmenityCategoryLabel` (`WeakMap`-cached, đóng băng bằng `Object.freeze`).
  2. `createAmenityExplorerState`, `reduceAmenityExplorerState`, `deriveAmenityExplorerView` (kèm kiểm tra đầu vào, lọc tiếng Việt không dấu, fallback mục đang chọn, quản lý mobile 2-pane).
  3. `describeAmenityPricing`, `describeSelectedAmenity`, `formatAmenitiesFeeSummary` dùng chung cho toàn bộ 5 màn hình UI.

---

## 5. Consequences (Hệ quả)

### Positive (Tích cực)
- `PropertyAmenitiesModal.tsx` rút gọn từ 7 `useMemo` thủ công xuống 1 `useReducer` + 1 `useMemo(deriveAmenityExplorerView)`.
- Tra cứu tiện ích khi lọc trang chủ và toggle trong booking đạt $O(1)$ qua `filterKeys` và `byId`.
- Đổi câu chữ hiển thị giá tiện ích chỉ cần sửa tại 1 chỗ duy nhất trong `src/lib/amenities.ts`.

### Negative & Trade-offs (Đánh đổi)
- Cache `WeakMap` dựa trên tham chiếu mảng `property.resortAmenities`: caller không được mutate mảng `resortAmenities` tại chỗ (luôn thay bằng mảng mới nếu cập nhật — nhất quán với phong cách immutable của dự án).

### Risks & Follow-ups (Rủi ro & Hành động tiếp theo)
- Khi thêm đa ngôn ngữ (Phase 3), cần truyền `locale` vào cụm Pricing Descriptors và bảng nhãn danh mục.

---

## 6. Validation & References (Kiểm chứng & Tham chiếu)

- Files affected: `src/lib/amenities.ts`, `src/data/amenities.ts`, `src/data/properties.ts`, `src/types/index.ts`, `src/components/home/PropertyCard.tsx`, `src/components/property/PropertyModal.tsx`, `src/components/property/PropertyAmenitiesModal.tsx`, `src/components/property/AmenityDetailPanel.tsx`, `src/components/booking/BookingCheckoutModal.tsx`, `src/components/booking/BookingSuccessModal.tsx`
- Tests: `tests/amenities.test.ts` (10 cases), `tests/amenities-catalog.test.ts` (3 cases), `tests/properties-amenities.test.ts` (5 cases)
- Commits: `96a3216`, `dc9d3a7`
