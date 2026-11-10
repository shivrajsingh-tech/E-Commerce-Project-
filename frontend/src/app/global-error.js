"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Root application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Application error
          </h1>

          <p className="mt-3 text-slate-600">
            The application could not load properly.
          </p>

          <button
            onClick={() => reset()}
            className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            Reload application
          </button>
        </div>
      </body>
    </html>
  );
}