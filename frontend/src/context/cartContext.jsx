"use client";

import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("elibcart_cart");
      if (saved) setCartItems(JSON.parse(saved));
    } catch (e) {
      console.error("Cart storage load error", e);
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    try {
      localStorage.setItem("elibcart_cart", JSON.stringify(cartItems));
    } catch (e) {
      console.error("Cart storage save error", e);
    }
  }, [cartItems]);

  const getItemKey = (item) => {
    return String(item.variantId || item._id);
  };

  // ADD TO CART WITH STOCK CEILING CHECK
  const addToCart = (product) => {
    const key = getItemKey(product);
    const maxStock = Number(product.availableQuantity ?? product.stock ?? 999);

    setCartItems((prev) => {
      const existing = prev.find((item) => getItemKey(item) === key);
      const incomingQty = product.quantity || 1;

      if (existing) {
        const newQty = existing.quantity + incomingQty;
        if (newQty > maxStock) {
          alert(`Sorry! Only ${maxStock} units available in stock.`);
          return prev;
        }
        return prev.map((item) =>
          getItemKey(item) === key
            ? { ...item, quantity: newQty, availableQuantity: maxStock }
            : item
        );
      }

      if (incomingQty > maxStock) {
        alert(`Sorry! Only ${maxStock} units available in stock.`);
        return prev;
      }

      return [
        ...prev,
        {
          ...product,
          quantity: incomingQty,
          availableQuantity: maxStock,
        },
      ];
    });
  };

  // REMOVE / DECREASE QUANTITY
  const removeFromCart = (targetId) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => getItemKey(item) === String(targetId));
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((item) => getItemKey(item) !== String(targetId));
      }
      return prev.map((item) =>
        getItemKey(item) === String(targetId)
          ? { ...item, quantity: item.quantity - 1 }
          : item
      );
    });
  };

  // DELETE SPECIFIC ITEM COMPLETELY
  const deleteFromCart = (targetId) => {
    setCartItems((prev) =>
      prev.filter((item) => getItemKey(item) !== String(targetId))
    );
  };

  // FLUSH CART
  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem("elibcart_cart");
  };

  const totalItems = cartItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);