"use client";

import { useEffect, useRef } from "react";
import {
  parseCatalogQueryFromSearchParams,
  serializeCatalogQueryToSearchParams,
} from "@luxestay/domain";
import { useCatalog } from "@/features/booking/BookingContext";

export function CatalogUrlSync() {
  const { catalogQuery, replaceCatalogQuery } = useCatalog();
  const hasHydratedFromUrlRef = useRef(false);

  // 1. Hydrate initial search/filter state from URL query string on first mount
  useEffect(() => {
    if (typeof window === "undefined" || hasHydratedFromUrlRef.current) return;
    hasHydratedFromUrlRef.current = true;

    const search = window.location.search;
    if (!search || search === "?") return;

    const parsed = parseCatalogQueryFromSearchParams(search);
    replaceCatalogQuery(parsed);
  }, [replaceCatalogQuery]);

  // 2. Keep URL query string in sync as user adjusts search/filters/sort
  useEffect(() => {
    if (typeof window === "undefined" || !hasHydratedFromUrlRef.current) return;

    const nextQuery = serializeCatalogQueryToSearchParams(catalogQuery).toString();
    const currentQuery = window.location.search.startsWith("?")
      ? window.location.search.slice(1)
      : window.location.search;

    if (nextQuery === currentQuery) return;

    const nextUrl = nextQuery
      ? `${window.location.pathname}?${nextQuery}${window.location.hash}`
      : `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, [catalogQuery]);

  return null;
}
