import { useState, useEffect, useCallback } from "react";
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
  Info,
} from "lucide-react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

// Which accordion section is currently open
const SECTIONS = { CATALOG: "catalog", STORES: "stores", DELIVERY: "delivery" };

// Setup dependency messages — shown as toasts when clicking items whose
// prerequisites have not yet been created.
const SETUP_MESSAGES = {
  subcategories: "Create a Category first before adding Sub-Categories.",
  brands:        "Create a Category first before adding Brands.",
  products:      "Create a Category, Sub-Category and Brand before adding Products.",
  variants:      "Create a Product first before adding Variants.",
  inventory:     "Create a Store first before managing Inventory.",
};

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, hasPermission } = useAuth();

  // ── Accordion: only one section open at a time ──────────────────────
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (section) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  // ── Setup prerequisite counts (cached) ──────────────────────────────
  const [setupCounts, setSetupCounts] = useState({
    categories: null,    // null = not yet fetched
    subcategories: null,
    brands: null,
    products: null,
    stores: null,
  });

  const fetchSetupCounts = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        api.get("/categories?limit=1"),
        api.get("/subcategories?limit=1"),
        api.get("/brands?limit=1"),
        api.get("/products?limit=1"),
        api.get("/stores?limit=1"),
      ]);

      const extract = (res) => {
        if (res.status !== "fulfilled") return 0;
        const d = res.value?.data;
        return (
          d?.pagination?.totalCategories ??
          d?.pagination?.totalSubCategories ??
          d?.pagination?.totalBrands ??
          d?.pagination?.total ??
          d?.pagination?.totalStores ??
          d?.pagination?.totalItems ??
          (Array.isArray(d?.categories)      ? d.categories.length      : null) ??
          (Array.isArray(d?.subcategories)   ? d.subcategories.length   : null) ??
          (Array.isArray(d?.brands)          ? d.brands.length          : null) ??
          (Array.isArray(d?.products)        ? d.products.length        : null) ??
          (Array.isArray(d?.stores)          ? d.stores.length          : null) ??
          0
        );
      };

      setSetupCounts({
        categories:    extract(results[0]),
        subcategories: extract(results[1]),
        brands:        extract(results[2]),
        products:      extract(results[3]),
        stores:        extract(results[4]),
      });
    } catch {
      // silent — counts just stay null
    }
  }, []);

  useEffect(() => {
    fetchSetupCounts();
  }, [fetchSetupCounts]);

  // ── Role helpers ──────────────────────────────────────────────────────
  const rawRole = (
    typeof user?.role === "string" ? user.role : user?.role?.name || ""
  ).toLowerCase().trim().replace(/[\s-]+/g, "_");

  const isSuperAdmin = ["super_admin", "superadmin"].includes(rawRole);

  const can = (permission) => {
    if (isSuperAdmin) return true;
    if (typeof hasPermission === "function") {
      const variants = [
        permission,
        permission.replace(/\./g, "_"),
        permission.replace(/[._]/g, "-"),
        permission.replace(/^roles\./, "role."),
        permission.toUpperCase(),
        permission.replace(/\./g, "_").toUpperCase(),
      ];
      for (const v of variants) {
        if (hasPermission(v)) return true;
      }
    }
    const userPerms = user?.role?.permissions || user?.permissions || [];
    if (Array.isArray(userPerms)) {
      const target = permission.toLowerCase().replace(/[._-]/g, "");
      return userPerms.some((p) => {
        if (typeof p !== "string") return false;
        const norm = p.toLowerCase().replace(/[._-]/g, "");
        return norm === target || norm.replace(/^roles/, "role") === target.replace(/^roles/, "role");
      });
    }
    return false;
  };

  // ── Prerequisite guard: show toast and block nav if prereqs missing ─
  const guardedNavigate = (path, hintKey) => {
    if (!hintKey) {
      navigate(path);
      return;
    }

    const counts = setupCounts;

    const missing = (() => {
      switch (hintKey) {
        case "subcategories":
          return counts.categories === 0 ? "No Categories exist yet. Create a Category first." : null;
        case "brands":
          return counts.categories === 0 ? "No Categories exist yet. Create a Category first." : null;
        case "products":
          if (counts.categories === 0)    return "No Categories exist yet. Create a Category first.";
          if (counts.subcategories === 0) return "No Sub-Categories exist yet. Create a Sub-Category first.";
          if (counts.brands === 0)        return "No Brands exist yet. Create a Brand first.";
          return null;
        case "variants":
          return counts.products === 0 ? "No Products exist yet. Create a Product first." : null;
        case "inventory":
          return counts.stores === 0 ? "No Stores exist yet. Create a Store first." : null;
        default:
          return null;
      }
    })();

    if (missing) {
      toast(missing, {
        icon: "⚠️",
        duration: 4000,
        style: {
          background: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fde68a",
          borderRadius: "12px",
          fontSize: "13px",
          fontWeight: "600",
        },
      });
      return; // block navigation
    }

    navigate(path);
  };

  // ── Sub-item lists — ordered by setup dependency ───────────────────────
  const catalogItems = [
    { name: "Categories",     path: "/categories",    icon: Folder,  perm: "categories.view",    hint: null },
    { name: "Sub Categories", path: "/subcategories", icon: Tags,    perm: "subcategories.view", hint: "subcategories" },
    { name: "Brands",         path: "/brands",        icon: Tags,    perm: "brands.view",        hint: "brands" },
    { name: "Products",       path: "/products",      icon: Package, perm: "products.view",      hint: "products" },
    { name: "Variants",       path: "/variants",      icon: Boxes,   perm: "variants.view",      hint: "variants" },
  ].filter((i) => can(i.perm));

  const storeItems = [
    { name: "Stores",    path: "/stores",    icon: Store,         perm: "stores.view",     hint: null },
    { name: "Inventory", path: "/inventory", icon: ClipboardList, perm: "inventory.view",  hint: "inventory" },
  ].filter((i) => can(i.perm));

  const deliveryItems = [
    { name: "Assign Orders",  path: "/delivery-assign", icon: Truck, perm: "deliveries.assign", hint: null },
    { name: "Delivery Tasks", path: "/delivery-tasks",  icon: Bike,  perm: "deliveries.view",   hint: null },
  ].filter((i) => can(i.perm));

  // ── Auto-open the section whose child is currently active ─────────────
  useEffect(() => {
    if (catalogItems.some((i) => i.path === location.pathname))  setOpenSection(SECTIONS.CATALOG);
    else if (storeItems.some((i) => i.path === location.pathname)) setOpenSection(SECTIONS.STORES);
    else if (deliveryItems.some((i) => i.path === location.pathname)) setOpenSection(SECTIONS.DELIVERY);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Visibility flags ──────────────────────────────────────────────────
  const showCoreOps   = can("dashboard.view") || can("orders.view") || can("customers.view");
  const showAccessCtl = can("users.view") || can("roles.view");
  const showSystem    = can("banners.view") || can("email_templates.view") || can("settings.view");

  // ── Style helpers ─────────────────────────────────────────────────────
  const mainLink = ({ isActive }) =>
    `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
      isActive
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
        : "text-slate-300 hover:bg-slate-900 hover:text-white"
    }`;

  const childLinkClass = (isActive) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
      isActive
        ? "bg-slate-800 text-indigo-400 font-semibold"
        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
    }`;

  const sectionBtn = (sectionKey) => {
    const isActive =
      (sectionKey === SECTIONS.CATALOG  && catalogItems.some((i) => i.path === location.pathname)) ||
      (sectionKey === SECTIONS.STORES   && storeItems.some((i) => i.path === location.pathname)) ||
      (sectionKey === SECTIONS.DELIVERY && deliveryItems.some((i) => i.path === location.pathname));
    const isOpen = openSection === sectionKey;
    return `w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
      isActive && !isOpen
        ? "bg-indigo-600/30 text-indigo-300"
        : "text-slate-300 hover:bg-slate-900 hover:text-white"
    }`;
  };

  // ── Logout ────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch {
      try { await api.post("/users/logout"); } catch { /* safe */ }
    } finally {
      localStorage.removeItem("admin_token");
      if (typeof setUser === "function") setUser(null);
      navigate("/login", { replace: true });
    }
  };

  // ── User display ──────────────────────────────────────────────────────
  const fullName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    "Staff Member";

  const displayRole = (rawRole || "Staff")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const initials =
    fullName.split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "OP";

  // ── Section renderer ──────────────────────────────────────────────────
  const AccordionSection = ({ sectionKey, label, icon: SectionIcon, items }) => {
    if (items.length === 0) return null;
    const isOpen = openSection === sectionKey;
    return (
      <div className="pt-1">
        <button
          type="button"
          onClick={() => toggleSection(sectionKey)}
          className={sectionBtn(sectionKey)}
        >
          <span className="flex items-center gap-3">
            <SectionIcon size={18} className="text-slate-400" />
            <span>{label}</span>
          </span>
          <ChevronDown
            size={16}
            className={`transition-transform duration-250 text-slate-400 ${isOpen ? "rotate-180 text-white" : ""}`}
          />
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="ml-5 pl-3 border-l border-slate-800 space-y-1 mt-1.5 pb-1">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              const hasHint = Boolean(item.hint);

              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => guardedNavigate(item.path, item.hint)}
                  className={childLinkClass(isActive)}
                >
                  <Icon size={15} />
                  <span className="flex-1 text-left">{item.name}</span>
                  {hasHint && setupCounts[item.hint.replace("subcategories", "categories")] === 0 && (
                    <span
                      title={SETUP_MESSAGES[item.hint]}
                      className="ml-1 shrink-0 text-amber-400"
                    >
                      <Info size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside className="w-64 h-screen bg-slate-950 text-white fixed left-0 top-0 flex flex-col shadow-2xl select-none z-40 border-r border-slate-900">

      {/* BRAND */}
      <div className="h-20 shrink-0 px-6 border-b border-slate-900 flex items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <ShoppingBag size={19} />
          </div>
          <h1 className="text-base font-bold tracking-wide text-white">ElibCart</h1>
        </div>
      </div>

      {/* NAV */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1.5" style={{ scrollbarWidth: "none" }}>

        {/* CORE OPERATIONS */}
        {showCoreOps && (
          <>
            <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Core Operations
            </p>
            {can("dashboard.view") && (
              <NavLink to="/dashboard" className={mainLink}>
                <LayoutDashboard size={18} /><span>Dashboard</span>
              </NavLink>
            )}
            {can("orders.view") && (
              <NavLink to="/orders" className={mainLink}>
                <OrderIcon size={18} /><span>Orders</span>
              </NavLink>
            )}
            {can("customers.view") && (
              <NavLink to="/customers" className={mainLink}>
                <UserCheck size={18} /><span>Customers</span>
              </NavLink>
            )}
          </>
        )}

        {/* CATALOG — ordered: Category → SubCategory → Brand → Product → Variant */}
        <AccordionSection
          sectionKey={SECTIONS.CATALOG}
          label="Catalog"
          icon={ShoppingBag}
          items={catalogItems}
        />

        {/* STORES & STOCK — ordered: Store → Inventory */}
        <AccordionSection
          sectionKey={SECTIONS.STORES}
          label="Stores & Stock"
          icon={Store}
          items={storeItems}
        />

        {/* DELIVERIES */}
        <AccordionSection
          sectionKey={SECTIONS.DELIVERY}
          label="Deliveries"
          icon={Truck}
          items={deliveryItems}
        />

        {/* ACCESS CONTROL */}
        {showAccessCtl && (
          <>
            <div className="border-t border-slate-900 my-3" />
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Access Control
            </p>
            {can("users.view") && (
              <NavLink to="/users" className={mainLink}>
                <Users size={18} /><span>User Management</span>
              </NavLink>
            )}
            {can("roles.view") && (
              <NavLink to="/role-management" className={mainLink}>
                <ShieldCheck size={18} /><span>Role Management</span>
              </NavLink>
            )}
          </>
        )}

        {/* SYSTEM */}
        {showSystem && (
          <>
            <div className="border-t border-slate-900 my-3" />
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              System
            </p>
            {can("banners.view") && (
              <NavLink to="/banners" className={mainLink}>
                <BannerIcon size={18} /><span>Banners</span>
              </NavLink>
            )}
            {can("email_templates.view") && (
              <NavLink to="/email-templates" className={mainLink}>
                <Mail size={18} /><span>Email Templates</span>
              </NavLink>
            )}
            {can("settings.view") && (
              <NavLink to="/settings" className={mainLink}>
                <Settings size={18} /><span>Settings</span>
              </NavLink>
            )}
          </>
        )}
      </div>

      {/* FOOTER USER CARD */}
      <div className="shrink-0 p-4 border-t border-slate-900">
        <div className="bg-slate-900/90 rounded-xl p-3 mb-2 flex items-center gap-3 border border-slate-800/80">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs tracking-wider text-white shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{fullName}</p>
            <p className="text-[11px] text-indigo-400 font-medium capitalize">{displayRole}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition text-xs font-semibold cursor-pointer"
        >
          <LogOut size={16} /><span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
