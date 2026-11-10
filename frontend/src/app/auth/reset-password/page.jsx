"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  LoaderCircle,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Apple,
  Package,
  Coffee,
  Truck,
  Sparkles,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import api from "@/lib/api";

const floatingItems = [
  { icon: ShoppingBasket, position: "left-[8%] top-[16%]", delay: 0, rotate: -12 },
  { icon: Apple, position: "right-[12%] top-[20%]", delay: 0.8, rotate: 12 },
  { icon: Package, position: "left-[13%] bottom-[20%]", delay: 1.2, rotate: 10 },
  { icon: Coffee, position: "right-[10%] bottom-[17%]", delay: 0.4, rotate: -10 },
];

export default function ResetPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("resetEmail");
    const savedOtp = sessionStorage.getItem("resetOtp");

    if (!savedEmail || !savedOtp) {
      router.replace("/auth/forgot-password");
      return;
    }

    setEmail(savedEmail);
    setOtp(savedOtp);
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/reset-password", {
        email,
        otp,
        password,
      });

      if (response.data.success) {
        sessionStorage.removeItem("resetEmail");
        sessionStorage.removeItem("resetOtp");
        router.replace("/login?reset=success");
      } else {
        setError(response.data.message || "Unable to reset password.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Session expired or OTP is invalid. Please request a new OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex h-[100dvh] min-h-0 w-full overflow-hidden bg-[#f7f8ff] text-slate-800">

      {/* Background Effects */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-300/30 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[450px] w-[450px] rounded-full bg-cyan-300/30 blur-[110px]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-200/20 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 grid h-full w-full grid-cols-1 lg:grid-cols-[1.08fr_0.92fr]"
      >

        {/* LEFT BRANDING SECTION */}
        <section className="relative hidden h-full flex-col justify-between overflow-hidden px-12 py-8 lg:flex xl:px-20">

          {/* Logo */}
          <Link href="/auth/login" className="relative z-20 flex w-fit items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-200">
              <ShoppingBag size={25} />
            </div>

            <span className="text-2xl font-extrabold tracking-tight text-slate-800">
              Elib<span className="text-violet-600">Cart</span>
            </span>
          </Link>

          {/* Floating Icons */}
          {floatingItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={index}
                className={`absolute ${item.position} flex h-14 w-14 items-center justify-center rounded-2xl border border-white/80 bg-white/70 text-violet-600 shadow-xl shadow-violet-100/50 backdrop-blur-md`}
                animate={{
                  y: [0, -18, 0],
                  rotate: [item.rotate, item.rotate + 8, item.rotate],
                }}
                transition={{
                  duration: 4 + index * 0.5,
                  delay: item.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Icon size={25} />
              </motion.div>
            );
          })}

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative z-10 max-w-xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/70 px-4 py-2 text-xs font-bold tracking-[0.18em] text-violet-600 shadow-sm">
              <Sparkles size={15} />
              SMARTER GROCERY EXPERIENCE
            </div>

            <h1 className="text-5xl font-extrabold leading-[1.15] tracking-tight text-slate-900 xl:text-6xl">
              Everything you need,
              <span className="block bg-gradient-to-r from-violet-600 to-cyan-500 bg-clip-text text-transparent">
                just minutes away.
              </span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-8 text-slate-500">
              Your everyday essentials, delivered with speed, simplicity and
              complete peace of mind.
            </p>

            {/* Feature Cards */}
            <div className="mt-10 grid max-w-lg grid-cols-2 gap-4">
              <div className="rounded-2xl border border-white bg-white/70 p-5 shadow-lg shadow-violet-100/40 backdrop-blur-md">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <Truck size={21} />
                </div>
                <h3 className="font-bold text-slate-800">Quick Delivery</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Essentials at your doorstep.
                </p>
              </div>

              <div className="rounded-2xl border border-white bg-white/70 p-5 shadow-lg shadow-cyan-100/40 backdrop-blur-md">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
                  <ShieldCheck size={21} />
                </div>
                <h3 className="font-bold text-slate-800">Secure Platform</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Safe and reliable shopping.
                </p>
              </div>
            </div>
          </motion.div>

          <p className="relative z-10 text-xs font-medium text-slate-400">
            © 2026 ElibCart. All rights reserved.
          </p>
        </section>

        {/* RIGHT RESET PASSWORD SECTION */}
        <section className="relative flex h-full min-h-0 items-center justify-center overflow-hidden px-8 py-6 sm:px-12 lg:px-16 xl:px-24 2xl:px-28">

          {/* Mobile Logo */}
          <Link
            href="/auth/login"
            className="absolute left-6 top-5 flex items-center gap-2 lg:hidden"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white">
              <ShoppingBag size={19} />
            </div>
            <span className="text-xl font-extrabold text-slate-800">
              Elib<span className="text-violet-600">Cart</span>
            </span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative w-full max-w-md"
          >
            <div className="overflow-hidden rounded-[26px] border border-white bg-white/95 p-6 shadow-[0_25px_80px_-25px_rgba(91,75,180,0.22)] backdrop-blur-xl sm:p-9">

              {/* Top Accent */}
              <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-violet-600 via-purple-500 to-cyan-400" />

              {/* Back Link */}
              <Link
                href="/verify-otp"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-violet-600"
              >
                <ArrowLeft size={17} className="transition-transform group-hover:-translate-x-1" />
                Back to OTP
              </Link>

              {/* Icon */}
              <div className="mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-200">
                <LockKeyhole size={27} />
              </div>

              {/* Heading */}
              <div className="mt-5">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-violet-600">
                  <ShieldCheck size={15} />
                  ACCOUNT SECURITY
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  Reset password
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Create a strong new password to secure your ElibCart account.
                </p>
              </div>

              {/* Verified Email */}
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
                  <CheckCircle2 size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                    OTP verified
                  </p>
                  <p className="break-all text-sm font-semibold text-slate-700">
                    {email || "your email"}
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">

                {/* New Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    New password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={6}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-violet-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Confirm password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={6}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-violet-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Submit Button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading || !email || !otp}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={19} className="animate-spin" />
                      Resetting password...
                    </>
                  ) : (
                    <>
                      Reset password
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Security Footer */}
              <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-xs font-medium text-slate-400">
                <LockKeyhole size={14} className="text-emerald-500" />
                Your password is securely protected
              </div>
            </div>

            <p className="mt-5 text-center text-xs text-slate-400 lg:hidden">
              © 2026 ElibCart. All rights reserved.
            </p>
          </motion.div>
        </section>
      </motion.div>
    </main>
  );
}