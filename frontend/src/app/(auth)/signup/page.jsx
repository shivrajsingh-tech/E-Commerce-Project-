"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  Package,
  Apple,
  Coffee,
  ShieldCheck,
  Zap,
  ShoppingBasket,
  CheckCircle2,
} from "lucide-react";

import api from "@/lib/api";

const floatingItems = [
  {
    icon: ShoppingBasket,
    position: "left-[8%] top-[16%]",
    delay: 0,
    rotate: -12,
  },
  {
    icon: Apple,
    position: "right-[12%] top-[20%]",
    delay: 0.8,
    rotate: 12,
  },
  {
    icon: Package,
    position: "left-[13%] bottom-[20%]",
    delay: 1.2,
    rotate: 10,
  },
  {
    icon: Coffee,
    position: "right-[10%] bottom-[17%]",
    delay: 0.4,
    rotate: -10,
  },
];

export default function SignupPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (loading) return;

    if (
      !formData.firstName.trim() ||
      !formData.email.trim() ||
      !formData.password
    ) {
      setError("First name, email and password are required.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/users/signup", {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (response.data?.success) {
        setSuccess("Account created successfully. Redirecting to login...");

        setTimeout(() => {
          router.push("/auth/login");
        }, 1200);
      } else {
        setError(response.data?.message || "Signup failed.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-12 pr-12 text-sm text-slate-800 outline-none transition-all duration-300 placeholder:text-slate-400 hover:border-violet-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";

  return (
    <main className="relative flex h-[100dvh] min-h-0 w-full overflow-hidden bg-[#f7f8ff] text-slate-800">

      {/* BACKGROUND GLOWS */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[550px] w-[550px] rounded-full bg-violet-200/40 blur-[110px]" />
        <div className="absolute -bottom-48 -right-40 h-[600px] w-[600px] rounded-full bg-cyan-200/40 blur-[120px]" />
        <div className="absolute right-[35%] top-[30%] h-64 w-64 rounded-full bg-pink-100/50 blur-[100px]" />
      </div>

      {/* MAIN CONTAINER */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.65 }}
        className="relative z-10 grid h-full min-h-0 w-full grid-cols-1 overflow-hidden lg:grid-cols-[1.08fr_0.92fr]"
      >

        {/* LEFT BRANDING SECTION */}
        <section className="relative hidden h-full min-h-0 flex-col justify-between overflow-hidden px-12 py-8 lg:flex xl:px-20">

          {/* DECORATIVE CIRCLES */}
          <div className="absolute -left-28 top-20 h-96 w-96 rounded-full border border-violet-200/60" />
          <div className="absolute -left-16 top-32 h-72 w-72 rounded-full border border-violet-200/50" />
          <div className="absolute bottom-[-180px] right-[-100px] h-[450px] w-[450px] rounded-full border border-cyan-200/60" />

          {/* LOGO */}
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="relative z-10 flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg shadow-violet-200">
              <ShoppingBag size={25} />
            </div>

            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              Elib<span className="text-violet-600">Cart</span>
            </span>
          </motion.div>

          {/* MAIN BRAND CONTENT */}
          <div className="relative z-10 max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-4 py-2 text-xs font-bold tracking-wide text-violet-600 shadow-sm">
                <Sparkles size={15} />
                SMARTER GROCERY EXPERIENCE
              </div>

              <h1 className="text-5xl font-extrabold leading-[1.15] tracking-tight text-slate-900 xl:text-6xl">
                Everything you need,

                <span className="mt-2 block bg-gradient-to-r from-violet-600 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                  just minutes away.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-8 text-slate-500">
                Welcome to ElibCart. Create your account and discover
                a smarter way to shop for your everyday essentials.
                Get everything you need delivered right to your doorstep.
              </p>
            </motion.div>

            {/* FEATURE CARDS */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 grid max-w-lg grid-cols-2 gap-4"
            >
              <motion.div
                whileHover={{ y: -5 }}
                className="flex items-center gap-3 rounded-2xl border border-white bg-white/80 p-4 shadow-sm"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <Zap size={21} />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Quick Delivery
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    10 minute commerce
                  </p>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -5 }}
                className="flex items-center gap-3 rounded-2xl border border-white bg-white/80 p-4 shadow-sm"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600">
                  <ShieldCheck size={21} />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Secure Platform
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Reliable experience
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* FLOATING ANIMATIONS */}
          {floatingItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={index}
                animate={{
                  y: [0, -18, 0],
                  rotate: [item.rotate, item.rotate + 8, item.rotate],
                }}
                transition={{
                  duration: 4 + index * 0.5,
                  repeat: Infinity,
                  delay: item.delay,
                  ease: "easeInOut",
                }}
                className={`pointer-events-none absolute ${item.position} z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-white bg-white/90 text-violet-600 shadow-xl shadow-violet-100/70`}
              >
                <Icon size={27} />
              </motion.div>
            );
          })}

          {/* FOOTER */}
          <div className="relative z-10 flex items-center justify-between gap-3 text-xs font-medium text-slate-400">
            <span>© 2026 ElibCart. All rights reserved.</span>

            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Your everyday essentials, simplified.
            </span>
          </div>
        </section>

        {/* RIGHT SIGNUP SECTION */}
      <section className="relative flex h-full min-h-0 items-center justify-center overflow-hidden px-8 py-6 sm:px-12 lg:px-16 xl:px-24 2xl:px-28">

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md"
          >

            {/* MOBILE LOGO */}
            <div className="mb-4 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-lg">
                <ShoppingBag size={21} />
              </div>

              <span className="text-xl font-extrabold text-slate-900">
                Elib<span className="text-violet-600">Cart</span>
              </span>
            </div>

            {/* SIGNUP CARD */}
            <div className="rounded-[26px] border border-white bg-white/95 p-6 shadow-[0_25px_80px_-25px_rgba(91,74,180,0.20)] backdrop-blur-xl sm:p-8">

              {/* HEADER */}
              <div className="mb-5">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-100 to-cyan-100 text-violet-600">
                  <User size={22} />
                </div>

                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600">
                  Create Account
                </p>

                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                  Join ElibCart
                </h2>

                <p className="mt-2 text-sm leading-5 text-slate-500">
                  Create your account and start your smarter shopping journey.
                </p>
              </div>

              {/* FORM */}
              <form onSubmit={handleSignup} className="space-y-3.5">

                {/* FIRST NAME + LAST NAME */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="mb-2 block text-sm font-semibold text-slate-500"
                    >
                      First Name
                    </label>

                    <div className="relative">
                      <User
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="firstName"
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        placeholder="First name"
                        autoComplete="given-name"
                        required
                        className={`${inputClass} pr-3`}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="mb-2 block text-sm font-semibold text-slate-500"
                    >
                      Last Name
                    </label>

                    <input
                      id="lastName"
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last name"
                      autoComplete="family-name"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 outline-none transition-all duration-300 placeholder:text-slate-400 hover:border-violet-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </div>
                </div>

                {/* EMAIL */}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-500"
                  >
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      autoComplete="email"
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* PASSWORD */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-500"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Create a password"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      className={inputClass}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition hover:text-violet-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* CONFIRM PASSWORD */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-semibold text-slate-500"
                  >
                    Confirm Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      className={inputClass}
                    />

                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition hover:text-violet-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* ERROR */}
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

                {/* SUCCESS */}
                {success && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="status"
                    className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-medium text-emerald-600"
                  >
                    {success}
                  </motion.p>
                )}

                {/* SUBMIT BUTTON */}
                <motion.button
                  whileHover={{ scale: loading ? 1 : 1.015 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  disabled={loading}
                  type="submit"
                  className="group flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-all duration-300 hover:shadow-xl hover:shadow-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Creating account..." : "Create Account"}

                  {!loading && (
                    <ArrowRight
                      size={19}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  )}
                </motion.button>
              </form>

              {/* LOGIN LINK */}
              <div className="mt-5 border-t border-slate-100 pt-5 text-center">
                <p className="text-sm text-slate-500">
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="!text-violet-600 font-bold transition-colors hover:!text-violet-800"
                  >
                    Login
                  </Link>
                </p>
              </div>

              {/* SECURITY */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
                <ShieldCheck size={15} className="text-emerald-500" />
                Your account is protected and secure
              </div>
            </div>

            {/* MOBILE FOOTER */}
            <p className="mt-4 text-center text-xs text-slate-400 lg:hidden">
              © 2026 ElibCart. All rights reserved.
            </p>
          </motion.div>
        </section>
      </motion.div>
    </main>
  );
}