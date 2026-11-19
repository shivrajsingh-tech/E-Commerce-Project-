// src/components/Header.jsx
"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, ShoppingCart, Heart, LogIn, MapPin, ChevronRight, Search, Menu, LogOut, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authContext";
import { useCart } from "@/context/cartContext";
import { useWishlist } from "@/context/wishlistContext";

export default function Header({ 
  locationLabel = "Select location", 
  onLocationClick,
  searchValue = "",
  onSearchChange,
  showMenuButton = false,
  onMenuClick,
  activeTab,
  onTabChange,
  ordersCount = 0
}) {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const { totalItems } = useCart();
  const { totalWishlist } = useWishlist();

  // Smart Scroll Hide/Show Logic
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header
      className={`sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-xs backdrop-blur-xl w-full transition-transform duration-300 ease-in-out ${
        showHeader ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          {showMenuButton && (
            <button
              type="button"
              onClick={onMenuClick}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              title="Open Menu"
            >
              <Menu size={22} />
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex shrink-0 items-center gap-2.5 cursor-pointer"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-200">
              <ShoppingBag size={22} />
            </span>
            <span className="text-xl font-extrabold tracking-tight">
              Elib<span className="text-violet-600">Cart</span>
            </span>
          </button>
        </div>

        {/* LOCATION SELECTOR */}
        {onLocationClick && (
          <button
            type="button"
            onClick={onLocationClick}
            className="order-3 flex w-full min-w-0 items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-left sm:order-none sm:w-auto sm:max-w-xs cursor-pointer"
          >
            <MapPin size={19} className="shrink-0 text-violet-600" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold text-slate-500">
                Delivering to
              </span>
              <span className="block truncate text-xs font-extrabold text-slate-800">
                {locationLabel}
              </span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-violet-600" />
          </button>
        )}

        {/* SEARCH */}
        {onSearchChange && (
          <div className="hidden max-w-xl flex-1 md:block px-4">
            <div className="relative">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search groceries, brands, and daily essentials..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
              />
            </div>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* TAB SWITCHER (For Account Page) */}
          {onTabChange && (
            <div className="hidden sm:flex items-center rounded-xl bg-slate-100 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => onTabChange("shop")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === "shop"
                    ? "bg-white text-violet-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Store
              </button>
              <button
                type="button"
                onClick={() => onTabChange("orders")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === "orders"
                    ? "bg-white text-violet-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package size={14} />
                Orders
                {ordersCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] text-white">
                    {ordersCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* WISHLIST */}
          <button
            type="button"
            onClick={() => router.push("/wishlist")}
            title="My Wishlist"
            className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
          >
            <Heart
              size={19}
              className={totalWishlist > 0 ? "fill-rose-500 text-rose-500" : ""}
            />
            {totalWishlist > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-extrabold text-white shadow-xs">
                {totalWishlist}
              </span>
            )}
          </button>

          {/* ACCOUNT / AUTH / LOGOUT */}
          {!authLoading && user ? (
            <button
              type="button"
              onClick={() => router.push("/account")}
              className="hidden text-right transition hover:opacity-80 sm:block cursor-pointer"
            >
              <p className="text-xs text-slate-500">My Account</p>
              <p className="max-w-36 truncate text-sm font-bold">
                {user?.name || user?.firstName || user?.email || "Account"}
              </p>
            </button>
          ) : !authLoading ? (
            <button
              type="button"
              onClick={() => router.push("/auth/login")}
              className="flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-bold text-violet-700 transition hover:bg-violet-100 cursor-pointer"
            >
              <LogIn size={15} />
              Sign In
            </button>
          ) : null}

          {user && onTabChange && (
            <button
              type="button"
              onClick={logout}
              title="Log out"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
            >
              <LogOut size={18} />
            </button>
          )}

          {/* CART */}
          <button
            type="button"
            onClick={() => router.push("/cart")} // Ya apna cart drawer open handler
            className="relative flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-white transition hover:bg-violet-700 cursor-pointer"
          >
            <ShoppingCart size={19} />
            <span className="hidden text-sm font-semibold sm:inline">
              Cart
            </span>
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-extrabold text-slate-900">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* MOBILE SEARCH */}
      {onSearchChange && (
        <div className="px-4 pb-3 md:hidden">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search groceries..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-4 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            />
          </div>
        </div>
      )}
    </header>
  );
}