"use client";

import React, { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { CurrencyCode, LocaleCode } from "@luxestay/contracts";
import { formatMoney, translate, type TranslationKey } from "@luxestay/domain";

const LOCALE_STORAGE_KEY = "luxestay_locale";
const CURRENCY_STORAGE_KEY = "luxestay_currency";

interface LocalePrefs {
  locale: LocaleCode;
  currency: CurrencyCode;
}

const DEFAULT_PREFS: LocalePrefs = Object.freeze({
  locale: "vi",
  currency: "VND",
});

let cachedPrefs: LocalePrefs = DEFAULT_PREFS;
const listeners = new Set<() => void>();

function readPrefsFromStorage(): LocalePrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const rawLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const rawCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    const locale: LocaleCode = rawLocale === "en" ? "en" : "vi";
    const currency: CurrencyCode = rawCurrency === "USD" ? "USD" : "VND";
    if (cachedPrefs.locale === locale && cachedPrefs.currency === currency) {
      return cachedPrefs;
    }
    cachedPrefs = Object.freeze({ locale, currency });
    return cachedPrefs;
  } catch {
    return cachedPrefs;
  }
}

function writePrefsToStorage(next: LocalePrefs): void {
  if (cachedPrefs.locale === next.locale && cachedPrefs.currency === next.currency) {
    return;
  }
  cachedPrefs = Object.freeze(next);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next.locale);
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, next.currency);
    } catch {
      // Ignore restricted storage mode
    }
  }
  for (const listener of [...listeners]) {
    listener();
  }
}

function subscribePrefs(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === null ||
      event.key === LOCALE_STORAGE_KEY ||
      event.key === CURRENCY_STORAGE_KEY
    ) {
      readPrefsFromStorage();
      listener();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getServerPrefsSnapshot(): LocalePrefs {
  return DEFAULT_PREFS;
}

export interface LocaleContextValue {
  locale: LocaleCode;
  currency: CurrencyCode;
  setLocale: (locale: LocaleCode) => void;
  setCurrency: (currency: CurrencyCode) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  formatPrice: (amountVnd: number) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const prefs = useSyncExternalStore(
    subscribePrefs,
    readPrefsFromStorage,
    getServerPrefsSnapshot
  );

  const setLocale = useCallback((locale: LocaleCode) => {
    const current = readPrefsFromStorage();
    writePrefsToStorage({ locale, currency: current.currency });
  }, []);

  const setCurrency = useCallback((currency: CurrencyCode) => {
    const current = readPrefsFromStorage();
    writePrefsToStorage({ locale: current.locale, currency });
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(prefs.locale, key, params),
    [prefs.locale]
  );

  const formatPrice = useCallback(
    (amountVnd: number) => formatMoney(amountVnd, prefs.currency, prefs.locale),
    [prefs.currency, prefs.locale]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale: prefs.locale,
      currency: prefs.currency,
      setLocale,
      setCurrency,
      t,
      formatPrice,
    }),
    [prefs.locale, prefs.currency, setLocale, setCurrency, t, formatPrice]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
