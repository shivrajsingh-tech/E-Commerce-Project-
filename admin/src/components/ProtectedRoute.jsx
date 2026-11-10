import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  ArrowLeft,
  Home,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const normalizePermission = (permission) => {
  if (typeof permission !== "string") return "";

  return permission
    .toLowerCase()
    .trim()
    .replace(/[._-]/g, "");
};

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { user, loading, hasPermission } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  // 1. Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />

          <p className="mt-4 text-slate-400 text-sm font-medium">
            Verifying staff credentials...
          </p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated check
  if (!user) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // 3. Force change password lock
  if (
    user.mustChangePassword &&
    location.pathname !== "/force-change-password"
  ) {
    return <Navigate to="/force-change-password" replace />;
  }

  const rawRole = (
    typeof user.role === "string"
      ? user.role
      : user.role?.name || ""
  )
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  // 4. Super Admin bypass
  const isSuperAdmin = [
    "super_admin",
    "superadmin",
  ].includes(rawRole);

  if (isSuperAdmin) {
    return children;
  }

  // 5. Customer block
  if (rawRole === "customer") {
    return <Navigate to="/login" replace />;
  }

  // 6. Permission checker
  const checkPerm = (permission) => {
    if (!permission) return true;

    // First check AuthContext
    if (typeof hasPermission === "function") {
      if (hasPermission(permission)) {
        return true;
      }
    }

    // Fallback permission check
    const userPermissions = Array.isArray(user.role?.permissions)
      ? user.role.permissions
      : Array.isArray(user.permissions)
      ? user.permissions
      : [];

    const target = normalizePermission(permission);

    return userPermissions.some((item) => {
      return normalizePermission(item) === target;
    });
  };

  const isPermitted = Array.isArray(requiredPermission)
    ? requiredPermission.some(checkPerm)
    : checkPerm(requiredPermission);

  // 7. Access restricted UI
  if (!isPermitted) {
    const defaultPage =
      rawRole === "delivery_partner"
        ? "/delivery-tasks"
        : rawRole === "delivery_manager"
        ? "/delivery-assign"
        : rawRole === "store_manager"
        ? "/orders"
        : "/dashboard";

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
        <div className="max-w-md w-full text-center bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={26} />
          </div>

          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
            Access Restricted
          </h2>

          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Your assigned role does not have permission (
            <code className="text-xs bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono">
              {Array.isArray(requiredPermission)
                ? requiredPermission.join(", ")
                : requiredPermission}
            </code>
            ) to access this module.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-700 hover:bg-slate-800 text-sm font-medium rounded-xl text-slate-300 transition cursor-pointer"
            >
              <ArrowLeft size={16} />
              Go Back
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(defaultPage, { replace: true })
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-sm font-medium rounded-xl text-white transition shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Home size={16} />
              Go to Workspace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;