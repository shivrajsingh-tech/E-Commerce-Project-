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
} from "lucide-react";
import { useCart } from "@/context/cartContext";

export default function CartPage() {
  const router = useRouter();
  const { cartItems, addToCart, removeFromCart, deleteFromCart, totalItems, totalAmount } =
    useCart();

  const getItemKey = (item) => String(item.variantId || item._id);

  return (
    <main className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className="text-base font-extrabold text-slate-800">Shopping Cart</h1>
          <span className="text-xs font-semibold text-slate-400">
            {totalItems} items
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {cartItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
            <PackageOpen size={48} className="mx-auto text-slate-300 mb-3" />
            <h2 className="text-lg font-bold text-slate-800">Your cart is empty</h2>
            <p className="mt-1 text-xs text-slate-400">
              Browse products and add fresh groceries to your cart.
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-5 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-violet-700 cursor-pointer"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* ITEMS LIST */}
            <div className="space-y-4">
              {cartItems.map((item) => {
                const key = getItemKey(item);
                const price = Number(item.price || 0);

                return (
                  <div
                    key={key}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <ShoppingBag size={24} className="text-slate-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{item.name}</h3>
                        <p className="text-xs text-slate-400">{item.unit || "1 pack"}</p>
                        <p className="mt-1 text-xs font-bold text-slate-900">
                          ₹{price.toFixed(2)} each
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-5">
                      {/* PLUS MINUS */}
                      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => removeFromCart(key)}
                          className="text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-4 text-center text-xs font-extrabold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <span className="text-sm font-extrabold text-slate-900">
                        ₹{(price * item.quantity).toFixed(2)}
                      </span>

                      <button
                        type="button"
                        onClick={() => deleteFromCart(key)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SUMMARY ASIDE */}
            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs h-fit space-y-4">
              <h2 className="text-base font-bold text-slate-800">Order Summary</h2>

              <div className="space-y-2.5 text-xs text-slate-600 border-b border-slate-100 pb-4">
                <div className="flex justify-between">
                  <span>Item Total</span>
                  <span className="font-bold text-slate-900">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Partner Fee</span>
                  <span className="font-bold text-emerald-600">FREE</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-extrabold text-slate-900 pt-1">
                <span>Grand Total</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>

              <button
                type="button"
                onClick={() => router.push("/checkout")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-xs font-extrabold text-white shadow-md shadow-violet-200 hover:bg-violet-700 cursor-pointer"
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
    </main>
  );
}