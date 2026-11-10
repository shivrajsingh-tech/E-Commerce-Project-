"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";
import { useAuth } from "./authContext";

const WishlistContext = createContext();
const LOCAL_WISHLIST_KEY = "elibcart_guest_wishlist";

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const syncDoneRef = useRef(false);

  // 1. Initial Load: LocalStorage se guest wishlist load karna
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
    }
  }, []);

  // 2. Database se wishlist fetch karna
  const fetchWishlist = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await api.get("/wishlist/my-wishlist");
      const list = res.data?.wishlist || res.data?.data || [];
      const validList = Array.isArray(list) ? list : [];

      setWishlistItems(validList);
      setWishlistIds(new Set(validList.map((item) => String(item._id || item.id || item))));
    } catch (err) {
      console.error("Database wishlist fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // 3. AUTO-SYNC: Login hone par Guest Wishlist ko Database me merge karna (With 300ms Delay)
  useEffect(() => {
    const syncGuestWishlistToDatabase = async () => {
      if (!user || syncDoneRef.current) return;

      try {
        const stored = localStorage.getItem(LOCAL_WISHLIST_KEY);
        if (stored) {
          const guestItems = JSON.parse(stored);
          if (Array.isArray(guestItems) && guestItems.length > 0) {
            // Har ek guest product ko database me push karna
            for (const item of guestItems) {
              const productId = String(item._id || item.id || item);
              try {
                await api.post("/wishlist/toggle", { productId });
              } catch (syncErr) {
                console.error("Sync item error:", syncErr);
              }
            }
            // Sync complete hone par guest storage clean karein
            localStorage.removeItem(LOCAL_WISHLIST_KEY);
          }
        }
        syncDoneRef.current = true;
        // Fresh database items fetch karein
        await fetchWishlist();
      } catch (err) {
        console.error("Wishlist sync error on login:", err);
      }
    };

    if (user) {
      // 🛠️ Cookie/Session ko set hone ka thoda time dene ke liye timeout lagaya hai
      const timer = setTimeout(() => {
        syncGuestWishlistToDatabase();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      syncDoneRef.current = false;
    }
  }, [user, fetchWishlist]);

  // 4. Toggle Product (Guest = localStorage, Logged-in = API)
  const toggleWishlist = async (product) => {
    const productId = String(product._id || product.id || product);
    const exists = wishlistIds.has(productId);

    // Instant UI state update
    const nextIds = new Set(wishlistIds);
    let nextItems = [...wishlistItems];

    if (exists) {
      nextIds.delete(productId);
      nextItems = nextItems.filter((i) => String(i._id || i.id) !== productId);
    } else {
      nextIds.add(productId);
      if (typeof product === "object") {
        nextItems.push(product);
      }
    }

    setWishlistIds(nextIds);
    setWishlistItems(nextItems);

    // Agar User Logged in nahi hai -> LocalStorage me save karo
    if (!user) {
      try {
        localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(nextItems));
      } catch (e) {
        console.error("Local wishlist save error:", e);
      }
      return;
    }

    // Agar User Logged in hai -> Database API call
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

    if (!user) {
      localStorage.setItem(LOCAL_WISHLIST_KEY, JSON.stringify(nextItems));
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

export const useWishlist = () => useContext(WishlistContext);