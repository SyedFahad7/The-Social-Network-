"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  department: string;
  rollNumber?: string;
  section?: string;
  employeeId?: string;
  profilePicture?: string;
  lastLogin?: string;
  profile?: {
    bio: string;
    picture: string;
    status: {
      emoji: string;
      text: string;
    };
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: string) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Check if token is expired
  const isTokenExpired = useCallback(() => {
    if (typeof window === "undefined") return false;

    const token = localStorage.getItem("token");
    if (!token) return true;

    try {
      // Decode JWT token to check expiration
      const payload = JSON.parse(atob(token.split(".")[1]));
      const currentTime = Date.now() / 1000;

      if (payload.exp && payload.exp < currentTime) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking token expiration:", error);
      return true;
    }
  }, []);

  // Clear authentication data
  const clearAuth = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  // Check authentication status
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      // Check if token is expired first
      if (isTokenExpired()) {
        clearAuth();
        return false;
      }

      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      if (!token || !userData) {
        clearAuth();
        return false;
      }

      // Verify token with backend
      const response = await apiClient.getCurrentUser();

      if (response.success && response.data?.user) {
        const user = response.data.user;
        setUser(user);
        setIsAuthenticated(true);
        localStorage.setItem("user", JSON.stringify(user));
        return true;
      } else {
        clearAuth();
        return false;
      }
    } catch (error: any) {
      console.error("Auth check error:", error);

      // Handle specific error cases
      if (
        error.message?.includes("Token expired") ||
        error.message?.includes("Invalid token") ||
        error.message?.includes("401")
      ) {
        clearAuth();
        return false;
      }

      // For network errors, keep current state
      return isAuthenticated;
    }
  }, [isTokenExpired, clearAuth, isAuthenticated]);

  // Login function
  const login = useCallback(
    async (email: string, password: string, role: string) => {
      try {
        const response = await apiClient.login(email, password, role);

        if (response.success && response.data?.token) {
          const user = response.data.user;
          setUser(user);
          setIsAuthenticated(true);
          localStorage.setItem("token", response.data.token);
          localStorage.setItem("user", JSON.stringify(user));
          return response;
        } else {
          return response;
        }
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    []
  );

  // Logout function
  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuth();
      router.push("/auth/login");
    }
  }, [clearAuth, router]);

  // Initialize auth on mount (client-side only)
  useEffect(() => {
    setMounted(true);

    const initializeAuth = async () => {
      setLoading(true);

      try {
        const isAuth = await checkAuth();

        if (!isAuth) {
          // If not authenticated and not on login page, redirect
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.includes("/auth/")
          ) {
            router.replace("/auth/login");
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        clearAuth();
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/auth/")
        ) {
          router.replace("/auth/login");
        }
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [checkAuth, clearAuth, router]);

  // Set up global error handler for token expiration
  useEffect(() => {
    const handleApiError = (event: any) => {
      if (
        event.detail?.status === 401 ||
        event.detail?.message?.includes("Token expired") ||
        event.detail?.message?.includes("Invalid token")
      ) {
        clearAuth();
        router.replace("/auth/login");
      }
    };

    // Listen for custom API error events
    window.addEventListener("api-error", handleApiError);

    return () => {
      window.removeEventListener("api-error", handleApiError);
    };
  }, [clearAuth, router]);

  const value: AuthContextType = {
    user,
    loading: !mounted || loading,
    isAuthenticated,
    login,
    logout,
    checkAuth,
    clearAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
