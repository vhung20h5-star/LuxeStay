# Thiết kế Đào sâu Kiến trúc (Ứng viên #2): Stay Catalog Query Module

**Ngày tạo:** 2026-11-21  
**Dự án:** LuxeStay (`travel-service`)  
**Tham chiếu từ vựng:** [GLOSSARY.md](file:///d:/Tutorial-Vibe%20Coding/travel-service/GLOSSARY.md) & [.agents/skills/codebase-design/SKILL.md](file:///d:/Tutorial-Vibe%20Coding/travel-service/.agents/skills/codebase-design/SKILL.md)  
**Trạng thái:** Chờ phê duyệt thiết kế

---

## 1. Mục tiêu & Lý do (Intent & Why)

Luồng tìm kiếm, lọc và sắp xếp danh mục chỗ nghỉ hiện tại bị phân mảnh qua 6 tệp (`types/index.ts`, `BookingContext.tsx`, `SearchBar.tsx`, `CategoryBar.tsx`, `FilterModal.tsx`, `PropertyList.tsx`), tạo ra 6 vấn đề thực tế do thiếu **locality**:
1. `PropertyList.tsx` giữ `sortBy` trong `useState` cục bộ tách khỏi `FilterState.sortBy` → bấm `"Xóa tất cả bộ lọc"` không đặt lại thứ tự sắp xếp.
2. `BookingContext.tsx` giữ song song `activeCategory` và `filterState.category`, còn `SearchCriteria.propertyType` và `FilterState.instantBookingOnly` là 2 trường chết chưa bao giờ được đọc.
3. `FilterModal.tsx` và `CategoryBar.tsx` hiển thị/đếm `minPrice`, nhưng `PropertyList.tsx` hoàn toàn bỏ qua `minPrice`.
4. Tìm kiếm điểm đến ở `PropertyList.tsx` dùng `.toLowerCase()` thô nên gõ không dấu (`"da lat"`, `"phu quoc"`) trả về 0 kết quả; đồng thời `SearchBar.tsx` chỉ cho chọn dropdown (chưa gõ tự do) và nút **Xu hướng tìm** dùng `tag.split(" ")[0]` biến cả `"Đà Lạt săn mây"` lẫn `"Đà Nẵng gần biển"` thành `"Đà"`.
5. `SearchBar.tsx` giữ `activeTab` cục bộ không đồng bộ với `FilterModal`/`resetFilters`, thiếu tab **Resort**, và chứa lỗi HTML `<button>` lồng trong `<button>` tại nút xóa điểm đến.
6. Toàn bộ thuật toán lọc, sắp xếp và đếm badge bộ lọc nằm trong `useMemo`/JSX nên có **0 unit tests**.

Đợt đào sâu này gom toàn bộ trạng thái truy vấn, luật lọc tiếng Việt không dấu, lọc khoảng giá `minPrice..maxPrice`, sắp xếp, đếm badge, thẻ gỡ nhanh (`ActiveFilterChip`) và các bộ gợi ý tìm nhanh (`QUICK_SEARCH_TRENDS`) vào một **deep module** thuần `in-process`: `src/lib/catalogQuery.ts`.

### Mục tiêu (Goals)
- Gom `searchCriteria`, `filterState`, `activeCategory`, `sortBy`, `activeTab` vào một trạng thái duy nhất `StayCatalogQueryState` (xóa bỏ trường chết `SearchCriteria.propertyType` và `FilterState.instantBookingOnly`).
- Chuyển hàm dùng chung `normalizeVietnamese` sang `src/lib/utils.ts` (re-export từ `src/lib/amenities.ts` để giữ nguyên tương thích) nhằm dùng nhất quán cho cả tìm kiếm chỗ nghỉ lẫn tìm kiếm tiện ích.
- Nâng cấp `SearchBar.tsx`:
  - Thêm tab **Resort** và đồng bộ 2 chiều tab loại hình với `catalogQuery.filters.propertyTypes` (bấm tab lọc ngay lập tức, reset khi xóa bộ lọc).
  - Cho phép **vừa gõ tự do** vào ô Điểm đến (lọc không dấu theo tên thành phố, tỉnh, địa chỉ, tên chỗ nghỉ; dropdown lọc gợi ý điểm đến theo chuỗi đang gõ) **vừa bấm chọn** từ danh sách gợi ý; sửa lỗi `<button>` lồng nhau.
  - Thay `tag.split(" ")[0]` bằng `QUICK_SEARCH_TRENDS` có cấu trúc (VD: `"Phú Quốc resort"` áp dụng `destination: "Phú Quốc"` + `propertyType: "resort"`, đồng thời xóa bộ lọc danh mục/loại hình xung đột từ lần bấm trước).
- Nâng cấp `FilterModal.tsx`:
  - Bổ sung 5 nút chọn nhanh khoảng giá (`Tất cả`, `Dưới 1 triệu`, `1 – 2.5 triệu`, `2.5 – 5 triệu`, `Trên 5 triệu`) song song với thanh trượt giá tối đa, cập nhật cả `minPrice` và `maxPrice`.
- Nâng cấp `PropertyList.tsx` & `CategoryBar.tsx`:
  - Đọc trực tiếp kết quả đã lọc/sắp xếp (`items`), `activeFilterCount`, `activeChips` và `sortBy` từ `BookingContext` (được tính bởi `executeCatalogQuery`).
  - Hiển thị hàng chip **"Đang lọc"** gọn phía trên lưới chỗ nghỉ cho phép gỡ nhanh từng tiêu chí hoặc bấm `"Xóa tất cả"`.
- Giữ nguyên tương thích giữa `searchCriteria` (trong `catalogQuery.search`) và Phase 1 (`BookingSession` seeding).

### Không thuộc phạm vi (Non-goals)
- Không đồng bộ query lên URL query string (`?city=...`) hay xây API tìm kiếm server-side.
- Không thay đổi cấu trúc 12 chỗ nghỉ trong `src/data/properties.ts` (phạm vi Ứng viên #3).

---

## 2. Phương án Kiến trúc (`in-process` Deep Module)

**Nhóm phụ thuộc (`codebase-design/DEEPENING.md`):** 100% **`In-process`** — toàn bộ lọc, chuẩn hóa chuỗi tiếng Việt, sắp xếp, đếm bộ lọc và chuyển đổi truy vấn đều là tính toán thuần trong bộ nhớ, không có I/O hay adapter suy đoán.

### Interface đề xuất của `src/lib/catalogQuery.ts`

```ts
export const DEFAULT_MIN_PRICE = 0;
export const DEFAULT_MAX_PRICE = 10000000;

export interface PriceRangePreset {
  id: string;
  label: string;
  minPrice: number;
  maxPrice: number;
}

export interface QuickSearchTrend {
  id: string;
  label: string;
  destination: string;
  category?: CategoryId;
  propertyType?: PropertyType;
}

export interface StayCatalogQueryState {
  search: SearchCriteria;
  filters: FilterState;
}

export type ActiveFilterChipKind =
  | "destination"
  | "category"
  | "price"
  | "propertyType"
  | "rating"
  | "amenity"
  | "freeCancellation";

export interface ActiveFilterChip {
  id: string;
  kind: ActiveFilterChipKind;
  label: string;
  value?: string;
}

export interface CatalogQueryResult {
  items: Property[];
  totalCount: number;
  activeFilterCount: number;
  activeChips: ActiveFilterChip[];
  activePropertyTypeTab: PropertyType | "all";
}
```

### Các điểm vào (Entry Points)
- **Hằng số chuẩn:** `PRICE_RANGE_PRESETS` (5 mức), `QUICK_SEARCH_TRENDS` (5 xu hướng).
- **Quản lý trạng thái truy vấn:**
  - `createDefaultCatalogQuery(): StayCatalogQueryState`
  - `setQueryDestination(state, destination)`
  - `setQueryDates(state, { checkIn?, checkOut? })`
  - `adjustQueryGuests(state, field: "adults" | "children" | "rooms", delta)`
  - `setQueryCategory(state, category)`
  - `setQueryPropertyTypeTab(state, tab: PropertyType | "all")` (tab `"all"` xóa `propertyTypes`; tab cụ thể đặt `propertyTypes: [tab]`)
  - `toggleQueryPropertyType(state, type)`
  - `setQueryPriceRange(state, minPrice, maxPrice)` (tự bảo đảm `0 <= minPrice <= maxPrice <= DEFAULT_MAX_PRICE`)
  - `setQueryMinRating(state, minRating)`
  - `toggleQueryAmenity(state, amenity)`
  - `setQueryFreeCancellation(state, enabled)`
  - `setQuerySortBy(state, sortBy)`
  - `applyQuickSearchTrend(state, trend: QuickSearchTrend)` (đặt `destination`, áp dụng `category`/`propertyType` của trend và reset bộ lọc xung đột từ trend trước)
  - `removeActiveFilterChip(state, chip: ActiveFilterChip)` (gỡ chính xác từng tiêu chí)
- **Thực thi truy vấn (Single Projection):**
  - `executeCatalogQuery(properties: Property[], query: StayCatalogQueryState): CatalogQueryResult`
    - Lọc `category`, `destination` (so khớp không dấu trên `city`, `province`, `address`, `title`, `subtitle`), `totalGuests <= prop.maxGuests`, `propertyTypes`, `prop.pricePerNight >= minPrice && prop.pricePerNight <= maxPrice`, `rating >= minRating`, `freeCancellationOnly`, `propertyHasAmenityFilters`.
    - Sắp xếp theo `sortBy` (`popular`, `price-asc`, `price-desc`, `rating-desc`) có tie-breaker ổn định.
    - Tính `activeFilterCount` (đồng nhất cho badge `CategoryBar`), `activeChips` (cho `PropertyList`), và `activePropertyTypeTab` (đồng bộ 2 chiều với tab `SearchBar`: chỉ sáng tab cụ thể khi `propertyTypes.length === 1`, ngược lại là `"all"`).

---

## 3. Tác động lên các Module xung quanh

- **`src/lib/utils.ts` & `src/lib/amenities.ts`:** Đặt `normalizeVietnamese` ở `src/lib/utils.ts` và re-export tại `src/lib/amenities.ts`.
- **`src/types/index.ts`:** Bỏ 2 trường chết `SearchCriteria.propertyType` và `FilterState.instantBookingOnly`; bổ sung các type của `StayCatalogQuery`.
- **`src/context/BookingContext.tsx`:** Thay `searchCriteria` + `filterState` + `activeCategory` bằng 1 state `catalogQuery` + `catalogResult` dẫn xuất từ `executeCatalogQuery(PROPERTIES, catalogQuery)`; giữ bí danh tương thích `searchCriteria`, `filterState`, `activeCategory`, `setSearchCriteria`, `setFilterState`, `setActiveCategory`, `resetFilters` và bổ sung các lệnh gọn (`applyQuickTrend`, `selectPropertyTypeTab`, `setSortBy`, `removeFilterChip`, `setPriceRange`, ...).
- **`src/components/home/SearchBar.tsx`:** Thêm tab `Resort`, đồng bộ với `catalogResult.activePropertyTypeTab`, biến ô điểm đến thành input gõ được (kèm lọc gợi ý không dấu trong dropdown, sửa `<button>` lồng nhau), dùng `QUICK_SEARCH_TRENDS`.
- **`src/components/home/CategoryBar.tsx`:** Xóa khối đếm `activeFilterCount` thủ công, đọc thẳng `catalogResult.activeFilterCount`.
- **`src/components/home/FilterModal.tsx`:** Thêm 5 nút chọn nhanh `PRICE_RANGE_PRESETS` + thanh trượt `maxPrice` (đồng bộ khi chọn mốc "Trên 5 triệu" hoặc kéo thanh trượt) dùng `setPriceRange`.
- **`src/components/home/PropertyList.tsx`:** Xóa `useState(sortBy)` cục bộ và toàn bộ `useMemo` lọc/sắp xếp nội tuyến; đọc trực tiếp `catalogResult.items`, `catalogQuery.filters.sortBy`, và hiển thị hàng `catalogResult.activeChips` cho phép gỡ nhanh từng tiêu chí.
- **`src/components/home/TrendingDestinations.tsx`:** Dùng `setDestination` gọn (đặt điểm đến và xóa `category`/`propertyTypes` xung đột hay giữ? Giữ bộ lọc khác và chỉ đặt `destination` giống hành vi hiện tại).
