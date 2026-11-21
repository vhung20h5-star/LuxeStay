# Kế hoạch Triển khai Phase 3: Amenity Projection & Explorer Module

**Spec:** [2026-11-21-amenity-projection-explorer-design.md](file:///d:/Tutorial-Vibe%20Coding/travel-service/docs/superpowers/specs/2026-11-21-amenity-projection-explorer-design.md)  
**Nhánh làm việc:** `feat/amenity-projection-explorer`  
**Chiến lược:** Thực thi Native + TDD (`RED → GREEN`), kiểm chứng đầy đủ (`node:test`, `tsc`, `eslint`, `next build`), và đánh giá độc lập toàn nhánh trước khi hoàn tất.

---

## Task 1 (TDD — RED → GREEN): Đào sâu `src/lib/amenities.ts` & Kiểu miền trong `src/types/index.ts`

1. **Cập nhật kiểu (`src/types/index.ts`):**
   - Xóa `export interface Amenity` và trường `Property.amenities: string[]`.
   - Thêm các kiểu của `PropertyAmenityProjection`, `AmenityCategoryGroup`, `AmenityCategorySummary`, `AmenityFeeFilter`, `AmenityExplorerState`, `AmenityExplorerAction`, `AmenityFeeFilterOption`, `AmenityExplorerView`, `AmenityPricingTone`, `AmenityPricingDescriptor`, `SelectedAmenityDisplay`.
2. **Viết test trước (`tests/amenities.test.ts` — RED):**
   - Import `normalizeVietnamese` trực tiếp từ `@/lib/utils`.
   - Test xuyên suốt qua interface sâu:
     - `projectPropertyAmenities`: hợp nhất override, xóa sạch `price`/`priceUnit` khi hạ `paid` → `free-reservation`/`included`, bỏ qua `amenityId` không hợp lệ, giữ thứ tự 7 nhóm và ẩn nhóm rỗng, `cardHighlights` tối đa 3 nhóm, `featured` ưu tiên nổi bật rồi fallback tối đa 6 mục, `byId`, `filterKeys`, và cache `WeakMap` (cùng ref `resortAmenities` trả đúng object đã cache; mảng mới tính độc lập).
     - `propertyHasAmenityFilters`: danh sách rỗng trả `true`, logic `AND` nhiều khóa, thiếu khóa trả `false`.
     - `getAmenityCategoryLabel`: trả đúng nhãn tiếng Việt của từng danh mục.
     - `createAmenityExplorerState`, `reduceAmenityExplorerState`, `deriveAmenityExplorerView`:
       - Mở bằng `initialAmenityId` hợp lệ (`mobileShowDetail: true`) và không hợp lệ (fallback mục đầu, `mobileShowDetail: false`).
       - Mở bằng `initialCategory` hợp lệ và không hợp lệ (fallback `"all"`).
       - Trường hợp chỗ nghỉ rỗng (`effectiveActiveAmenity: null`, `isEmpty: true`).
       - Tìm kiếm tiếng Việt không dấu (tên, nhãn ngắn, mô tả, vị trí, ghi chú), lọc `feeFilter` (`all`, `free`, `paid`, `selected`), lọc danh mục, gom nhóm theo thứ tự ưu tiên, auto-fallback `effectiveActiveAmenity` khi mục đang xem bị lọc ẩn, `selectedAmenityIds` dạng `Set`, `selectedTotalFee` chỉ cộng mục `paid`, nhãn động `Đã chọn (N)`.
       - Mọi hành động lọc/tìm/đổi danh mục/đặt lại/quay lại đều đưa `mobileShowDetail` về `false`; chọn mục đặt về `true`.
     - `describeAmenityPricing`, `describeSelectedAmenity`, `formatAmenitiesFeeSummary`: đầy đủ 3 loại `included`, `free-reservation`, `paid` (có và không có `priceUnit`, tổng phí `0` và `> 0`, kiểu `"plain"` và `"parenthesized"`).
   - Chạy `tests/amenities.test.ts` để xác nhận **RED**.
3. **Triển khai `src/lib/amenities.ts` (GREEN):**
   - Xóa re-export shim `normalizeVietnamese` và các hàm shallow thừa.
   - Xây dựng `projectPropertyAmenities` có cache `WeakMap<readonly PropertyAmenityOverride[], PropertyAmenityProjection>`, `propertyHasAmenityFilters`, `getAmenityCategoryLabel`, cụm `AmenityExplorer`, và cụm `describeAmenityPricing` / `describeSelectedAmenity` / `formatAmenitiesFeeSummary`.
   - Chạy `tests/amenities.test.ts` để xác nhận **GREEN**.

---

## Task 2: Xóa dữ liệu `amenities` cũ & Chuyển đổi module nghiệp vụ + test dữ liệu

1. **`src/data/properties.ts`:** Xóa mảng `amenities: [...]` cũ khỏi toàn bộ 12 chỗ nghỉ; giữ nguyên `resortAmenities`.
2. **`src/lib/bookingSession.ts`:** Chuyển sang `projectPropertyAmenities(property)` (`byId.get(amenityId)` trong `toggleSessionAmenity` và `.all` trong `deriveBookingQuote`).
3. **`tests/properties-amenities.test.ts`:** Chuyển sang kiểm thử qua `projectPropertyAmenities` & `propertyHasAmenityFilters`, đồng thời thêm kiểm tra khẳng định không chỗ nghỉ nào còn trường `amenities` cũ.

---

## Task 3: Đơn giản hóa 6 module UI theo interface sâu & Pricing Descriptors

1. **`src/components/home/PropertyCard.tsx`:** Dùng `projectPropertyAmenities(property)` lấy `{ totalCount, cardHighlights }`.
2. **`src/components/property/PropertyModal.tsx`:** Dùng `projectPropertyAmenities(property)` lấy `{ totalCount, categories, featured }`; dùng `describeAmenityPricing`, `describeSelectedAmenity` và `formatAmenitiesFeeSummary`.
3. **`src/components/property/PropertyAmenitiesModal.tsx`:** Xóa 7 khối `useMemo` rời và import `AMENITY_CATEGORIES`; dùng `projectPropertyAmenities`, `createAmenityExplorerState`, `reduceAmenityExplorerState`, `deriveAmenityExplorerView`, `describeAmenityPricing` và `formatAmenitiesFeeSummary(..., "parenthesized")`.
4. **`src/components/property/AmenityDetailPanel.tsx`:** Dùng `describeAmenityPricing(amenity)` thay toàn bộ nhánh trùng lặp.
5. **`src/components/booking/BookingCheckoutModal.tsx` & `BookingSuccessModal.tsx`:** Dùng `describeSelectedAmenity(item)` và `formatAmenitiesFeeSummary(pricing.amenitiesFee)`.

---

## Task 4: Kiểm chứng toàn diện & Đánh giá độc lập (Final Review)

1. Chạy đầy đủ 5 bộ test `node:test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
2. Gửi subagent `research` (`Model: "pro"`) đánh giá độc lập toàn nhánh với trọng tâm:
   - **Review Focus:**
     - Bảo đảm `WeakMap` cache không gây rò rỉ hay sai khác khi test/caller thay đổi mảng `resortAmenities` hoặc dùng lại object clone.
     - Kiểm tra không còn tham chiếu ẩn tới `Property.amenities` hoặc `interface Amenity` hoặc re-export shim cũ.
     - Kiểm tra mọi trường hợp biên của `AmenityExplorer` (`initialAmenityId` không thuộc property, `initialCategory` không tồn tại trên property, lọc về rỗng, mobile list/detail, `selectedAmenities` chỉ gồm dịch vụ miễn phí `0đ` vs có phụ phí).
     - Kiểm tra nhất quán 100% giữa 5 màn hình dùng `describeAmenityPricing` / `describeSelectedAmenity` / `formatAmenitiesFeeSummary` (không mất hành vi hay sai câu chữ/màu sắc ngữ nghĩa).
3. Nếu có phát hiện Critical/Important, chạy đúng 1 lượt sửa theo TDD + kiểm chứng lại trước khi commit và trình menu hoàn tất nhánh.
