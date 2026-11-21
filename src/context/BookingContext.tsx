"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { PROPERTIES } from "@/data/properties";
import type {
  ActiveFilterChip,
  AmenityFilterKey,
  BookingDetails,
  BookingQuote,
  BookingSessionState,
  CatalogQueryResult,
  CategoryId,
  CheckoutGuestInput,
  FilterState,
  Property,
  PropertyType,
  QuickSearchTrend,
  ReservationSubmitter,
  SearchCriteria,
  SortOption,
  StayCatalogQueryState,
} from "@/types";
import {
  closeCheckoutSession,
  closePreviewSession,
  createBrowserReservationAdapter,
  createIdleBookingSession,
  deriveBookingQuote,
  dismissConfirmedBooking,
  openPropertySession,
  removeSessionAmenity,
  startCheckoutSession,
  submitBookingSession,
  toggleSessionAmenity,
  updateSessionAdults,
  updateSessionNights,
} from "@/lib/bookingSession";
import {
  adjustQueryGuests,
  applyQuickSearchTrend,
  createDefaultCatalogQuery,
  executeCatalogQuery,
  removeActiveFilterChip,
  setQueryCategory,
  setQueryDates,
  setQueryDestination,
  setQueryFreeCancellation,
  setQueryMinRating,
  setQueryPriceRange,
  setQueryPropertyTypeTab,
  setQuerySortBy,
  toggleQueryAmenity,
  toggleQueryPropertyType,
} from "@/lib/catalogQuery";

interface BookingContextType {
  // Favorites
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  favoritesDrawerOpen: boolean;
  setFavoritesDrawerOpen: (open: boolean) => void;

  // Deep Stay Catalog Query Interface
  catalogQuery: StayCatalogQueryState;
  catalogResult: CatalogQueryResult;
  searchCriteria: SearchCriteria;
  filterState: FilterState;
  activeCategory: CategoryId;
  setDestination: (destination: string) => void;
  setDates: (dates: { checkIn?: string; checkOut?: string }) => void;
  adjustGuests: (field: "adults" | "children" | "rooms", delta: number) => void;
  setActiveCategory: (cat: CategoryId) => void;
  selectPropertyTypeTab: (tab: PropertyType | "all") => void;
  togglePropertyType: (type: PropertyType) => void;
  setPriceRange: (minPrice: number, maxPrice: number) => void;
  setMinRating: (rating: number) => void;
  toggleAmenityFilter: (amenity: AmenityFilterKey) => void;
  setFreeCancellationOnly: (enabled: boolean) => void;
  setSortBy: (sortBy: SortOption) => void;
  applyQuickTrend: (trend: QuickSearchTrend) => void;
  removeFilterChip: (chip: ActiveFilterChip) => void;
  resetFilters: () => void;
  filterModalOpen: boolean;
  setFilterModalOpen: (open: boolean) => void;

  // Deep Booking Session & Quote Interface
  bookingSession: BookingSessionState;
  bookingQuote: BookingQuote | null;
  selectedProperty: Property | null;
  setSelectedProperty: (property: Property | null) => void;
  checkoutProperty: Property | null;
  setCheckoutProperty: (property: Property | null) => void;
  bookingSuccess: BookingDetails | null;
  setBookingSuccess: (details: BookingDetails | null) => void;
  proceedToCheckout: () => void;
  setDraftNights: (nights: number) => void;
  setDraftAdults: (adults: number) => void;
  toggleBookingAmenity: (amenityId: string) => void;
  removeBookingAmenity: (amenityId: string) => void;
  submitCheckout: (
    input: CheckoutGuestInput,
    signal?: AbortSignal
  ) => Promise<{ ok: true; booking: BookingDetails } | { ok: false; error: string }>;
}

const defaultReservationSubmitter = createBrowserReservationAdapter(1200);

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({
  children,
  reservationSubmitter = defaultReservationSubmitter,
}: {
  children: React.ReactNode;
  reservationSubmitter?: ReservationSubmitter;
}) {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("travel_favorites");
        if (saved) return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return ["stay-01", "stay-02"];
  });

  const [favoritesDrawerOpen, setFavoritesDrawerOpen] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Unified Stay Catalog Query State
  const [catalogQuery, setCatalogQuery] = useState<StayCatalogQueryState>(() =>
    createDefaultCatalogQuery()
  );
  const catalogResult = useMemo(
    () => executeCatalogQuery(PROPERTIES, catalogQuery),
    [catalogQuery]
  );

  const searchCriteria = catalogQuery.search;
  const filterState = catalogQuery.filters;
  const activeCategory = catalogQuery.filters.category;

  // Unified Booking Session State
  const [bookingSession, setBookingSession] = useState<BookingSessionState>(() =>
    createIdleBookingSession()
  );
  const bookingQuote = useMemo(() => deriveBookingQuote(bookingSession), [bookingSession]);

  const selectedProperty =
    bookingSession.step === "previewing" ? bookingSession.property : null;
  const checkoutProperty =
    bookingSession.step === "checking-out" ? bookingSession.property : null;
  const bookingSuccess =
    bookingSession.step === "confirmed" ? bookingSession.confirmedBooking : null;

  // Catalog Query Commands
  const setDestination = useCallback((destination: string) => {
    setCatalogQuery((prev) => setQueryDestination(prev, destination));
  }, []);

  const setDates = useCallback((dates: { checkIn?: string; checkOut?: string }) => {
    setCatalogQuery((prev) => setQueryDates(prev, dates));
  }, []);

  const adjustGuests = useCallback(
    (field: "adults" | "children" | "rooms", delta: number) => {
      setCatalogQuery((prev) => adjustQueryGuests(prev, field, delta));
    },
    []
  );

  const setActiveCategory = useCallback((cat: CategoryId) => {
    setCatalogQuery((prev) => setQueryCategory(prev, cat));
  }, []);

  const selectPropertyTypeTab = useCallback((tab: PropertyType | "all") => {
    setCatalogQuery((prev) => setQueryPropertyTypeTab(prev, tab));
  }, []);

  const togglePropertyType = useCallback((type: PropertyType) => {
    setCatalogQuery((prev) => toggleQueryPropertyType(prev, type));
  }, []);

  const setPriceRange = useCallback((minPrice: number, maxPrice: number) => {
    setCatalogQuery((prev) => setQueryPriceRange(prev, minPrice, maxPrice));
  }, []);

  const setMinRating = useCallback((rating: number) => {
    setCatalogQuery((prev) => setQueryMinRating(prev, rating));
  }, []);

  const toggleAmenityFilter = useCallback((amenity: AmenityFilterKey) => {
    setCatalogQuery((prev) => toggleQueryAmenity(prev, amenity));
  }, []);

  const setFreeCancellationOnly = useCallback((enabled: boolean) => {
    setCatalogQuery((prev) => setQueryFreeCancellation(prev, enabled));
  }, []);

  const setSortBy = useCallback((sortBy: SortOption) => {
    setCatalogQuery((prev) => setQuerySortBy(prev, sortBy));
  }, []);

  const applyQuickTrend = useCallback((trend: QuickSearchTrend) => {
    setCatalogQuery((prev) => applyQuickSearchTrend(prev, trend));
  }, []);

  const removeFilterChip = useCallback((chip: ActiveFilterChip) => {
    setCatalogQuery((prev) => removeActiveFilterChip(prev, chip));
  }, []);

  const resetFilters = useCallback(() => {
    setCatalogQuery(createDefaultCatalogQuery());
  }, []);

  // Booking Session Commands
  const setSelectedProperty = useCallback(
    (property: Property | null) => {
      setBookingSession((prev) =>
        property
          ? openPropertySession(prev, property, searchCriteria)
          : closePreviewSession(prev)
      );
    },
    [searchCriteria]
  );

  const setCheckoutProperty = useCallback(
    (property: Property | null) => {
      setBookingSession((prev) =>
        property
          ? startCheckoutSession(prev, property, searchCriteria)
          : closeCheckoutSession(prev)
      );
    },
    [searchCriteria]
  );

  const setBookingSuccess = useCallback((details: BookingDetails | null) => {
    setBookingSession((prev) => {
      if (!details) return dismissConfirmedBooking(prev);
      return {
        ...createIdleBookingSession(),
        step: "confirmed",
        confirmedBooking: details,
      };
    });
  }, []);

  const proceedToCheckout = useCallback(() => {
    setBookingSession((prev) =>
      prev.property ? startCheckoutSession(prev, prev.property, searchCriteria) : prev
    );
  }, [searchCriteria]);

  const setDraftNights = useCallback((nights: number) => {
    setBookingSession((prev) => updateSessionNights(prev, nights));
  }, []);

  const setDraftAdults = useCallback((adults: number) => {
    setBookingSession((prev) => updateSessionAdults(prev, adults));
  }, []);

  const toggleBookingAmenity = useCallback((amenityId: string) => {
    setBookingSession((prev) => toggleSessionAmenity(prev, amenityId));
  }, []);

  const removeBookingAmenity = useCallback((amenityId: string) => {
    setBookingSession((prev) => removeSessionAmenity(prev, amenityId));
  }, []);

  const submitCheckout = useCallback(
    async (input: CheckoutGuestInput, signal?: AbortSignal) => {
      const result = await submitBookingSession(bookingSession, input, reservationSubmitter, {
        signal,
      });
      if (!result.ok) {
        return result;
      }
      if (!signal?.aborted) {
        setBookingSession((prev) =>
          prev.step === "checking-out" && prev.property?.id === result.booking.property.id
            ? result.nextSession
            : prev
        );
      }
      return { ok: true as const, booking: result.booking };
    },
    [bookingSession, reservationSubmitter]
  );

  // Favorites
  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("travel_favorites", JSON.stringify(next));
        }
      } catch { }
      return next;
    });
  };

  const isFavorite = (id: string) => favorites.includes(id);

  return (
    <BookingContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite,
        favoritesDrawerOpen,
        setFavoritesDrawerOpen,
        catalogQuery,
        catalogResult,
        searchCriteria,
        filterState,
        activeCategory,
        setDestination,
        setDates,
        adjustGuests,
        setActiveCategory,
        selectPropertyTypeTab,
        togglePropertyType,
        setPriceRange,
        setMinRating,
        toggleAmenityFilter,
        setFreeCancellationOnly,
        setSortBy,
        applyQuickTrend,
        removeFilterChip,
        resetFilters,
        filterModalOpen,
        setFilterModalOpen,
        bookingSession,
        bookingQuote,
        selectedProperty,
        setSelectedProperty,
        checkoutProperty,
        setCheckoutProperty,
        bookingSuccess,
        setBookingSuccess,
        proceedToCheckout,
        setDraftNights,
        setDraftAdults,
        toggleBookingAmenity,
        removeBookingAmenity,
        submitCheckout,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
