"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/authContext";

export default function AuthLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // If already logged in, go to home or the originally intended page
      try {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get("redirect");
        router.replace(redirect && redirect.startsWith("/") ? redirect : "/");
      } catch {
        router.replace("/");
      }
    }
  }, [loading, user, router]);

  return <>{children}</>;
}
