import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOtp from "./pages/VerifyOtp";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import Users from "./pages/User";
import Categories from "./pages/Categories";
import SubCategories from "./pages/SubCategories";
import Brands from "./pages/Brand";
import Products from "./pages/Products";
import Variants from "./pages/Varients";
import Stores from "./pages/Stores";
import Inventory from "./pages/Inventary";
import Settings from "./pages/Settings";
import EmailTemplates from "./pages/EmailTemplates";
import RoleManagement from "./pages/RoleManagement";
import Banners from "./pages/Banners";

// Customers and Orders Pages
import Customers from "./pages/Customers";
import Orders from "./pages/Orders";

import DeliveryAssign from "./pages/DeliveryAssign";
import DeliveryTasks from "./pages/DeliveryTasks";
import ForceChangePassword from "./pages/ForceChangePassword";

// SMART ROLE-BASED LANDING DISPATCHER
const RoleBasedLanding = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/force-change-password" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* ================= PUBLIC AUTH ================= */}
      <Route path="/login" element={<Login />} />
      <Route path="/super-admin/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/super-admin/forgot-password" element={<ForgotPassword />} />
      <Route path="/super-admin/verify-otp" element={<VerifyOtp />} />
      <Route path="/super-admin/reset-password" element={<ResetPassword />} />

      {/* ================= FIRST-TIME PASSWORD CHANGE LOCK ================= */}
      <Route
        path="/force-change-password"
        element={
          <ProtectedRoute>
            <ForceChangePassword />
          </ProtectedRoute>
        }
      />

      {/* ================= ROOT PATH ================= */}
      <Route
        path="/"
        element={
          user ? <RoleBasedLanding /> : <Navigate to="/login" replace />
        }
      />

      {/* ================= PROTECTED DASHBOARD ROUTES ================= */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/dashboard"
        element={<Navigate to="/dashboard" replace />}
      />

      {/* ================= ORDERS (PROTECTED) ================= */}
      <Route
        path="/orders"
        element={
          <ProtectedRoute requiredPermission="orders.view">
            <AdminLayout>
              <Orders />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/orders"
        element={<Navigate to="/orders" replace />}
      />

      {/* ================= CUSTOMERS (PROTECTED) ================= */}
      <Route
        path="/customers"
        element={
          <ProtectedRoute requiredPermission="customers.view">
            <AdminLayout>
              <Customers />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/customers"
        element={<Navigate to="/customers" replace />}
      />

      {/* ================= DELIVERIES & DISPATCH ================= */}
      <Route
        path="/delivery-assign"
        element={
          <ProtectedRoute requiredPermission="deliveries.assign">
            <AdminLayout>
              <DeliveryAssign />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/delivery-tasks"
        element={
          <ProtectedRoute requiredPermission="deliveries.view">
            <AdminLayout>
              <DeliveryTasks />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* ================= ACCESS CONTROL ================= */}
      <Route
        path="/role-management"
        element={
          <ProtectedRoute requiredPermission="roles.view">
            <AdminLayout>
              <RoleManagement />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/role-management"
        element={<Navigate to="/role-management" replace />}
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute requiredPermission="users.view">
            <AdminLayout>
              <Users />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/users"
        element={<Navigate to="/users" replace />}
      />

      {/* ================= CATALOG ================= */}
      <Route
        path="/categories"
        element={
          <ProtectedRoute requiredPermission="categories.view">
            <AdminLayout>
              <Categories />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/categories"
        element={<Navigate to="/categories" replace />}
      />

      <Route
        path="/subcategories"
        element={
          <ProtectedRoute requiredPermission="subcategories.view">
            <AdminLayout>
              <SubCategories />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/subcategories"
        element={<Navigate to="/subcategories" replace />}
      />

      <Route
        path="/brands"
        element={
          <ProtectedRoute requiredPermission="brands.view">
            <AdminLayout>
              <Brands />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/brands"
        element={<Navigate to="/brands" replace />}
      />

      <Route
        path="/products"
        element={
          <ProtectedRoute requiredPermission="products.view">
            <AdminLayout>
              <Products />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/products"
        element={<Navigate to="/products" replace />}
      />

      <Route
        path="/variants"
        element={
          <ProtectedRoute requiredPermission="variants.view">
            <AdminLayout>
              <Variants />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/variants"
        element={<Navigate to="/variants" replace />}
      />

      {/* ================= STORES & INVENTORY ================= */}
      <Route
        path="/stores"
        element={
          <ProtectedRoute requiredPermission="stores.view">
            <AdminLayout>
              <Stores />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/stores"
        element={<Navigate to="/stores" replace />}
      />

      <Route
        path="/inventory"
        element={
          <ProtectedRoute requiredPermission="inventory.view">
            <AdminLayout>
              <Inventory />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/inventory"
        element={<Navigate to="/inventory" replace />}
      />

      {/* ================= BANNERS ================= */}
      <Route
        path="/banners"
        element={
          <ProtectedRoute requiredPermission="banners.view">
            <AdminLayout>
              <Banners />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/banners"
        element={<Navigate to="/banners" replace />}
      />

      {/* ================= SYSTEM SETTINGS ================= */}
      <Route
        path="/email-templates"
        element={
          <ProtectedRoute requiredPermission="email_templates.view">
            <AdminLayout>
              <EmailTemplates />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/email-templates"
        element={<Navigate to="/email-templates" replace />}
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute requiredPermission="settings.view">
            <AdminLayout>
              <Settings />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/settings"
        element={<Navigate to="/settings" replace />}
      />

      {/* Fallbacks */}
      <Route path="/super-admin" element={<Navigate to="/login" replace />} />
      <Route
        path="*"
        element={
          user ? <RoleBasedLanding /> : <Navigate to="/login" replace />
        }
      />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;