"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Zap,
  ArrowLeft,
  Loader2,
  PackageOpen,
  Heart,
} from "lucide-react";

import api from "@/lib/api";
import { useAuth } from "@/context/authContext";
import { useCart } from "@/context/cartContext";
import CartDrawer from "@/components/CartDrawer";

const getDisplayName = (value) => {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    return value.name || value.title || value.label || value.unit || "";
  }
  return "";
};

const getImageUrl = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.url || item.secure_url || "";
};

const getProductImage = (product) => {
  const firstImage = Array.isArray(product?.images) ? product.images[0] : null;
  return getImageUrl(firstImage) || getImageUrl(product?.image) || "";
};

export default function WishlistPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addToCart, totalItems } = useCart();

  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Protected route
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth/login");
    }
  }, [authLoading, user, router]);

  // Fetch Wishlist Items
  const loadWishlist = async () => {
    try {
      setLoading(true);
      const res = await api.get("/wishlist/my-wishlist");
      const list = res.data?.wishlist || res.data?.data || [];
      setWishlistItems(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Wishlist load error:", err);
      setWishlistItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadWishlist();
    }
  }, [user]);

  // Pricing helper
  const getProductDetails = (product) => {
    const variant = Array.isArray(product?.variants) && product.variants.length > 0
      ? product.variants[0]
      : null;

    const originalPrice = Number(product?.price ?? variant?.price ?? 0);
    const finalPrice = Number(
      product?.discountPrice ?? variant?.discountPrice ?? originalPrice
    );

    const discountPercentage =
      originalPrice > finalPrice && originalPrice > 0
        ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
        : 0;

    return {
      variantId: String(variant?._id || product?._id),
      price: finalPrice,
      originalPrice,
      discountPercentage,
      unit: variant?.unit ? `${variant.unitValue || 1} ${variant.unit}` : "1 item",
    };
  };

  // 1. Remove Action
  const handleRemove = async (productId) => {
    try {
      setRemovingId(productId);
      await api.delete(`/wishlist/remove/${productId}`);
      setWishlistItems((prev) => prev.filter((item) => String(item._id) !== String(productId)));
    } catch (err) {
      alert(err.response?.data?.message || "Item remove nahi ho paya");
    } finally {
      setRemovingId(null);
    }
  };

  // 2. Buy Now Action
  const handleBuyNow = (product) => {
    const details = getProductDetails(product);

    // Cart me add karke seedha checkout route
    addToCart({
      ...product,
      _id: String(product._id),
      variantId: details.variantId,
      price: details.price,
      unit: details.unit,
      image: getProductImage(product),
    });

    router.push("/checkout");
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 size={32} className="animate-spin text-violet-600" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Heart size={20} className="fill-violet-700" />
              </span>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight">My Wishlist</h1>
                <p className="text-xs text-slate-500">
                  {wishlistItems.length} {wishlistItems.length === 1 ? "saved item" : "saved items"}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-white hover:bg-violet-700"
          >
            <ShoppingCart size={18} />
            <span className="text-sm font-semibold">Cart</span>
            {totalItems > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-900">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Grid Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 rounded-3xl bg-white shadow-sm">
            <Loader2 size={26} className="animate-spin text-violet-600" />
            <span className="text-sm font-medium text-slate-500">Loading your wishlist...</span>
          </div>
        ) : wishlistItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {wishlistItems.map((product) => {
              const details = getProductDetails(product);
              const imageUrl = getProductImage(product);
              const productId = String(product._id);
              const isRemoving = removingId === productId;

              return (
                <article
                  key={productId}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg sm:rounded-3xl"
                >
                  {/* Delete from wishlist button */}
                  <button
                    type="button"
                    disabled={isRemoving}
                    onClick={() => handleRemove(productId)}
                    title="Remove from wishlist"
                    className="absolute right-2.5 top-2.5 z-10 rounded-full border border-slate-200 bg-white/95 p-2 text-slate-400 shadow-sm transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    {isRemoving ? (
                      <Loader2 size={15} className="animate-spin text-rose-600" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>

                  {/* Product Image */}
                  <div className="flex h-40 items-center justify-center overflow-hidden bg-slate-50/70 p-4 sm:h-48">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={getDisplayName(product.name)}
                        className="h-full w-full object-contain transition group-hover:scale-105"
                      />
                    ) : (
                      <PackageOpen size={40} className="text-slate-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-2 min-h-10 text-xs font-bold text-slate-800 sm:text-sm">
                      {getDisplayName(product.name)}
                    </h3>
                    <p className="mt-1 text-[11px] font-medium text-slate-500">{details.unit}</p>

                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-base font-extrabold text-slate-900 sm:text-lg">
                        ₹{details.price.toLocaleString("en-IN")}
                      </span>
                      {details.originalPrice > details.price && (
                        <span className="text-xs text-slate-400 line-through">
                          ₹{details.originalPrice.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>

                    {/* Actions: Buy Now & Remove */}
                    <div className="mt-auto flex flex-col gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => handleBuyNow(product)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 active:scale-95"
                      >
                        <Zap size={14} className="fill-amber-300 text-amber-300" />
                        Buy now
                      </button>

                      <button
                        type="button"
                        disabled={isRemoving}
                        onClick={() => handleRemove(productId)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-20 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <Heart size={32} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-800">Your wishlist is empty</h2>
            <p className="mt-1 text-sm text-slate-500">
              Explore our fresh essentials and tap the heart icon to save products.
            </p>
            <button
              type="button"
              onClick={() => router.push("/account")}
              className="mt-6 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
            >
              Explore Products
            </button>
          </div>
        )}
      </div>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => {
          setIsCartOpen(false);
          router.push("/checkout");
        }}
      />
    </main>
  );
}