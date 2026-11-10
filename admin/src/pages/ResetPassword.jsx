import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  Sparkles,
  ShoppingBag,
  Check,
  X,
  ShieldAlert,
} from "lucide-react";
import api from "../api/api";

const floatingIcons = [
  {
    icon: LockKeyhole,
    position: "left-[8%] top-[20%]",
    delay: 0,
  },
  {
    icon: ShieldCheck,
    position: "right-[12%] top-[28%]",
    delay: 0.6,
  },
  {
    icon: KeyRound,
    position: "left-[15%] bottom-[23%]",
    delay: 1.2,
  },
  {
    icon: CheckCircle2,
    position: "right-[10%] bottom-[20%]",
    delay: 1.8,
  },
];

const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || "";
  const otp = location.state?.otp || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!email || !otp) {
      navigate("/super-admin/forgot-password", {
        replace: true,
      });
    }
  }, [email, otp, navigate]);

  const passwordChecks = [
    {
      label: "At least 6 characters",
      valid: password.length >= 6,
    },
    {
      label: "Passwords match",
      valid: password.length > 0 && password === confirmPassword,
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/auth/reset-password", {
        email,
        otp,
        password,
      });

      if (res.data.success) {
        setIsSuccess(true);
      } else {
        setError(res.data.message || "Failed to reset password");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to reset password"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!email || !otp) return null;

  return (
    <main className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#0c0925] font-sans">

      {/* AUTOFILL BACKGROUND FIX */}

      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
          box-shadow: 0 0 0 1000px #ffffff inset !important;
          -webkit-text-fill-color: #17132f !important;
          caret-color: #17132f;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>

      <div className="grid h-full w-full grid-cols-1 overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">

        {/* ================= LEFT PANEL ================= */}

        <section className="relative hidden h-full flex-col justify-between overflow-hidden bg-[#10083c] px-10 py-9 lg:flex xl:px-14">

          {/* BACKGROUND */}

          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_45%,rgba(112,49,255,0.4),transparent_55%)]" />

          <div className="absolute -left-40 -top-40 h-[450px] w-[450px] rounded-full bg-violet-700/30 blur-[120px]" />

          <div className="absolute -bottom-48 right-0 h-[500px] w-[500px] rounded-full bg-purple-700/30 blur-[120px]" />

          {/* GRID */}

          <div
            className="absolute inset-0 opacity-[0.045]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.3) 1px,transparent 1px)",
              backgroundSize: "55px 55px",
            }}
          />

          {/* BRANDING */}

          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative z-20 flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white shadow-xl shadow-violet-500/20 backdrop-blur-xl">
              <ShoppingBag size={25} />
            </div>

            <span className="text-2xl font-black tracking-tight text-white">
              Elib<span className="text-violet-400">Cart</span>
            </span>
          </motion.div>

          {/* FLOATING ICONS */}

          <div className="pointer-events-none absolute inset-0 z-10">
            {floatingIcons.map((item, index) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={index}
                  className={`absolute flex h-[65px] w-[65px] items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-violet-200 shadow-2xl shadow-purple-900/40 backdrop-blur-xl ${item.position}`}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: [0, -13, 0],
                    rotate: [0, 5, 0],
                  }}
                  transition={{
                    opacity: { duration: 0.7, delay: item.delay },
                    scale: { duration: 0.7, delay: item.delay },
                    y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: item.delay },
                    rotate: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: item.delay },
                  }}
                >
                  <Icon size={27} />
                </motion.div>
              );
            })}

            {/* ORBIT RINGS */}

            <motion.div
              className="absolute left-1/2 top-[45%] h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/20"
              animate={{ rotate: 360 }}
              transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
            />

            <motion.div
              className="absolute left-1/2 top-[45%] h-[250px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-300/20"
              animate={{ rotate: -360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            />

            {/* MAIN ILLUSTRATION */}

            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: 15 }}
              animate={{ opacity: 1, scale: [1, 1.025, 1], y: [0, -10, 0] }}
              transition={{
                opacity: { duration: 0.8, delay: 0.3 },
                scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              }}
              className="absolute left-1/2 top-[45%] z-10 flex h-[165px] w-[165px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[38px] border border-white/30 text-white shadow-[0_0_70px_rgba(139,92,246,0.5)]"
              style={{
                background: "radial-gradient(circle at 30% 20%,#c4b5fd,#7c3aed 50%,#26105c 100%)",
              }}
            >
              <LockKeyhole size={65} strokeWidth={1.5} />
              <span className="mt-4 text-[10px] font-black tracking-[3px]">NEW PASSWORD</span>
            </motion.div>
          </div>

          {/* HERO CONTENT */}

          <motion.div
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative z-20 mt-auto mb-8 max-w-[450px]"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-[10px] font-bold tracking-[1.5px] text-violet-200">
              <Sparkles size={14} className="text-violet-400" />
              PASSWORD RECOVERY
            </div>

            <h1 className="text-5xl font-black leading-[1.08] tracking-[-2px] text-white xl:text-[62px]">
              Set a secure
              <br />
              password.
              <span className="mt-1 block bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Protect data.
              </span>
            </h1>

            <p className="mt-5 max-w-[390px] text-sm leading-7 text-slate-400">
              Create a robust password with strong encryption to protect your management workspace.
            </p>

            <div className="mt-7 space-y-4">
              {[
                "Advanced account encryption",
                "Strict password validation rules",
                "Instant login recovery access",
              ].map((text, index) => (
                <motion.div
                  key={text}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.15 }}
                  className="flex items-center gap-3 text-sm font-medium text-slate-300"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-500/15 text-violet-300">
                    <CheckCircle2 size={16} />
                  </div>
                  {text}
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* LEFT FOOTER */}

          <div className="relative z-25 flex items-center justify-between border-t border-white/10 pt-5 text-[10px] font-medium text-slate-500">
            <span>© 2026 ElibCart</span>
            <span className="flex items-center gap-2">
              <ShieldCheck size={14} />
              SECURE & RELIABLE PLATFORM
            </span>
          </div>
        </section>

        {/* ================= RIGHT PANEL ================= */}

        <section className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#faf8ff] px-6 py-6 sm:px-12 lg:px-12 xl:px-16">

          {/* BACKGROUND DECORATION */}

          <div className="pointer-events-none absolute -right-32 -top-40 h-[430px] w-[430px] rounded-full bg-violet-200/60 blur-[100px]" />

          <div className="pointer-events-none absolute -bottom-40 -left-32 h-[400px] w-[400px] rounded-full bg-purple-200/50 blur-[100px]" />

          <div className="pointer-events-none absolute right-5 top-[15%] h-52 w-52 rounded-full border border-violet-200/60" />

          <div className="pointer-events-none absolute bottom-[10%] left-5 h-36 w-36 rounded-full border border-purple-200/50" />

          {/* FORM CONTAINER */}

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-15 w-full max-w-[430px]"
          >
            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.div
                  key="reset-form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {/* TOP HEADER */}
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 shadow-sm">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-600">
                        Smart • Secure • Scalable
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <ShieldCheck size={16} className="text-violet-600" />
                      Secure Reset
                    </div>
                  </div>

                  {/* HEADING */}
                  <div className="mb-5">
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 180 }}
                      className="mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-violet-200 bg-white text-violet-600 shadow-[0_6px_25px_rgba(139,92,246,0.15)]"
                    >
                      <KeyRound size={25} />
                    </motion.div>

                    <p className="mb-2 text-[12px] font-extrabold tracking-[2px] text-violet-700">
                      PASSWORD RECOVERY
                    </p>

                    <h2 className="text-[34px] font-black leading-[1.08] tracking-[-1.8px] text-[#100c38] sm:text-[40px]">
                      Create new
                      <span className="block bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 bg-clip-text text-transparent">
                        password.
                      </span>
                    </h2>

                    <p className="mt-3 text-[13px] leading-6 text-slate-500">
                      Account email: <span className="font-bold text-[#100c38]">{email}</span>
                    </p>
                  </div>

                  {/* ERROR */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      role="alert"
                      className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600"
                    >
                      <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  {/* FORM */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* NEW PASSWORD */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-[13px] font-extrabold text-[#171044]">
                        <LockKeyhole size={17} className="text-violet-600" />
                        New Password
                      </label>

                      <div className="group flex h-[54px] items-center rounded-full border border-violet-200 bg-white px-3 shadow-[0_4px_18px_rgba(124,58,237,0.08)] transition-all duration-300 hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                          <LockKeyhole size={17} />
                        </div>

                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setError("");
                          }}
                          placeholder="Enter new password"
                          autoComplete="new-password"
                          disabled={loading}
                          className="h-full min-w-0 flex-1 border-0 bg-white px-3 text-[13px] font-medium text-[#17132f] outline-none placeholder:text-slate-400 focus:border-0 focus:bg-white focus:outline-none focus:ring-0 disabled:opacity-60"
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center text-slate-400 transition hover:text-violet-600"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* CONFIRM PASSWORD */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-[13px] font-extrabold text-[#171044]">
                        <ShieldCheck size={17} className="text-violet-600" />
                        Confirm Password
                      </label>

                      <div className="group flex h-[54px] items-center rounded-full border border-violet-200 bg-white px-3 shadow-[0_4px_18px_rgba(124,58,237,0.08)] transition-all duration-300 hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                          <ShieldCheck size={17} />
                        </div>

                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setError("");
                          }}
                          placeholder="Re-enter new password"
                          autoComplete="new-password"
                          disabled={loading}
                          className="h-full min-w-0 flex-1 border-0 bg-white px-3 text-[13px] font-medium text-[#17132f] outline-none placeholder:text-slate-400 focus:border-0 focus:bg-white focus:outline-none focus:ring-0 disabled:opacity-60"
                        />

                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((p) => !p)}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center text-slate-400 transition hover:text-violet-600"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* PASSWORD REQUIREMENTS */}
                    <div className="rounded-2xl border border-violet-200/70 bg-white/75 p-3.5 shadow-sm">
                      <p className="mb-2 text-[10px] font-extrabold tracking-wide text-slate-400">
                        PASSWORD REQUIREMENTS
                      </p>
                      <div className="space-y-1.5">
                        {passwordChecks.map((item) => (
                          <div key={item.label} className="flex items-center gap-2">
                            {item.valid ? (
                              <Check size={14} className="text-emerald-500" />
                            ) : (
                              <X size={14} className="text-slate-300" />
                            )}
                            <span className={`text-[11px] font-semibold ${item.valid ? "text-emerald-600" : "text-slate-400"}`}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SUBMIT BUTTON */}
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="group relative flex h-[53px] w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 text-[13px] font-extrabold text-white shadow-[0_12px_28px_rgba(109,40,217,0.3)] transition-all hover:shadow-[0_16px_35px_rgba(109,40,217,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <motion.span
                        className="absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-20deg] bg-white/20 blur-sm"
                        animate={{ left: ["-50%", "150%"] }}
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
                            <LockKeyhole size={18} />
                            Reset Password
                          </>
                        )}
                      </span>
                    </motion.button>
                  </form>

                  {/* BACK TO LOGIN */}
                  <div className="mt-4">
                    <Link
                      to="/super-admin/login"
                      className="group flex w-full items-center justify-center gap-2 rounded-full border border-violet-200 bg-white py-3 text-[12px] font-extrabold text-violet-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-400 hover:bg-violet-50 hover:shadow-md"
                    >
                      <ArrowLeft
                        size={16}
                        className="transition group-hover:-translate-x-1"
                      />
                      Back to login
                    </Link>
                  </div>

                  {/* FOOTER */}
                  <div className="mt-4 flex items-center justify-between border-t border-violet-200/70 pt-3 text-[9px] font-bold tracking-wide text-slate-400">
                    <span>© 2026 ELIBCART</span>
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-violet-500" />
                      SECURE & RELIABLE
                    </span>
                  </div>
                </motion.div>
              ) : (
                /* SUCCESS SCREEN */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="py-4 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      delay: 0.2,
                      type: "spring",
                      stiffness: 180,
                    }}
                    className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full border-4 border-emerald-100 bg-emerald-50 text-emerald-600 shadow-[0_8px_30px_rgba(16,185,129,0.15)]"
                  >
                    <CheckCircle2 size={52} />
                  </motion.div>

                  <p className="mb-2 text-[11px] font-extrabold tracking-[2px] text-emerald-600">
                    PASSWORD UPDATED
                  </p>

                  <h2 className="text-3xl font-black tracking-tight text-[#171044]">
                    All Done!
                  </h2>

                  <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-6 text-slate-500">
                    Your password has been reset successfully. You can now securely log in to your account.
                  </p>

                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => navigate("/super-admin/login", { replace: true })}
                    className="mt-6 flex h-[53px] w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-700 to-indigo-600 text-[13px] font-extrabold text-white shadow-[0_12px_28px_rgba(109,40,217,0.3)] transition hover:shadow-[0_16px_35px_rgba(109,40,217,0.45)]"
                  >
                    Continue to Login
                    <ArrowLeft size={17} className="rotate-180" />
                  </motion.button>

                  <div className="mt-6 flex items-center justify-center gap-2 border-t border-violet-200/70 pt-4 text-[9px] font-bold tracking-wide text-slate-400">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    ELIBCART SECURE AUTHENTICATION
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>
      </div>
    </main>
  );
};

export default ResetPassword;