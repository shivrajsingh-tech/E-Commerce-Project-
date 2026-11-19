"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verify session with the server on every mount/refresh
  const fetchUser = useCallback(async () => {
    try {
      // Try the customer profile endpoint first
      const res = await api.get("/users/getCustomerProfile");
      if (res.data?.success && res.data?.user) {
        const u = res.data.user;
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));
        return;
      }
    } catch {
      // 401/403 means not logged in — clear stale localStorage
    }
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }, []);

  useEffect(() => {
    // Start from localStorage so UI shows immediately (no flash)
    try {
      const saved = localStorage.getItem("user");
      if (saved) setUser(JSON.parse(saved));
    } catch {
      localStorage.removeItem("user");
    }
    // Then verify with server
    fetchUser().finally(() => setLoading(false));
  }, [fetchUser]);

  const login = (userData, token) => {
    if (!userData) throw new Error("User information is missing.");
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    if (token) localStorage.setItem("token", token);
  };

  const logout = async () => {
    try {
      await api.post("/users/logout");
    } catch {
      // ignore
    }
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  };

  const role = user?.role || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        role,
        loading,
        login,
        logout,
        refetchUser: fetchUser,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
