# Backend Workspace Rules — `@luxestay/api` (`apps/api`)

Tệp này định nghĩa quy tắc cục bộ cho dịch vụ Backend **Hono (Node.js + TypeScript + Zod)**, hoạt động song song với tài liệu kiến trúc chung (`GLOSSARY.md`, `docs/ARCHITECTURE.md`, `docs/PLAN.md`, `docs/adr/`).

---

## 1. Cấu trúc Modular & Tách lớp

Mỗi phân hệ nghiệp vụ nằm trong `src/modules/<domain>/` (hiện có `health`, `catalog`, `reservations`) theo cấu trúc 3 lớp rõ ràng:
- `routes.ts` — Xử lý HTTP (parse JSON an toàn, validate bằng Zod schema từ `@luxestay/contracts`, map status code & trả response envelope chuẩn). **Không** chứa logic nghiệp vụ hay truy vấn DB trực tiếp.
- `service.ts` — Điều phối use-case, gọi pure domain logic từ `@luxestay/domain` và làm việc với repository seam.
- `repository.ts` — Định nghĩa interface seam (`Api*Repository`) và các adapter lưu trữ (hiện tại là seed/in-memory; Phase 1 bổ sung DB adapter từ `src/db/`).

Các thành phần dùng chung của API:
- `src/app.ts` — Factory `createApiApp(deps?)` cho phép tiêm repository và kiểm thử in-process qua `app.request()` không cần mở cổng TCP.
- `src/index.ts` — Entrypoint `@hono/node-server` đọc cấu hình từ `src/config/env.ts`.
- `src/config/env.ts` — Validate toàn bộ biến môi trường bằng Zod ngay khi khởi động (`PORT`, `CORS_ORIGINS`, `NODE_ENV`, `STORAGE_DRIVER`, `DATABASE_URL`).
- `src/middleware/` — `requestIdMiddleware`, `errorHandler`, `notFoundHandler`.
- `src/db/` — Vị trí chuẩn bị cho tầng cơ sở dữ liệu Phase 1 (`schema/`, `migrations/`, `client.ts`).

### Ranh giới Import Bắt buộc (được khóa bằng ESLint)
- **CẤM** import từ `@luxestay/web`, `react`, `next` hoặc `apps/web/**`.
- **CẤM** import `@luxestay/domain/seed` trong `routes.ts` và `service.ts` — chỉ `repository.ts` và `src/db/**` được phép truy cập dữ liệu seed.

---

## 2. Hợp đồng API, Bảo mật & Toàn vẹn Nghiệp vụ

1. **Contracts-First (`@luxestay/contracts`):**
   - Mọi endpoint mới phải được khai báo path trong `API_ENDPOINTS` và Zod request/response schema trong `@luxestay/contracts` trước khi cài đặt route.
   - Mọi response **bắt buộc** dùng `buildApiSuccess(data, buildMeta(c))` hoặc `buildApiError(code, message, details, buildMeta(c))` với `x-request-id` thống nhất.
   - Đánh phiên bản đường dẫn `/api/v1/*` (ngoại trừ `/health`).
2. **Authoritative Server Calculation:**
   - **Không bao giờ** tin tưởng tổng tiền (`pricing`), giảm giá hay danh sách tiện ích đã tính sẵn từ client. Luôn nhận intent tối giản (`ServerReservationIntent`) và tính lại bằng hàm thuần trong `@luxestay/domain` trên dữ liệu gốc từ repository.
3. **Database Phase 1 Governance:**
   - Trước khi cài đặt ORM (Drizzle / Prisma) hoặc kết nối PostgreSQL vào `src/db/`, bắt buộc tạo **ADR-0008** trong `docs/adr/`.
   - Mọi thay đổi schema DB đi kèm migration có kiểm soát trong `src/db/migrations/` và adapter mới phải thỏa seam `Api*Repository` để giữ nguyên 100% route & integration tests.

---

## 3. Kiểm thử & Kiểm chứng cục bộ

- Mọi endpoint mới phải có integration test in-process trong `tests/` phủ: happy path (khớp Zod schema), JSON hỏng (`400 INVALID_JSON`), validation sai (`400 VALIDATION_ERROR`), không tìm thấy (`404 NOT_FOUND`) và chống giả mạo dữ liệu.

```bash
npm run lint --workspace=@luxestay/api
npm run typecheck --workspace=@luxestay/api
npm run test --workspace=@luxestay/api
npm run build --workspace=@luxestay/api
```
