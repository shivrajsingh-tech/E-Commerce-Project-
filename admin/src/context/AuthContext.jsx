
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

import api from "../api/api";

const AuthContext = createContext(null);

// Normalize permission names
const normalizePermission = (permission) => {
  if (typeof permission !== "string") return "";

  return permission
    .toLowerCase()
    .trim()
    .replace(/[._-]/g, "");
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch latest logged-in user
  const fetchUser = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const response = await api.get("/auth/me");

      if (response?.data?.success && response?.data?.user) {
        const u = response.data.user;

        const roleName = (
          typeof u.role === "string"
            ? u.role
            : u.role?.name || ""
        )
          .toLowerCase()
          .trim()
          .replace(/[\s-]+/g, "_");

        // Customer cannot access admin portal
        if (roleName === "customer") {
          setUser(null);
          return;
        }

        // Latest role permissions first
        const latestPermissions = Array.isArray(u.role?.permissions)
          ? u.role.permissions
          : Array.isArray(u.permissions)
          ? u.permissions
          : [];

        setUser({
          ...u,
          permissions: latestPermissions,
        });
      } else {
        setUser(null);
      }
    } catch (error) {
      // 401 means the token is invalid/expired — clear it so the
      // interceptor stops sending a stale token on future requests
      if (error?.response?.status === 401) {
        localStorage.removeItem("admin_token");
      }
      setUser(null);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // Initial user fetch
  useEffect(() => {
    fetchUser(true);
  }, [fetchUser]);

  // Automatically refresh permissions
  useEffect(() => {
    const refreshUser = () => {
      if (document.visibilityState === "visible") {
        fetchUser(false);
      }
    };

    document.addEventListener("visibilitychange", refreshUser);
    window.addEventListener("focus", refreshUser);

    const interval = setInterval(() => {
      fetchUser(false);
    }, 5 * 60 * 1000); // Refresh every 5 minutes (not every 30 seconds)

    return () => {
      document.removeEventListener("visibilitychange", refreshUser);
      window.removeEventListener("focus", refreshUser);
      clearInterval(interval);
    };
  }, [fetchUser]);

  // Permission checker
  const hasPermission = useCallback(
    (requiredPermission) => {
      if (!user) return false;

      const roleName = (
        typeof user.role === "string"
          ? user.role
          : user.role?.name || ""
      )
        .toLowerCase()
        .trim()
        .replace(/[\s-]+/g, "_");

      // Super Admin bypass
      if (["super_admin", "superadmin"].includes(roleName)) {
        return true;
      }

      // Customer blocked
      if (roleName === "customer") {
        return false;
      }

      // No specific permission required
      if (
        !requiredPermission ||
        (Array.isArray(requiredPermission) &&
          requiredPermission.length === 0)
      ) {
        return true;
      }

      // Latest permissions
      const userPermissions = Array.isArray(user.role?.permissions)
        ? user.role.permissions
        : Array.isArray(user.permissions)
        ? user.permissions
        : [];

      const permissionList = userPermissions.map(
        normalizePermission
      );

      const checkSinglePermission = (permission) => {
        const target = normalizePermission(permission);

        if (!target) return false;

        return permissionList.includes(target);
      };

      // Multiple permissions: any one is sufficient
      if (Array.isArray(requiredPermission)) {
        return requiredPermission.some(checkSinglePermission);
      }

      return checkSinglePermission(requiredPermission);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        hasPermission,
        refetchUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
