// src/components/MainLayout.jsx
"use client";

import { useState, useEffect } from "react";
import { ShoppingBag, ShoppingCart, Heart, LogIn, MapPin, ChevronRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authContext";
import { useCart } from "@/context/cartContext";
import { useWishlist } from "@/context/wishlistContext";

export default function MainLayout({ 
  children, 
  locationLabel = "Select location", 
  onLocationClick,
  searchValue = "",
  onSearchChange 
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { totalItems } = useCart();
  const { totalWishlist } = useWishlist();

  // Smart Scroll Hide/Show Logic
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < lastScrollY || currentScrollY < 50) {
        setShowHeader(true); // Upar scroll karne par header turant dikhega
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowHeader(false); // Niche scroll karne par header chup jayega
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-violet-500 selection:text-white">
      {/* 1. STICKY HIDE/SHOW HEADER */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md transition-transform duration-300 ease-in-out ${
          showHeader ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-8">
          {/* Logo */}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-md">
              <ShoppingBag size={20} />
            </span>
            <span className="text-xl font-extrabold tracking-tight">
              Elib<span className="text-violet-600">Cart</span>
            </span>
          </button>

          {/* Location Button */}
          {onLocationClick && (
            <button
              type="button"
              onClick={onLocationClick}
              className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-left cursor-pointer"
            >
              <MapPin size={17} className="text-violet-600 shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-slate-500 leading-tight">Delivering to</p>
                <p className="text-xs font-bold text-slate-800 truncate max-w-[150px] sm:max-w-[200px]">{locationLabel}</p>
              </div>
              <ChevronRight size={15} className="text-violet-600" />
            </button>
          )}

          {/* Optional Search Bar inside Header */}
          {onSearchChange && (
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search groceries, essentials..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs outline-none focus:border-violet-500 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Right Icons (Wishlist, Account, Cart) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/wishlist")}
              className="relative p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
              title="Wishlist"
            >
              <Heart size={18} className={totalWishlist > 0 ? "fill-rose-500 text-rose-500" : ""} />
              {totalWishlist > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {totalWishlist}
                </span>
              )}
            </button>

            {!authLoading && user ? (
              <button
                type="button"
                onClick={() => router.push("/account")}
                className="hidden sm:block text-right cursor-pointer"
              >
                <p className="text-[10px] text-slate-500">My Account</p>
                <p className="text-xs font-bold truncate max-w-[120px]">{user?.name || user?.email || "Account"}</p>
              </button>
            ) : !authLoading ? (
              <button
                type="button"
                onClick={() => router.push("/auth/login")}
                className="flex items-center gap-1.5 rounded-xl bg-violet-50 border border-violet-200 px-3.5 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100 cursor-pointer"
              >
                <LogIn size={14} /> Sign In
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => router.push("/cart")}
              className="relative flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-white hover:bg-violet-700 transition cursor-pointer"
            >
              <ShoppingCart size={18} />
              <span className="hidden sm:inline text-xs font-semibold">Cart</span>
              {totalItems > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-extrabold text-slate-900">
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN CONTENT WRAPPER (pt-20 taaki header ke niche content chupe na) */}
      <main className="flex-1 pt-20 w-full">{children}</main>

      {/* 3. GLOBAL FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-10 mt-16 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white font-bold">
              <ShoppingBag size={16} />
            </span>
            <span className="font-extrabold text-slate-900 text-sm">ElibCart</span>
          </div>
          <p>© {new Date().getFullYear()} ElibCart Technologies Inc. All rights reserved.</p>
          <div className="flex gap-6 font-medium">
            <a href="#" className="hover:text-violet-600">Privacy Policy</a>
            <a href="#" className="hover:text-violet-600">Terms of Service</a>
            <a href="#" className="hover:text-violet-600">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}