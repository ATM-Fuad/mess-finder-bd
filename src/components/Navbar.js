// ─────────────────────────────────────────────────
//  Navbar.js  —  src/components/Navbar.js
//  Phase 1 redesign:
//  • Frosted glass on scroll
//  • Plus Jakarta Sans via global CSS
//  • Warm border color
//  • Clean dropdown with scale-in animation
//  • Logout confirmation modal
//  • Zero ESLint errors
// ─────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth }       from "../contexts/AuthContext";
import { useLanguage }   from "../contexts/LanguageContext";
import LogoutModal       from "./LogoutModal";
import NotificationBell  from "./NotificationBell";

export default function Navbar() {
  const { currentUser, userRole, logout } = useAuth();
  const { lang, toggleLang, t }           = useLanguage();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [menuOpen,        setMenuOpen]        = useState(false);
  const [mobileOpen,      setMobileOpen]      = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [scrolled,        setScrolled]        = useState(false);

  const menuRef = useRef(null);

  // Frosted glass on scroll
  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 12); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close everything on route change
  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [location]);

  function requestLogout()  { setShowLogoutModal(true); }
  async function confirmLogout() {
    setShowLogoutModal(false);
    await logout();
    navigate("/");
  }

  const navLinks = [
    { to: "/",             label: `🏠 ${t("browseM")}` },
    { to: "/saved",        label: `🔖 ${t("bookmarked")}` },
    { to: "/roommates",    label: `🤝 ${t("findRoommate")}` },
    { to: "/compare",      label: "⚖️ Compare Messes" },
    ...(userRole === "owner" ? [
      { to: "/post",       label: `➕ ${t("postMess")}` },
      { to: "/dashboard",  label: `⚙️ ${t("dashboard")}` },
    ] : []),
    ...(userRole === "finder" ? [
      { to: "/post-roommate", label: "➕ Post Roommate" },
      { to: "/dashboard",     label: `⚙️ ${t("dashboard")}` },
    ] : []),
  ];

  const navBg = scrolled
    ? "navbar-scrolled"
    : "bg-white border-b border-[#E8E8E4]";

  return (
    <>
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${navBg}`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">

            {/* ── Logo ── */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <span className="text-2xl">🏠</span>
              <span className="font-extrabold text-xl text-[#1A1A1A] tracking-tight">
                Mess
                <span className="text-orange-500">Finder</span>
                <span className="text-sm font-normal text-[#9CA3AF] ml-1">BD</span>
              </span>
            </Link>

            {/* ── Desktop right ── */}
            <div className="hidden md:flex items-center gap-2">

              {/* Language toggle */}
              <button
                onClick={toggleLang}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E8E8E4] text-xs font-semibold text-[#6B7280] hover:border-orange-300 hover:text-orange-500 transition-all tap-target"
              >
                <span>{lang === "en" ? "EN" : "বাং"}</span>
                <span className="text-[#D1D5DB]">|</span>
                <span>{lang === "en" ? "বাংলা" : "EN"}</span>
              </button>

              {/* Notification bell */}
              <NotificationBell />

              {/* Menu dropdown */}
              <div ref={menuRef} className="relative">
                <button
                  onClick={() => setMenuOpen(o => !o)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-semibold text-sm transition-all tap-target
                    ${menuOpen
                      ? "border-orange-500 bg-orange-50 text-orange-600"
                      : "border-[#E8E8E4] text-[#374151] hover:border-orange-300 hover:text-orange-500"
                    }`}
                >
                  <span>☰</span>
                  <span>{t("menu")}</span>
                  <span
                    className="text-xs transition-transform duration-200"
                    style={{ transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    ▼
                  </span>
                </button>

                {/* Dropdown panel */}
                {menuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-3xl shadow-glass border border-[#E8E8E4] py-2 z-50 overflow-hidden animate-scale-in"
                    style={{ transformOrigin: "top right" }}
                  >
                    {navLinks.map(link => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
                          ${location.pathname === link.to
                            ? "bg-orange-50 text-orange-600"
                            : "text-[#374151] hover:bg-[#FAFAF8] hover:text-orange-500"
                          }`}
                      >
                        {link.label}
                      </Link>
                    ))}

                    <div className="border-t border-[#E8E8E4] mt-2 pt-2">
                      {currentUser ? (
                        <button
                          onClick={requestLogout}
                          className="w-full text-left flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                        >
                          🚪 {t("logout")}
                        </button>
                      ) : (
                        <Link
                          to="/login"
                          className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-[#374151] hover:bg-[#FAFAF8] hover:text-orange-500 transition-colors"
                        >
                          🔐 {t("login")}
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar */}
              {currentUser && (
                <div className="flex items-center gap-2 pl-1">
                  <img
                    src={
                      currentUser.photoURL ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        currentUser.displayName ?? "U"
                      )}&background=FED7AA&color=C2410C`
                    }
                    alt={currentUser.displayName ?? "User"}
                    className="w-9 h-9 rounded-full border-2 border-orange-200 object-cover"
                  />
                  <div className="flex flex-col leading-none">
                    <span className="text-xs font-bold text-[#1A1A1A] max-w-[80px] truncate">
                      {currentUser.displayName?.split(" ")[0] ?? "User"}
                    </span>
                    <span className="text-[10px] text-[#9CA3AF] capitalize mt-0.5">
                      {userRole ?? "…"}
                    </span>
                  </div>
                </div>
              )}

              {/* CTA post button — owners */}
              {userRole === "owner" && (
                <Link
                  to="/post"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-orange tap-target"
                  style={{ minHeight: "44px", display: "flex", alignItems: "center" }}
                >
                  + {lang === "en" ? "Post" : "পোস্ট"}
                </Link>
              )}

              {/* CTA post button — finders */}
              {userRole === "finder" && (
                <Link
                  to="/post-roommate"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-orange tap-target"
                  style={{ minHeight: "44px", display: "flex", alignItems: "center" }}
                >
                  + Roommate
                </Link>
              )}

              {/* Auth buttons — logged out */}
              {!currentUser && (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 rounded-xl text-sm font-medium text-[#374151] hover:text-orange-500 transition-colors tap-target"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-orange tap-target"
                    style={{ minHeight: "44px", display: "flex", alignItems: "center" }}
                  >
                    Sign up free →
                  </Link>
                </div>
              )}
            </div>

            {/* ── Mobile right ── */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={toggleLang}
                className="px-2.5 py-1.5 rounded-xl border border-[#E8E8E4] text-xs font-bold text-[#6B7280] tap-target"
              >
                {lang === "en" ? "বাং" : "EN"}
              </button>
              <NotificationBell />
              <button
                onClick={() => setMobileOpen(o => !o)}
                className="p-2 rounded-xl text-[#374151] hover:bg-[#F3F4F6] transition-colors tap-target"
              >
                {mobileOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>

          {/* ── Mobile drawer ── */}
          {mobileOpen && (
            <div className="md:hidden border-t border-[#E8E8E4] py-3 flex flex-col gap-1 pb-4 animate-fade-in">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-colors
                    ${location.pathname === link.to
                      ? "bg-orange-50 text-orange-600"
                      : "text-[#374151] hover:bg-[#FAFAF8]"
                    }`}
                >
                  {link.label}
                </Link>
              ))}

              <div className="border-t border-[#E8E8E4] mt-2 pt-2">
                {currentUser ? (
                  <button
                    onClick={requestLogout}
                    className="w-full text-left px-3 py-3 text-sm font-medium text-red-500"
                  >
                    🚪 {t("logout")}
                  </button>
                ) : (
                  <div className="flex flex-col gap-2 px-3 pt-1 pb-2">
                    <Link
                      to="/signup"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-2xl text-sm font-bold transition-colors text-center"
                    >
                      Sign up free →
                    </Link>
                    <Link
                      to="/login"
                      className="w-full border border-[#E8E8E4] text-[#374151] py-2.5 rounded-2xl text-sm font-medium text-center hover:border-orange-300 hover:text-orange-500 transition-colors"
                    >
                      Log in
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Logout modal */}
      {showLogoutModal && (
        <LogoutModal
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </>
  );
}
