"use client";

import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  PackageOpen,
  ShieldCheck,
  Truck,
  Sparkles,
  Tag,
} from "lucide-react";
import { useCart } from "@/context/cartContext";

const FREE_DELIVERY_THRESHOLD = 299;

export default function CartPage() {
  const router = useRouter();
  const {
    cartItems,
    addToCart,
    removeFromCart,
    deleteFromCart,
    clearCart,
    totalItems,
    totalAmount,
    getItemKey,
  } = useCart();

  const isEligibleForFreeDelivery = totalAmount >= FREE_DELIVERY_THRESHOLD;
  const amountNeededForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - totalAmount);
  const deliveryFee = isEligibleForFreeDelivery || totalAmount === 0 ? 0 : 40;
  const grandTotal = totalAmount + deliveryFee;

  const totalMrp = cartItems.reduce((acc, curr) => {
    const mrp = Number(curr.mrp || curr.originalPrice || curr.price || 0);
    return acc + mrp * Number(curr.quantity || 1);
  }, 0);

  const totalSavings = Math.max(0, totalMrp - totalAmount);

  return (
    <div className="pb-20">
      {/* PAGE TITLE BAR */}
      <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft size={16} /> Continue Shopping
          </button>
          <div className="text-center">
            <h1 className="text-base font-extrabold text-slate-800">Shopping Cart</h1>
            <p className="text-[11px] text-slate-400">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </p>
          </div>
          {cartItems.length > 0 ? (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
            >
              Clear Cart
            </button>
          ) : (
            <div className="w-16" />
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {cartItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-50 text-violet-600 mb-4">
              <PackageOpen size={44} />
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">Your cart is empty</h2>
            <p className="mt-2 text-xs text-slate-400 max-w-sm mx-auto">
              Looks like you haven&apos;t added any items to your shopping cart yet. Explore our fresh catalog and discover daily discounts!
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-violet-200 hover:bg-violet-700 cursor-pointer transition active:scale-95"
            >
              <ShoppingBag size={16} />
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
            {/* ITEMS LIST */}
            <div className="space-y-4">
              {/* DELIVERY PROGRESS BAR */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2.5 text-xs">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isEligibleForFreeDelivery ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"}`}>
                    <Truck size={17} />
                  </div>
                  <div className="flex-1">
                    {isEligibleForFreeDelivery ? (
                      <p className="font-bold text-emerald-700">
                        🎉 Congratulations! You unlocked <span className="underline">FREE Delivery</span>!
                      </p>
                    ) : (
                      <p className="font-semibold text-slate-700">
                        Add <strong className="text-violet-700 font-extrabold">₹{amountNeededForFreeDelivery.toFixed(0)}</strong> more to get <strong>FREE Delivery</strong>
                      </p>
                    )}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-gradient-to-r from-violet-600 to-emerald-500 transition-all duration-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (totalAmount / FREE_DELIVERY_THRESHOLD) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {cartItems.map((item) => {
                const key = getItemKey(item);
                const price = Number(item.price || 0);
                const mrp = Number(item.mrp || item.originalPrice || price);
                const maxStock = Number(item.availableQuantity || 99);
                const isMaxReached = item.quantity >= maxStock;

                return (
                  <div
                    key={key}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:border-slate-300"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="flex h-18 w-18 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-contain p-1.5"
                          />
                        ) : (
                          <ShoppingBag size={24} className="text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-800 truncate">{item.name}</h3>
                        <p className="text-xs text-slate-400">{item.unit || "1 pack"}</p>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-sm font-extrabold text-slate-900">
                            ₹{price.toFixed(2)}
                          </span>
                          {mrp > price && (
                            <span className="text-xs text-slate-400 line-through">
                              ₹{mrp.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-5">
                      {/* PLUS MINUS */}
                      <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1">
                        <button
                          type="button"
                          onClick={() => removeFromCart(key)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 cursor-pointer transition"
                          title="Decrease"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="min-w-5 text-center text-xs font-extrabold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isMaxReached}
                          onClick={() => addToCart(item)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                          title={isMaxReached ? "Maximum stock reached" : "Increase"}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <span className="text-sm font-extrabold text-slate-900 min-w-16 text-right">
                        ₹{(price * item.quantity).toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => deleteFromCart(key)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer transition"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SUMMARY ASIDE */}
            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs h-fit space-y-4">
              <h2 className="text-base font-extrabold text-slate-800">Bill Details</h2>

              <div className="space-y-3 text-xs text-slate-600 border-b border-slate-100 pb-4">
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-slate-900">₹{totalAmount.toFixed(2)}</span>
                </div>

                {totalSavings > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-1 font-semibold">
                      <Tag size={13} /> Product Discounts
                    </span>
                    <span className="font-bold">-₹{totalSavings.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Delivery Partner Fee</span>
                  {deliveryFee === 0 ? (
                    <span className="font-bold text-emerald-600">FREE</span>
                  ) : (
                    <span className="font-bold text-slate-900">₹{deliveryFee.toFixed(2)}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-base font-extrabold text-slate-900 pt-1">
                <span>To Pay</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>

              {totalSavings > 0 && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-2.5 text-center text-xs font-bold text-emerald-700 flex items-center justify-center gap-1.5">
                  <Sparkles size={14} /> You save ₹{totalSavings.toFixed(2)} on this order!
                </div>
              )}

              <button
                type="button"
                onClick={() => router.push("/checkout")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-xs font-extrabold text-white shadow-md shadow-violet-200 hover:bg-violet-700 cursor-pointer transition active:scale-95"
              >
                Proceed to Checkout <ArrowRight size={15} />
              </button>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center pt-2">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>100% Safe & Secure Checkout</span>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
