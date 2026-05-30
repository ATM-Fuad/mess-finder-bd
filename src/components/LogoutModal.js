// ─────────────────────────────────────────────────
//  LogoutModal.js
//  src/components/LogoutModal.js
//  Animated confirmation modal before logout
// ─────────────────────────────────────────────────

import React, { useEffect } from "react";

export default function LogoutModal({ onConfirm, onCancel }) {
  // Close on Escape key
  useEffect(() => {
    function handler(e) { if (e.key === "Escape") onCancel(); }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ animation: "fadeIn 0.15s ease" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Card */}
      <div
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ animation: "slideUp 0.2s ease" }}
      >
        {/* Top accent strip */}
        <div className="h-1.5 bg-gradient-to-r from-orange-400 to-orange-600" />

        <div className="p-6">
          {/* Icon */}
          <div className="w-14 h-14 bg-red-50 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚪</span>
          </div>

          {/* Text */}
          <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center mb-1">
            Log out of MessFinder?
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            You'll need to log in again to access your bookmarks and listings.
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              Yes, Logout
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { transform:translateY(16px); opacity:0 } to { transform:translateY(0); opacity:1 } }
      `}</style>
    </div>
  );
}
