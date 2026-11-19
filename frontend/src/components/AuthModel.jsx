
"use client";

import { useEffect, useState } from "react";
import {
    X,
    Mail,
    LockKeyhole,
    UserRound,
    Eye,
    EyeOff,
    ArrowLeft,
    Loader2,
    ShieldCheck,
} from "lucide-react";

import api from "@/lib/api";
import { useAuth } from "@/context/authContext";

export default function AuthModal({
    isOpen,
    initialMode = "login",
    onClose,
    onSuccess,
}) {
    const { login } = useAuth();

    const [mode, setMode] = useState(initialMode);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [form, setForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        otp: "",
    });

    useEffect(() => {
        if (isOpen) {
            setError("");
            setMessage("");
            setShowPassword(false);
        }
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError("");
    };

    const getErrorMessage = (error, fallback) => {
        return (
            error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            fallback
        );
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        try {
            const response = await api.post("/users/login", {
                email: form.email,
                password: form.password,
            });

            const data = response.data;

            // Handle common API response structures
            const userData =
                data?.user ||
                data?.data?.user ||
                data?.data?.admin ||
                data?.admin ||
                data?.data?.data?.user ||
                data?.data;

            const token =
                data?.token ||
                data?.accessToken ||
                data?.data?.token ||
                data?.data?.accessToken;

            if (!userData || typeof userData !== "object") {
                throw new Error(
                    "Login succeeded, but user information was not found in the response."
                );
            }

            const rawRole =
                typeof userData.role === "string"
                    ? userData.role
                    : userData.role?.name || "";

            const role = String(rawRole)
                .trim()
                .toLowerCase()
                .replace(/[\s-]+/g, "_");

            if (role !== "customer") {
                setError(
                    "Access Restricted: Only accounts with the 'customer' role are allowed to log in here."
                );
                return;
            }

            login(userData, token);

            onClose?.();
            onSuccess?.();
        } catch (error) {
            setError(
                getErrorMessage(error, "Unable to log in. Please try again.")
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");

        if (form.password.length < 6) {
            setError("Password must contain at least 6 characters.");
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            await api.post("/users/signup", {
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email,
                password: form.password,
            });

            setForm((previous) => ({
                ...previous,
                password: "",
                confirmPassword: "",
            }));

            setMode("login");
            setMessage("Account created successfully. Please log in.");
        } catch (error) {
            setError(
                getErrorMessage(error, "Unable to create your account.")
            );
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (event) => {
        // The event is optional so this also works for Resend OTP.
        event?.preventDefault();

        setError("");
        setMessage("");

        if (!form.email.trim()) {
            setError("Please enter your email address.");
            return;
        }

        setLoading(true);

        try {
            await api.post("/auth/forgot-password", {
                email: form.email,
            });

            setMode("verify");
            setMessage("OTP sent. Please check your email.");
        } catch (error) {
            setError(
                getErrorMessage(error, "Unable to send OTP. Please try again.")
            );
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");

        if (!form.otp.trim()) {
            setError("Please enter the OTP.");
            return;
        }

        setLoading(true);

        try {
            await api.post("/auth/verify-otp", {
                email: form.email,
                otp: form.otp,
            });

            sessionStorage.setItem("elibcartResetEmail", form.email);
            sessionStorage.setItem("elibcartResetOtp", form.otp);

            setMode("reset");
            setMessage("OTP verified. You can reset your password now.");
        } catch (error) {
            setError(
                getErrorMessage(error, "Invalid OTP. Please try again.")
            );
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (event) => {
        event.preventDefault();
        setError("");
        setMessage("");

        if (form.password.length < 6) {
            setError("Password must contain at least 6 characters.");
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const email =
                sessionStorage.getItem("elibcartResetEmail") || form.email;

            const otp =
                sessionStorage.getItem("elibcartResetOtp") || form.otp;

            await api.post("/auth/reset-password", {
                email,
                otp,
                newPassword: form.password,
            });

            sessionStorage.removeItem("elibcartResetEmail");
            sessionStorage.removeItem("elibcartResetOtp");

            setForm((previous) => ({
                ...previous,
                password: "",
                confirmPassword: "",
                otp: "",
            }));

            setMode("login");
            setMessage("Password reset successfully. Please log in.");
        } catch (error) {
            setError(
                getErrorMessage(error, "Unable to reset password.")
            );
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full rounded-xl border border-white/10 bg-[#0b1020] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20";

    const labelClass = "mb-2 block text-sm font-medium text-slate-300";

    const renderEmailInput = () => (
        <div>
            <label className={labelClass} htmlFor="auth-email">
                Email address
            </label>

            <div className="relative">
                <Mail
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                    id="auth-email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className={inputClass}
                />
            </div>
        </div>
    );

    const renderPasswordInput = (
        name,
        label,
        autoComplete = "current-password"
    ) => (
        <div>
            <label className={labelClass} htmlFor={`auth-${name}`}>
                {label}
            </label>

            <div className="relative">
                <LockKeyhole
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                    id={`auth-${name}`}
                    type={showPassword ? "text" : "password"}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    autoComplete={autoComplete}
                    required
                    className={`${inputClass} pr-12`}
                />

                <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                >
                    {showPassword ? (
                        <EyeOff size={18} />
                    ) : (
                        <Eye size={18} />
                    )}
                </button>
            </div>
        </div>
    );

    const renderSubmitButton = (label) => (
        <button
            type="submit"
            disabled={loading}
            className="gradient-background flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? "Please wait..." : label}
        </button>
    );

    const titles = {
        login: {
            title: "Welcome back",
            description: "Log in to continue shopping with Elibcart.",
        },
        signup: {
            title: "Create account",
            description: "Join Elibcart and start shopping.",
        },
        forgot: {
            title: "Forgot password?",
            description: "Enter your email to receive a verification OTP.",
        },
        verify: {
            title: "Verify your email",
            description: "Enter the OTP sent to your email address.",
        },
        reset: {
            title: "Reset password",
            description: "Create a new password for your account.",
        },
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !loading) {
                    onClose?.();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-title"
                className="relative my-auto w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#101629] shadow-2xl shadow-black/50"
            >
                <div className="absolute inset-x-0 top-0 h-1 gradient-background" />

                <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    aria-label="Close authentication popup"
                    className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                    <X size={20} />
                </button>

                <div className="px-6 pb-7 pt-8 sm:px-8">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                        {mode === "verify" || mode === "reset" ? (
                            <ShieldCheck size={28} />
                        ) : (
                            <UserRound size={28} />
                        )}
                    </div>

                    {mode !== "login" && (
                        <button
                            type="button"
                            onClick={() => {
                                setError("");
                                setMessage("");

                                if (mode === "signup" || mode === "forgot") {
                                    setMode("login");
                                } else if (mode === "verify") {
                                    setMode("forgot");
                                } else if (mode === "reset") {
                                    setMode("verify");
                                }
                            }}
                            className="mb-3 flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                    )}

                    <h2
                        id="auth-title"
                        className="text-2xl font-bold text-white"
                    >
                        {titles[mode].title}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                        {titles[mode].description}
                    </p>

                    {error && (
                        <div
                            role="alert"
                            className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                        >
                            {error}
                        </div>
                    )}

                    {message && (
                        <div
                            role="status"
                            className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
                        >
                            {message}
                        </div>
                    )}

                    <form
                        onSubmit={
                            mode === "login"
                                ? handleLogin
                                : mode === "signup"
                                    ? handleSignup
                                    : mode === "forgot"
                                        ? handleForgotPassword
                                        : mode === "verify"
                                            ? handleVerifyOtp
                                            : handleResetPassword
                        }
                        className="mt-6 space-y-5"
                    >
                        {mode === "signup" && (
                            <>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label
                                            className={labelClass}
                                            htmlFor="auth-firstName"
                                        >
                                            First name
                                        </label>

                                        <input
                                            id="auth-firstName"
                                            type="text"
                                            name="firstName"
                                            value={form.firstName}
                                            onChange={handleChange}
                                            placeholder="First name"
                                            autoComplete="given-name"
                                            required
                                            className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            className={labelClass}
                                            htmlFor="auth-lastName"
                                        >
                                            Last name
                                        </label>

                                        <input
                                            id="auth-lastName"
                                            type="text"
                                            name="lastName"
                                            value={form.lastName}
                                            onChange={handleChange}
                                            placeholder="Last name"
                                            autoComplete="family-name"
                                            required
                                            className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500"
                                        />
                                    </div>
                                </div>

                                {renderEmailInput()}

                                {renderPasswordInput(
                                    "password",
                                    "Password",
                                    "new-password"
                                )}

                                {renderPasswordInput(
                                    "confirmPassword",
                                    "Confirm password",
                                    "new-password"
                                )}

                                {renderSubmitButton("Create account")}
                            </>
                        )}

                        {mode === "login" && (
                            <>
                                {renderEmailInput()}

                                {renderPasswordInput("password", "Password")}

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setError("");
                                            setMessage("");
                                            setMode("forgot");
                                        }}
                                        className="text-sm text-cyan-300 transition hover:text-cyan-200"
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                {renderSubmitButton("Log in")}
                            </>
                        )}

                        {mode === "forgot" && (
                            <>
                                {renderEmailInput()}

                                {renderSubmitButton("Send OTP")}
                            </>
                        )}

                        {mode === "verify" && (
                            <>
                                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
                                    OTP sent to{" "}
                                    <span className="font-medium text-white">
                                        {form.email}
                                    </span>
                                </div>

                                <div>
                                    <label
                                        className={labelClass}
                                        htmlFor="auth-otp"
                                    >
                                        Verification OTP
                                    </label>

                                    <input
                                        id="auth-otp"
                                        type="text"
                                        name="otp"
                                        value={form.otp}
                                        onChange={handleChange}
                                        placeholder="Enter OTP"
                                        autoComplete="one-time-code"
                                        inputMode="numeric"
                                        required
                                        className="w-full rounded-xl border border-white/10 bg-[#0b1020] px-4 py-3 text-center text-lg tracking-[0.3em] text-white outline-none placeholder:text-slate-500 focus:border-violet-500"
                                    />
                                </div>

                                {renderSubmitButton("Verify OTP")}

                                <button
                                    type="button"
                                    disabled={loading}
                                    onClick={() => handleForgotPassword()}
                                    className="w-full text-sm text-cyan-300 transition hover:text-cyan-200 disabled:opacity-50"
                                >
                                    Resend OTP
                                </button>
                            </>
                        )}

                        {mode === "reset" && (
                            <>
                                {renderPasswordInput(
                                    "password",
                                    "New password",
                                    "new-password"
                                )}

                                {renderPasswordInput(
                                    "confirmPassword",
                                    "Confirm new password",
                                    "new-password"
                                )}

                                {renderSubmitButton("Reset password")}
                            </>
                        )}
                    </form>

                    {(mode === "login" || mode === "signup") && (
                        <p className="mt-6 text-center text-sm text-slate-400">
                            {mode === "login"
                                ? "Don't have an account?"
                                : "Already have an account?"}{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    setError("");
                                    setMessage("");
                                    setMode(
                                        mode === "login" ? "signup" : "login"
                                    );
                                }}
                                className="font-semibold text-cyan-300 transition hover:text-cyan-200"
                            >
                                {mode === "login" ? "Sign up" : "Log in"}
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
