// ─────────────────────────────────────────────────
//  BottomNav.js  —  src/components/BottomNav.js
//  Phase 1 redesign:
//  • SVG filled/outline icons
//  • Orange pill behind active tab
//  • 64px height, 44px tap targets
//  • Frosted glass background
//  • Raised CTA post button
// ─────────────────────────────────────────────────

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

// ── SVG icon pairs (filled = active, outline = inactive) ──
function HomeIcon({ filled }) {
  return filled ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function CompareIcon({ filled }) {
  return filled ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function BookmarkIcon({ filled }) {
  return filled ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z" />
    </svg>
  );
}

function ProfileIcon({ filled }) {
  return filled ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function DashboardIcon({ filled }) {
  return filled ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

// ── Main component ────────────────────────────────
export default function BottomNav() {
  const { userRole } = useAuth();
  const { t }        = useLanguage();
  const location     = useLocation();

  const postTo    = userRole === "owner" ? "/post" : "/post-roommate";
  const profileTo = userRole === "owner" ? "/dashboard" : "/saved";

  const tabs = [
    {
      to:      "/",
      label:   t("home"),
      Icon:    HomeIcon,
    },
    {
      to:      "/compare",
      label:   t("search"),
      Icon:    CompareIcon,
    },
    {
      to:      postTo,
      label:   t("post"),
      isCTA:   true,
    },
    {
      to:      "/saved",
      label:   t("saved"),
      Icon:    BookmarkIcon,
    },
    {
      to:      profileTo,
      label:   userRole === "owner" ? t("dashboard") : t("profile"),
      Icon:    userRole === "owner" ? DashboardIcon : ProfileIcon,
    },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-bottom"
      style={{
        background:           "rgba(250,250,248,0.95)",
        backdropFilter:       "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop:            "1px solid #E8E8E4",
      }}
    >
      <div className="flex items-stretch" style={{ height: "60px" }}>
        {tabs.map((tab, i) => {
          const isActive =
            tab.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(tab.to) && tab.to !== "/";

          // ── CTA raised button ──
          if (tab.isCTA) {
            return (
              <Link
                key={i}
                to={tab.to}
                className="flex-1 flex flex-col items-center justify-center relative"
              >
                <div
                  className="absolute -top-4 w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background:  "linear-gradient(135deg, #F97316, #EA580C)",
                    boxShadow:   "0 4px 14px rgba(249,115,22,0.45)",
                  }}
                >
                  <PlusIcon />
                </div>
                <span
                  className="text-[10px] font-semibold mt-7"
                  style={{ color: "#F97316" }}
                >
                  {tab.label}
                </span>
              </Link>
            );
          }

          const { Icon } = tab;

          // ── Regular tab ──
          return (
            <Link
              key={i}
              to={tab.to}
              className="flex-1 flex flex-col items-center justify-center relative tap-target"
            >
              {/* Pill background when active */}
              {isActive && (
                <div
                  className="absolute rounded-2xl"
                  style={{
                    inset:      "6px 8px",
                    background: "rgba(249,115,22,0.10)",
                  }}
                />
              )}

              {/* Icon */}
              <span
                className="relative z-10 transition-colors duration-150"
                style={{ color: isActive ? "#F97316" : "#9CA3AF" }}
              >
                <Icon filled={isActive} />
              </span>

              {/* Label */}
              <span
                className="text-[10px] font-semibold relative z-10 transition-colors duration-150 mt-0.5"
                style={{ color: isActive ? "#F97316" : "#9CA3AF" }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
