// ─────────────────────────────────────────────────
//  Navbar.js — clean version, no dark mode
// ─────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth }     from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import LogoutModal     from "./LogoutModal";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { currentUser, userRole, logout } = useAuth();
  const { lang, toggleLang, t } = useLanguage();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [menuOpen,         setMenuOpen]         = useState(false);
  const [mobileOpen,       setMobileOpen]       = useState(false);
  const [showLogoutModal,  setShowLogoutModal]  = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setMenuOpen(false); setMobileOpen(false); }, [location]);

  function requestLogout() { setShowLogoutModal(true); }
  async function confirmLogout() { setShowLogoutModal(false); await logout(); navigate("/"); }

  const navLinks = [
    { to: "/",          label: `🏠 ${t("browseM")}` },
    { to: "/saved",     label: `🔖 ${t("bookmarked")}` },
    { to: "/roommates", label: `🤝 ${t("findRoommate")}` },
    ...(userRole === "owner" ? [
      { to: "/post",          label: `➕ ${t("postMess")}` },
      { to: "/dashboard",     label: `⚙️ ${t("dashboard")}` },
    ] : []),
    ...(userRole === "finder" ? [
      { to: "/post-roommate", label: `➕ Post Roommate` },
      { to: "/dashboard",     label: `⚙️ ${t("dashboard")}` },
    ] : []),
  ];

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <span className="text-2xl">🏠</span>
              <span className="font-bold text-xl text-gray-900">
                Mess<span className="text-orange-500">Finder</span>
                <span className="text-sm font-normal text-gray-400 ml-1">BD</span>
              </span>
            </Link>

            {/* Desktop */}
            <div className="hidden md:flex items-center gap-3">

              {/* Language toggle */}
              <button onClick={toggleLang}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-orange-300 hover:text-orange-500 transition-all">
                <span>{lang === "en" ? "EN" : "বাং"}</span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-400">{lang === "en" ? "বাংলা" : "EN"}</span>
              </button>

              {/* Notification bell */}
              <NotificationBell />

              {/* Menu dropdown */}
              <div ref={menuRef} className="relative">
                <button onClick={() => setMenuOpen(o => !o)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-medium text-sm transition-all
                    ${menuOpen
                      ? "border-orange-500 bg-orange-50 text-orange-600"
                      : "border-gray-200 text-gray-600 hover:border-orange-300"}`}>
                  <span>☰</span> {t("menu")}
                  <span className={`text-xs transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}>▼</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden">
                    {navLinks.map(link => (
                      <Link key={link.to} to={link.to}
                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-orange-50 hover:text-orange-600
                          ${location.pathname === link.to ? "bg-orange-50 text-orange-600" : "text-gray-700"}`}>
                        {link.label}
                      </Link>
                    ))}
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      {currentUser
                        ? <button onClick={requestLogout}
                            className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                            🚪 {t("logout")}
                          </button>
                        : <div className="flex flex-col gap-1 px-3 pb-1">
                            <Link to="/login"
                              className="flex items-center gap-2 px-2 py-2.5 text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-colors">
                              🔐 Log in
                            </Link>
                            <Link to="/signup"
                              className="flex items-center gap-2 px-2 py-2.5 text-sm font-semibold text-orange-500 hover:bg-orange-50 rounded-xl transition-colors">
                              ✨ Sign up free
                            </Link>
                          </div>
                      }
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar */}
              {currentUser && (
                <div className="flex items-center gap-2">
                  <img
                    src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.displayName ?? "U"}`}
                    alt={currentUser?.displayName ?? "User"}
                    className="w-9 h-9 rounded-full border-2 border-orange-200 object-cover"
                  />
                  <div className="flex flex-col leading-none">
                    <span className="text-xs font-semibold text-gray-800 max-w-[80px] truncate">
                      {currentUser?.displayName?.split(" ")[0] ?? "User"}
                    </span>
                    <span className="text-[10px] text-gray-400 capitalize">{userRole ?? "…"}</span>
                  </div>
                </div>
              )}

              {userRole === "owner" && (
                <Link to="/post" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
                  + {lang === "en" ? "Post" : "পোস্ট"}
                </Link>
              )}
              {userRole === "finder" && (
                <Link to="/post-roommate" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
                  + Roommate
                </Link>
              )}
              {/* Auth buttons when logged out */}
              {!currentUser && (
                <div className="flex items-center gap-2">
                  <Link to="/login"
                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors">
                    Log in
                  </Link>
                  <Link to="/signup"
                    className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-sm font-bold transition-colors shadow-sm">
                    Sign up free →
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile right */}
            <div className="md:hidden flex items-center gap-2">
              <button onClick={toggleLang}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600">
                {lang === "en" ? "বাং" : "EN"}
              </button>
              <button onClick={() => setMobileOpen(o => !o)}
                className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors">
                {mobileOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>

          {/* Mobile drawer */}
          {mobileOpen && (
            <div className="md:hidden border-t border-gray-100 py-3 flex flex-col gap-1 pb-4">
              {navLinks.map(link => (
                <Link key={link.to} to={link.to}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors
                    ${location.pathname === link.to ? "bg-orange-50 text-orange-600" : "text-gray-700 hover:bg-gray-50"}`}>
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-gray-100 mt-2 pt-2">
                {currentUser
                  ? <button onClick={requestLogout} className="w-full text-left px-3 py-3 text-sm font-medium text-red-500">
                      🚪 {t("logout")}
                    </button>
                  : <div className="flex flex-col gap-2 px-3 pt-1 pb-2">
                      <Link to="/signup"
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl text-sm font-bold transition-colors text-center">
                        Sign up free →
                      </Link>
                      <Link to="/login"
                        className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium transition-colors text-center hover:border-orange-400 hover:text-orange-500">
                        Log in
                      </Link>
                    </div>
                }
              </div>
            </div>
          )}
        </div>
      </nav>

      {showLogoutModal && (
        <LogoutModal onConfirm={confirmLogout} onCancel={() => setShowLogoutModal(false)} />
      )}
    </>
  );
}

