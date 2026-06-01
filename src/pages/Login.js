// ─────────────────────────────────────────────────
//  Login.js — email/password + Google login
//  + forgot password flow
//  + resend verification email option
// ─────────────────────────────────────────────────

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { currentUser, loginWithGoogle, loginWithEmail,
          resetPassword, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();

  const [tab,       setTab]       = useState("login");   // "login" | "forgot"
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [info,      setInfo]      = useState("");        // success messages
  const [showPass,  setShowPass]  = useState(false);
  const [notVerified, setNotVerified] = useState(false); // unverified state

  // ── Already logged in ───────────────────────────
  if (currentUser) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">👋</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Welcome, {currentUser?.displayName?.split(" ")[0] ?? "there"}!
        </h2>
        <p className="text-gray-500 mb-6">You're already logged in.</p>
        <Link to="/" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Browse Messes
        </Link>
      </div>
    );
  }

  // ── Google login ────────────────────────────────
  async function handleGoogle() {
    setError(""); setInfo("");
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err) {
      setError("Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Email login ─────────────────────────────────
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
          setError("Too many failed attempts. Please wait a moment and try again.");
        else if (code === "auth/invalid-email")
          setError("Please enter a valid email address.");
        else
          setError(err?.message ?? "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Resend verification ─────────────────────────
  async function handleResend() {
    setError(""); setInfo("");
    try {
      // Sign in temporarily to resend
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const { auth } = await import("../firebase");
      const result = await signInWithEmailAndPassword(auth, email, password);
      await resendVerificationEmail();
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
      setInfo("Verification email resent! Check your inbox.");
      setNotVerified(false);
    } catch {
      setInfo("Could not resend. Please try signing up again.");
    }
  }

  // ── Forgot password ─────────────────────────────
  async function handleForgotPassword(e) {
    e.preventDefault();
    setError(""); setInfo("");
    if (!email) { setError("Please enter your email address above."); return; }
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

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 bg-white text-gray-900 transition-colors";

  return (
    <div className="max-w-sm mx-auto py-12 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tab === "forgot" ? "Reset password" : "Welcome back"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {tab === "forgot"
              ? "Enter your email to receive a reset link"
              : "Log in to your MessFinder BD account"}
          </p>
        </div>

        {/* ── LOGIN TAB ── */}
        {tab === "login" && (
          <>
            {/* Google */}
            <button onClick={handleGoogle} disabled={loading}
              className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3 px-4 font-semibold text-gray-700 hover:border-orange-400 hover:bg-orange-50 transition-all text-sm mb-4 disabled:opacity-60">
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20H24v8h11.3c-1.6 4.4-5.8 7.6-11.3 7.6C17 35.6 11.4 30 11.4 23S17 10.4 24 10.4c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 4.5 29.3 2.4 24 2.4 12.8 2.4 3.6 11.6 3.6 22.8S12.8 43.2 24 43.2c10.5 0 19.6-7.6 19.6-20.8 0-1.2-.1-2.3-.4-3.4z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16.1 18.9 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 4.5 29.3 2.4 24 2.4 16.3 2.4 9.6 7.5 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 43.6c5.2 0 9.8-1.9 13.4-5l-6.2-5.2C29.4 35 26.8 36 24 36c-5.4 0-9.9-3.6-11.5-8.5L5.8 32C9 38.9 16 43.6 24 43.6z"/>
                <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.7 2-2 3.7-3.7 4.9l6.2 5.2c3.6-3.3 5.8-8.3 5.8-14.1 0-1.2-.1-2.3-.4-3.4z"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">or login with email</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Email form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="you@example.com" className={inputCls} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPass?"text":"password"} value={password}
                    onChange={e=>setPassword(e.target.value)}
                    placeholder="Your password" className={`${inputCls} pr-12`} required />
                  <button type="button" onClick={()=>setShowPass(s=>!s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">
                    {showPass ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Error / info banners */}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">
                  ⚠️ {error}
                  {/* Resend verification option */}
                  {notVerified && (
                    <button type="button" onClick={handleResend}
                      className="block mt-2 text-orange-500 font-semibold text-xs hover:underline">
                      Resend verification email →
                    </button>
                  )}
                </div>
              )}
              {info && (
                <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl border border-green-200">
                  ✅ {info}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60">
                {loading ? "Logging in…" : "Log In →"}
              </button>
            </form>

            {/* Forgot password link */}
            <button onClick={()=>{setTab("forgot");setError("");setInfo("");}}
              className="w-full text-center text-xs text-gray-400 hover:text-orange-500 mt-3 transition-colors">
              Forgot your password?
            </button>

            {/* Sign up link */}
            <div className="border-t border-gray-100 mt-5 pt-4 text-center">
              <p className="text-xs text-gray-500">
                Don't have an account?{" "}
                <Link to="/signup" className="text-orange-500 font-semibold hover:underline">
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
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="you@example.com" className={inputCls} required autoFocus />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">
                  ⚠️ {error}
                </div>
              )}
              {info && (
                <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl border border-green-200">
                  ✅ {info}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60">
                {loading ? "Sending…" : "Send Reset Link →"}
              </button>
            </form>

            <button onClick={()=>{setTab("login");setError("");setInfo("");}}
              className="w-full text-center text-xs text-gray-400 hover:text-orange-500 mt-3 transition-colors">
              ← Back to login
            </button>
          </>
        )}

      </div>
    </div>
  );
}
