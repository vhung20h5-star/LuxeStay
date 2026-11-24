# Frontend Workspace Rules — `@luxestay/web` (`apps/web`)

Tệp này bổ sung quy tắc cục bộ cho ứng dụng Frontend **Next.js 16 (App Router)**, hoạt động song song với quy tắc chung ở root (`.agents/rules/AGENTS.md`, `GLOSSARY.md`, `docs/`).

---

## 1. Cấu trúc & Ranh giới Module (Feature-Based Architecture)

- `src/app/` — Next.js App Router (`layout.tsx`, `error.tsx`, `global-error.tsx`, `not-found.tsx`, `(main)/layout.tsx`, `(main)/page.tsx`). Route mới dùng chung vỏ ứng dụng đặt trong `(main)/`.
- `src/features/<domain>/` — Đối xứng 1–1 với Backend (`catalog`, `property`, `booking`, `favorites`, `auth`). Mỗi feature chỉ chứa UI component và React context/hook của miền đó.
- `src/shared/` — Hạ tầng dùng chung cho Frontend:
  - `ui/` — Primitive tái sử dụng (`Badge`, `Button`, `Input`, `Modal`; ưu tiên Shadcn/ui khi mở rộng component phức tạp).
  - `layout/` — `Navbar`, `Footer`.
  - `overlay/` — `OverlayContext` & `overlayStack` (điều phối ngăn xếp lớp phủ).
  - `ports/` — Mọi giao tiếp HTTP/Browser I/O (`CatalogRepository`, `ReservationSubmitter`, `FavoritesRepository`, `HttpApiError`).
  - `config/env.ts` — Đọc và validate biến môi trường bằng Zod.
  - `utils/cn.ts` — Helper className (`clsx` + `tailwind-merge`).

### Ranh giới Import Bắt buộc (được khóa bằng ESLint)
- **CẤM** import từ `@luxestay/api`, `hono` hoặc `apps/api/**` — mọi giao tiếp với Backend đi qua HTTP sử dụng schema & endpoint từ `@luxestay/contracts`.
- **CẤM** import `@luxestay/domain/seed` bên trong `src/features/**` hoặc `src/app/**` — chỉ `src/shared/ports/**` được phép đọc seed cho chế độ `NEXT_PUBLIC_DATA_MODE=mock`.
- Logic nghiệp vụ thuần (lọc, tính giá, chuẩn hóa tiếng Việt, tiện ích) **phải nằm ở `@luxestay/domain`**, không viết lặp trong JSX.

---

## 2. Quy tắc Đồng bộ Dữ liệu, Lỗi & SSR

1. **Chế độ dữ liệu tường minh (`NEXT_PUBLIC_DATA_MODE=api|mock`):**
   - Ở `api` mode, **tuyệt đối không âm thầm fallback sang mock** khi gặp lỗi `4xx`/`5xx` hoặc mất kết nối — phải ném và hiển thị `HttpApiError` trung thực.
   - Mọi phản hồi HTTP từ `apps/api` phải được xác thực runtime bằng Zod schema từ `@luxestay/contracts`.
2. **An toàn SSR & Hydration:**
   - Không đọc trực tiếp `window.localStorage` trong render hoặc `useState` initializer; luôn đi qua `FavoritesRepository` với `useSyncExternalStore`.
   - Các layout/route gọi `loadInitialCatalog()` ở `api` mode phải khai báo `export const dynamic = "force-dynamic"` để `next build` không phụ thuộc API runtime.
3. **Chia tách Domain Context:**
   - Component chỉ được subscribe hook đúng miền (`useCatalog`, `useFavorites`, `useBookingSession`) để tránh re-render chéo; chỉ dùng `useBooking()` khi thực sự cần cả 3 miền.
   - Khi thêm miền độc lập mới (như `Auth`), tạo context riêng trong `src/features/<domain>/` thay vì phình to `BookingContext.tsx`.

---

## 3. Quy tắc Overlay, Trợ năng & Thiết kế UI

- Mọi modal/drawer mới **bắt buộc** đi qua `<Modal />` hoặc `useOverlayLayer({ id, kind, isOpen, onClose, tier })` (`tier = 0` cho lớp nền, `tier = 1` cho modal lồng).
- **CẤM** tự gắn `window.addEventListener("keydown")` cho phím `Escape` hoặc tự gán `document.body.style.overflow` trong component UI.
- Đảm bảo `role="dialog"`, `aria-modal="true"`, `aria-label`, giao diện tiếng Việt (`vi-VN`, đơn vị `VNĐ`), Tailwind CSS v4 (không tạo lại `tailwind.config.mjs`).

---

## 4. Kiểm chứng cục bộ trước khi hoàn tất

```bash
npm run lint --workspace=@luxestay/web
npm run typecheck --workspace=@luxestay/web
npm run test --workspace=@luxestay/web
npm run build --workspace=@luxestay/web
```
