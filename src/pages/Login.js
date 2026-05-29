// ─────────────────────────────────────────────────
//  Login.js  –  Login page
// ─────────────────────────────────────────────────

import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const { currentUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleLogin() {
    await loginWithGoogle();
    navigate("/");
  }

  if (currentUser) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">👋</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Welcome, {currentUser.displayName?.split(" ")[0]}!
        </h2>
        <p className="text-gray-500 mb-6">You're already logged in.</p>
        <Link to="/" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Browse Messes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto py-16">
      <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
        <div className="text-5xl mb-4">🏠</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-gray-500 text-sm mb-8">Login to post listings, save messes, and write reviews</p>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3 px-4 font-semibold text-gray-700 hover:border-orange-400 hover:bg-orange-50 transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3c-1.6 4.4-5.8 7.6-11.3 7.6C17 35.6 11.4 30 11.4 23S17 10.4 24 10.4c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 4.5 29.3 2.4 24 2.4 12.8 2.4 3.6 11.6 3.6 22.8S12.8 43.2 24 43.2c10.5 0 19.6-7.6 19.6-20.8 0-1.2-.1-2.3-.4-3.4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16.1 18.9 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34 4.5 29.3 2.4 24 2.4 16.3 2.4 9.6 7.5 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 43.6c5.2 0 9.8-1.9 13.4-5l-6.2-5.2C29.4 35 26.8 36 24 36c-5.4 0-9.9-3.6-11.5-8.5L5.8 32C9 38.9 16 43.6 24 43.6z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.7 2-2 3.7-3.7 4.9l6.2 5.2c3.6-3.3 5.8-8.3 5.8-14.1 0-1.2-.1-2.3-.4-3.4z"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-xs text-gray-400 mt-4">
          By logging in, you agree to use MessFinder responsibly.
        </p>
      </div>
    </div>
  );
}
