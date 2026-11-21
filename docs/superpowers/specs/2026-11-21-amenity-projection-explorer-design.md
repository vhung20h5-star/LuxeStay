# Thiết kế Đào sâu Kiến trúc (Ứng viên #3): Amenity Projection & Explorer Module

**Ngày tạo:** 2026-11-21  
**Dự án:** LuxeStay (`travel-service`)  
**Tham chiếu từ vựng:** [GLOSSARY.md](file:///d:/Tutorial-Vibe%20Coding/travel-service/GLOSSARY.md) & [.agents/skills/codebase-design/SKILL.md](file:///d:/Tutorial-Vibe%20Coding/travel-service/.agents/skills/codebase-design/SKILL.md)  
**Trạng thái:** Đã hoàn thành (đã kiểm chứng và xử lý toàn bộ phát hiện review)

---

## 1. Mục tiêu & Lý do (Intent & Why)

Dù tiện ích khu nghỉ dưỡng đã có danh mục chuẩn tại `src/data/amenities.ts`, phần xử lý và trình diễn hiện bị chia nhỏ thành nhiều hàm **shallow** trong `src/lib/amenities.ts` và rải rác qua 6 module UI cùng 2 module nghiệp vụ, tạo ra 4 điểm ma sát kiến trúc rõ rệt:

1. **Schema & dữ liệu cũ đã chết nhưng vẫn tồn tại song song:** `export interface Amenity` (`src/types/index.ts`) và `Property.amenities: string[]` (trên toàn bộ 12 chỗ nghỉ trong `src/data/properties.ts`) hiện có **0 caller** đọc tới, nhưng vẫn song hành cùng `Property.resortAmenities`, gây rủi ro lệch dữ liệu về sau.
2. **Giải nghĩa lặp lại không có bộ nhớ đệm (repeated re-resolution):**
   - `PropertyCard.tsx` gọi `resolvePropertyAmenities(property)` rồi `getCardHighlightCategories(...)` ở mọi lần render của từng thẻ.
   - `catalogQuery.ts` gọi `propertyHasAmenityFilters(...)` giải nghĩa lại toàn bộ tiện ích và dựng lại `Set` cho từng chỗ nghỉ ở mỗi lần đổi từ khóa hoặc kéo thanh giá.
   - `bookingSession.ts` giải nghĩa lại danh sách tiện ích mỗi khi bật/tắt tiện ích hoặc tính báo giá.
   - `src/lib/amenities.ts` vẫn giữ re-export shim `normalizeVietnamese` sau khi hàm này đã chuyển sang `src/lib/utils.ts` ở Phase 2.
3. **Orchestration phức tạp bị rò rỉ vào `PropertyAmenitiesModal.tsx`:** Modal phải tự lắp ghép **7 khối `useMemo` thủ công** (`resolvedAmenities`, `availableCategories`, `selectedAmenityIds`, `selectedTotalFee`, `filteredAmenities`, `groupedFiltered`, `effectiveActiveAmenity`, `categoryLabelMap`) và danh sách `feeFilterOptions`, đồng thời chưa kiểm tra tính hợp lệ khi nhận `initialAmenityId` hoặc `initialCategory` không tồn tại trên chỗ nghỉ.
4. **Nhân bản 5 nơi logic hiển thị `pricingType`:** `PropertyModal.tsx`, `PropertyAmenitiesModal.tsx`, `AmenityDetailPanel.tsx`, `BookingCheckoutModal.tsx`, và `BookingSuccessModal.tsx` mỗi nơi tự viết chuỗi điều kiện `included | free-reservation | paid` cho nhãn giá, trạng thái đặt trước, phụ phí và câu lệnh hành động — đổi một câu chữ hiển thị phải rà sửa 5 tệp.

Đợt đào sâu này tái cấu trúc `src/lib/amenities.ts` thành một **deep module** thuần `in-process` sở hữu trọn vẹn **Property Amenity Projection** (có cache `WeakMap`), **Amenity Explorer** (trạng thái + dẫn xuất view model đầy đủ) và **Amenity Pricing Descriptor** (nguồn chân lý duy nhất cho nhãn & ngữ nghĩa hiển thị giá tiện ích), đồng thời xóa sạch dữ liệu/kiểu cũ đã chết.

### Mục tiêu (Goals)
- Xóa hoàn toàn `export interface Amenity` và `Property.amenities: string[]` khỏi `src/types/index.ts` và 12 chỗ nghỉ trong `src/data/properties.ts`, đưa `Property.resortAmenities` thành nguồn chân lý duy nhất.
- Xóa re-export shim `normalizeVietnamese` khỏi `src/lib/amenities.ts` (mọi caller dùng trực tiếp `@/lib/utils`).
- Thu gọn 8 hàm shallow rời rạc của `src/lib/amenities.ts` về **3 cụm interface sâu**:
  1. **Projection có cache `WeakMap`:** `projectPropertyAmenities(property)` + `propertyHasAmenityFilters(property, requiredFilters)` + `getAmenityCategoryLabel(categoryId)`.
  2. **Amenity Explorer:** `createAmenityExplorerState`, `reduceAmenityExplorerState`, `deriveAmenityExplorerView` — thay toàn bộ 7 khối `useMemo` trong `PropertyAmenitiesModal.tsx` bằng 1 lời gọi dẫn xuất thuần, có kiểm tra hợp lệ `initialAmenityId`/`initialCategory` và tối ưu `selectedAmenityIds` bằng `ReadonlySet<string>`.
  3. **Canonical Pricing Descriptors:** `describeAmenityPricing(amenity)`, `describeSelectedAmenity(selected)`, `formatAmenitiesFeeSummary(totalFee, style?)` — dùng thống nhất tại tất cả 5 module UI mà không rò rỉ class CSS vào `src/lib/`.
- Cập nhật `bookingSession.ts` và `catalogQuery.ts` dùng projection đã cache (tra cứu `byId` và `filterKeys` trong $O(1)$).
- Giữ nguyên 100% giao diện, bố cục và trải nghiệm tương tác hiện tại cho người dùng.

### Không thuộc phạm vi (Non-goals)
- Không thay đổi nội dung danh mục 51 tiện ích tại `src/data/amenities.ts` hay danh sách `resortAmenities` của 12 chỗ nghỉ.
- Không tách quản lý ngăn xếp modal (`Overlay Stack` — phạm vi Ứng viên #4) hay tầng lưu trữ yêu thích (`Persistence` — phạm vi Ứng viên #5).

---

## 2. Phương án Kiến trúc (`in-process` Deep Module)

**Nhóm phụ thuộc (`codebase-design/DEEPENING.md`):** 100% **`In-process`** — toàn bộ projection, bộ lọc tiếng Việt không dấu, state machine của Explorer và chuẩn hóa nhãn hiển thị giá đều là tính toán thuần trong bộ nhớ, không có I/O hay adapter suy đoán.

### Interface đề xuất của `src/lib/amenities.ts`

```ts
export type AmenityFeeFilter = "all" | "free" | "paid" | "selected";

export interface AmenityCategoryGroup {
  category: AmenityCategoryMeta;
  items: ResolvedPropertyAmenity[];
}

export interface AmenityCategorySummary {
  category: AmenityCategoryMeta;
  count: number;
}

export interface PropertyAmenityProjection {
  all: readonly ResolvedPropertyAmenity[];
  totalCount: number;
  byId: ReadonlyMap<string, ResolvedPropertyAmenity>;
  groups: readonly AmenityCategoryGroup[];
  categories: readonly AmenityCategorySummary[];
  cardHighlights: readonly AmenityCategoryMeta[];   // tối đa 3 nhóm ưu tiên cho PropertyCard
  featured: readonly ResolvedPropertyAmenity[];     // tối đa 6 tiện ích nổi bật cho PropertyModal
  filterKeys: ReadonlySet<AmenityFilterKey>;
}

export interface AmenityExplorerState {
  activeCategory: AmenityCategoryId | "all";
  searchQuery: string;
  feeFilter: AmenityFeeFilter;
  activeAmenityId: string | null;
  mobileShowDetail: boolean;
}

export type AmenityExplorerAction =
  | { type: "SET_CATEGORY"; category: AmenityCategoryId | "all" }
  | { type: "SET_SEARCH"; query: string }
  | { type: "SET_FEE_FILTER"; feeFilter: AmenityFeeFilter }
  | { type: "SELECT_AMENITY"; amenityId: string }
  | { type: "BACK_TO_LIST" }
  | { type: "RESET_FILTERS" };

export interface AmenityFeeFilterOption {
  id: AmenityFeeFilter;
  label: string;
}

export interface AmenityExplorerView {
  totalCount: number;
  availableCategories: readonly AmenityCategorySummary[];
  feeFilterOptions: AmenityFeeFilterOption[];
  filteredItems: ResolvedPropertyAmenity[];
  groupedItems: AmenityCategoryGroup[];
  effectiveActiveAmenity: ResolvedPropertyAmenity | null;
  activeCategoryLabel: string;
  mobileShowDetail: boolean;
  selectedAmenityIds: ReadonlySet<string>;
  selectedCount: number;
  selectedTotalFee: number;
  isEmpty: boolean;
}

export type AmenityPricingTone = AmenityPricingType;

export interface AmenityPricingDescriptor {
  tone: AmenityPricingTone;
  isSelectable: boolean;
  compactBadge: string;        // "+550.000đ" | "Miễn phí • Đặt trước" | "Miễn phí"
  heroBadge: string;           // "+550.000đ" | "Miễn phí • Cần đặt trước" | "Miễn phí"
  detailPrice: string;         // "550.000đ / suất" | "Miễn phí (0đ)" | "Miễn phí • Bao gồm sẵn"
  detailStatus: string;        // "Dịch vụ chọn thêm (cộng vào đơn)" | "Khuyến nghị đăng ký trước" | "Sử dụng tự do trong kỳ nghỉ"
  includedNotice: string;      // thông báo cho nhóm included
  selectActionLabel: string;   // nhãn nút thêm/đăng ký (rỗng nếu included)
  selectedActionLabel: string; // nhãn nút đã chọn/bấm để gỡ (rỗng nếu included)
}

export interface SelectedAmenityDisplay {
  tone: "free-reservation" | "paid";
  subtitle: string;            // priceUnit ?? "Gói dịch vụ theo kỳ nghỉ" | "Miễn phí • Đăng ký giữ chỗ trước"
  compactFee: string;          // "+550.000đ" | "0đ • Đặt trước"
  checkoutFee: string;         // "+550.000đ" | "0đ"
  confirmedFee: string;        // "+550.000đ" | "Miễn phí • Đã đăng ký"
}
```

### Các điểm vào (Entry Points) & Bất biến (Invariants)

1. **`projectPropertyAmenities(property: Pick<Property, "resortAmenities">): PropertyAmenityProjection`**
   - Cache theo tham chiếu mảng `property.resortAmenities` bằng `WeakMap<readonly PropertyAmenityOverride[], PropertyAmenityProjection>`. Nếu truyền cùng tham chiếu `resortAmenities` (kể cả qua object clone `{ ...property }`), trả ngay kết quả đã cache; nếu truyền mảng mới (như fixture trong test), tính mới độc lập.
   - Bỏ qua `amenityId` không tồn tại trong `AMENITY_CATALOG`.
   - Khi override hạ `pricingType` từ `paid` xuống `free-reservation` hoặc `included`, luôn xóa sạch `price` và `priceUnit` kế thừa từ catalog.
   - Luôn bảo toàn thứ tự ưu tiên 7 nhóm trong `AMENITY_CATEGORIES` và ẩn mọi nhóm có 0 tiện ích.
2. **`propertyHasAmenityFilters(property, requiredFilters): boolean`**
   - Dùng trực tiếp `projectPropertyAmenities(property).filterKeys` để kiểm tra phép `AND` trên `requiredFilters` mà không dựng lại danh sách hay `Set`.
3. **`getAmenityCategoryLabel(categoryId: AmenityCategoryId): string`**
   - Tra cứu $O(1)$ từ bảng hằng cấp module (fallback `"Tiện ích"`).
4. **`createAmenityExplorerState({ projection, initialAmenityId?, initialCategory? }): AmenityExplorerState`**
   - Chỉ kích hoạt `mobileShowDetail: true` khi `initialAmenityId` tồn tại trong `projection.byId`; ngược lại fallback về `projection.all[0]?.id ?? null` với `mobileShowDetail: false`.
   - Chỉ nhận `initialCategory` nếu là `"all"` hoặc thuộc `projection.categories`; ngược lại fallback về `"all"`.
5. **`reduceAmenityExplorerState(state, action): AmenityExplorerState`**
   - Giữ bất biến mobile: mọi thao tác `SET_CATEGORY`, `SET_SEARCH`, `SET_FEE_FILTER`, `BACK_TO_LIST`, `RESET_FILTERS` đều đưa `mobileShowDetail` về `false`; riêng `SELECT_AMENITY` mở `mobileShowDetail: true`.
6. **`deriveAmenityExplorerView(projection, state, selectedAmenities): AmenityExplorerView`**
   - Lọc theo `activeCategory`, `feeFilter` (`all`, `free` gồm cả `included` + `free-reservation`, `paid`, `selected`), và `searchQuery` không dấu qua `normalizeVietnamese` từ `@/lib/utils`.
   - Tự động fallback `effectiveActiveAmenity` về mục hiển thị đầu tiên khi mục đang xem bị lọc ẩn (hoặc `null` khi `isEmpty === true`).
   - Tính `selectedTotalFee` nhất quán với `BookingSession` (chỉ cộng mục `pricingType === "paid"`).
7. **`describeAmenityPricing(amenity)`, `describeSelectedAmenity(selected)`, `formatAmenitiesFeeSummary(totalFee, style?)`**
   - Nguồn chân lý duy nhất cho toàn bộ nhãn giá/trạng thái/hành động theo `pricingType`; các module UI chỉ ánh xạ `tone` sang màu Tailwind tương ứng.

---

## 3. Tác động lên các Module xung quanh

- **`GLOSSARY.md`:** Bổ sung 3 thuật ngữ miền: `Property Amenity Projection`, `Amenity Explorer`, và `Amenity Pricing Descriptor`.
- **`src/types/index.ts`:** Xóa `export interface Amenity` và trường `Property.amenities: string[]`; bổ sung các kiểu dữ liệu của `PropertyAmenityProjection`, `AmenityExplorer*`, `AmenityPricingDescriptor`, `SelectedAmenityDisplay`.
- **`src/data/properties.ts`:** Xóa trường `amenities: [...]` cũ khỏi toàn bộ 12 chỗ nghỉ, giữ nguyên `resortAmenities`.
- **`src/lib/amenities.ts`:** Tái cấu trúc sâu theo interface mới ở Mục 2, bỏ re-export shim `normalizeVietnamese`.
- **`src/lib/bookingSession.ts`:** Đọc `projectPropertyAmenities(property).byId.get(amenityId)` trong `toggleSessionAmenity` và `projectPropertyAmenities(property).all` trong `deriveBookingQuote`.
- **`src/lib/catalogQuery.ts`:** Giữ lời gọi `propertyHasAmenityFilters(prop, filters.amenities)` — tự động hưởng lợi $O(1)$ từ `WeakMap` cache.
- **`src/components/home/PropertyCard.tsx`:** Thay 2 lời gọi rời bằng `const { totalCount, cardHighlights } = projectPropertyAmenities(property)`.
- **`src/components/property/PropertyModal.tsx`:** Dùng `projectPropertyAmenities(property)` cho `totalCount`, `categories`, `featured`; dùng `describeAmenityPricing`, `describeSelectedAmenity` và `formatAmenitiesFeeSummary` cho thẻ nổi bật, danh sách đã chọn và dòng tổng phụ phí.
- **`src/components/property/PropertyAmenitiesModal.tsx`:** Bỏ toàn bộ 7 khối `useMemo` rời, bỏ import `AMENITY_CATEGORIES`, dùng `projectPropertyAmenities`, `createAmenityExplorerState`, `reduceAmenityExplorerState`, `deriveAmenityExplorerView`, `describeAmenityPricing` và `formatAmenitiesFeeSummary(..., "parenthesized")`.
- **`src/components/property/AmenityDetailPanel.tsx`:** Dùng `describeAmenityPricing(amenity)` thay toàn bộ 3 khối nhánh `isPaid / isFreeReservation / isIncluded` trùng lặp.
- **`src/components/booking/BookingCheckoutModal.tsx` & `BookingSuccessModal.tsx`:** Dùng `describeSelectedAmenity(item)` và `formatAmenitiesFeeSummary(pricing.amenitiesFee)`.
- **Kiểm thử ("Replace, don't layer"):**
  - `tests/amenities.test.ts`: Viết lại kiểm thử xuyên suốt qua interface sâu (projection + cache `WeakMap`, `propertyHasAmenityFilters`, full `AmenityExplorer` state + view derivation + invalid init fallback, và canonical pricing descriptors); import `normalizeVietnamese` trực tiếp từ `@/lib/utils`.
  - `tests/properties-amenities.test.ts`: Chuyển sang kiểm thử qua `projectPropertyAmenities` và khẳng định không còn chỗ nghỉ nào giữ trường `amenities` cũ.
