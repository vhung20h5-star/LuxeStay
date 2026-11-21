# Stay Catalog Query Deepening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all property search, filtering, sorting, active-filter badge counting, removable active filter chips, and quick search trends into one deep `in-process` module (`src/lib/catalogQuery.ts`) consumed by `BookingContext` and all 5 homepage callers.

**Architecture:** Move shared `normalizeVietnamese` to `src/lib/utils.ts` (re-exporting from `src/lib/amenities.ts`), drop dead fields (`SearchCriteria.propertyType`, `FilterState.instantBookingOnly`), and build `src/lib/catalogQuery.ts` as the single source of truth for query state and projection (`executeCatalogQuery`). `BookingContext` replaces 3 separate query states (`searchCriteria`, `filterState`, `activeCategory`) with one `catalogQuery` + derived `catalogResult`, eliminating local `sortBy` in `PropertyList`, local `activeTab` in `SearchBar`, and manual filter counting in `CategoryBar`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Framer Motion 12, Lucide React 1.16, Node 24 `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-21-stay-catalog-query-design.md`  
**Glossary:** `GLOSSARY.md`

## Global Constraints

- Zero new npm dependencies; unit tests run with `node --import ./tests/register-alias.mjs --test tests/*.test.ts`.
- Use `import type` for type-only imports in pure TS modules (`src/lib/*`, `src/data/*`).
- Keep Phase 1 (`BookingSession`) `SearchCriteria` seeding 100% intact.
- 100% Vietnamese UI copy consistent with LuxeStay.
- Fix nested `<button>` inside `<button>` in `SearchBar.tsx`.

## Review Focus

1. **Diacritic-insensitive matching & quick-trend conflict clearing:** Unaccented queries (`"da lat"`, `"phu quoc"`, `"hoi an"`) must match cities/provinces/addresses/titles; every entry in `QUICK_SEARCH_TRENDS` must match >= 1 property; clicking a second trend (e.g. `"Phú Quốc resort"` right after `"Đà Lạt săn mây"`) must clear conflicting `category`/`propertyTypes` from the previous trend instead of producing 0 results. *(Pinned in Task 1)*
2. **`minPrice..maxPrice` bounds & slider/preset reconciliation:** `setQueryPriceRange` must clamp `[0..DEFAULT_MAX_PRICE]` and enforce `minPrice <= maxPrice` (even if `minPrice` was previously set by a preset like `Trên 5 triệu` and the user then drags the max slider below `5 triệu`); filtering must enforce both lower and upper bounds. *(Pinned in Task 1)*
3. **`sortBy` & `activePropertyTypeTab` full reset:** `resetCatalogQuery` must reset `sortBy` back to `"popular"` and `activePropertyTypeTab` to `"all"`; checking 2+ property types in `FilterModal` must show `"all"` on `SearchBar` tabs instead of highlighting a wrong single tab. *(Pinned in Task 1)*
4. **`activeFilterCount` & `removeActiveFilterChip` round-trip:** Every active filter chip emitted by `executeCatalogQuery` must cleanly remove its exact criterion via `removeActiveFilterChip` (leaving sibling filters intact), and `activeFilterCount` must accurately reflect active `FilterModal` criteria. *(Pinned in Task 1)*
5. **Guest capacity filtering & bounds:** `adjustQueryGuests` enforces `adults >= 1`, `children >= 0`, `rooms >= 1`, and filters `prop.maxGuests >= adults + children`. *(Pinned in Task 1)*

---

### Task 1: Move `normalizeVietnamese` & Implement Deep `src/lib/catalogQuery.ts` via TDD
- **Files:** `src/lib/utils.ts`, `src/lib/amenities.ts`, `src/types/index.ts`, `src/lib/catalogQuery.ts`, `tests/catalog-query.test.ts`
- [ ] Step 1: Write failing tests in `tests/catalog-query.test.ts` and verify RED
- [ ] Step 2: Move `normalizeVietnamese` to `src/lib/utils.ts` (re-export in `src/lib/amenities.ts`), clean dead fields & add query types in `src/types/index.ts`, implement `src/lib/catalogQuery.ts`
- [ ] Step 3: Verify GREEN (`tests/catalog-query.test.ts`)

### Task 2: Wire `BookingContext.tsx` to `src/lib/catalogQuery.ts`
- **Files:** `src/context/BookingContext.tsx`
- [ ] Step 1: Replace `searchCriteria`/`filterState`/`activeCategory` states with single `catalogQuery` + derived `catalogResult` while preserving compatible aliases and exposing clean query actions

### Task 3: Upgrade `SearchBar`, `CategoryBar`, `FilterModal`, `PropertyList`, and `TrendingDestinations`
- **Files:** `src/components/home/SearchBar.tsx`, `src/components/home/CategoryBar.tsx`, `src/components/home/FilterModal.tsx`, `src/components/home/PropertyList.tsx`, `src/components/home/TrendingDestinations.tsx`
- [ ] Step 1: Upgrade `SearchBar` (add `Resort` tab synced 2-way with live apply, free-text typeable destination + accent-insensitive dropdown filter, fix nested `<button>`, structured `QUICK_SEARCH_TRENDS`)
- [ ] Step 2: Simplify `CategoryBar` onto `catalogResult.activeFilterCount`
- [ ] Step 3: Upgrade `FilterModal` with 5 `PRICE_RANGE_PRESETS` + synced `maxPrice` slider
- [ ] Step 4: Simplify `PropertyList` onto `catalogResult.items`, `catalogQuery.filters.sortBy`, and removable `activeChips` bar; simplify `TrendingDestinations`

### Task 4: Full Verification, Fresh `pro` Whole-Branch Review & Commit
- [ ] Step 1: Run full `node --test`, `tsc --noEmit`, `npm run lint`, and `npm run build`
- [ ] Step 2: Dispatch fresh `pro` code reviewer, apply TDD fix pass if needed, clean scratch ledger, commit on `feat/stay-catalog-query`, and present branch finish options
