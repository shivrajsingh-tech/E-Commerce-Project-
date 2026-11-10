import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Settings,
  LogOut,
  ChevronDown,
  Folder,
  Tags,
  Package,
  Boxes,
  Store,
  ClipboardList,
  Mail,
  ShieldCheck,
  ShoppingBag as OrderIcon,
  UserCheck,
  Image as BannerIcon,
  Truck,
  Bike,
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, hasPermission } = useAuth();

  const [catalogOpen, setCatalogOpen] = useState(true);
  const [storesOpen, setStoresOpen] = useState(true);
  const [deliveryOpen, setDeliveryOpen] = useState(true);

  // Normalize current role string
  const rawRole = (
    typeof user?.role === "string" ? user.role : user?.role?.name || ""
  )
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");

  // Sirf Super Admin global bypass karega
  const isSuperAdmin = ["super_admin", "superadmin"].includes(rawRole);

  // Full foolproof permission matcher (handles dot, underscore, hyphen, singular, case)
  const can = (permission) => {
    if (isSuperAdmin) return true;

    // Direct AuthContext helper check
    if (typeof hasPermission === "function") {
      const candidates = [
        permission,                                         // roles.view
        permission.replace(/\./g, "_"),                     // roles_view
        permission.replace(/[._]/g, "-"),                   // roles-view
        permission.replace(/^roles\./, "role."),            // role.view
        permission.replace(/^roles_/, "role_"),             // role_view
        permission.toUpperCase(),                           // ROLES.VIEW
        permission.replace(/\./g, "_").toUpperCase(),       // ROLES_VIEW
      ];

      for (const cand of candidates) {
        if (hasPermission(cand)) return true;
      }
    }

    // Direct fallback array search in user object
    const userPerms =
      user?.role?.permissions ||
      user?.permissions ||
      [];

    if (Array.isArray(userPerms)) {
      const normalizedTarget = permission.toLowerCase().replace(/[._-]/g, "");
      const found = userPerms.some((p) => {
        if (typeof p !== "string") return false;
        const norm = p.toLowerCase().replace(/[._-]/g, "");
        return (
          norm === normalizedTarget ||
          norm === normalizedTarget.replace(/^roles/, "role") ||
          norm.replace(/^roles/, "role") === normalizedTarget.replace(/^roles/, "role")
        );
      });
      if (found) return true;
    }

    return false;
  };

  // --- Dynamic Sub-item Lists ---
  const catalogSubItems = [
    { name: "Categories", path: "/categories", icon: Folder, permission: "categories.view" },
    { name: "Sub Categories", path: "/subcategories", icon: Tags, permission: "subcategories.view" },
    { name: "Brands", path: "/brands", icon: Tags, permission: "brands.view" },
    { name: "Products", path: "/products", icon: Package, permission: "products.view" },
    { name: "Variants", path: "/variants", icon: Boxes, permission: "variants.view" },
  ].filter((item) => can(item.permission));

  const storeSubItems = [
    { name: "Stores", path: "/stores", icon: Store, permission: "stores.view" },
    { name: "Inventory", path: "/inventory", icon: ClipboardList, permission: "inventory.view" },
  ].filter((item) => can(item.permission));

  const deliverySubItems = [
    {
      name: "Assign Orders",
      path: "/delivery-assign",
      icon: Truck,
      permission: "deliveries.assign",
    },
    {
      name: "Delivery Tasks",
      path: "/delivery-tasks",
      icon: Bike,
      permission: "deliveries.view",
    },
  ].filter((item) => can(item.permission));

  const catalogActive = catalogSubItems.some((item) => item.path === location.pathname);
  const storesActive = storeSubItems.some((item) => item.path === location.pathname);
  const deliveryActive = deliverySubItems.some((item) => item.path === location.pathname);

  const mainLinkClass = ({ isActive }) =>
    `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
        : "text-slate-300 hover:bg-slate-900 hover:text-white"
    }`;

  const childLinkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
      isActive
        ? "bg-slate-800 text-indigo-400 font-semibold"
        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
    }`;

  const handleLogout = async () => {
    try {
      await api.post("/users/logout");
    } catch {
      try {
        await api.post("/auth/logout");
      } catch {
        // Safe proceed
      }
    } finally {
      if (typeof setUser === "function") setUser(null);
      navigate("/login", { replace: true });
    }
  };

  const fullName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Staff Member";

  const displayRole = (rawRole || "Staff")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const userInitials =
    fullName
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "OP";

  // Section Headers condition
  const showCoreOperations =
    can("dashboard.view") || can("orders.view") || can("customers.view") || can("users.view");

  const showAccessControl =
    can("users.view") || can("roles.view");

  const showSystemConfig =
    can("banners.view") || can("email_templates.view") || can("settings.view");

  return (
    <aside className="w-64 h-screen bg-slate-950 text-white fixed left-0 top-0 flex flex-col shadow-2xl select-none z-40 border-r border-slate-900">
      {/* BRAND HEADER */}
      <div className="h-20 shrink-0 px-6 border-b border-slate-900 flex items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white">
            <ShoppingBag size={19} />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide text-white">ElibCart</h1>
          </div>
        </div>
      </div>

      {/* DYNAMIC SCROLLABLE NAVIGATION */}
      <div className="sidebar-scroll p-4 space-y-1.5 flex-1 min-h-0 overflow-y-auto">
        {/* CORE OPERATIONS */}
        {showCoreOperations && (
          <>
            <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Core Operations
            </p>

            {can("dashboard.view") && (
              <NavLink to="/dashboard" className={mainLinkClass}>
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </NavLink>
            )}

            {can("orders.view") && (
              <NavLink to="/orders" className={mainLinkClass}>
                <OrderIcon size={18} />
                <span>Orders Management</span>
              </NavLink>
            )}

            {can("customers.view") && (
              <NavLink to="/customers" className={mainLinkClass}>
                <UserCheck size={18} />
                <span>Customers</span>
              </NavLink>
            )}
          </>
        )}

        {/* LOGISTICS & DELIVERIES MODULE */}
        {deliverySubItems.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setDeliveryOpen(!deliveryOpen)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                deliveryActive && !deliveryOpen
                  ? "bg-indigo-600/30 text-indigo-300"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Truck size={18} className="text-slate-400" />
                <span>Deliveries</span>
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 text-slate-400 ${
                  deliveryOpen ? "rotate-180 text-white" : ""
                }`}
              />
            </button>

            {deliveryOpen && (
              <div className="ml-5 pl-3 border-l border-slate-800 space-y-1 mt-1.5">
                {deliverySubItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.path} to={item.path} className={childLinkClass}>
                      <Icon size={15} />
                      {item.name}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CATALOG MODULE */}
        {catalogSubItems.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setCatalogOpen(!catalogOpen)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                catalogActive && !catalogOpen
                  ? "bg-indigo-600/30 text-indigo-300"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <ShoppingBag size={18} className="text-slate-400" />
                <span>Catalog</span>
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 text-slate-400 ${
                  catalogOpen ? "rotate-180 text-white" : ""
                }`}
              />
            </button>

            {catalogOpen && (
              <div className="ml-5 pl-3 border-l border-slate-800 space-y-1 mt-1.5">
                {catalogSubItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.path} to={item.path} className={childLinkClass}>
                      <Icon size={15} />
                      {item.name}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STORES & STOCK MODULE */}
        {storeSubItems.length > 0 && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setStoresOpen(!storesOpen)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                storesActive && !storesOpen
                  ? "bg-indigo-600/30 text-indigo-300"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Store size={18} className="text-slate-400" />
                <span>Stores & Stock</span>
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 text-slate-400 ${
                  storesOpen ? "rotate-180 text-white" : ""
                }`}
              />
            </button>

            {storesOpen && (
              <div className="ml-5 pl-3 border-l border-slate-800 space-y-1 mt-1.5">
                {storeSubItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.path} to={item.path} className={childLinkClass}>
                      <Icon size={15} />
                      {item.name}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ACCESS CONTROL */}
        {showAccessControl && (
          <>
            <div className="border-t border-slate-900 my-3" />
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Access Control
            </p>

            {can("users.view") && (
              <NavLink to="/users" className={mainLinkClass}>
                <Users size={18} />
                <span>User Management</span>
              </NavLink>
            )}

            {can("roles.view") && (
              <NavLink to="/role-management" className={mainLinkClass}>
                <ShieldCheck size={18} />
                <span>Role Management</span>
              </NavLink>
            )}
          </>
        )}

        {/* SYSTEM CONFIGURATION */}
        {showSystemConfig && (
          <>
            <div className="border-t border-slate-900 my-3" />
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              System
            </p>

            {can("banners.view") && (
              <NavLink to="/banners" className={mainLinkClass}>
                <BannerIcon size={18} />
                <span>Banners</span>
              </NavLink>
            )}

            {can("email_templates.view") && (
              <NavLink to="/email-templates" className={mainLinkClass}>
                <Mail size={18} />
                <span>Email Templates</span>
              </NavLink>
            )}

            {can("settings.view") && (
              <NavLink to="/settings" className={mainLinkClass}>
                <Settings size={18} />
                <span>Settings</span>
              </NavLink>
            )}
          </>
        )}
      </div>

      {/* FOOTER USER CARD */}
      <div className="shrink-0 p-4 border-t border-slate-900 bg-slate-950">
        <div className="bg-slate-900/90 rounded-xl p-3 mb-2 flex items-center gap-3 border border-slate-800/80">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs tracking-wider text-white shrink-0 shadow-sm">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{fullName}</p>
            <p className="text-[11px] text-indigo-400 font-medium truncate capitalize">
              {displayRole}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition text-xs font-semibold cursor-pointer"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;