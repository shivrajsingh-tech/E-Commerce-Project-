"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  Apple,
  Package,
  Coffee,
  Truck,
  LockKeyhole,
  Sparkles,
  Mail,
} from "lucide-react";
import api from "@/lib/api";

const floatingItems = [
  { icon: ShoppingBasket, position: "left-[8%] top-[16%]", delay: 0, rotate: -12 },
  { icon: Apple, position: "right-[12%] top-[20%]", delay: 0.8, rotate: 12 },
  { icon: Package, position: "left-[13%] bottom-[20%]", delay: 1.2, rotate: 10 },
  { icon: Coffee, position: "right-[10%] bottom-[17%]", delay: 0.4, rotate: -10 },
];

export default function VerifyOtpPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("resetEmail");

    if (!savedEmail) {
      router.replace("/auth/forgot-password");
      return;
    }

    setEmail(savedEmail);
  }, [router]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/verify-otp", {
        email,
        otp,
      });

      if (response.data.success) {
        sessionStorage.setItem("resetOtp", otp);
        router.push("/auth/reset-password");
      } else {
        setError(response.data.message || "OTP verification failed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    setResending(true);

    try {
      const response = await api.post("/auth/forgot-password", {
        email,
      });

      if (response.data.success) {
        setOtp("");
        sessionStorage.removeItem("resetOtp");
        setMessage("A new OTP has been sent to your email.");
      } else {
        setError(response.data.message || "Unable to resend OTP.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to resend OTP.");
    } finally {
      setResending(false);
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

        {/* RIGHT OTP SECTION */}
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
                href="/auth/forgot-password"
                className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-violet-600"
              >
                <ArrowLeft size={17} className="transition-transform group-hover:-translate-x-1" />
                Change email
              </Link>

              {/* Icon */}
              <div className="mt-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-200">
                <KeyRound size={27} />
              </div>

              {/* Heading */}
              <div className="mt-6">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-violet-600">
                  <ShieldCheck size={15} />
                  ACCOUNT VERIFICATION
                </div>

                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                  Verify OTP
                </h1>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Enter the 6-digit verification code sent to your email
                  address.
                </p>
              </div>

              {/* Email Display */}
              <div className="mt-5 flex items-center gap-3 rounded-xl border border-violet-100 bg-violet-50/70 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
                  <Mail size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Verification email
                  </p>
                  <p className="break-all text-sm font-semibold text-slate-700">
                    {email || "your email"}
                  </p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleVerify} className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="otp"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    6-digit OTP
                  </label>

                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100"
                  />
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

                {/* Success */}
                {message && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="status"
                    className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-medium text-emerald-600"
                  >
                    {message}
                  </motion.p>
                )}

                {/* Verify Button */}
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading || !email}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:from-violet-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={19} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify OTP
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>
              </form>

              {/* Resend OTP */}
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500">
                  Didn't receive the code?
                </p>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || !email}
                  className="mt-2 text-sm font-bold text-violet-600 transition hover:text-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resending ? (
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle size={15} className="animate-spin" />
                      Sending new OTP...
                    </span>
                  ) : (
                    "Resend OTP"
                  )}
                </button>
              </div>

              {/* Security Footer */}
              <div className="mt-7 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-xs font-medium text-slate-400">
                <LockKeyhole size={14} className="text-emerald-500" />
                Your verification is secure and protected
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