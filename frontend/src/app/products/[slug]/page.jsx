"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShoppingBag,
  ShoppingCart,
  Heart,
  Plus,
  Minus,
  Check,
  Zap,
  PackageOpen,
  Loader2,
  ShieldCheck,
  Truck,
  Layers,
  Award,
  Sparkles,
  Star,
  RefreshCcw,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

import api from "@/lib/api";
import { useCart } from "@/context/cartContext";
import { useWishlist } from "@/context/wishlistContext";

const LOCATION_KEY = "elibcart_location";

const getDisplayName = (value) => {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (value && typeof value === "object") {
    return value.name || value.title || value.label || value.unit || "";
  }
  return "";
};

export default function ProductDetailPage() {
  const { slug } = useParams();
  const router = useRouter();

  const { addToCart, cartItems } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();

  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [activeImage, setActiveImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storeId, setStoreId] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const resolvedStoreId = parsed.store?._id || parsed.store?.id || null;
        if (resolvedStoreId) {
          setStoreId(resolvedStoreId);
        }
      }
    } catch (e) {
      console.error("Location read error:", e);
    }
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      setLoading(true);
      setError("");

      try {
        const params = {};
        let activeStoreId = storeId;
        if (!activeStoreId) {
          try {
            const saved = localStorage.getItem(LOCATION_KEY);
            if (saved) {
              const parsed = JSON.parse(saved);
              activeStoreId = parsed.store?._id || parsed.store?.id || null;
            }
          } catch (e) {}
        }

        if (activeStoreId) {
          params.storeId = activeStoreId;
          params.store = activeStoreId;
        }

        const res = await api.get(`/products/slug/${slug}`, { params });

        const p = res.data?.product;
        if (!p) throw new Error("Product not found.");

        setProduct(p);
        const firstImg = p.images?.[0]?.url || p.images?.[0] || "";
        setActiveImage(firstImg);

        const variants = (p.variants || []).filter((v) => v.status !== "inactive");
        if (variants.length > 0) {
          setSelectedVariant(variants[0]);
        }
      } catch (err) {
        console.error("Product load error:", err);
        setError("Unable to load product details.");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug, storeId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Loader2 size={32} className="animate-spin text-violet-600" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
        <PackageOpen size={48} className="text-slate-300 mb-3" />
        <h1 className="text-lg font-bold text-slate-800">Product Not Found</h1>
        <p className="mt-1 text-xs text-slate-500">{error || "This item is currently unavailable."}</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-violet-700 cursor-pointer"
        >
          Back to Store
        </button>
      </div>
    );
  }

  const currentPrice = Number(
    selectedVariant?.sellingPrice ?? product.sellingPrice ?? 0
  );
  const currentMrp = Number(
    selectedVariant?.mrp ?? product.mrp ?? currentPrice
  );
  
  const availableStock = Number(
    selectedVariant?.availableQuantity ??
    product.availableQuantity ??
    product.inventory?.availableQuantity ??
    0
  );

  const discount =
    currentMrp > currentPrice
      ? Math.round(((currentMrp - currentPrice) / currentMrp) * 100)
      : 0;

  const itemIsWishlisted = isWishlisted(String(product._id));

  // Check if item is already in cart
  const itemKey = String(selectedVariant?._id || product._id);
  const cartItem = cartItems.find((it) => String(it.variantId || it._id) === itemKey);
  const currentCartQty = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = (action = "cart") => {
    if (availableStock <= 0) {
      toast.error("This item is currently out of stock.");
      return;
    }

    if (currentCartQty + quantity > availableStock) {
      toast.error(`Only ${availableStock} units available in stock!`);
      return;
    }

    addToCart({
      ...product,
      _id: String(product._id),
      variantId: itemKey,
      price: currentPrice,
      unit: selectedVariant?.name || `${selectedVariant?.unitValue || 1} ${selectedVariant?.unit || "piece"}`,
      image: activeImage || product.images?.[0]?.url,
      storeId,
      availableQuantity: availableStock,
      quantity,
    });

    if (action === "buy") {
      router.push("/checkout");
    } else {
      toast.success("Added to cart!");
    }
  };

  return (
    <main className="min-h-screen bg-white pb-24 text-slate-900 selection:bg-violet-500 selection:text-white">
      <Toaster position="top-center" reverseOrder={false} />

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 hover:text-violet-600 cursor-pointer transition"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                toggleWishlist(product);
                toast(itemIsWishlisted ? "Removed from Wishlist" : "Added to Wishlist", {
                  icon: itemIsWishlisted ? "🗑️" : "❤️",
                });
              }}
              className={`rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-2xs transition hover:scale-105 active:scale-95 cursor-pointer ${
                itemIsWishlisted ? "text-rose-500 border-rose-200 bg-rose-50" : ""
              }`}
            >
              <Heart size={18} className={itemIsWishlisted ? "fill-rose-500 text-rose-500" : ""} />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN PDP CONTENT (BLINKIT / ZEPT0 STYLE SPLIT LAYOUT) */}
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="grid gap-8 md:grid-cols-12 md:items-start">
          
          {/* LEFT: IMAGE PREVIEW (5 Cols) */}
          <div className="md:col-span-5 space-y-3">
            <div className="relative flex h-72 sm:h-80 w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 p-6">
              {discount > 0 && (
                <span className="absolute left-3 top-3 z-10 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-black text-white shadow-xs">
                  {discount}% OFF
                </span>
              )}

              {activeImage ? (
                <img
                  src={activeImage}
                  alt={product.name}
                  className="h-full w-full object-contain transition duration-300 hover:scale-105"
                />
              ) : (
                <PackageOpen size={56} className="text-slate-300" />
              )}
            </div>

            {/* THUMBNAILS */}
            {product.images?.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => {
                  const url = img.url || img;
                  const isActive = activeImage === url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(url)}
                      className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border p-1 bg-white transition cursor-pointer ${
                        isActive ? "border-violet-600 ring-2 ring-violet-100" : "border-slate-200"
                      }`}
                    >
                      <img src={url} alt="" className="h-full w-full object-contain" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: DETAILS & ACTIONS (7 Cols) */}
          <div className="md:col-span-7 space-y-5">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                <span>{getDisplayName(product.category?.name || "Groceries")}</span>
                {product.brand && (
                  <>
                    <span>•</span>
                    <span className="text-violet-600">{getDisplayName(product.brand)}</span>
                  </>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                {product.name}
              </h1>
            </div>

            {/* DELIVERY TIME & UNIT INFO */}
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100 w-fit">
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <Truck size={15} /> 10 mins delivery
              </span>
              <span>•</span>
              <span>{selectedVariant?.name || selectedVariant?.unit || "Standard pack"}</span>
            </div>

            {/* PRICE & STOCK */}
            <div className="flex items-baseline gap-3 pt-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                ₹{currentPrice.toLocaleString("en-IN")}
              </span>
              {currentMrp > currentPrice && (
                <span className="text-sm text-slate-400 line-through font-bold">
                  ₹{currentMrp.toLocaleString("en-IN")}
                </span>
              )}
              <span
                className={`ml-auto text-[11px] font-extrabold px-2.5 py-1 rounded-lg ${
                  availableStock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                }`}
              >
                {availableStock > 0 ? `In Stock (${availableStock})` : "Out of Stock"}
              </span>
            </div>

            {/* VARIANT BUTTONS (PILLS) */}
            {product.variants?.length > 0 && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Unit Options:
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const isSelected = String(selectedVariant?._id) === String(v._id);
                    return (
                      <button
                        key={v._id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                          isSelected
                            ? "border-violet-600 bg-violet-50 text-violet-700 ring-2 ring-violet-100"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                      >
                        {v.name || `${v.unitValue} ${v.unit}`} : ₹{v.sellingPrice}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ADD TO CART & BUY NOW BUTTONS */}
            <div className="grid grid-cols-2 gap-3 pt-3">
              {currentCartQty === 0 ? (
                <button
                  type="button"
                  disabled={availableStock <= 0}
                  onClick={() => handleAddToCart("cart")}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-600 bg-violet-600 py-3 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-40 cursor-pointer shadow-md shadow-violet-200 transition"
                >
                  <ShoppingCart size={15} /> Add to Cart
                </button>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentCartQty > 1) {
                        addToCart({
                          ...product,
                          _id: String(product._id),
                          variantId: itemKey,
                          price: currentPrice,
                          unit: selectedVariant?.name || "piece",
                          image: activeImage,
                          storeId,
                          availableQuantity: availableStock,
                          quantity: -1, // Decrease 1
                        });
                      } else {
                        // Remove item
                        removeFromCart(itemKey);
                      }
                    }}
                    className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                  >
                    <Minus size={15} />
                  </button>

                  <span className="text-sm font-extrabold text-emerald-800">
                    {currentCartQty} in cart
                  </span>

                  <button
                    type="button"
                    disabled={currentCartQty >= availableStock}
                    onClick={() => handleAddToCart("cart")}
                    className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              )}

              <button
                type="button"
                disabled={availableStock <= 0}
                onClick={() => handleAddToCart("buy")}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-3 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-40 cursor-pointer transition shadow-md"
              >
                <Zap size={15} className="fill-amber-400 text-amber-400" /> Buy Now
              </button>
            </div>

            {/* WHY SHOP WITH US */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-violet-600 shrink-0" />
                <span>Superfast Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>100% Authentic Quality</span>
              </div>
            </div>

            {/* PRODUCT DESCRIPTION */}
            {product.description && (
              <div className="border-t border-slate-100 pt-5 space-y-2">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Product Details
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                  {product.description}
                </p>
              </div>
            )}

            {/* SPECIFICATIONS */}
            {product.specifications?.length > 0 && (
              <div className="border-t border-slate-100 pt-5 space-y-2">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Specifications
                </h3>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs">
                  {product.specifications.map((spec, sIdx) => (
                    <div key={sIdx} className="flex justify-between py-1.5">
                      <span className="font-medium text-slate-500">{spec.key}</span>
                      <span className="font-bold text-slate-800">{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}