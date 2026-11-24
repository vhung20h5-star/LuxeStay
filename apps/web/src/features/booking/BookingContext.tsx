"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  ActiveFilterChip,
  AmenityFilterKey,
  AmenityFilterOption,
  BookingDetails,
  BookingQuote,
  BookingSessionState,
  CatalogQueryResult,
  CatalogSnapshot,
  Category,
  CategoryId,
  CheckoutGuestInput,
  Destination,
  FilterState,
  NotificationLog,
  PromotionsBundle,
  Property,
  PropertyType,
  QuickSearchTrend,
  SearchCriteria,
  SortOption,
  StayCatalogQueryState,
  TestimonialItem,
} from "@luxestay/contracts";
import {
  adjustQueryGuests,
  applyQuickSearchTrend,
  closeCheckoutSession,
  closePreviewSession,
  createDefaultCatalogQuery,
  createIdleBookingSession,
  deriveBookingQuote,
  dismissConfirmedBooking,
  executeCatalogQuery,
  filterDestinations,
  openPropertySession,
  removeActiveFilterChip,
  removeSessionAmenity,
  resolveFavoriteProperties,
  setQueryCategory,
  setQueryDates,
  setQueryDestination,
  setQueryFreeCancellation,
  setQueryMinRating,
  setQueryPriceRange,
  setQueryPropertyTypeTab,
  setQuerySortBy,
  setSessionPromoCode,
  startCheckoutSession,
  submitBookingSession,
  toggleQueryAmenity,
  toggleQueryPropertyType,
  toggleSessionAmenity,
  updateSessionAdults,
  updateSessionNights,
} from "@luxestay/domain";
import { useAuth } from "@/features/auth/AuthContext";
import type { DataMode } from "@/shared/config/env";
import { createWebAppPorts } from "@/shared/ports/persistencePort";
import type { AppPorts, PaymentGatewayPort } from "@/shared/ports/types";

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
  properties: readonly Property[];
  categories: readonly Category[];
  destinations: readonly Destination[];
  amenityFilterOptions: readonly AmenityFilterOption[];
  promotions: PromotionsBundle;
  testimonials: readonly TestimonialItem[];
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
  replaceCatalogQuery: (next: StayCatalogQueryState) => void;
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
  startCheckoutWithDraft: (
    property: Property,
    draft: { nights: number; adults: number; selectedAmenityIds: readonly string[] }
  ) => void;
  setDraftNights: (nights: number) => void;
  setDraftAdults: (adults: number) => void;
  toggleBookingAmenity: (amenityId: string) => void;
  removeBookingAmenity: (amenityId: string) => void;
  setBookingPromoCode: (promoCode: string | undefined | null) => void;
  submitCheckout: (
    input: CheckoutGuestInput,
    signal?: AbortSignal
  ) => Promise<{ ok: true; booking: BookingDetails } | { ok: false; error: string }>;
  lookupReservation: (
    bookingId: string,
    contact?: string,
    signal?: AbortSignal
  ) => Promise<BookingDetails>;
  cancelReservation: (
    bookingId: string,
    input: { contact?: string; reason?: string },
    signal?: AbortSignal
  ) => Promise<BookingDetails>;
  listMyReservations: (signal?: AbortSignal) => Promise<readonly BookingDetails[]>;
  listReservationNotifications: (
    bookingId: string,
    contact?: string,
    signal?: AbortSignal
  ) => Promise<readonly NotificationLog[]>;
  paymentGateway: PaymentGatewayPort;
}

export type BookingContextType = FavoritesContextValue &
  CatalogContextValue &
  BookingSessionContextValue;

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);
const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);
const BookingSessionContext = createContext<BookingSessionContextValue | undefined>(undefined);
const BookingContext = createContext<BookingContextType | undefined>(undefined);

export interface BookingProviderProps {
  children: React.ReactNode;
  initialCatalog: CatalogSnapshot;
  dataMode: DataMode;
  apiBaseUrl: string;
  ports?: Partial<AppPorts>;
}

export function BookingProvider({
  children,
  initialCatalog,
  dataMode,
  apiBaseUrl,
  ports,
}: BookingProviderProps) {
  const {
    properties,
    categories,
    destinations,
    amenityFilterOptions,
    promotions,
    testimonials,
  } = initialCatalog;

  const validPropertyIds = useMemo(
    () => new Set(properties.map((property) => property.id)),
    [properties]
  );

  const { user, authPort } = useAuth();

  // Explicit mode selection (api vs mock) with ZERO silent fallback in api mode
  const defaultPorts = useMemo(
    () =>
      createWebAppPorts({
        mode: dataMode,
        apiBaseUrl,
        validPropertyIds,
        vouchers: promotions.vouchers,
        mockReservationDelayMs: 1200,
      }),
    [apiBaseUrl, dataMode, promotions.vouchers, validPropertyIds]
  );

  const favoritesRepository = ports?.favorites ?? defaultPorts.favorites;
  const reservationSubmitter = ports?.reservations ?? defaultPorts.reservations;
  const reservationManager = ports?.reservationManager ?? defaultPorts.reservationManager;
  const paymentGateway = ports?.paymentGateway ?? defaultPorts.paymentGateway;

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

  // Merge localStorage wishlist with remote account wishlist when user signs in
  const syncedUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      syncedUserIdRef.current = null;
      return;
    }
    if (syncedUserIdRef.current === user.id) return;
    syncedUserIdRef.current = user.id;

    let cancelled = false;
    const localIds = favoritesRepository.getSnapshot();
    authPort
      .syncFavorites(localIds, "merge")
      .then((mergedIds) => {
        if (!cancelled) {
          favoritesRepository.setAll(mergedIds);
        }
      })
      .catch(() => {
        // Keep local wishlist intact if remote sync fails transiently
      });

    return () => {
      cancelled = true;
    };
  }, [authPort, favoritesRepository, user]);

  const [favoritesDrawerOpen, setFavoritesDrawerOpen] = useState(false);

  const favoriteProperties = useMemo(
    () => resolveFavoriteProperties(properties, favorites),
    [properties, favorites]
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      favoritesRepository.toggle(id);
      if (user) {
        authPort
          .toggleRemoteFavorite(id)
          .then((serverIds) => {
            favoritesRepository.setAll(serverIds);
          })
          .catch(() => {
            // Keep optimistic toggle on transient failure
          });
      }
    },
    [authPort, favoritesRepository, user]
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
    () =>
      executeCatalogQuery(properties, catalogQuery, {
        categories,
        amenityFilterOptions,
      }),
    [properties, catalogQuery, categories, amenityFilterOptions]
  );

  const searchCriteria = catalogQuery.search;
  const filterState = catalogQuery.filters;
  const activeCategory = catalogQuery.filters.category;

  const filteredDestinations = useMemo(
    () => filterDestinations(destinations, searchCriteria.destination),
    [destinations, searchCriteria.destination]
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

  const replaceCatalogQuery = useCallback((next: StayCatalogQueryState) => {
    setCatalogQuery(next);
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
      properties,
      categories,
      destinations,
      amenityFilterOptions,
      promotions,
      testimonials,
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
      replaceCatalogQuery,
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
      properties,
      categories,
      destinations,
      amenityFilterOptions,
      promotions,
      testimonials,
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
      replaceCatalogQuery,
      resetFilters,
      filterModalOpen,
    ]
  );

  // 3. Booking Session & Checkout Domain State
  const [bookingSession, setBookingSession] = useState<BookingSessionState>(() =>
    createIdleBookingSession()
  );
  const bookingQuote = useMemo(
    () =>
      deriveBookingQuote(bookingSession, undefined, {
        vouchers: promotions.vouchers,
        isAuthenticated: Boolean(user),
      }),
    [bookingSession, promotions.vouchers, user]
  );

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

  const startCheckoutWithDraft = useCallback(
    (
      property: Property,
      draft: { nights: number; adults: number; selectedAmenityIds: readonly string[] }
    ) => {
      setBookingSession((prev) => {
        let next = startCheckoutSession(prev, property, searchCriteria);
        next = updateSessionNights(next, draft.nights);
        next = updateSessionAdults(next, draft.adults);
        next = { ...next, selectedAmenityIds: [] };
        for (const amenityId of draft.selectedAmenityIds) {
          next = toggleSessionAmenity(next, amenityId);
        }
        return next;
      });
    },
    [searchCriteria]
  );

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

  const setBookingPromoCode = useCallback((promoCode: string | undefined | null) => {
    setBookingSession((prev) => setSessionPromoCode(prev, promoCode));
  }, []);

  const submitCheckout = useCallback(
    async (input: CheckoutGuestInput, signal?: AbortSignal) => {
      const result = await submitBookingSession(bookingSession, input, reservationSubmitter, {
        signal,
        vouchers: promotions.vouchers,
        isAuthenticated: Boolean(user),
      });
      if (!result.ok) {
        return result;
      }
      if (!signal?.aborted) {
        setBookingSession((prev) => {
          if (prev.step !== "checking-out" || prev.property?.id !== result.booking.property.id) {
            return prev;
          }
          // Online payment redirects to /payments/[transactionId]; clear modal without showing success ticket yet
          if (result.booking.status === "pending_payment" && result.booking.payment?.checkoutUrl) {
            return createIdleBookingSession();
          }
          return result.nextSession;
        });
      }
      return { ok: true as const, booking: result.booking };
    },
    [bookingSession, promotions.vouchers, reservationSubmitter, user]
  );

  const lookupReservation = useCallback(
    (bookingId: string, contact?: string, signal?: AbortSignal) => {
      return reservationManager.lookup(bookingId, contact, { signal });
    },
    [reservationManager]
  );

  const cancelReservation = useCallback(
    (bookingId: string, input: { contact?: string; reason?: string }, signal?: AbortSignal) => {
      return reservationManager.cancel(bookingId, input, { signal });
    },
    [reservationManager]
  );

  const listMyReservations = useCallback(
    (signal?: AbortSignal) => {
      return reservationManager.listMine({ signal });
    },
    [reservationManager]
  );

  const listReservationNotifications = useCallback(
    (bookingId: string, contact?: string, signal?: AbortSignal) => {
      return reservationManager.listNotifications(bookingId, contact, { signal });
    },
    [reservationManager]
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
      startCheckoutWithDraft,
      setDraftNights,
      setDraftAdults,
      toggleBookingAmenity,
      removeBookingAmenity,
      setBookingPromoCode,
      submitCheckout,
      lookupReservation,
      cancelReservation,
      listMyReservations,
      listReservationNotifications,
      paymentGateway,
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
      startCheckoutWithDraft,
      setDraftNights,
      setDraftAdults,
      toggleBookingAmenity,
      removeBookingAmenity,
      setBookingPromoCode,
      submitCheckout,
      lookupReservation,
      cancelReservation,
      listMyReservations,
      listReservationNotifications,
      paymentGateway,
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
