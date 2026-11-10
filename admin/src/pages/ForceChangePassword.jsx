import { useState } from "react";
import { motion } from "framer-motion";
import {
  KeyRound,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  ShoppingBag,
  ShieldCheck,
  Zap,
  Globe2,
  LockKeyhole,
  Sparkles,
  ArrowRight,
  Shield,
} from "lucide-react";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function ForceChangePassword() {
  const { user, setUser } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword.trim().length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/first-time-change-password", {
        newPassword: newPassword.trim(),
      });

      if (res.data?.success) {
        if (user) {
          setUser({
            ...user,
            mustChangePassword: false,
            status: "active",
          });
        }

        alert("Password updated successfully! Redirecting...");

        const rawRole = (
          typeof user?.role === "string"
            ? user.role
            : user?.role?.name || ""
        ).toLowerCase();

        if (rawRole === "delivery_partner") {
          window.location.href = "/delivery-tasks";
        } else if (
          rawRole === "delivery_manager" ||
          rawRole === "store_manager"
        ) {
          window.location.href = "/orders";
        } else {
          window.location.href = "/dashboard";
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to update password"
      );
    } finally {
      setLoading(false);
    }
  };

  const securityFeatures = [
    {
      icon: ShieldCheck,
      title: "Secure Access",
      description: "Protected login",
    },
    {
      icon: LockKeyhole,
      title: "Your Data",
      description: "Always protected",
    },
    {
      icon: Zap,
      title: "Get Started",
      description: "Ready to work",
    },
  ];

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-[#faf8ff] font-sans">

      {/* BACKGROUND DECORATIONS */}

      <div className="pointer-events-none absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-200/50 blur-[110px]" />

      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[550px] w-[550px] rounded-full bg-purple-200/60 blur-[120px]" />

      <div className="pointer-events-none absolute right-[35%] top-[15%] h-72 w-72 rounded-full border border-violet-200/40" />

      <div className="pointer-events-none absolute bottom-[15%] left-[5%] h-40 w-40 rounded-full border border-purple-200/50" />

      <div className="relative z-10 grid min-h-dvh grid-cols-1 lg:grid-cols-2">

        {/* LEFT SIDE */}

        <section className="relative flex min-h-[520px] flex-col justify-between overflow-hidden px-7 py-8 sm:px-12 lg:min-h-dvh lg:px-12 lg:py-9 xl:px-16">

          {/* LEFT BACKGROUND */}

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_45%_40%,rgba(139,92,246,0.12),transparent_65%)]" />

          {/* LOGO */}

          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative z-10 flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-300/50">
              <ShoppingBag size={25} />
            </div>

            <span className="text-2xl font-black tracking-tight text-[#171044]">
              Elib<span className="text-violet-600">Cart</span>
            </span>
          </motion.div>

          {/* SECURITY ILLUSTRATION */}

          <div className="relative z-10 flex flex-1 flex-col justify-center py-10 lg:py-0">

            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.8,
                type: "spring",
              }}
              className="relative mx-auto mb-8 flex h-52 w-52 items-center justify-center sm:h-60 sm:w-60"
            >
              {/* GLOW */}

              <div className="absolute inset-0 rounded-full bg-violet-400/20 blur-[55px]" />

              {/* ORBIT */}

              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 25,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute inset-0 rounded-full border border-dashed border-violet-300/80"
              />

              <motion.div
                animate={{ rotate: -360 }}
                transition={{
                  duration: 35,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute inset-5 rounded-full border border-violet-300/60"
              />

              {/* SHIELD */}

              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={floatAnimation}
                className="relative flex h-36 w-36 items-center justify-center rounded-[38px] border border-white bg-gradient-to-br from-violet-500 via-purple-600 to-indigo-700 text-white shadow-[0_20px_60px_rgba(109,40,217,0.35)] sm:h-40 sm:w-40"
              >
                <Shield size={78} strokeWidth={1.4} />

                <div className="absolute flex h-14 w-14 items-center justify-center rounded-2xl border border-white/30 bg-white/20 backdrop-blur-md">
                  <LockKeyhole size={30} />
                </div>
              </motion.div>

              {/* FLOATING SPARKLES */}

              <motion.div
                animate={{
                  y: [0, -12, 0],
                  rotate: [0, 15, 0],
                }}
                transition={floatAnimation}
                className="absolute right-1 top-8 flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-200 bg-white text-violet-600 shadow-lg"
              >
                <KeyRound size={21} />
              </motion.div>

              <motion.div
                animate={{
                  y: [0, 10, 0],
                  rotate: [0, -15, 0],
                }}
                transition={{
                  ...floatAnimation,
                  delay: 0.5,
                }}
                className="absolute bottom-5 left-0 flex h-10 w-10 items-center justify-center rounded-xl border border-purple-200 bg-white text-purple-600 shadow-lg"
              >
                <Sparkles size={20} />
              </motion.div>

              <div className="absolute right-3 bottom-8 h-3 w-3 rounded-full bg-violet-400 shadow-[0_0_15px_#a78bfa]" />

              <div className="absolute left-4 top-8 h-2.5 w-2.5 rounded-full bg-purple-400" />
            </motion.div>

            {/* LEFT TEXT */}

            <motion.div
              initial={{ opacity: 0, x: -25 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.2,
              }}
              className="relative z-10 mx-auto w-full max-w-[520px]"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-[10px] font-extrabold tracking-[1.5px] text-violet-700 shadow-sm">
                <Sparkles size={14} />
                ACCOUNT SECURITY
              </div>

              <h1 className="text-4xl font-black leading-[1.08] tracking-[-2px] text-[#171044] sm:text-5xl xl:text-[58px]">
                Create New
                <span className="block bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Password.
                </span>
              </h1>

              <h2 className="mt-5 text-lg font-extrabold text-violet-800 sm:text-xl">
                Welcome to the ElibCart team!
              </h2>

              <p className="mt-3 max-w-[440px] text-sm leading-7 text-slate-600 sm:text-[15px]">
                Since this is your first time logging in with a temporary
                password, you must create a new secure password to
                activate your account.
              </p>

              {/* FEATURES */}

              <div className="mt-8 grid grid-cols-3 gap-3">
                {securityFeatures.map((item, index) => {
                  const Icon = item.icon;

                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.4 + index * 0.15,
                      }}
                      whileHover={{ y: -5 }}
                      className="flex min-w-0 flex-col items-center rounded-2xl border border-violet-200/80 bg-white/70 px-2 py-4 text-center shadow-sm backdrop-blur-sm transition hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100"
                    >
                      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                        <Icon size={21} />
                      </div>

                      <p className="text-[11px] font-extrabold text-[#171044] sm:text-xs">
                        {item.title}
                      </p>

                      <p className="mt-1 text-[9px] font-medium text-slate-500 sm:text-[10px]">
                        {item.description}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* LEFT FOOTER */}

          <div className="relative z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-violet-200/70 pt-5 text-[10px] font-bold tracking-wide text-slate-500">
            <span className="flex items-center gap-2">
              <Globe2 size={15} className="text-violet-600" />
              © 2026 ELIBCART
            </span>

            <span className="text-violet-300">•</span>

            <span>ONE PLATFORM. COMPLETE CONTROL.</span>
          </div>
        </section>

        {/* RIGHT SIDE */}

        <section className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10 sm:px-10 lg:px-10 xl:px-16">

          {/* BACKGROUND DECORATIONS */}

          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-violet-200/60 blur-[90px]" />

          <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-purple-200/50 blur-[90px]" />

          {/* SECURE BADGE */}

          <div className="absolute right-6 top-7 z-10 hidden items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur-md sm:flex lg:right-10 lg:top-9">
            <ShieldCheck size={17} className="text-emerald-500" />

            <span className="text-[11px] font-extrabold text-[#171044]">
              Secure Account
            </span>
          </div>

          {/* FORM CARD */}

          <motion.div
            initial={{ opacity: 0, y: 25, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.7,
              ease: "easeOut",
            }}
            className="relative z-10 my-auto w-full max-w-[500px] rounded-[30px] border border-white bg-white/90 p-6 shadow-[0_20px_80px_rgba(109,40,217,0.13)] backdrop-blur-xl sm:p-9 lg:p-10 xl:p-11"
          >

            {/* CARD HEADER */}

            <div className="mb-8 text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.2,
                  type: "spring",
                }}
                className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[25px] border border-violet-200 bg-gradient-to-br from-violet-100 to-purple-100 text-violet-700 shadow-[0_8px_25px_rgba(139,92,246,0.15)]"
              >
                <KeyRound size={37} strokeWidth={1.8} />
              </motion.div>

              <p className="mb-2 text-xs font-extrabold uppercase tracking-[2px] text-violet-700">
                Account Activation
              </p>

              <h2 className="text-3xl font-black tracking-[-1.5px] text-[#171044] sm:text-4xl">
                New Password<span className="text-violet-600">.</span>
              </h2>

              <p className="mx-auto mt-3 max-w-[350px] text-sm leading-6 text-slate-500">
                Set a new password to secure your account and get started
                with ElibCart.
              </p>
            </div>

            {/* ERROR */}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-rose-600"
              >
                <ShieldAlert
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <span className="text-xs font-semibold leading-5">
                  {error}
                </span>
              </motion.div>
            )}

            {/* FORM */}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* NEW PASSWORD */}

              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-2.5 flex items-center gap-2 text-[13px] font-extrabold text-[#171044]"
                >
                  <LockKeyhole size={17} className="text-violet-600" />
                  New Password
                </label>

                <div className="group flex h-[56px] items-center rounded-full border border-violet-200 bg-white px-3 shadow-[0_4px_15px_rgba(124,58,237,0.07)] transition-all duration-300 hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <KeyRound size={17} />
                  </div>

                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    disabled={loading}
                    className="h-full min-w-0 flex-1 border-0 bg-transparent px-4 text-[13px] font-medium text-[#17132f] outline-none placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:opacity-60"
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewPassword((prev) => !prev)
                    }
                    aria-label={
                      showNewPassword ? "Hide password" : "Show password"
                    }
                    className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-violet-600 transition hover:bg-violet-100"
                  >
                    {showNewPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>

                <p className="mt-2 pl-3 text-[10px] font-medium text-slate-400">
                  Password must contain at least 6 characters.
                </p>
              </div>

              {/* CONFIRM PASSWORD */}

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2.5 flex items-center gap-2 text-[13px] font-extrabold text-[#171044]"
                >
                  <LockKeyhole size={17} className="text-violet-600" />
                  Confirm Password
                </label>

                <div className="group flex h-[56px] items-center rounded-full border border-violet-200 bg-white px-3 shadow-[0_4px_15px_rgba(124,58,237,0.07)] transition-all duration-300 hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <LockKeyhole size={17} />
                  </div>

                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Re-type new password"
                    autoComplete="new-password"
                    disabled={loading}
                    className="h-full min-w-0 flex-1 border-0 bg-transparent px-4 text-[13px] font-medium text-[#17132f] outline-none placeholder:text-slate-400 focus:outline-none focus:ring-0 disabled:opacity-60"
                    required
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((prev) => !prev)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-violet-600 transition hover:bg-violet-100"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>

                {confirmPassword.length > 0 &&
                  newPassword === confirmPassword && (
                    <p className="mt-2 flex items-center gap-1.5 pl-3 text-[11px] font-semibold text-emerald-600">
                      <CheckCircle2 size={14} />
                      Passwords match
                    </p>
                  )}
              </div>

              {/* SUBMIT BUTTON */}

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="group relative mt-2 flex h-[57px] w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 text-[13px] font-extrabold text-white shadow-[0_10px_25px_rgba(109,40,217,0.30)] transition-all hover:shadow-[0_14px_30px_rgba(109,40,217,0.42)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <motion.span
                  className="absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-20deg] bg-white/20 blur-sm"
                  animate={{
                    left: ["-50%", "150%"],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 2,
                    ease: "linear",
                  }}
                />

                <span className="relative z-10 flex items-center gap-3">
                  {loading ? (
                    <>
                      <Loader2 size={19} className="animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={19} />
                      Save Password & Activate
                      <ArrowRight
                        size={18}
                        className="transition group-hover:translate-x-1"
                      />
                    </>
                  )}
                </span>
              </motion.button>
            </form>

            {/* SECURITY MESSAGE */}

            <div className="mt-7 flex items-center justify-center gap-2.5 rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3.5">
              <ShieldCheck
                size={19}
                className="shrink-0 text-emerald-500"
              />

              <span className="text-[11px] font-semibold leading-5 text-[#24145d]">
                Your account is protected with secure password
                authentication.
              </span>
            </div>

            {/* CARD FOOTER */}

            <div className="mt-7 flex items-center justify-center gap-2 border-t border-violet-100 pt-5 text-[10px] font-bold tracking-wide text-slate-400">
              <ShieldCheck size={13} className="text-violet-500" />
              SECURE & RELIABLE PLATFORM
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}

const floatAnimation = {
  duration: 4,
  repeat: Infinity,
  repeatType: "reverse",
  ease: "easeInOut",
};