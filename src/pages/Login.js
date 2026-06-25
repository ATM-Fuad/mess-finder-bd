// ─────────────────────────────────────────────────
//  Login.js  —  Phase 2 redesign
//  • Warm colors, rounded-3xl
//  • Email/password + Google login
//  • Forgot password tab
//  • Resend verification option
//  • Zero ESLint errors
// ─────────────────────────────────────────────────

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const {
    currentUser, loginWithGoogle, loginWithEmail,
    resetPassword, resendVerificationEmail,
  } = useAuth();
  const navigate = useNavigate();

  const [tab,         setTab]         = useState("login");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [info,        setInfo]        = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [notVerified, setNotVerified] = useState(false);

  if (currentUser) {
    return (
      <div className="max-w-md mx-auto text-center py-20 animate-fade-in">
        <div className="text-5xl mb-4">👋</div>
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">
          Welcome, {currentUser?.displayName?.split(" ")[0] ?? "there"}!
        </h2>
        <p className="text-[#6B7280] mb-6">You're already logged in.</p>
        <Link
          to="/"
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold transition-colors tap-target inline-block"
        >
          Browse Messes
        </Link>
      </div>
    );
  }

  async function handleGoogle() {
    setError(""); setInfo("");
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/");
    } catch {
      setError("Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError(""); setInfo(""); setNotVerified(false);
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate("/");
    } catch (err) {
      if (err?.message === "EMAIL_NOT_VERIFIED") {
        setNotVerified(true);
        setError("Your email is not verified yet. Please check your inbox.");
      } else {
        const code = err?.code ?? "";
        if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential")
          setError("Incorrect email or password. Please try again.");
        else if (code === "auth/too-many-requests")
          setError("Too many attempts. Please wait a moment and try again.");
        else if (code === "auth/invalid-email")
          setError("Please enter a valid email address.");
        else
          setError(err?.message ?? "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(""); setInfo("");
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { auth: firebaseAuth }         = await import("../firebase");
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      await resendVerificationEmail();
      const { signOut } = await import("firebase/auth");
      await signOut(firebaseAuth);
      setInfo("Verification email resent! Check your inbox.");
      setNotVerified(false);
    } catch {
      setInfo("Could not resend. Please try signing up again.");
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError(""); setInfo("");
    if (!email) { setError("Please enter your email address."); return; }
    setLoading(true);
    try {
      await resetPassword(email);
      setInfo("Password reset email sent! Check your inbox.");
    } catch (err) {
      const code = err?.code ?? "";
      if (code === "auth/user-not-found")
        setError("No account found with this email.");
      else if (code === "auth/invalid-email")
        setError("Please enter a valid email address.");
      else
        setError("Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full border border-[#E8E8E4] rounded-2xl px-4 py-3 text-sm outline-none text-[#1A1A1A] bg-white transition-colors";

  return (
    <div
      className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-fade-in"
      style={{ backgroundColor: "#FAFAF8" }}
    >
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-white rounded-3xl border border-[#E8E8E4] shadow-card p-8">

          {/* Header */}
          <div className="text-center mb-7">
            <div className="text-4xl mb-3">🏠</div>
            <h1 className="text-2xl font-extrabold text-[#1A1A1A]">
              {tab === "forgot" ? "Reset password" : "Welcome back"}
            </h1>
            <p className="text-[#9CA3AF] text-sm mt-1">
              {tab === "forgot"
                ? "Enter your email to receive a reset link"
                : "Log in to your MessFinder BD account"}
            </p>
          </div>

          {/* ── LOGIN TAB ── */}
          {tab === "login" && (
            <>
              {/* Google button */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 border-2 border-[#E8E8E4] hover:border-orange-300 hover:bg-orange-50 rounded-2xl py-3 px-4 font-bold text-[#374151] text-sm transition-all mb-5 tap-target disabled:opacity-60"
              >
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.6 20H24v8h11.3c-1.6 4.4-5.8 7.6-11.3 7.6C17 35.6 11.4 30 11.4 23S17 10.4 24 10.4c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 4.5 29.3 2.4 24 2.4 12.8 2.4 3.6 11.6 3.6 22.8S12.8 43.2 24 43.2c10.5 0 19.6-7.6 19.6-20.8 0-1.2-.1-2.3-.4-3.4z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16.1 18.9 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 4.5 29.3 2.4 24 2.4 16.3 2.4 9.6 7.5 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 43.6c5.2 0 9.8-1.9 13.4-5l-6.2-5.2C29.4 35 26.8 36 24 36c-5.4 0-9.9-3.6-11.5-8.5L5.8 32C9 38.9 16 43.6 24 43.6z"/>
                  <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.7 2-2 3.7-3.7 4.9l6.2 5.2c3.6-3.3 5.8-8.3 5.8-14.1 0-1.2-.1-2.3-.4-3.4z"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px" style={{ background: "#E8E8E4" }} />
                <span className="text-xs text-[#9CA3AF] font-medium">or login with email</span>
                <div className="flex-1 h-px" style={{ background: "#E8E8E4" }} />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputCls} required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#6B7280] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Your password"
                      className={`${inputCls} pr-14`} required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9CA3AF] hover:text-orange-500 transition-colors"
                    >
                      {showPass ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* Error banner */}
                {error && (
                  <div
                    className="text-sm px-4 py-3 rounded-2xl border"
                    style={{ background:"#FEF2F2", color:"#991B1B", borderColor:"#FECACA" }}
                  >
                    ⚠️ {error}
                    {notVerified && (
                      <button
                        type="button" onClick={handleResend}
                        className="block mt-1.5 text-orange-500 font-bold text-xs hover:underline"
                      >
                        Resend verification email →
                      </button>
                    )}
                  </div>
                )}

                {/* Info banner */}
                {info && (
                  <div
                    className="text-sm px-4 py-3 rounded-2xl border"
                    style={{ background:"#F0FDF4", color:"#065F46", borderColor:"#BBF7D0" }}
                  >
                    ✅ {info}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-2xl font-bold text-sm transition-colors disabled:opacity-60 tap-target"
                >
                  {loading ? "Logging in…" : "Log In →"}
                </button>
              </form>

              {/* Forgot password */}
              <button
                onClick={() => { setTab("forgot"); setError(""); setInfo(""); }}
                className="w-full text-center text-xs text-[#9CA3AF] hover:text-orange-500 mt-3 transition-colors py-1"
              >
                Forgot your password?
              </button>

              {/* Sign up link */}
              <div
                className="mt-5 pt-4 text-center"
                style={{ borderTop: "1px solid #E8E8E4" }}
              >
                <p className="text-xs text-[#6B7280]">
                  Don't have an account?{" "}
                  <Link
                    to="/signup"
                    className="text-orange-500 font-bold hover:underline"
                  >
                    Sign up free
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD TAB ── */}
          {tab === "forgot" && (
            <>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#6B7280] mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputCls} required autoFocus
                  />
                </div>

                {error && (
                  <div
                    className="text-sm px-4 py-3 rounded-2xl border"
                    style={{ background:"#FEF2F2", color:"#991B1B", borderColor:"#FECACA" }}
                  >
                    ⚠️ {error}
                  </div>
                )}
                {info && (
                  <div
                    className="text-sm px-4 py-3 rounded-2xl border"
                    style={{ background:"#F0FDF4", color:"#065F46", borderColor:"#BBF7D0" }}
                  >
                    ✅ {info}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-2xl font-bold text-sm transition-colors disabled:opacity-60 tap-target"
                >
                  {loading ? "Sending…" : "Send Reset Link →"}
                </button>
              </form>

              <button
                onClick={() => { setTab("login"); setError(""); setInfo(""); }}
                className="w-full text-center text-xs text-[#9CA3AF] hover:text-orange-500 mt-3 transition-colors py-1"
              >
                ← Back to login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
