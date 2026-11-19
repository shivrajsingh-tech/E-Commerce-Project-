// src/context/cartContext.jsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuth } from "./authContext";

const CartContext = createContext();
const LOCAL_CART_KEY = "elibcart_guest_cart";

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const syncDoneRef = useRef(false);

  const getItemKey = (item) => {
    if (!item) return "";
    const prodId = String(item.product?._id || item.product || item._id || item.id || "");
    const varId = String(item.variantId || "");
    return varId ? `${prodId}_${varId}` : prodId;
  };

  // 1. Initial state starts empty to match SSR, and hydrates on client mount
  const [cartItems, setCartItems] = useState([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CART_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCartItems(parsed);
        }
      }
    } catch (e) {
      console.error("Cart storage load error", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const saveLocalCart = (items) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Local cart save error", e);
    }
  };

  // 2. Fetch cart from Database when user logs in
  const fetchCart = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!user || !token) return;

    try {
      const res = await api.get("/cart/my-cart");
      const serverItems = res.data?.cart?.items || [];

      const formatted = serverItems.map((item) => ({
        ...item.product,
        _id: String(item.product?._id || item.product),
        cartItemId: String(item._id || ""),
        variantId: item.variantId ? String(item.variantId) : null,
        quantity: Number(item.quantity || 1),
        price: Number(item.price || item.product?.sellingPrice || item.product?.price || 0),
        unit: item.unit || item.product?.unit || "1 item",
        image: item.image || item.product?.images?.[0]?.url || item.product?.image || "",
        storeId: item.storeId || null,
        availableQuantity: Number(
          item.product?.availableQuantity ??
          item.product?.stock ??
          99
        ),
      }));

      setCartItems(formatted);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error("Database cart fetch failed:", err);
      }
    }
  }, [user]);

  // 3. AUTO-SYNC on login: merge guest cart into user database cart safely
  useEffect(() => {
    const syncGuestCartToDatabase = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!user || !token || syncDoneRef.current) return;

      try {
        const stored = localStorage.getItem(LOCAL_CART_KEY);
        if (stored) {
          const guestItems = JSON.parse(stored);
          if (Array.isArray(guestItems) && guestItems.length > 0) {
            await api.post("/cart/sync", { localItems: guestItems });
            localStorage.removeItem(LOCAL_CART_KEY);
          }
        }
        syncDoneRef.current = true;
        await fetchCart();
      } catch (err) {
        if (err.response?.status !== 401) {
          console.error("Cart sync error on login:", err);
        }
      }
    };

    if (user) {
      const timer = setTimeout(() => {
        syncGuestCartToDatabase();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      syncDoneRef.current = false;
    }
  }, [user, fetchCart]);

  // 4. ADD TO CART / INCREASE QUANTITY
  const addToCart = async (product, qtyToAdd = 1) => {
    const maxStock = Number(
      product.availableQuantity ?? product.stock ?? product.inventory?.availableQuantity ?? 99
    );
    const incomingQty = Number(product.quantity || qtyToAdd || 1);
    const key = getItemKey(product);

    let updatedList = [];
    let stockReached = false;

    setCartItems((prev) => {
      const existing = prev.find((item) => getItemKey(item) === key);

      if (existing) {
        const newQty = existing.quantity + incomingQty;
        if (newQty > maxStock) {
          stockReached = true;
          return prev;
        }
        updatedList = prev.map((item) =>
          getItemKey(item) === key
            ? { ...item, quantity: newQty, availableQuantity: maxStock }
            : item
        );
      } else {
        if (incomingQty > maxStock) {
          stockReached = true;
          return prev;
        }
        updatedList = [
          ...prev,
          {
            ...product,
            _id: String(product._id || product.id),
            variantId: product.variantId ? String(product.variantId) : null,
            quantity: incomingQty,
            availableQuantity: maxStock,
          },
        ];
      }
      return updatedList;
    });

    if (stockReached) {
      toast.error(`Maximum available stock reached (${maxStock} units)`);
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!user || !token) {
      saveLocalCart(updatedList);
      return;
    }

    try {
      await api.post("/cart/add", {
        productId: String(product._id || product.id),
        variantId: product.variantId ? String(product.variantId) : null,
        quantity: incomingQty,
        price: Number(product.price || 0),
        unit: product.unit || "1 item",
        image: product.image || "",
        storeId: product.storeId || null,
      });
    } catch (err) {
      console.error("Add to cart API failed:", err);
      fetchCart();
    }
  };

  // 5. REMOVE / DECREASE QUANTITY BY 1
  const removeFromCart = async (targetId) => {
    const idStr = String(targetId);
    let updatedList = [];
    let itemToUpdate = null;
    let willRemove = false;

    setCartItems((prev) => {
      const existing = prev.find(
        (item) =>
          getItemKey(item) === idStr ||
          String(item.variantId) === idStr ||
          String(item._id) === idStr ||
          String(item.cartItemId) === idStr
      );

      if (!existing) return prev;
      itemToUpdate = existing;

      if (existing.quantity <= 1) {
        willRemove = true;
        updatedList = prev.filter(
          (item) =>
            getItemKey(item) !== idStr &&
            String(item.variantId) !== idStr &&
            String(item._id) !== idStr &&
            String(item.cartItemId) !== idStr
        );
      } else {
        const nextQty = existing.quantity - 1;
        updatedList = prev.map((item) =>
          getItemKey(item) === idStr ||
          String(item.variantId) === idStr ||
          String(item._id) === idStr ||
          String(item.cartItemId) === idStr
            ? { ...item, quantity: nextQty }
            : item
        );
      }
      return updatedList;
    });

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!user || !token) {
      saveLocalCart(updatedList);
      return;
    }

    if (!itemToUpdate) return;

    try {
      if (willRemove) {
        const removeTarget = itemToUpdate.cartItemId || itemToUpdate.variantId || itemToUpdate._id;
        await api.delete(`/cart/remove/${removeTarget}`);
      } else {
        await api.put("/cart/quantity", {
          productId: String(itemToUpdate._id),
          variantId: itemToUpdate.variantId || null,
          quantity: itemToUpdate.quantity - 1,
        });
      }
    } catch (err) {
      console.error("Update cart quantity API failed:", err);
      fetchCart();
    }
  };

  // 6. DELETE ITEM COMPLETELY
  const deleteFromCart = async (targetId) => {
    const idStr = String(targetId);
    let itemToRemove = null;
    let updatedList = [];

    setCartItems((prev) => {
      itemToRemove = prev.find(
        (item) =>
          getItemKey(item) === idStr ||
          String(item.variantId) === idStr ||
          String(item._id) === idStr ||
          String(item.cartItemId) === idStr
      );
      updatedList = prev.filter(
        (item) =>
          getItemKey(item) !== idStr &&
          String(item.variantId) !== idStr &&
          String(item._id) !== idStr &&
          String(item.cartItemId) !== idStr
      );
      return updatedList;
    });

    toast.success("Item removed from cart");

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!user || !token) {
      saveLocalCart(updatedList);
      return;
    }

    if (!itemToRemove) return;

    try {
      const removeTarget = itemToRemove.cartItemId || itemToRemove.variantId || itemToRemove._id;
      await api.delete(`/cart/remove/${removeTarget}`);
    } catch (err) {
      console.error("Delete from cart API failed:", err);
      fetchCart();
    }
  };

  // 7. CLEAR ALL ITEMS FROM CART
  const clearCart = () => {
    setCartItems([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_CART_KEY);
    }
  };

  const totalItems = cartItems.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0);
  const totalAmount = cartItems.reduce(
    (acc, curr) => acc + Number(curr.price || 0) * Number(curr.quantity || 0),
    0
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        deleteFromCart,
        clearCart,
        totalItems,
        totalAmount,
        fetchCart,
        getItemKey,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
};
