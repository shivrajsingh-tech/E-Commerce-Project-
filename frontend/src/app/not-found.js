import Link from "next/link";
import { Home, SearchX } from "lucide-react";

export const metadata = {
  title: "Page Not Found | ElibCart",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="text-center">
        <SearchX size={54} className="mx-auto text-indigo-600" />

        <h1 className="mt-5 text-5xl font-bold text-slate-900">
          404
        </h1>

        <p className="mt-3 text-lg font-semibold text-slate-800">
          Page not found
        </p>

        <p className="mt-2 text-sm text-slate-500">
          The page you requested does not exist.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Home size={17} />
          Back to Home
        </Link>
      </div>
    </main>
  );
}
