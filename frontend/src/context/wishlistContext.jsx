// src/context/wishlistContext.jsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "./authContext";

const WishlistContext = createContext();
const LOCAL_WISHLIST_KEY = "elibcart_guest_wishlist";
const LOCATION_KEY = "elibcart_location";

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const syncDoneRef = useRef(false);
  const [loading, setLoading] = useState(false);

  // 1. Initial state starts empty to match SSR, and hydrates on client mount
  const [wishlistItems, setWishlistItems] = useState([]);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_WISHLIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setWishlistItems(parsed);
          setWishlistIds(new Set(parsed.map((item) => String(item._id || item.id || item))));
        }
      }
    } catch (e) {
      console.error("Local wishlist parse error:", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const saveLocalWishlist = (items) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Local wishlist save error:", e);
    }
  };

  // 2. Fetch Wishlist from Database for logged-in user
  const fetchWishlist = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!user || !token) return;

    try {
      setLoading(true);
      const res = await api.get("/wishlist/my-wishlist");
      const list = res.data?.wishlist || res.data?.data || [];
      const validList = Array.isArray(list) ? list : [];

      let storeId = null;
      try {
        const savedLoc = localStorage.getItem(LOCATION_KEY);
        if (savedLoc) {
          const parsed = JSON.parse(savedLoc);
          storeId = parsed?.store?._id || parsed?.storeId;
        }
      } catch (e) {}

      // Refresh product variants/pricing when needed
      const enhancedList = await Promise.all(
        validList.map(async (item) => {
          const prodObj = item.product || item;
          const prodId = prodObj._id || prodObj.id;

          if (!Array.isArray(prodObj.variants) || prodObj.variants.length === 0) {
            try {
              const variantUrl = storeId
                ? `/product-variants/product/${prodId}?storeId=${storeId}`
                : `/product-variants/product/${prodId}`;

              const vRes = await api.get(variantUrl);
              const variants = vRes.data?.variants || [];
              if (variants.length > 0) {
                return { ...prodObj, variants };
              }
            } catch (err) {
              // Fallback gracefully
            }
          }
          return prodObj;
        })
      );

      setWishlistItems(enhancedList);
      setWishlistIds(new Set(enhancedList.map((item) => String(item._id || item.id || item))));
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error("Database wishlist fetch failed:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 3. AUTO-SYNC on login: safely merge guest wishlist into database with /wishlist/sync
  useEffect(() => {
    const syncGuestWishlistToDatabase = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!user || !token || syncDoneRef.current) return;

      try {
        const stored = localStorage.getItem(LOCAL_WISHLIST_KEY);
        if (stored) {
          const guestItems = JSON.parse(stored);
          if (Array.isArray(guestItems) && guestItems.length > 0) {
            const productIds = guestItems.map((item) => String(item._id || item.id || item));
            await api.post("/wishlist/sync", { productIds });
            localStorage.removeItem(LOCAL_WISHLIST_KEY);
          }
        }
        syncDoneRef.current = true;
        await fetchWishlist();
      } catch (err) {
        if (err.response?.status !== 401) {
          console.error("Wishlist sync error on login:", err);
        }
      }
    };

    if (user) {
      const timer = setTimeout(() => {
        syncGuestWishlistToDatabase();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      syncDoneRef.current = false;
    }
  }, [user, fetchWishlist]);

  // 4. Toggle Product in Wishlist
  const toggleWishlist = async (product) => {
    const productId = String(product._id || product.id || product);
    const exists = wishlistIds.has(productId);

    const nextIds = new Set(wishlistIds);
    let nextItems = [...wishlistItems];

    if (exists) {
      nextIds.delete(productId);
      nextItems = nextItems.filter((i) => String(i._id || i.id) !== productId);
      toast("Removed from wishlist", { icon: "🤍" });
    } else {
      nextIds.add(productId);
      if (typeof product === "object") {
        nextItems.push(product);
      }
      toast.success("Saved to wishlist!");
    }

    setWishlistIds(nextIds);
    setWishlistItems(nextItems);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!user || !token) {
      saveLocalWishlist(nextItems);
      return;
    }

    try {
      await api.post("/wishlist/toggle", { productId });
    } catch (err) {
      console.error("Wishlist toggle API fail, reverting:", err);
      fetchWishlist();
    }
  };

  // 5. Remove Item from Wishlist
  const removeFromWishlist = async (productId) => {
    const idStr = String(productId);
    const nextIds = new Set(wishlistIds);
    nextIds.delete(idStr);
    const nextItems = wishlistItems.filter((i) => String(i._id || i.id) !== idStr);

    setWishlistIds(nextIds);
    setWishlistItems(nextItems);
    toast.success("Removed from wishlist");

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!user || !token) {
      saveLocalWishlist(nextItems);
      return;
    }

    try {
      await api.delete(`/wishlist/remove/${idStr}`);
    } catch (err) {
      console.error("Remove from wishlist API fail:", err);
      fetchWishlist();
    }
  };

  const isWishlisted = (productId) => wishlistIds.has(String(productId));

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        totalWishlist: wishlistIds.size,
        toggleWishlist,
        removeFromWishlist,
        isWishlisted,
        loading,
        fetchWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }
  return context;
};
