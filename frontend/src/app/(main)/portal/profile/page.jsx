"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/authContext";
import {
  User,
  Lock,
  Phone,
  Mail,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";

export default function ProfilePage() {
  const { user, setUser, role } = useAuth();

  const [firstName, setFirstName] = useState(() => user?.firstName || "");
  const [lastName, setLastName] = useState(() => user?.lastName || "");
  const [phone, setPhone] = useState(() => user?.phone || "");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isCustomer = role === "customer";

  // Pre-fill form when user is restored
  const prevUserIdRef = useRef(user?._id || user?.id);
  useEffect(() => {
    const currentId = user?._id || user?.id;
    if (user && currentId !== prevUserIdRef.current) {
      prevUserIdRef.current = currentId;
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    setLoading(true);

    try {
      // Build request payload conditionally
      const payload = {
        phone: phone.trim(),
        ...(isCustomer
          ? {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
            }
          : {}),
      };

      const response = await api.put("/user/updateProfile", payload);

      const updatedUser = response.data?.user;
      if (updatedUser) {
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      setSuccessMessage(
        response.data?.message || "Profile updated successfully!"
      );
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          "Failed to update profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        {/* Header Section */}
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-green-600 font-bold text-xl border border-green-100">
            {user?.firstName?.charAt(0)?.toUpperCase() || <User size={26} />}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Account Settings</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-700">
                {role || "User"}
              </span>
              <span className="text-xs text-slate-400">
                Member ID: {user?.id || user?._id || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {successMessage && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-green-50 border border-green-200 p-3.5 text-sm text-green-700">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-600">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Operational Staff Notice */}
        {!isCustomer && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 p-3.5 text-xs text-amber-800">
            <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-600" />
            <span>
              Staff account names are managed administratively for audit
              compliance. You can update your contact phone number below.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* First & Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>First Name</span>
                {!isCustomer && (
                  <span className="text-[11px] font-normal text-slate-400 flex items-center gap-1">
                    <Lock size={12} /> Locked
                  </span>
                )}
              </label>
              <input
                type="text"
                disabled={!isCustomer}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required={isCustomer}
                placeholder="Enter first name"
                className={`w-full rounded-xl border p-3 text-sm outline-none transition ${
                  !isCustomer
                    ? "border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                    : "border-slate-200 bg-white text-slate-900 focus:border-green-600"
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Last Name</span>
                {!isCustomer && (
                  <span className="text-[11px] font-normal text-slate-400 flex items-center gap-1">
                    <Lock size={12} /> Locked
                  </span>
                )}
              </label>
              <input
                type="text"
                disabled={!isCustomer}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                className={`w-full rounded-xl border p-3 text-sm outline-none transition ${
                  !isCustomer
                    ? "border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed"
                    : "border-slate-200 bg-white text-slate-900 focus:border-green-600"
                }`}
              />
            </div>
          </div>

          {/* Email Address (Always Locked) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Email Address</span>
              <span className="text-[11px] font-normal text-slate-400 flex items-center gap-1">
                <Lock size={12} /> Primary Identifier
              </span>
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full rounded-xl border border-slate-200 bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-500 cursor-not-allowed outline-none"
              />
            </div>
          </div>

          {/* Phone Number (Editable for all) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Contact Phone
            </label>
            <div className="relative">
              <Phone
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter phone number"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none focus:border-green-600"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60 cursor-pointer transition"
            >
              {loading ? (
                <>
                  <LoaderCircle size={18} className="animate-spin" />
                  Saving Updates...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}