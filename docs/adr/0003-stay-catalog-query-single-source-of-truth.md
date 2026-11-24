# ADR-0003: `StayCatalogQuery` làm nguồn chân lý duy nhất cho tìm kiếm, lọc và sắp xếp

- **Status:** Accepted
- **Date:** 2026-11-21 (mở rộng preset ngày động & helper đích đến ngày 2026-11-24)
- **Deciders:** Engineering Team (`travel-service`)
- **Related Docs:** [PRD](../PRD.md) | [ARCHITECTURE](../ARCHITECTURE.md) | [Spec gốc](../superpowers/specs/2026-11-21-stay-catalog-query-design.md)
- **Supersedes / Superseded by:** None

---

## 1. Context (Bối cảnh & Vấn đề)

Trước đợt tái cấu trúc (`0476330`), trạng thái tìm kiếm, lọc và sắp xếp trang chủ bị phân mảnh qua 6 tệp (`types/index.ts`, `BookingContext.tsx`, `SearchBar.tsx`, `CategoryBar.tsx`, `FilterModal.tsx`, `PropertyList.tsx`), dẫn đến 6 lỗi thực tế:
1. `sortBy` nằm trong `useState` cục bộ của `PropertyList`, nên nút **"Xóa tất cả bộ lọc"** không đặt lại thứ tự sắp xếp.
2. `activeCategory` bị nhân đôi song song với `filterState.category`; tồn tại 2 trường chết (`SearchCriteria.propertyType`, `FilterState.instantBookingOnly`).
3. `minPrice` hiển thị và đếm badge ở `FilterModal`/`CategoryBar` nhưng bị bỏ qua khi lọc ở `PropertyList`.
4. Tìm điểm đến dùng `.toLowerCase()` thô khiến gõ tiếng Việt không dấu (`"da lat"`, `"phu quoc"`) trả về 0 kết quả; nút xu hướng cắt chuỗi bằng `tag.split(" ")[0]` biến cả `"Đà Lạt"` lẫn `"Đà Nẵng"` thành `"Đà"`.
5. `activeTab` trong `SearchBar` lệch pha với `FilterModal` và `resetFilters`.
6. Toàn bộ thuật toán lọc/sắp xếp nằm trong JSX/`useMemo`, không có unit test.

---

## 2. Decision Drivers (Tiêu chí quyết định)

- Một nguồn chân lý duy nhất cho toàn bộ truy vấn trang chủ (`search` + `filters` + `sortBy`).
- Tìm kiếm thân thiện với người dùng Việt Nam (bỏ dấu, chuẩn hóa `đ/Đ`).
- Giao diện người dùng không phải tự đọc cấu trúc bộ lọc nội bộ để hiển thị số badge, tab loại hình hay thẻ gỡ lọc nhanh (`ActiveFilterChip`).
- Sẵn sàng mở rộng sang đồng bộ URL query params hoặc truy vấn server ở Phase 1.

---

## 3. Considered Options (Các phương án đã cân nhắc)

1. **Option A (Đã chọn) — Pure `StayCatalogQuery` Deep Module (`src/lib/catalogQuery.ts`):**
   - Gom `search` + `filters` vào `StayCatalogQueryState` duy nhất; xuất `CatalogQueryResult` gồm `items`, `totalCount`, `activeFilterCount`, `activeChips`, `activePropertyTypeTab`.
   - Chuẩn hóa `normalizeVietnamese` dùng chung tại `src/lib/utils.ts`.
   - Biểu diễn xu hướng tìm kiếm bằng dữ liệu có cấu trúc `QuickSearchTrend` và ngày gợi ý bằng `getQuickDatePresets(baseDate)` trả về định dạng ISO `YYYY-MM-DD`.
2. **Option B — Giữ các hook lọc tách rời và chỉ vá từng lỗi riêng lẻ:**
   - Không giải quyết nguyên nhân gốc (phân mảnh state); mọi tiêu chí lọc mới sẽ tiếp tục phải sửa đồng thời nhiều component.

---

## 4. Decision Outcome (Quyết định cuối cùng)

Xây dựng `src/lib/catalogQuery.ts` làm **deep module** duy nhất sở hữu:
- Toàn bộ trạng thái `StayCatalogQueryState` và các hàm chuyển đổi thuần có kẹp biên (`setQueryPriceRange`, `adjustQueryGuests`, `setQueryDates`, `setQueryMinRating`, `applyQuickSearchTrend`, `removeActiveFilterChip`, ...).
- Bộ thực thi `executeCatalogQuery(properties, query)` áp dụng đầy đủ `minPrice..maxPrice`, `maxGuests >= adults + children`, tìm kiếm tiếng Việt không dấu, `propertyHasAmenityFilters` (ngữ nghĩa AND) và sắp xếp tất định.
- Hai helper truy vấn UI bổ trợ: `filterDestinations` và `resolveFavoriteProperties`.
- Xóa bỏ hoàn toàn các trường chết (`SearchCriteria.propertyType`, `FilterState.instantBookingOnly`).

---

## 5. Consequences (Hệ quả)

### Positive (Tích cực)
- `SearchBar`, `CategoryBar`, `FilterModal`, `PropertyList`, `TrendingDestinations` đồng bộ tuyệt đối 2 chiều và reset sạch hoàn toàn chỉ qua 1 hành động `resetFilters()`.
- `ActiveFilterChip` cho phép gỡ từng điều kiện lọc với 0 logic phân nhánh trong `PropertyList`.
- Được bảo vệ bởi 9 test case toàn diện trong `tests/catalog-query.test.ts`.

### Negative & Trade-offs (Đánh đổi)
- Hiện tại lọc thực hiện client-side trên mảng `PROPERTIES` tĩnh; khi danh mục tăng lên hàng trăm/nghìn chỗ nghỉ ở Phase 1, cần chuyển bước thực thi sang truy vấn backend trong khi vẫn giữ lại kiểu `StayCatalogQueryState` và URL serializer.

### Risks & Follow-ups (Rủi ro & Hành động tiếp theo)
- Bổ sung bộ chuyển đổi `serializeCatalogQueryToParams` / `parseCatalogQueryFromParams` ở **P1.3** ([PLAN.md](../PLAN.md)) để hỗ trợ link tìm kiếm chia sẻ được.

---

## 6. Validation & References (Kiểm chứng & Tham chiếu)

- Files affected: `src/lib/catalogQuery.ts`, `src/lib/utils.ts`, `src/context/BookingContext.tsx`, `src/components/home/SearchBar.tsx`, `src/components/home/CategoryBar.tsx`, `src/components/home/FilterModal.tsx`, `src/components/home/PropertyList.tsx`, `src/components/home/TrendingDestinations.tsx`
- Tests: `tests/catalog-query.test.ts` (9 test cases)
- Commits: `0476330`, `abedd20`
