import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/authContext";
import { CartProvider } from "@/context/cartContext";
import { WishlistProvider } from "@/context/wishlistContext";
import { ThemeProvider } from "@/context/themeContext";
import ToastWrapper from "@/components/ToastWrapper";

export const metadata = {
  title: {
    default: "ElibCart — Groceries Delivered in Minutes",
    template: "%s | ElibCart",
  },
  description:
    "Shop fresh groceries, daily essentials and household items online. Fast delivery from your nearest ElibCart store.",
  keywords: [
    "online grocery delivery",
    "groceries",
    "daily essentials",
    "quick delivery",
    "ElibCart",
  ],
  authors: [{ name: "ElibCart" }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: "ElibCart",
    title: "ElibCart — Groceries Delivered in Minutes",
    description:
      "Shop fresh groceries and daily essentials online. Fast delivery from your nearest store.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ElibCart — Groceries Delivered in Minutes",
    description:
      "Shop fresh groceries and daily essentials online.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <ToastWrapper />
                {children}
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>

        {/* Razorpay Checkout SDK — loaded only when needed */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
