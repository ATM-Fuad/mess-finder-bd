// ─────────────────────────────────────────────────
//  Signup.js  —  src/pages/Signup.js
//  New user registration with email + password
//  Sends verification email on success
// ─────────────────────────────────────────────────

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Signup() {
  const { signUpWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm: "",
  });
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [emailSent, setEmailSent] = useState(false); // show success screen

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  }

  // ── Password strength indicator ─────────────────
  function passwordStrength(pw) {
    if (!pw) return null;
    if (pw.length < 6)  return { label: "Too short", color: "bg-red-400",    width: "w-1/4" };
    if (pw.length < 8)  return { label: "Weak",      color: "bg-orange-400", width: "w-2/4" };
    if (!/[0-9]/.test(pw) || !/[A-Z]/.test(pw))
                        return { label: "Fair",       color: "bg-yellow-400", width: "w-3/4" };
    return               { label: "Strong",     color: "bg-green-500",  width: "w-full" };
  }

  const strength = passwordStrength(form.password);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim())           { setError("Please enter your full name."); return; }
    if (form.password.length < 6)    { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      await signUpWithEmail(form.name.trim(), form.email.trim(), form.password);
      setEmailSent(true); // show verification screen
    } catch (err) {
      // Translate Firebase error codes to friendly messages
      const code = err?.code ?? "";
      if (code === "auth/email-already-in-use")
        setError("This email is already registered. Try logging in instead.");
      else if (code === "auth/invalid-email")
        setError("Please enter a valid email address.");
      else if (code === "auth/weak-password")
        setError("Password is too weak. Use at least 6 characters.");
      else
        setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Verification sent screen ─────────────────────
  if (emailSent) {
    return (
      <div className="max-w-sm mx-auto py-16 px-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📧</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email!</h1>
          <p className="text-gray-500 text-sm mb-2">
            We sent a verification link to
          </p>
          <p className="font-semibold text-orange-500 text-sm mb-6 break-all">{form.email}</p>
          <div className="bg-orange-50 rounded-xl p-4 text-left mb-6">
            <p className="text-sm text-gray-700 font-medium mb-2">Next steps:</p>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Open your email inbox</li>
              <li>Click the verification link from Firebase</li>
              <li>Come back here and log in</li>
            </ol>
          </div>
          <Link
            to="/login"
            className="w-full block bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors text-center"
          >
            Go to Login →
          </Link>
          <p className="text-xs text-gray-400 mt-4">
            Didn't get the email? Check your spam folder, or{" "}
            <Link to="/login" className="text-orange-500 hover:underline">try logging in</Link>{" "}
            to resend it.
          </p>
        </div>
      </div>
    );
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 bg-white text-gray-900 transition-colors";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";

  return (
    <div className="max-w-sm mx-auto py-12 px-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🏠</div>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">Join MessFinder BD — it's free</p>
        </div>

        {/* Google option */}
        <button
          onClick={async () => { await loginWithGoogle(); navigate("/"); }}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3 px-4 font-semibold text-gray-700 hover:border-orange-400 hover:bg-orange-50 transition-all text-sm mb-4"
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
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or sign up with email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email sign up form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className={labelCls}>Full Name *</label>
            <input name="name" type="text" value={form.name} onChange={handleChange}
              placeholder="Your full name" className={inputCls} required autoFocus />
          </div>

          <div>
            <label className={labelCls}>Email Address *</label>
            <input name="email" type="email" value={form.email} onChange={handleChange}
              placeholder="you@example.com" className={inputCls} required />
          </div>

          <div>
            <label className={labelCls}>Password *</label>
            <input name="password" type="password" value={form.password} onChange={handleChange}
              placeholder="At least 6 characters" className={inputCls} required />
            {/* Strength bar */}
            {strength && (
              <div className="mt-1.5">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                </div>
                <p className={`text-xs mt-0.5 ${strength.color.replace("bg-","text-").replace("-400","-600").replace("-500","-600")}`}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Confirm Password *</label>
            <input name="confirm" type="password" value={form.confirm} onChange={handleChange}
              placeholder="Repeat your password" className={inputCls} required />
            {form.confirm && form.password !== form.confirm && (
              <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
            )}
            {form.confirm && form.password === form.confirm && form.confirm.length > 0 && (
              <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? "Creating account…" : "Create Account →"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-5">
          Already have an account?{" "}
          <Link to="/login" className="text-orange-500 font-medium hover:underline">Log in</Link>
        </p>
        <p className="text-xs text-gray-400 text-center mt-2">
          By signing up, you agree to use MessFinder BD responsibly.
        </p>
      </div>
    </div>
  );
}
