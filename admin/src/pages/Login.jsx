
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, useMotionValue, useSpring } from "framer-motion";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Loader2,
  Store,
  Package,
  Truck,
  ChartNoAxesCombined,
  ShieldCheck,
  Zap,
  Globe2,
  Users,
  CheckCircle2,
} from "lucide-react";

import api from "../api/api";
import { useAuth } from "../context/AuthContext";

const float = {
  duration: 4,
  repeat: Infinity,
  repeatType: "reverse",
  ease: "easeInOut",
};

const FloatingCard = ({ icon: Icon, title, position, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.7 }}
    animate={{ opacity: 1, scale: 1, y: [0, -9, 0] }}
    transition={{
      opacity: { duration: 0.7, delay },
      scale: { duration: 0.7, delay },
      y: { ...float, delay },
    }}
    className={`absolute z-20 flex h-[82px] w-[88px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-[#252143]/90 text-white shadow-xl backdrop-blur-xl ${position}`}
  >
    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10">
      <Icon size={22} />
    </div>
    <span className="text-[10px] font-bold tracking-wide text-white/80">
      {title}
    </span>
  </motion.div>
);

const OrbitVisual = ({ mouseX, mouseY }) => {
  const rotateX = useSpring(mouseY, { stiffness: 65, damping: 20 });
  const rotateY = useSpring(mouseX, { stiffness: 65, damping: 20 });

  const stars = Array.from({ length: 28 }, (_, i) => ({
    left: `${(i * 43 + 7) % 100}%`,
    top: `${(i * 67 + 13) % 100}%`,
    delay: (i % 7) * 0.3,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {stars.map((star, i) => (
        <motion.span
          key={i}
          className="absolute h-[3px] w-[3px] rounded-full bg-violet-200"
          style={{
            left: star.left,
            top: star.top,
            boxShadow: "0 0 9px #c4b5fd",
          }}
          animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.5, 0.7] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: star.delay,
          }}
        />
      ))}

      <motion.div
        className="absolute left-[75%] top-[40%] h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 max-lg:left-[72%] max-sm:left-1/2 max-sm:top-[34%] max-sm:scale-[0.78]"
        style={{
          rotateX,
          rotateY,
          transformPerspective: 1000,
        }}
        animate={{ y: [0, -8, 0] }}
        transition={float}
      >
        <motion.div
          className="absolute left-1/2 top-1/2 h-[180px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-blue-400/40"
          style={{ transform: "rotateX(65deg) rotateZ(-25deg)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        />

        <motion.div
          className="absolute left-1/2 top-1/2 h-[240px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-violet-400/40"
          style={{ transform: "rotateX(65deg) rotateZ(35deg)" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
        />

        <div className="absolute left-1/2 top-1/2 h-[255px] w-[255px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-300/20" />

        <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/30 blur-[65px]" />

        <motion.div
          className="absolute left-1/2 top-1/2 z-10 flex h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/40 text-white"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, #d8b4fe, #8752ff 42%, #24105e 100%)",
            boxShadow:
              "0 0 35px rgba(139,92,246,.75), 0 0 80px rgba(109,40,217,.4), inset -12px -12px 30px rgba(10,5,50,.5)",
          }}
          animate={{ scale: [1, 1.045, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <ShoppingBag size={55} strokeWidth={1.5} />
          <span className="mt-1 text-[9px] font-black tracking-[3px]">
            ELIBCART
          </span>
        </motion.div>

        <FloatingCard
          icon={Store}
          title="STORES"
          position="left-[-5px] top-[30px]"
        />

        <FloatingCard
          icon={Package}
          title="PRODUCTS"
          position="right-[-5px] top-[30px]"
          delay={0.5}
        />

        <FloatingCard
          icon={Truck}
          title="DELIVERY"
          position="left-[-5px] bottom-[25px]"
          delay={1}
        />

        <FloatingCard
          icon={ChartNoAxesCombined}
          title="ANALYTICS"
          position="right-[-5px] bottom-[25px]"
          delay={1.5}
        />
      </motion.div>
    </div>
  );
};

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();

    mouseX.set(((e.clientX - rect.left) / rect.width - 0.5) * 14);
    mouseY.set(((e.clientY - rect.top) / rect.height - 0.5) * -14);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setServerError("");
  };

  const validate = () => {
    const newErrors = {};

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email.trim())) {
      newErrors.email = "Enter a valid email";
    }

    if (!form.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });

      const data = response.data;
      const user = data?.user;

      if (!data?.success || !user) {
        setServerError(data?.message || "Unable to login. Please try again.");
        return;
      }

      const userRole = (
        typeof user.role === "string"
          ? user.role
          : user.role?.name || ""
      ).toLowerCase();

      if (userRole === "customer") {
        setServerError(
          "Access denied. Customer accounts cannot log in to the management panel."
        );
        return;
      }

      // Store token so the axios interceptor can attach it to every request
      if (data?.token) {
        localStorage.setItem("admin_token", data.token);
      }

      if (typeof setUser === "function") {
        setUser(user);
      }

      if (data?.mustChangePassword || user?.mustChangePassword) {
        navigate("/force-change-password", { replace: true });
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 401) {
        setServerError(message || "Invalid email or password");
      } else if (status === 403) {
        setServerError(
          message ||
            "Your account is inactive or you are not authorized to login."
        );
      } else {
        setServerError(message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Store, title: "Stores", desc: "Manage your stores" },
    { icon: Users, title: "Users", desc: "Access control" },
    { icon: Truck, title: "Delivery", desc: "Operations" },
  ];

  return (
    <main className="h-dvh w-full overflow-hidden bg-[#090b20] font-sans">

      {/* Prevent browser autofill from applying grey/blue input background */}
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

      <div className="grid h-full min-h-0 lg:grid-cols-[1.08fr_0.92fr]">

        {/* LEFT PANEL */}

        <section
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            mouseX.set(0);
            mouseY.set(0);
          }}
          className="relative flex min-h-0 flex-col justify-between overflow-hidden bg-[#0b0e23] px-7 py-7 sm:px-10 lg:px-12 xl:px-16"
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_40%,rgba(104,58,230,0.22),transparent_55%)]" />

          <div className="absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-violet-700/20 blur-[120px]" />

          <div
            className="absolute inset-0 opacity-[0.055]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.2) 1px,transparent 1px)",
              backgroundSize: "55px 55px",
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative z-30 flex items-center gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-lg shadow-violet-500/20 backdrop-blur-xl">
              <ShoppingBag size={24} />
            </div>

            <span className="text-2xl font-extrabold tracking-tight text-white">
              Elib<span className="text-violet-400">Cart</span>
            </span>
          </motion.div>

          <OrbitVisual mouseX={mouseX} mouseY={mouseY} />

          <motion.div
            initial={{ opacity: 0, x: -25 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative z-30 mt-auto mb-5 max-w-[430px] lg:mb-8"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-[10px] font-bold tracking-[1.5px] text-violet-200">
              <Sparkles size={14} className="text-violet-400" />
              SMART MANAGEMENT SYSTEM
            </div>

            <h1 className="text-4xl font-black leading-[1.04] tracking-[-2px] text-white sm:text-5xl xl:text-[60px]">
              Manage
              <br />
              everything.
              <span className="block bg-gradient-to-r from-violet-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                One place.
              </span>
            </h1>

            <p className="mt-5 max-w-[390px] text-sm leading-6 text-slate-400">
              Powerful tools to manage your stores, products,
              customers and delivery operations from one
              intelligent workspace.
            </p>

            <div className="mt-5 flex flex-wrap gap-5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <ShieldCheck size={17} className="text-violet-400" />
                Secure access
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Zap size={17} className="text-violet-400" />
                Smart operations
              </div>
            </div>
          </motion.div>

          <div className="relative z-30 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] font-medium tracking-wide text-slate-500">
            <span>© 2026 ElibCart</span>
            <span className="flex items-center gap-2">
              <Globe2 size={13} />
              ONE PLATFORM. COMPLETE CONTROL.
            </span>
          </div>
        </section>
    

        {/* RIGHT PANEL - REDESIGNED */}

        <section className="relative flex min-h-0 items-center justify-center overflow-hidden bg-[#faf8ff] px-5 py-5 sm:px-9 lg:px-9 xl:px-12">

          {/* BACKGROUND DECORATION */}

          <div className="pointer-events-none absolute -right-32 -top-40 h-[450px] w-[450px] rounded-full bg-violet-200/60 blur-[90px]" />

          <div className="pointer-events-none absolute -bottom-40 -left-32 h-[400px] w-[400px] rounded-full bg-purple-200/50 blur-[100px]" />

          <div className="pointer-events-none absolute right-[-100px] top-[20%] h-64 w-64 rounded-full border border-violet-200/60" />

          <div className="pointer-events-none absolute bottom-5 left-10 h-28 w-28 rounded-full border border-purple-200/50" />

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 w-full max-w-[455px]"
          >

            {/* TOP HEADER */}

            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-300">
                  <ShoppingBag size={21} />
                </div>

                <span className="text-xl font-extrabold text-slate-900">
                  Elib<span className="text-violet-600">Cart</span>
                </span>
              </div>

              <div className="hidden items-center gap-2 rounded-full border border-violet-200/80 bg-white/80 px-4 py-2 shadow-sm lg:flex">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-slate-600">
                  Smart • Secure • Scalable
                </span>
              </div>

              <div className="ml-auto flex items-center gap-2 text-xs font-semibold text-slate-500">
                <ShieldCheck size={16} className="text-violet-600" />
                Secure login
              </div>
            </div>

            {/* WELCOME HEADING */}

            <div className="mb-5">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-200 bg-white text-violet-600 shadow-[0_5px_20px_rgba(139,92,246,0.12)]"
              >
                <LockKeyhole size={23} />
              </motion.div>

              <p className="mb-1 text-sm font-extrabold text-violet-700">
                Welcome Back
              </p>

              <h2 className="text-[36px] font-black leading-[1.05] tracking-[-1.8px] text-[#100c38] sm:text-[40px]">
                Sign in to
                <span className="block bg-gradient-to-r from-violet-700 via-purple-600 to-violet-500 bg-clip-text text-transparent">
                  ElibCart.
                </span>
              </h2>

              <p className="mt-2 text-[12px] leading-5 text-slate-600">
                Enter your credentials to access your management workspace.
              </p>
            </div>

            {/* SERVER ERROR */}

            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600"
              >
                {serverError}
              </motion.div>
            )}

            {/* LOGIN FORM */}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* EMAIL */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 flex items-center gap-2 text-[12px] font-extrabold text-[#171044]"
                >
                  <Mail size={17} className="text-violet-600" />
                  Email address
                </label>

                <div
                  className={`group flex h-[49px] items-center rounded-full border bg-white px-2.5 shadow-[0_4px_15px_rgba(124,58,237,0.09)] transition-all duration-300 ${
                    errors.email
                      ? "border-red-400 ring-4 ring-red-100"
                      : "border-violet-200 hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <Mail size={16} />
                  </div>

                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={loading}
                    className="h-full min-w-0 flex-1 border-0 bg-white px-3 text-[12px] font-medium text-[#17132f] outline-none placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-0 disabled:opacity-60"
                  />

                  {form.email && !errors.email && (
                    <div className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </div>

                {errors.email && (
                  <p className="mt-1.5 pl-3 text-[11px] text-red-500">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* PASSWORD */}

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 flex items-center gap-2 text-[12px] font-extrabold text-[#171044]"
                >
                  <LockKeyhole size={17} className="text-violet-600" />
                  Password
                </label>

                <div
                  className={`group flex h-[49px] items-center rounded-full border bg-white px-2.5 shadow-[0_4px_15px_rgba(124,58,237,0.09)] transition-all duration-300 ${
                    errors.password
                      ? "border-red-400 ring-4 ring-red-100"
                      : "border-violet-200 hover:border-violet-300 focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-100"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <LockKeyhole size={16} />
                  </div>

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                    className="h-full min-w-0 flex-1 border-0 bg-white px-3 text-[12px] font-medium text-[#17132f] outline-none placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-0 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-violet-600 transition hover:bg-violet-100"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p className="mt-1.5 pl-3 text-[11px] text-red-500">
                    {errors.password}
                  </p>
                )}

                <div className="mt-2 flex justify-end">
                  <Link
                    to="/forgot-password"
                    state={{ email: form.email.trim() }}
                    className="group flex items-center gap-1 text-[11px] font-bold text-violet-700 transition hover:text-violet-900"
                  >
                    Forgot password?
                    <ArrowRight
                      size={13}
                      className="transition group-hover:translate-x-1"
                    />
                  </Link>
                </div>
              </div>

              {/* LOGIN BUTTON */}

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="group relative flex h-[49px] w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-violet-700 via-purple-600 to-indigo-600 text-[12px] font-extrabold text-white shadow-[0_10px_25px_rgba(109,40,217,0.32)] transition-all hover:shadow-[0_14px_30px_rgba(109,40,217,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
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
                      <Loader2 size={17} className="animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <LockKeyhole size={16} />
                      Sign in to dashboard
                      <ArrowRight
                        size={17}
                        className="transition group-hover:translate-x-1"
                      />
                    </>
                  )}
                </span>
              </motion.button>
            </form>

            {/* OR DIVIDER */}

            <div className="my-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-violet-200" />
              <span className="text-[10px] font-extrabold text-violet-600">
                OR
              </span>
              <div className="h-px flex-1 bg-violet-200" />
            </div>

            {/* MANAGEMENT FEATURE CARDS */}

            <div className="grid grid-cols-3 gap-2.5">
              {features.map((item, index) => {
                const Icon = item.icon;

                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.12 }}
                    whileHover={{ y: -4 }}
                    className="group rounded-xl border border-violet-200/80 bg-white/90 p-3 shadow-[0_3px_12px_rgba(124,58,237,0.06)] transition-all duration-300 hover:border-violet-300 hover:shadow-[0_8px_20px_rgba(124,58,237,0.13)]"
                  >
                    <div className="mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white">
                      <Icon size={16} />
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[11px] font-extrabold text-[#171044]">
                        {item.title}
                      </p>
                      <ArrowRight
                        size={12}
                        className="shrink-0 text-violet-600 transition group-hover:translate-x-1"
                      />
                    </div>

                    <p className="mt-0.5 text-[9px] font-medium text-slate-400">
                      {item.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            {/* SECURITY MESSAGE */}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-violet-200/70 bg-white/75 px-3 py-2.5 text-center"
            >
              <ShieldCheck
                size={17}
                className="shrink-0 text-emerald-500"
              />
              <span className="text-[10px] font-semibold text-[#24145d]">
                Your account is protected with enterprise-grade security.
              </span>
            </motion.div>

            {/* RIGHT FOOTER */}

            <div className="mt-4 flex items-center justify-between border-t border-violet-200/70 pt-3 text-[9px] font-bold tracking-wide text-slate-400">
              <span>© 2026 ELIBCART</span>

              <span className="flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-violet-500" />
                SECURE & RELIABLE PLATFORM
              </span>
            </div>

          </motion.div>
        </section>
      </div>
    </main>
  );
};

export default Login;
