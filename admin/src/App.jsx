import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";

// ── Lazy-loaded pages (each page becomes its own JS chunk) ───────────────────
// Auth pages load eagerly — they're the first thing the user sees
import Login               from "./pages/Login";
import ForgotPassword      from "./pages/ForgotPassword";
import VerifyOtp           from "./pages/VerifyOtp";
import ResetPassword       from "./pages/ResetPassword";
import ForceChangePassword from "./pages/ForceChangePassword";

// All other pages are lazy — only downloaded when the user navigates to them
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Users          = lazy(() => import("./pages/User"));
const Categories     = lazy(() => import("./pages/Categories"));
const SubCategories  = lazy(() => import("./pages/SubCategories"));
const Brands         = lazy(() => import("./pages/Brand"));
const Products       = lazy(() => import("./pages/Products"));
const Variants       = lazy(() => import("./pages/Varients"));
const Stores         = lazy(() => import("./pages/Stores"));
const Inventory      = lazy(() => import("./pages/Inventary"));
const Settings       = lazy(() => import("./pages/Settings"));
const EmailTemplates = lazy(() => import("./pages/EmailTemplates"));
const RoleManagement = lazy(() => import("./pages/RoleManagement"));
const Banners        = lazy(() => import("./pages/Banners"));
const Customers      = lazy(() => import("./pages/Customers"));
const Orders         = lazy(() => import("./pages/Orders"));
const DeliveryAssign = lazy(() => import("./pages/DeliveryAssign"));
const DeliveryTasks  = lazy(() => import("./pages/DeliveryTasks"));

// ── Page loading fallback ────────────────────────────────────────────────────
const PageLoader = () => (
  <div className="flex h-full min-h-screen w-full items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      <span className="text-xs font-medium text-slate-400">Loading…</span>
    </div>
  </div>
);

// ── Role-based landing ───────────────────────────────────────────────────────
const RoleBasedLanding = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/force-change-password" replace />;
  return <Navigate to="/dashboard" replace />;
};

// ── Route tree ───────────────────────────────────────────────────────────────
const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* PUBLIC AUTH */}
        <Route path="/login"                         element={<Login />} />
        <Route path="/super-admin/login"             element={<Login />} />
        <Route path="/forgot-password"               element={<ForgotPassword />} />
        <Route path="/verify-otp"                    element={<VerifyOtp />} />
        <Route path="/reset-password"                element={<ResetPassword />} />
        <Route path="/super-admin/forgot-password"   element={<ForgotPassword />} />
        <Route path="/super-admin/verify-otp"        element={<VerifyOtp />} />
        <Route path="/super-admin/reset-password"    element={<ResetPassword />} />

        {/* FORCE PASSWORD CHANGE */}
        <Route path="/force-change-password" element={
          <ProtectedRoute><ForceChangePassword /></ProtectedRoute>
        } />

        {/* ROOT */}
        <Route path="/" element={user ? <RoleBasedLanding /> : <Navigate to="/login" replace />} />

        {/* DASHBOARD */}
        <Route path="/dashboard" element={
          <ProtectedRoute><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>
        } />
        <Route path="/super-admin/dashboard" element={<Navigate to="/dashboard" replace />} />

        {/* ORDERS */}
        <Route path="/orders" element={
          <ProtectedRoute requiredPermission="orders.view">
            <AdminLayout><Orders /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/super-admin/orders" element={<Navigate to="/orders" replace />} />

        {/* CUSTOMERS */}
        <Route path="/customers" element={
          <ProtectedRoute requiredPermission="customers.view">
            <AdminLayout><Customers /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/super-admin/customers" element={<Navigate to="/customers" replace />} />

        {/* DELIVERIES */}
        <Route path="/delivery-assign" element={
          <ProtectedRoute requiredPermission="deliveries.assign">
            <AdminLayout><DeliveryAssign /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/delivery-tasks" element={
          <ProtectedRoute requiredPermission="deliveries.view">
            <AdminLayout><DeliveryTasks /></AdminLayout>
          </ProtectedRoute>
        } />

        {/* ACCESS CONTROL */}
        <Route path="/role-management" element={
          <ProtectedRoute requiredPermission="roles.view">
            <AdminLayout><RoleManagement /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/super-admin/role-management" element={<Navigate to="/role-management" replace />} />

        <Route path="/users" element={
          <ProtectedRoute requiredPermission="users.view">
            <AdminLayout><Users /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/super-admin/users" element={<Navigate to="/users" replace />} />

        {/* CATALOG */}
        <Route path="/categories" element={
          <ProtectedRoute requiredPermission="categories.view">
            <AdminLayout><Categories /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/super-admin/categories" element={<Navigate to="/categories" replace />} />

        <Route path="/subcategories" element={
          <ProtectedRoute requiredPermission="subcategories.view">
            <AdminLayout><SubCategories /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/super-admin/subcategories" element={<Navigate to="/subcategories" replace />} />

        <Route path="/brands" element={
          <ProtectedRoute requiredPermission="brands.view">
            <AdminLayout><Brands /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/super-admin/brands" element={<Navigate to="/brands" replace />} />

        <Route path="/products" element={
          <ProtectedRoute requiredPermission="products.view">
            <AdminLayout><Products /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/super-admin/products" element={<Navigate to="/products" replace />} />

        <Route path="/variants" element={
          <ProtectedRoute requiredPermission="variants.view">
            <AdminLayout><Variants /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/super-admin/variants" element={<Navigate to="/variants" replace />} />

        {/* STORES & INVENTORY */}
        <Route path="/stores" element={
          <ProtectedRoute requiredPermission="stores.view">
            <AdminLayout><Stores /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/super-admin/stores" element={<Navigate to="/stores" replace />} />

        <Route path="/inventory" element={
          <ProtectedRoute requiredPermission="inventory.view">
            <AdminLayout><Inventory /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/super-admin/inventory" element={<Navigate to="/inventory" replace />} />

        {/* BANNERS */}
        <Route path="/banners" element={
          <ProtectedRoute requiredPermission="banners.view">
            <AdminLayout><Banners /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/super-admin/banners" element={<Navigate to="/banners" replace />} />

        {/* SYSTEM */}
        <Route path="/email-templates" element={
          <ProtectedRoute requiredPermission="email_templates.view">
            <AdminLayout><EmailTemplates /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/super-admin/email-templates" element={<Navigate to="/email-templates" replace />} />

        <Route path="/settings" element={
          <ProtectedRoute requiredPermission="settings.view">
            <AdminLayout><Settings /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/super-admin/settings" element={<Navigate to="/settings" replace />} />

        {/* FALLBACKS */}
        <Route path="/super-admin" element={<Navigate to="/login" replace />} />
        <Route path="*" element={user ? <RoleBasedLanding /> : <Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
};

// ── App root ─────────────────────────────────────────────────────────────────
const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#1e293b",
            color: "#f1f5f9",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: "500",
            padding: "12px 16px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
            border: "1px solid rgba(255,255,255,0.08)",
          },
          success: { iconTheme: { primary: "#6366f1", secondary: "#fff" } },
          error:   { iconTheme: { primary: "#ef4444", secondary: "#fff" } },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
