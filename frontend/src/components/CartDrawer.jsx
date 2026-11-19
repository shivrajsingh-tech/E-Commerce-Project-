// src/components/CartDrawer.jsx
"use client";

import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  PackageOpen,
  Truck,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/context/cartContext";

const FREE_DELIVERY_THRESHOLD = 299;

export default function CartDrawer({ isOpen, onClose, onCheckout }) {
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

  if (!isOpen) return null;

  const isEligibleForFreeDelivery = totalAmount >= FREE_DELIVERY_THRESHOLD;
  const amountNeeded = Math.max(0, FREE_DELIVERY_THRESHOLD - totalAmount);

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-black/60 backdrop-blur-xs">
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <ShoppingBag size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Your Cart</h2>
              <p className="text-xs text-slate-500">
                {totalItems} {totalItems === 1 ? "item" : "items"} added
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-semibold text-rose-500 hover:text-rose-700 mr-2 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* FREE DELIVERY BANNER */}
        {cartItems.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-2.5">
            <div className="flex items-center gap-2 text-xs">
              <Truck size={15} className={isEligibleForFreeDelivery ? "text-emerald-600" : "text-violet-600"} />
              {isEligibleForFreeDelivery ? (
                <span className="font-bold text-emerald-700">You unlocked FREE Delivery! 🎉</span>
              ) : (
                <span className="text-slate-600">
                  Add <strong className="text-violet-700">₹{amountNeeded.toFixed(0)}</strong> more for <strong>FREE Delivery</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* ITEMS LIST */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
          {cartItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                <PackageOpen size={36} />
              </div>
              <p className="font-bold text-slate-800">Your cart is empty</p>
              <p className="mt-1 text-xs text-slate-400 max-w-xs">
                Browse our fresh products and essentials to get started.
              </p>
            </div>
          ) : (
            cartItems.map((item) => {
              const key = getItemKey(item);
              const price = Number(item.price || 0);
              const maxStock = Number(item.availableQuantity || 99);
              const isMaxReached = item.quantity >= maxStock;

              return (
                <div
                  key={key}
                  className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 transition hover:bg-slate-50"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/60 bg-white">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <ShoppingBag size={20} className="text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xs font-bold text-slate-800">
                      {item.name}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {item.unit || "1 pack"} • ₹{price.toFixed(2)}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between">
                      {/* PLUS & MINUS CONTROLS */}
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => removeFromCart(key)}
                          className="text-slate-600 hover:text-slate-900 cursor-pointer"
                          title="Decrease"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="min-w-4 text-center text-xs font-bold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isMaxReached}
                          onClick={() => addToCart(item)}
                          className="text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
                          title={isMaxReached ? "Stock limit reached" : "Increase"}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-extrabold text-slate-900">
                          ₹{(price * item.quantity).toFixed(2)}
                        </span>

                        <button
                          type="button"
                          onClick={() => deleteFromCart(key)}
                          className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        {cartItems.length > 0 && (
          <div className="border-t border-slate-100 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-600">Subtotal</span>
              <span className="text-base font-extrabold text-slate-900">
                ₹{Number(totalAmount).toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push("/cart");
                }}
                className="w-full rounded-xl border border-slate-200 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition active:scale-95"
              >
                View Full Cart
              </button>

              <button
                type="button"
                onClick={onCheckout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 text-xs font-extrabold text-white shadow-md shadow-violet-200 hover:bg-violet-700 cursor-pointer transition active:scale-95"
              >
                Checkout <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
