# Booking Session, Quote & Checkout Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse fragmented booking draft state, `SearchBar` date/guest seeding, quote pricing derivation, and reservation submission into one deep `BookingSession` module (`src/lib/bookingSession.ts`) with a `ReservationSubmitter` seam (`BrowserReservationAdapter` + `InMemoryReservationAdapter`).

**Architecture:** Replace `src/lib/bookingDraft.ts` and the booking-pricing slice of `src/lib/amenities.ts` with a single pure `in-process` state/quote/validation module `src/lib/bookingSession.ts`, plus a narrow `ReservationSubmitter` seam accepting an `AbortSignal`. `BookingContext` delegates all session transitions and quote derivation to this deep module, leaving `PropertyModal` and `BookingCheckoutModal` as thin callers reading `bookingQuote`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Framer Motion 12, Lucide React 1.16, Node 24 `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-21-booking-session-deepening-design.md`  
**Glossary:** `GLOSSARY.md`

## Global Constraints

- Zero new npm dependencies; all tests run via `node --import ./tests/register-alias.mjs --test tests/*.test.ts`.
- Use `import type` for type-only imports in pure TS modules (`src/lib/*`, `src/data/*`) for Node 24 native type-stripping.
- Strict `codebase-design` vocabulary & "Replace, don't layer": delete `src/lib/bookingDraft.ts` and `tests/booking-draft.test.ts` once replaced by `src/lib/bookingSession.ts` and `tests/booking-session.test.ts`.
- Preserve external caller compatibility on `useBooking()` (`selectedProperty`, `checkoutProperty`, `bookingSuccess`, `setSelectedProperty`, `setCheckoutProperty`, `setBookingSuccess`) so `PropertyCard` and `FavoritesDrawer` keep working without modification.
- Pricing formula unchanged: `nightsTotal = pricePerNight * nights`, `cleaningFee = 150000`, `discount = 100000`, `amenitiesFee = sum(paid selected prices)`, `total = max(0, nightsTotal + cleaningFee + amenitiesFee - discount)`.
- 100% Vietnamese UI copy and validation messages.

## Review Focus

1. **Cross-year & `DD/MM` `SearchBar` seeding:** Presets like `25/12 → 28/12` must seed `nights = 3`, cross-year `30/12 → 02/01` must resolve `checkOut` into the next year (`nights = 3`) rather than collapsing to negative/default `2`, and invalid calendar dates (`2026-02-31`) must fall back safely without rollover. *(Pinned in Task 1)*
2. **Property switch vs same-property handoff invariants:** Reopening or moving to checkout for the same `property.id` preserves `nights`, `guests`, and `selectedAmenityIds`; switching to another property via `openPropertySession` or `startCheckoutSession` clears `selectedAmenityIds`, re-seeds from `searchCriteria`, and clamps `adults` into `[1..property.maxGuests]`. *(Pinned in Task 1)*
3. **Unselectable add-on guard & override pricing accuracy:** Toggling `"included"` or unknown `amenityId` is a no-op; `"free-reservation"` always adds `0đ`; `"paid"` adds its resolved `price`. *(Pinned in Task 1)*
4. **Checkout validation & full post-submit state reset:** Blank `fullName`/`phone` or invalid `email` returns `{ ok: false, error }` without calling `submitter`; successful submit snapshots `BookingDetails` and resets `nights`, `guests`, and `selectedAmenityIds` cleanly for future bookings. *(Pinned in Task 1)*
5. **`AbortSignal` cancellation during mid-submit modal close:** Closing or unmounting `BookingCheckoutModal` during the 1.2s `BrowserReservationAdapter` delay aborts the pending submission so no ghost `BookingSuccessModal` opens and no state leaks. *(Pinned in Tasks 1 & 4)*

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/types/index.ts` | Modify | Add `BookingSessionStep`, `BookingSessionState`, `BookingQuote`, `CheckoutGuestInput`, `ReservationSubmissionRequest`, `ReservationSubmitter`; remove `BookingDraft` after migration. |
| `src/lib/bookingSession.ts` | Create | Deep `BookingSession` module: seeding from `SearchCriteria`, date computation, session transitions, `deriveBookingQuote`, checkout validation, `submitBookingSession`, and `Browser`/`InMemory` adapters. |
| `tests/booking-session.test.ts` | Create | Interface-level tests exercising full open → adjust → quote → validate → submit → abort lifecycle. |
| `src/lib/bookingDraft.ts` | Delete | Absorbed into `src/lib/bookingSession.ts`. |
| `tests/booking-draft.test.ts` | Delete | Replaced by `tests/booking-session.test.ts`. |
| `src/lib/amenities.ts` | Modify | Remove moved booking pricing & add-on selection functions (`CLEANING_FEE`, `SERVICE_DISCOUNT`, `buildSelectedBookingAmenities`, `calculateBookingPricing`); keep amenity projection/explorer pure. |
| `tests/amenities.test.ts` | Modify | Remove moved booking pricing assertion (now covered in `tests/booking-session.test.ts`). |
| `src/context/BookingContext.tsx` | Modify | Hold single `bookingSession` + derived `bookingQuote` + injectable `reservationSubmitter`, keeping compatible `useBooking()` surface. |
| `src/components/property/PropertyModal.tsx` | Modify | Read directly from `bookingQuote`; remove duplicated 5-step quote pipeline; use `proceedToCheckout()` and add stepper `aria-label` + `disabled` states. |
| `src/components/booking/BookingCheckoutModal.tsx` | Modify | Read directly from `bookingQuote`; call `submitCheckout` with `AbortController`; show inline error banner and full guest counts (`adults`, `children`, `rooms`). |
| `src/components/booking/BookingSuccessModal.tsx` | Modify | Render `children` (when `> 0`) and `rooms` alongside `adults` in itinerary grid. |

---

### Task 1: Implement Deep `BookingSession` Module via TDD

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/lib/bookingSession.ts`
- Test: `tests/booking-session.test.ts`

**Interfaces:**
- Consumes: `resolvePropertyAmenities` from `@/lib/amenities`; `Property`, `SearchCriteria`, `BookingDetails`, `ResolvedPropertyAmenity`, `SelectedBookingAmenity` from `@/types`.
- Produces (`src/lib/bookingSession.ts`):
  - `CLEANING_FEE = 150000`, `SERVICE_DISCOUNT = 100000`
  - `createIdleBookingSession(): BookingSessionState`
  - `openPropertySession(current, property, searchCriteria?, fallbackBaseDate?): BookingSessionState`
  - `startCheckoutSession(current, property, searchCriteria?, fallbackBaseDate?): BookingSessionState`
  - `closePreviewSession(current): BookingSessionState`
  - `closeCheckoutSession(current): BookingSessionState`
  - `dismissConfirmedBooking(current): BookingSessionState`
  - `updateSessionNights(current, nights): BookingSessionState`
  - `updateSessionAdults(current, adults): BookingSessionState`
  - `toggleSessionAmenity(current, amenityId): BookingSessionState`
  - `removeSessionAmenity(current, amenityId): BookingSessionState`
  - `deriveBookingQuote(session, fallbackBaseDate?): BookingQuote | null`
  - `validateCheckoutGuestInput(input): { ok: true; value: CheckoutGuestInput } | { ok: false; error: string }`
  - `submitBookingSession(session, input, submitter, options?): Promise<{ ok: true; booking: BookingDetails; nextSession: BookingSessionState } | { ok: false; error: string }>`
  - `createBrowserReservationAdapter(delayMs?): ReservationSubmitter`
  - `createInMemoryReservationAdapter(overrides?): ReservationSubmitter`

- [ ] **Step 1: Write failing interface-level tests in `tests/booking-session.test.ts`**
- [ ] **Step 2: Run test to verify RED** (`node --import ./tests/register-alias.mjs --test tests/booking-session.test.ts`)
- [ ] **Step 3: Add `BookingSession` types to `src/types/index.ts` and implement `src/lib/bookingSession.ts`**
- [ ] **Step 4: Run test to verify GREEN** (`node --import ./tests/register-alias.mjs --test tests/booking-session.test.ts`)

---

### Task 2: Wire `BookingContext` to `BookingSession` & Remove Replaced Shallow Helpers

**Files:**
- Modify: `src/context/BookingContext.tsx`
- Modify: `src/lib/amenities.ts`
- Modify: `src/types/index.ts` (remove obsolete `BookingDraft`)
- Modify: `tests/amenities.test.ts`
- Delete: `src/lib/bookingDraft.ts`
- Delete: `tests/booking-draft.test.ts`

**Interfaces:**
- Consumes: `src/lib/bookingSession.ts`
- Produces: upgraded `BookingProvider` (optional `reservationSubmitter?: ReservationSubmitter` prop) and `useBooking()` exposing `bookingQuote`, `setDraftNights`, `setDraftAdults(adults)`, `toggleBookingAmenity(amenityId)`, `removeBookingAmenity(amenityId)`, `proceedToCheckout()`, `submitCheckout(input, signal)` alongside backward-compatible `selectedProperty`, `checkoutProperty`, `bookingSuccess`, `setSelectedProperty`, `setCheckoutProperty`, `setBookingSuccess`.

- [ ] **Step 1: Update `BookingContext.tsx` to delegate to `src/lib/bookingSession.ts`**
- [ ] **Step 2: Clean `src/lib/amenities.ts`, `tests/amenities.test.ts`, `src/types/index.ts`, and delete `src/lib/bookingDraft.ts` & `tests/booking-draft.test.ts`**
- [ ] **Step 3: Verify unit tests (`tests/*.test.ts`) pass**

---

### Task 3: Simplify `PropertyModal`, `BookingCheckoutModal`, and `BookingSuccessModal`

**Files:**
- Modify: `src/components/property/PropertyModal.tsx`
- Modify: `src/components/booking/BookingCheckoutModal.tsx`
- Modify: `src/components/booking/BookingSuccessModal.tsx`

**Interfaces:**
- Consumes: `bookingQuote`, `setDraftNights`, `setDraftAdults`, `toggleBookingAmenity`, `removeBookingAmenity`, `proceedToCheckout`, `submitCheckout` from `useBooking()`.
- Produces: thin UI callers with zero duplicated quote/pricing/date/clamping pipelines, `AbortController`-safe checkout submission, inline form validation banner, stepper a11y/bounds, and full guest counts (`adults`, `children`, `rooms`).

- [ ] **Step 1: Update `PropertyModal.tsx` to read from `bookingQuote` and add stepper `aria-label` + `disabled` bounds**
- [ ] **Step 2: Update `BookingCheckoutModal.tsx` to read from `bookingQuote`, wire `AbortController` cancellation + inline validation error, and display full guest summary**
- [ ] **Step 3: Update `BookingSuccessModal.tsx` to display `children` (when `> 0`) and `rooms` alongside `adults`**

---

### Task 4: Full Verification Suite, Independent Whole-Branch Review & Branch Finish

- [ ] **Step 1: Run `node --import ./tests/register-alias.mjs --test tests/*.test.ts`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`**
- [ ] **Step 2: Dispatch fresh `pro` code reviewer across all modified/created/deleted files**
- [ ] **Step 3: Execute TDD fix pass for any Critical/Important findings (if any) and clean scratch ledger**
- [ ] **Step 4: Commit on `feat/booking-session-deepening` and present branch finish options**
