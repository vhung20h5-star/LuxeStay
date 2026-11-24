"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { CATEGORIES } from "@/data/categories";
import { DESTINATIONS } from "@/data/destinations";
import { PROPERTIES } from "@/data/properties";
import type {
  ActiveFilterChip,
  AmenityFilterKey,
  AppPorts,
  BookingDetails,
  BookingQuote,
  BookingSessionState,
  CatalogQueryResult,
  Category,
  CategoryId,
  CheckoutGuestInput,
  Destination,
  FilterState,
  Property,
  PropertyType,
  QuickSearchTrend,
  SearchCriteria,
  SortOption,
  StayCatalogQueryState,
} from "@/types";
import {
  closeCheckoutSession,
  closePreviewSession,
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
  createBrowserAppPorts,
  createHttpReservationAdapter,
} from "@/lib/persistencePort";
import {
  adjustQueryGuests,
  applyQuickSearchTrend,
  createDefaultCatalogQuery,
  executeCatalogQuery,
  filterDestinations,
  removeActiveFilterChip,
  resolveFavoriteProperties,
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

export interface FavoritesContextValue {
  favorites: readonly string[];
  favoriteProperties: Property[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  favoritesDrawerOpen: boolean;
  setFavoritesDrawerOpen: (open: boolean) => void;
}

export interface CatalogContextValue {
  catalogQuery: StayCatalogQueryState;
  catalogResult: CatalogQueryResult;
  searchCriteria: SearchCriteria;
  filterState: FilterState;
  activeCategory: CategoryId;
  categories: readonly Category[];
  destinations: readonly Destination[];
  filteredDestinations: Destination[];
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
}

export interface BookingSessionContextValue {
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

export type BookingContextType = FavoritesContextValue &
  CatalogContextValue &
  BookingSessionContextValue;

const VALID_PROPERTY_IDS = new Set(PROPERTIES.map((property) => property.id));
const defaultBrowserPorts = createBrowserAppPorts({
  validPropertyIds: VALID_PROPERTY_IDS,
  reservationDelayMs: 1200,
});
const defaultHttpReservationAdapter = createHttpReservationAdapter({
  endpoint: "/api/reservations",
});

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);
const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);
const BookingSessionContext = createContext<BookingSessionContextValue | undefined>(undefined);
const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({
  children,
  ports,
}: {
  children: React.ReactNode;
  ports?: Partial<AppPorts>;
}) {
  const favoritesRepository = ports?.favorites ?? defaultBrowserPorts.favorites;
  const reservationSubmitter = useMemo(() => {
    if (ports?.reservations) return ports.reservations;
    return {
      async submit(
        request: Parameters<typeof defaultHttpReservationAdapter.submit>[0],
        options?: Parameters<typeof defaultHttpReservationAdapter.submit>[1]
      ) {
        try {
          return await defaultHttpReservationAdapter.submit(request, options);
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            throw err;
          }
          // Fallback to browser adapter if running in static/offline preview without API route
          return defaultBrowserPorts.reservations.submit(request, options);
        }
      },
    };
  }, [ports?.reservations]);

  // 1. Favorites Domain State
  const subscribeFavorites = useCallback(
    (listener: () => void) => favoritesRepository.subscribe(listener),
    [favoritesRepository]
  );
  const getFavoritesSnapshot = useCallback(
    () => favoritesRepository.getSnapshot(),
    [favoritesRepository]
  );
  const getFavoritesServerSnapshot = useCallback(
    () => favoritesRepository.getServerSnapshot(),
    [favoritesRepository]
  );

  const favorites = useSyncExternalStore(
    subscribeFavorites,
    getFavoritesSnapshot,
    getFavoritesServerSnapshot
  );

  const [favoritesDrawerOpen, setFavoritesDrawerOpen] = useState(false);

  const favoriteProperties = useMemo(
    () => resolveFavoriteProperties(PROPERTIES, favorites),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      favoritesRepository.toggle(id);
    },
    [favoritesRepository]
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const favoritesValue = useMemo<FavoritesContextValue>(
    () => ({
      favorites,
      favoriteProperties,
      toggleFavorite,
      isFavorite,
      favoritesDrawerOpen,
      setFavoritesDrawerOpen,
    }),
    [
      favorites,
      favoriteProperties,
      toggleFavorite,
      isFavorite,
      favoritesDrawerOpen,
    ]
  );

  // 2. Stay Catalog Query Domain State
  const [filterModalOpen, setFilterModalOpen] = useState(false);
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

  const filteredDestinations = useMemo(
    () => filterDestinations(DESTINATIONS, searchCriteria.destination),
    [searchCriteria.destination]
  );

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

  const catalogValue = useMemo<CatalogContextValue>(
    () => ({
      catalogQuery,
      catalogResult,
      searchCriteria,
      filterState,
      activeCategory,
      categories: CATEGORIES,
      destinations: DESTINATIONS,
      filteredDestinations,
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
    }),
    [
      catalogQuery,
      catalogResult,
      searchCriteria,
      filterState,
      activeCategory,
      filteredDestinations,
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
    ]
  );

  // 3. Booking Session & Checkout Domain State
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

  const bookingSessionValue = useMemo<BookingSessionContextValue>(
    () => ({
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
    }),
    [
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
    ]
  );

  const combinedFacadeValue = useMemo<BookingContextType>(
    () => ({
      ...favoritesValue,
      ...catalogValue,
      ...bookingSessionValue,
    }),
    [favoritesValue, catalogValue, bookingSessionValue]
  );

  return (
    <FavoritesContext.Provider value={favoritesValue}>
      <CatalogContext.Provider value={catalogValue}>
        <BookingSessionContext.Provider value={bookingSessionValue}>
          <BookingContext.Provider value={combinedFacadeValue}>
            {children}
          </BookingContext.Provider>
        </BookingSessionContext.Provider>
      </CatalogContext.Provider>
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a BookingProvider");
  }
  return context;
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) {
    throw new Error("useCatalog must be used within a BookingProvider");
  }
  return context;
}

export function useBookingSession(): BookingSessionContextValue {
  const context = useContext(BookingSessionContext);
  if (!context) {
    throw new Error("useBookingSession must be used within a BookingProvider");
  }
  return context;
}

export function useBooking(): BookingContextType {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}
