// ─────────────────────────────────────────────────
//  Navbar.js
//  + Logout confirmation modal (Feature 1)
//  + Dark mode toggle Sun/Moon (Feature 5)
//  + Finder dashboard link
// ─────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth }      from "../contexts/AuthContext";
import { useLanguage }  from "../contexts/LanguageContext";
import { useDarkMode }  from "../contexts/DarkModeContext";
import LogoutModal      from "./LogoutModal";

// ── Sun / Moon SVG icons ──────────────────────────
function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="5"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

export default function Navbar() {
  const { currentUser, userRole, loginWithGoogle, logout } = useAuth();
  const { lang, toggleLang, t }  = useLanguage();
  const { dark, toggleDark }     = useDarkMode();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [menuOpen,      setMenuOpen]      = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setMenuOpen(false); setMobileOpen(false); }, [location]);

  async function handleLogin() { await loginWithGoogle(); navigate("/"); }

  // Instead of calling logout() directly, show the modal
  function requestLogout() { setShowLogoutModal(true); }
  async function confirmLogout() { setShowLogoutModal(false); await logout(); navigate("/"); }

  // Nav links vary by role
  const navLinks = [
    { to: "/",          label: `🏠 ${t("browseM")}` },
    { to: "/saved",     label: `🔖 ${t("bookmarked")}` },
    { to: "/roommates", label: `🤝 ${t("findRoommate")}` },
    ...(userRole === "owner"  ? [
      { to: "/post",           label: `➕ ${t("postMess")}` },
      { to: "/dashboard",      label: `⚙️ ${t("dashboard")}` },
    ] : []),
    ...(userRole === "finder" ? [
      { to: "/post-roommate",  label: `➕ Post Roommate` },
      { to: "/dashboard",      label: `⚙️ ${t("dashboard")}` },
    ] : []),
  ];

  const darkBtn = "flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-yellow-300 hover:border-orange-300 transition-all";

  return (
    <>
      <nav className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <span className="text-2xl">🏠</span>
              <span className="font-bold text-xl text-gray-900 dark:text-white">
                Mess<span className="text-orange-500">Finder</span>
                <span className="text-sm font-normal text-gray-400 ml-1">BD</span>
              </span>
            </Link>

            {/* ── Desktop ── */}
            <div className="hidden md:flex items-center gap-3">

              {/* Dark mode toggle */}
              <button onClick={toggleDark} className={darkBtn} title={dark ? "Light mode" : "Dark mode"}>
                {dark ? <SunIcon /> : <MoonIcon />}
              </button>

              {/* Language toggle */}
              <button onClick={toggleLang}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:border-orange-300 hover:text-orange-500 transition-all">
                <span>{lang === "en" ? "EN" : "বাং"}</span>
                <span className="text-gray-300 dark:text-slate-500">|</span>
                <span className="text-gray-400 dark:text-gray-500">{lang === "en" ? "বাংলা" : "EN"}</span>
              </button>

              {/* Menu dropdown */}
              <div ref={menuRef} className="relative">
                <button onClick={() => setMenuOpen(o => !o)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-medium text-sm transition-all
                    ${menuOpen
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600"
                      : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:border-orange-300"}`}>
                  <span>☰</span> {t("menu")}
                  <span className={`text-xs transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}>▼</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 py-2 z-50 overflow-hidden">
                    {navLinks.map(link => (
                      <Link key={link.to} to={link.to}
                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600
                          ${location.pathname === link.to
                            ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600"
                            : "text-gray-700 dark:text-gray-300"}`}>
                        {link.label}
                      </Link>
                    ))}
                    <div className="border-t border-gray-100 dark:border-slate-700 mt-2 pt-2">
                      {currentUser
                        ? <button onClick={requestLogout}
                            className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            🚪 {t("logout")}
                          </button>
                        : <button onClick={handleLogin}
                            className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 transition-colors">
                            🔐 {t("login")}
                          </button>
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
                    <span className="text-xs font-semibold text-gray-800 dark:text-white max-w-[80px] truncate">
                      {currentUser?.displayName?.split(" ")[0] ?? "User"}
                    </span>
                    <span className="text-[10px] text-gray-400 capitalize">{userRole ?? "…"}</span>
                  </div>
                </div>
              )}

              {userRole === "owner" && (
                <Link to="/post"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
                  + {lang === "en" ? "Post" : "পোস্ট"}
                </Link>
              )}
              {userRole === "finder" && (
                <Link to="/post-roommate"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
                  + Roommate
                </Link>
              )}
            </div>

            {/* ── Mobile right ── */}
            <div className="md:hidden flex items-center gap-2">
              <button onClick={toggleDark} className={darkBtn}>
                {dark ? <SunIcon /> : <MoonIcon />}
              </button>
              <button onClick={toggleLang}
                className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-xs font-semibold text-gray-600 dark:text-gray-300">
                {lang === "en" ? "বাং" : "EN"}
              </button>
              <button onClick={() => setMobileOpen(o => !o)}
                className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                {mobileOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>

          {/* Mobile drawer */}
          {mobileOpen && (
            <div className="md:hidden border-t border-gray-100 dark:border-slate-700 py-3 flex flex-col gap-1 pb-4">
              {navLinks.map(link => (
                <Link key={link.to} to={link.to}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors
                    ${location.pathname === link.to
                      ? "bg-orange-50 dark:bg-orange-900/20 text-orange-600"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-gray-100 dark:border-slate-700 mt-2 pt-2">
                {currentUser
                  ? <button onClick={requestLogout}
                      className="w-full text-left px-3 py-3 text-sm font-medium text-red-500">
                      🚪 {t("logout")}
                    </button>
                  : <button onClick={handleLogin}
                      className="w-full text-left px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      🔐 {t("login")}
                    </button>
                }
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Logout confirmation modal */}
      {showLogoutModal && (
        <LogoutModal
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </>
  );
}
