"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft, LogIn, ShoppingBag } from "lucide-react";
import { useAuth } from "@/context/authContext";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const roleName =
    typeof user?.role === "string"
      ? user.role
      : user?.role?.name || "User";

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 py-16 text-slate-800">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/50">
          <ShieldAlert size={36} />
        </div>

        <span className="mt-6 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
          Access Restricted
        </span>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Customer Area Only
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          This portal is reserved for registered <strong>customers</strong>. Your current session is identified as{" "}
          <span className="font-semibold text-slate-700 capitalize">
            {roleName.replaceAll("_", " ")}
          </span>
          . Operations, staff, and administration tools must be accessed through the designated management portal.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 active:scale-95"
          >
            <ShoppingBag size={17} />
            Continue Shopping
          </Link>

          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/auth/login");
            }}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 cursor-pointer"
          >
            <LogIn size={17} />
            Switch Account
          </button>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-5 text-xs text-slate-400">
          Need assistance? Contact support@elibcart.com
        </div>
      </div>
    </main>
  );
}
