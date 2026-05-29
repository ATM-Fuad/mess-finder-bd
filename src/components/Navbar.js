// ─────────────────────────────────────────────────
//  Navbar.js  –  Top navigation bar
// ─────────────────────────────────────────────────

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { currentUser, loginWithGoogle, logout } = useAuth();
  const navigate   = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogin() {
    await loginWithGoogle();
    navigate("/");
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🏠</span>
            <span className="font-bold text-xl text-gray-900">
              Mess<span className="text-orange-500">Finder</span>
              <span className="text-sm font-normal text-gray-400 ml-1">BD</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/"          className="text-gray-600 hover:text-orange-500 font-medium transition-colors">Browse Messes</Link>
            <Link to="/roommates" className="text-gray-600 hover:text-orange-500 font-medium transition-colors">Find Roommate</Link>
            <Link
              to="/post"
              className="bg-orange-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              + Post a Mess
            </Link>

            {/* Login / user avatar */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                <img
                  src={currentUser.photoURL || "https://ui-avatars.com/api/?name=" + currentUser.displayName}
                  alt={currentUser.displayName}
                  className="w-8 h-8 rounded-full border-2 border-orange-200"
                />
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-red-500 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 text-gray-600 hover:text-orange-500 font-medium transition-colors"
              >
                <span>🔐</span> Login
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 flex flex-col gap-3">
            <Link to="/"          className="text-gray-700 font-medium" onClick={() => setMenuOpen(false)}>Browse Messes</Link>
            <Link to="/roommates" className="text-gray-700 font-medium" onClick={() => setMenuOpen(false)}>Find Roommate</Link>
            <Link to="/post"      className="text-orange-500 font-medium" onClick={() => setMenuOpen(false)}>+ Post a Mess</Link>
            {currentUser
              ? <button onClick={logout} className="text-left text-red-500 font-medium">Logout</button>
              : <button onClick={handleLogin} className="text-left text-gray-700 font-medium">🔐 Login with Google</button>
            }
          </div>
        )}
      </div>
    </nav>
  );
}
