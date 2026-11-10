"use client";

import React, { createContext, useContext, useState } from "react";
import { Property, SearchCriteria, FilterState, BookingDetails, CategoryId } from "@/types";

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

  // Modals & Flows
  selectedProperty: Property | null;
  setSelectedProperty: (property: Property | null) => void;
  checkoutProperty: Property | null;
  setCheckoutProperty: (property: Property | null) => void;
  bookingSuccess: BookingDetails | null;
  setBookingSuccess: (details: BookingDetails | null) => void;
  filterModalOpen: boolean;
  setFilterModalOpen: (open: boolean) => void;
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

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
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

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [checkoutProperty, setCheckoutProperty] = useState<Property | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<BookingDetails | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

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
        selectedProperty,
        setSelectedProperty,
        checkoutProperty,
        setCheckoutProperty,
        bookingSuccess,
        setBookingSuccess,
        filterModalOpen,
        setFilterModalOpen,
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
