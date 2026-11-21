"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import type {
  BookingDetails,
  BookingQuote,
  BookingSessionState,
  CategoryId,
  CheckoutGuestInput,
  FilterState,
  Property,
  ReservationSubmitter,
  SearchCriteria,
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

interface BookingContextType {
  // Favorites
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  favoritesDrawerOpen: boolean;
  setFavoritesDrawerOpen: (open: boolean) => void;

  // Search & Filter
  searchCriteria: SearchCriteria;
  setSearchCriteria: React.Dispatch<React.SetStateAction<SearchCriteria>>;
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  activeCategory: CategoryId;
  setActiveCategory: (cat: CategoryId) => void;
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

const defaultSearch: SearchCriteria = {
  destination: "",
  checkIn: "",
  checkOut: "",
  guests: {
    adults: 2,
    children: 0,
    rooms: 1,
  },
  propertyType: "all",
};

const defaultFilters: FilterState = {
  category: "all",
  minPrice: 0,
  maxPrice: 10000000,
  propertyTypes: [],
  minRating: 0,
  amenities: [],
  freeCancellationOnly: false,
  instantBookingOnly: false,
  sortBy: "popular",
};

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
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria>(defaultSearch);
  const [filterState, setFilterState] = useState<FilterState>(defaultFilters);
  const [activeCategory, setActiveCategoryState] = useState<CategoryId>("all");
  const [filterModalOpen, setFilterModalOpen] = useState(false);

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

  const setActiveCategory = (cat: CategoryId) => {
    setActiveCategoryState(cat);
    setFilterState((prev) => ({ ...prev, category: cat }));
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("travel_favorites", JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  };

  const isFavorite = (id: string) => favorites.includes(id);

  const resetFilters = () => {
    setFilterState(defaultFilters);
    setActiveCategoryState("all");
    setSearchCriteria(defaultSearch);
  };

  return (
    <BookingContext.Provider
      value={{
        favorites,
        toggleFavorite,
        isFavorite,
        favoritesDrawerOpen,
        setFavoritesDrawerOpen,
        searchCriteria,
        setSearchCriteria,
        filterState,
        setFilterState,
        resetFilters,
        activeCategory,
        setActiveCategory,
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
