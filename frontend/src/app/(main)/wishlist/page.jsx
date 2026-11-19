// src/app/wishlist/page.jsx
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
  Plus,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/context/authContext";
import { useCart } from "@/context/cartContext";
import { useWishlist } from "@/context/wishlistContext";
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

const getVariantDetails = (product) => {
  const variant = Array.isArray(product?.variants) && product.variants.length > 0
    ? product.variants[0]
    : null;

  const originalPrice = Number(
    variant?.mrp ?? 
    product?.mrp ?? 
    product?.price ?? 
    0
  );

  const finalPrice = Number(
    variant?.sellingPrice ?? 
    product?.sellingPrice ?? 
    product?.discountPrice ?? 
    originalPrice
  );

  const discountPercentage =
    originalPrice > finalPrice && originalPrice > 0
      ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
      : Number(variant?.discountPercentage || product?.discountPercentage || 0);

  const unitText = variant?.name || 
    (variant?.unit ? `${variant.unitValue || 1} ${variant.unit}` : (product?.unit || "1 item"));

  const imageUrl = variant?.images?.[0] ? getImageUrl(variant.images[0]) : getProductImage(product);

  return {
    variantId: String(variant?._id || product?._id),
    price: finalPrice > 0 ? finalPrice : originalPrice,
    originalPrice: originalPrice > 0 ? originalPrice : finalPrice,
    discountPercentage,
    unit: unitText,
    image: imageUrl,
    availableQuantity: Number(variant?.availableQuantity ?? variant?.availableToSell ?? product?.availableQuantity ?? 10),
  };
};

export default function WishlistPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart, totalItems } = useCart();
  const { wishlistItems, removeFromWishlist, loading: wishlistLoading, totalWishlist } = useWishlist();

  const [removingId, setRemovingId] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [movingAll, setMovingAll] = useState(false);

  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const controlHeader = () => {
      if (typeof window !== "undefined") {
        if (window.scrollY > lastScrollY && window.scrollY > 80) {
          setShowHeader(false);
        } else {
          setShowHeader(true);
        }
        setLastScrollY(window.scrollY);
      }
    };

    window.addEventListener("scroll", controlHeader, { passive: true });
    return () => window.removeEventListener("scroll", controlHeader);
  }, [lastScrollY]);

  const handleRemove = async (productId) => {
    try {
      setRemovingId(productId);
      await removeFromWishlist(productId);
    } catch (err) {
      console.error("Failed to remove from wishlist:", err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = (product) => {
    const details = getVariantDetails(product);

    addToCart({
      ...product,
      _id: String(product._id || product.id),
      variantId: details.variantId,
      price: details.price,
      unit: details.unit,
      image: details.image,
      availableQuantity: details.availableQuantity > 0 ? details.availableQuantity : 10,
      quantity: 1,
    });

    toast.success("Added to cart!");
  };

  const handleMoveToCart = async (product) => {
    const productId = String(product._id || product.id);
    handleAddToCart(product);
    await handleRemove(productId);
  };

  const handleBuyNow = (product) => {
    handleAddToCart(product);
    router.push("/checkout");
  };

  const handleMoveAllToCart = async () => {
    if (wishlistItems.length === 0) return;
    setMovingAll(true);
    try {
      for (const product of wishlistItems) {
        const details = getVariantDetails(product);
        addToCart({
          ...product,
          _id: String(product._id || product.id),
          variantId: details.variantId,
          price: details.price,
          unit: details.unit,
          image: details.image,
          availableQuantity: details.availableQuantity > 0 ? details.availableQuantity : 10,
          quantity: 1,
        });
        await removeFromWishlist(String(product._id || product.id));
      }
      toast.success("All items moved to cart!");
    } catch (err) {
      console.error("Move all error:", err);
    } finally {
      setMovingAll(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      <header
        className={`sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md transition-transform duration-300 ease-in-out ${
          showHeader ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 cursor-pointer"
              title="Go back"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <Heart size={20} className="fill-rose-600" />
              </span>
              <div>
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight">My Wishlist</h1>
                <p className="text-xs text-slate-500">
                  {wishlistItems.length} {wishlistItems.length === 1 ? "saved item" : "saved items"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {wishlistItems.length > 0 && (
              <button
                type="button"
                onClick={handleMoveAllToCart}
                disabled={movingAll}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50 cursor-pointer"
              >
                {movingAll ? (
                  <Loader2 size={14} className="animate-spin text-violet-600" />
                ) : (
                  <ShoppingCart size={14} />
                )}
                Move All to Cart
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-white hover:bg-violet-700 transition cursor-pointer"
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
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {wishlistLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 rounded-3xl bg-white shadow-xs">
            <Loader2 size={26} className="animate-spin text-violet-600" />
            <span className="text-sm font-medium text-slate-500">Loading your wishlist...</span>
          </div>
        ) : wishlistItems.length > 0 ? (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Saved for later
              </span>
              <button
                type="button"
                onClick={handleMoveAllToCart}
                disabled={movingAll}
                className="sm:hidden text-xs font-bold text-violet-600 hover:text-violet-800"
              >
                Move all to cart
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {wishlistItems.map((product) => {
                const details = getVariantDetails(product);
                const productId = String(product._id || product.id);
                const isRemoving = removingId === productId;

                return (
                  <article
                    key={productId}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:shadow-lg sm:rounded-3xl"
                  >
                    <button
                      type="button"
                      disabled={isRemoving}
                      onClick={() => handleRemove(productId)}
                      title="Remove from wishlist"
                      className="absolute right-2.5 top-2.5 z-10 rounded-full border border-slate-200 bg-white/95 p-2 text-slate-400 shadow-xs transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 cursor-pointer"
                    >
                      {isRemoving ? (
                        <Loader2 size={15} className="animate-spin text-rose-600" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>

                    {details.discountPercentage > 0 && (
                      <span className="absolute left-2.5 top-2.5 z-10 rounded-lg bg-emerald-500 px-2 py-1 text-[10px] font-extrabold text-white shadow-xs">
                        {details.discountPercentage}% OFF
                      </span>
                    )}

                    <div
                      onClick={() => router.push(`/products/${product.slug || productId}`)}
                      className="flex h-40 items-center justify-center overflow-hidden bg-slate-50/70 p-4 sm:h-48 cursor-pointer"
                    >
                      {details.image ? (
                        <img
                          src={details.image}
                          alt={getDisplayName(product.name || product.title)}
                          className="h-full w-full object-contain transition group-hover:scale-105"
                        />
                      ) : (
                        <PackageOpen size={40} className="text-slate-300" />
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <h3
                        onClick={() => router.push(`/products/${product.slug || productId}`)}
                        className="line-clamp-2 min-h-10 text-xs font-bold text-slate-800 sm:text-sm hover:text-violet-600 transition cursor-pointer"
                      >
                        {getDisplayName(product.name || product.title)}
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

                      <div className="mt-auto flex flex-col gap-2 pt-4">
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-violet-700 active:scale-95 cursor-pointer"
                        >
                          <ShoppingCart size={14} />
                          Add to Cart
                        </button>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleMoveToCart(product)}
                            className="flex items-center justify-center rounded-lg border border-violet-200 bg-violet-50/50 py-1.5 text-[11px] font-bold text-violet-700 transition hover:bg-violet-100 active:scale-95 cursor-pointer"
                          >
                            Move to Cart
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBuyNow(product)}
                            className="flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 cursor-pointer"
                          >
                            <Zap size={11} className="fill-amber-400 text-amber-500" />
                            Buy Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-20 text-center shadow-xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <Heart size={32} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-800">Your wishlist is empty</h2>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              Explore our fresh essentials and tap the heart icon on items you want to save for later.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 active:scale-95 cursor-pointer"
            >
              <ShoppingBag size={16} />
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
