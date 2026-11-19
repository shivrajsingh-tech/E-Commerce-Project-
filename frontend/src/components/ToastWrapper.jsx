"use client";

import { Toaster } from "react-hot-toast";
import { useTheme } from "@/context/themeContext";

export default function ToastWrapper() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={10}
      toastOptions={{
        duration: 3500,
        style: {
          background: theme === "dark" ? "#1e293b" : "#ffffff",
          color: theme === "dark" ? "#f1f5f9" : "#0f172a",
          border: theme === "dark" ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e2e8f0",
          borderRadius: "14px",
          fontWeight: "600",
          fontSize: "13px",
          boxShadow: theme === "dark"
            ? "0 10px 40px rgba(0,0,0,0.5)"
            : "0 4px 20px rgba(0,0,0,0.1)",
          padding: "10px 16px",
        },
        success: {
          iconTheme: {
            primary: "#7c3aed",
            secondary: "#fff",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
        },
      }}
    />
  );
}
