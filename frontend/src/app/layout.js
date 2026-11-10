import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/authContext";
import { CartProvider } from "@/context/cartContext";
import { WishlistProvider } from "@/context/wishlistContext";

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="antialiased">
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              {children}
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>

        {/* Razorpay Checkout SDK */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}