"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/authContext";
import { Loader2 } from "lucide-react";

// Pages inside (main) that require login
const PROTECTED_PATHS = [
  "/checkout",
  "/account",
  "/portal",
  "/portal/profile",
  "/wishlist",
];

export default function MainLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const requiresAuth = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  useEffect(() => {
    if (!loading && requiresAuth && !user) {
      // Redirect to login with return URL so user comes back after login
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, requiresAuth, pathname, router]);

  // Show spinner while verifying auth for protected pages
  if (loading && requiresAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-violet-600" size={32} />
      </div>
    );
  }

  // Block render of protected page until redirect fires
  if (!loading && requiresAuth && !user) {
    return null;
  }

  return <>{children}</>;
}
