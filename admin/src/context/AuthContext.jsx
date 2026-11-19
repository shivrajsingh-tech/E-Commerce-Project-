import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import api from "../api/api";

const AuthContext = createContext(null);

const normalizePermission = (permission) => {
  if (typeof permission !== "string") return "";
  return permission.toLowerCase().trim().replace(/[._-]/g, "");
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── helpers ───────────────────────────────────────────────────────────
  const hasToken = () => Boolean(localStorage.getItem("admin_token"));

  // ── fetchUser: only runs when a token is present ──────────────────────
  const fetchUser = useCallback(async (showLoading = true) => {
    // No token → no request, just mark loading done
    if (!hasToken()) {
      setUser(null);
      if (showLoading) setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);

      const response = await api.get("/auth/me");

      if (response?.data?.success && response?.data?.user) {
        const u = response.data.user;

        const roleName = (
          typeof u.role === "string" ? u.role : u.role?.name || ""
        )
          .toLowerCase()
          .trim()
          .replace(/[\s-]+/g, "_");

        if (roleName === "customer") {
          localStorage.removeItem("admin_token");
          setUser(null);
          return;
        }

        const latestPermissions = Array.isArray(u.role?.permissions)
          ? u.role.permissions
          : Array.isArray(u.permissions)
          ? u.permissions
          : [];

        setUser({ ...u, permissions: latestPermissions });
      } else {
        setUser(null);
      }
    } catch (error) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        // Token invalid / expired — wipe it so we stop sending it
        localStorage.removeItem("admin_token");
      }
      setUser(null);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // ── On mount: check session once ─────────────────────────────────────
  useEffect(() => {
    fetchUser(true);
  }, [fetchUser]);

  // ── Background refresh: only while a token exists ────────────────────
  useEffect(() => {
    const refreshIfNeeded = () => {
      if (document.visibilityState === "visible" && hasToken()) {
        fetchUser(false);
      }
    };

    document.addEventListener("visibilitychange", refreshIfNeeded);
    window.addEventListener("focus", refreshIfNeeded);

    // Refresh every 10 minutes — only fires if token present
    const interval = setInterval(() => {
      if (hasToken()) fetchUser(false);
    }, 10 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", refreshIfNeeded);
      window.removeEventListener("focus", refreshIfNeeded);
      clearInterval(interval);
    };
  }, [fetchUser]);

  // ── Permission checker ────────────────────────────────────────────────
  const hasPermission = useCallback(
    (requiredPermission) => {
      if (!user) return false;

      const roleName = (
        typeof user.role === "string" ? user.role : user.role?.name || ""
      )
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, "_");

      if (["super_admin", "superadmin"].includes(roleName)) return true;
      if (roleName === "customer") return false;

      if (
        !requiredPermission ||
        (Array.isArray(requiredPermission) && requiredPermission.length === 0)
      ) {
        return true;
      }

      const userPermissions = Array.isArray(user.role?.permissions)
        ? user.role.permissions
        : Array.isArray(user.permissions)
        ? user.permissions
        : [];

      const permissionList = userPermissions.map(normalizePermission);

      const checkOne = (permission) => {
        const target = normalizePermission(permission);
        return target ? permissionList.includes(target) : false;
      };

      return Array.isArray(requiredPermission)
        ? requiredPermission.some(checkOne)
        : checkOne(requiredPermission);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, hasPermission, refetchUser: fetchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
