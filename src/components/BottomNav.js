// ─────────────────────────────────────────────────
//  BottomNav.js
//  src/components/BottomNav.js
//  Feature 6: Mobile bottom navigation bar
//  Pathao/Shohoz style — Home, Search, Post,
//  Bookmarked, Profile/Dashboard
// ─────────────────────────────────────────────────

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

export default function BottomNav() {
  const { currentUser, userRole } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const profileTo = userRole === "owner" ? "/dashboard" : "/saved";
  const profileLabel = userRole === "owner" ? t("dashboard") : t("profile");
  const profileIcon  = userRole === "owner" ? "⚙️" : "👤";

  const tabs = [
    { to: "/",          icon: "🏠", label: t("home") },
    { to: "/?search=1", icon: "🔍", label: t("search"),  exact: false },
    { to: "/post",      icon: null,  label: t("post"),   isCTA: true },
    { to: "/saved",     icon: "🔖", label: t("saved") },
    { to: profileTo,    icon: profileIcon, label: profileLabel },
  ];

  // Only render on mobile
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-bottom">
      <div className="flex items-stretch h-16">
        {tabs.map((tab, i) => {
          const isActive = tab.to === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(tab.to.split("?")[0]) && tab.to !== "/";

          if (tab.isCTA) {
            return (
              <Link
                key={i}
                to={tab.to}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
              >
                {/* Raised orange circle CTA */}
                <div className="absolute -top-5 w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                  <span className="text-white text-xl font-bold leading-none">+</span>
                </div>
                <span className="text-[10px] text-gray-400 mt-7">{tab.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={i}
              to={tab.to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors
                ${isActive ? "text-orange-500" : "text-gray-400 hover:text-gray-600"}`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className={`text-[10px] font-medium ${isActive ? "text-orange-500" : "text-gray-400"}`}>
                {tab.label}
              </span>
              {/* Active dot */}
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
