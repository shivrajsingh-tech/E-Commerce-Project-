"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <AlertTriangle size={28} />
        </div>

        <h1 className="mt-5 text-xl font-bold text-slate-900">
          Something went wrong
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          An unexpected error occurred. Please try again.
        </p>

        <button
          onClick={() => reset()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          <RotateCcw size={16} />
          Try again
        </button>
      </div>
    </main>
  );
}