"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  AuthUser,
  LoginInput,
  OtpRequestInput,
  OtpRequestResult,
  OtpVerifyInput,
  RegisterInput,
} from "@luxestay/contracts";
import type { DataMode } from "@/shared/config/env";
import { createAuthPortForMode } from "@/shared/ports/authPort";
import { isAbortError } from "@/shared/ports/errors";
import type { AuthPort } from "@/shared/ports/types";

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authPort: AuthPort;
  dataMode: DataMode;
  register: (input: RegisterInput) => Promise<AuthUser>;
  login: (input: LoginInput) => Promise<AuthUser>;
  requestOtp: (input: OtpRequestInput) => Promise<OtpRequestResult>;
  verifyOtp: (input: OtpVerifyInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
  dataMode: DataMode;
  apiBaseUrl: string;
  port?: AuthPort;
}

export function AuthProvider({
  children,
  dataMode,
  apiBaseUrl,
  port,
}: AuthProviderProps) {
  const authPort = useMemo(
    () => port ?? createAuthPortForMode({ mode: dataMode, apiBaseUrl }),
    [apiBaseUrl, dataMode, port]
  );

  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(dataMode === "api");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (dataMode !== "api") return;
    const controller = new AbortController();
    authPort
      .me({ signal: controller.signal })
      .then((resolvedUser) => {
        if (!controller.signal.aborted) {
          setUser(resolvedUser);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || isAbortError(err)) return;
        setUser(null);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [authPort, dataMode]);

  const register = useCallback(
    async (input: RegisterInput) => {
      const nextUser = await authPort.register(input);
      setUser(nextUser);
      setAuthModalOpen(false);
      return nextUser;
    },
    [authPort]
  );

  const login = useCallback(
    async (input: LoginInput) => {
      const nextUser = await authPort.login(input);
      setUser(nextUser);
      setAuthModalOpen(false);
      return nextUser;
    },
    [authPort]
  );

  const requestOtp = useCallback(
    async (input: OtpRequestInput) => {
      return authPort.requestOtp(input);
    },
    [authPort]
  );

  const verifyOtp = useCallback(
    async (input: OtpVerifyInput) => {
      const nextUser = await authPort.verifyOtp(input);
      setUser(nextUser);
      setAuthModalOpen(false);
      return nextUser;
    },
    [authPort]
  );

  const logout = useCallback(async () => {
    await authPort.logout();
    setUser(null);
  }, [authPort]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      authModalOpen,
      setAuthModalOpen,
      authPort,
      dataMode,
      register,
      login,
      requestOtp,
      verifyOtp,
      logout,
    }),
    [
      user,
      isLoading,
      authModalOpen,
      authPort,
      dataMode,
      register,
      login,
      requestOtp,
      verifyOtp,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
