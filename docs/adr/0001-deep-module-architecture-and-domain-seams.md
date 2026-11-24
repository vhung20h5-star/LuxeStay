# ADR-0001: Kiến trúc Deep Modules thuần trong `src/lib` & Seams tường minh

- **Status:** Accepted
- **Date:** 2026-11-21
- **Deciders:** Engineering Team (`travel-service`)
- **Related Docs:** [ARCHITECTURE](../ARCHITECTURE.md) | [GLOSSARY](../../GLOSSARY.md) | [codebase-design](../../.agents/skills/codebase-design/SKILL.md)
- **Supersedes / Superseded by:** None

---

## 1. Context (Bối cảnh & Vấn đề)

Ở phiên bản MVP đầu tiên (`9c20f2a` và `96a3216`), phần lớn logic nghiệp vụ của LuxeStay (lọc/sắp xếp chỗ nghỉ, tính báo giá đặt phòng, lọc tiện ích, khóa cuộn modal, đọc/ghi `localStorage`) bị phân tán trực tiếp trong các React component (`PropertyList.tsx`, `SearchBar.tsx`, `PropertyModal.tsx`, `PropertyAmenitiesModal.tsx`, `BookingCheckoutModal.tsx`) và một React Context phẳng (`BookingContext.tsx`).

Cách tổ chức "shallow modules + logic trong JSX" gây ra nhiều vấn đề thực tế:
- Lệch hành vi giữa các màn hình (ví dụ `PropertyModal` và `BookingCheckoutModal` tự lắp lại chuỗi tính giá; 5 màn hình tự viết chuỗi nhãn giá tiện ích).
- Không thể viết unit test nhanh cho logic cốt lõi nếu không dựng React/DOM test runner nặng.
- Khó thay đổi nguồn dữ liệu (từ `localStorage`/mock sang API/Database) do side-effect trộn lẫn với logic tính toán.

---

## 2. Decision Drivers (Tiêu chí quyết định)

- **Depth & Leverage:** Ít hàm/kiểu ở interface nhưng gánh toàn bộ hành vi và bất biến bên trong.
- **Locality:** Sửa một quy tắc nghiệp vụ chỉ chạm đúng một module, không phải dò nhiều component.
- **Testability:** Kiểm thử chạy tức thì qua public interface trên Node.js thuần (`node:test`) không phụ thuộc trình duyệt.
- **Seam Discipline:** Chỉ mở seam tại nơi thực sự có từ 2 adapter trở lên (ví dụ Browser/HTTP vs InMemory); không tạo abstraction suy đoán.

---

## 3. Considered Options (Các phương án đã cân nhắc)

1. **Option A (Đã chọn) — Pure In-process Deep Modules (`src/lib/*`) + Thin React Context Hosts (`src/context/*`) + Explicit I/O Seams (`src/lib/persistencePort.ts`):**
   - Toàn bộ state machine, query, projection, pricing và validation là hàm thuần TypeScript trong `src/lib/*`.
   - React components chỉ đọc view model / quote dẫn xuất và dispatch hành động.
   - Chạy test trực tiếp trên Node 24 (`--experimental-strip-types`) qua `tests/register-alias.mjs`.
2. **Option B — Đưa toàn bộ state và logic vào thư viện state bên ngoài (Redux Toolkit / Zustand):**
   - Tăng dependency và boilerplate trong khi vẫn cần tách pure domain logic khỏi UI; chưa giải quyết tự động vấn đề tái sử dụng logic tính giá ở server Route Handler (`/api/reservations`).
3. **Option C — Giữ logic trong custom React hooks (`useCatalogQuery`, `useBookingQuote`):**
   - Gắn chặt logic nghiệp vụ vào vòng đời React (`useMemo`/`useEffect`), khiến unit test phải dùng Testing Library/JSDOM và không thể gọi trực tiếp từ Next.js Route Handler trên server.

---

## 4. Decision Outcome (Quyết định cuối cùng)

Áp dụng mô hình **Deep Modules thuần + Thin React Hosts + Explicit I/O Seams** cho toàn bộ `travel-service`:
- Mỗi miền nghiệp vụ sở hữu 1 deep module trong `src/lib/`: `bookingSession.ts`, `catalogQuery.ts`, `amenities.ts`, `overlayStack.ts`, `persistencePort.ts`, `utils.ts`.
- Chuẩn hóa từ vựng miền tập trung tại [GLOSSARY.md](../../GLOSSARY.md) và dùng thống nhất trong mã nguồn, tài liệu và bài test.
- Áp dụng chiến lược test **"Replace, don't layer"**: kiểm thử đi qua interface của từng deep module.

---

## 5. Consequences (Hệ quả)

### Positive (Tích cực)
- `51/51` unit/integration tests chạy trong `~260ms` không cần trình duyệt hay JSDOM.
- Logic tính báo giá (`deriveBookingQuote`, `validateCheckoutGuestInput`) dùng lại trực tiếp trên cả Client lẫn Next.js Server Route Handler (`POST /api/reservations`).
- Dễ kiểm soát và mở rộng tính năng mới bằng cả con người lẫn AI coding agent nhờ bản đồ module rõ ràng.

### Negative & Trade-offs (Đánh đổi)
- Cần kỷ luật giữ ranh giới (không viết nhanh logic nghiệp vụ trực tiếp trong JSX).
- React Context và Component cần truyền/gọi hàm từ `src/lib/*` thay vì tự thao tác trực tiếp state thô.

### Risks & Follow-ups (Rủi ro & Hành động tiếp theo)
- Rủi ro trôi kiến trúc khi thêm tính năng gấp → kiểm soát thông qua DoD trong [PLAN.md](../PLAN.md) và bộ quy tắc `codebase-design`.

---

## 6. Validation & References (Kiểm chứng & Tham chiếu)

- Files affected: `src/lib/*`, `src/context/*`, `src/types/index.ts`, `tests/*.test.ts`, `GLOSSARY.md`
- Commits: `61cf2d6`, `0476330`, `dc9d3a7`, `f467d47`, `0f26b7b`, `abedd20`
