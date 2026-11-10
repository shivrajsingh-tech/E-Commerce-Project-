
"use client";

import { AuthProvider } from "@/context/authContext";
import { CartProvider } from "@/context/cartContext";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <CartProvider>
        {children}
      </CartProvider>
    </AuthProvider>
  );
}
