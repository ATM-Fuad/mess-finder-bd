// ─────────────────────────────────────────────────
//  RoleSelectionModal.js
//  src/components/RoleSelectionModal.js
//
//  Shown once after first Google login.
//  User picks: Mess/Home Finder OR Mess/Home Owner
// ─────────────────────────────────────────────────

import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function RoleSelectionModal() {
  const { currentUser, saveUserRole } = useAuth();
  const [selected, setSelected] = useState(null); // "owner" | "finder"
  const [saving,   setSaving]   = useState(false);

  async function handleConfirm() {
    if (!selected) return;
    setSaving(true);
    await saveUserRole(selected);
    setSaving(false);
  }

  return (
    // Backdrop
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Orange header */}
        <div className="bg-orange-500 px-6 py-5">
          <p className="text-white/80 text-sm font-medium mb-1">Welcome to</p>
          <h1 className="text-white text-2xl font-bold tracking-tight">
            Mess<span className="text-orange-100">Finder</span>
            <span className="text-orange-200 text-base font-normal ml-1">BD</span>
          </h1>
          <p className="text-orange-100 text-sm mt-2">
            Hi {currentUser?.displayName?.split(" ")[0]} 👋 — how will you use MessFinder?
          </p>
        </div>

        {/* Role options */}
        <div className="p-6 flex flex-col gap-4">
          <RoleCard
            role="finder"
            selected={selected}
            onSelect={setSelected}
            emoji="🎓"
            title="Mess / Home Finder"
            description="I'm a student or professional looking for a mess, room, or roommate near my campus."
          />
          <RoleCard
            role="owner"
            selected={selected}
            onSelect={setSelected}
            emoji="🏠"
            title="Mess / Home Owner"
            description="I own or manage a mess or rental property and want to list it for students."
          />
        </div>

        {/* Confirm button */}
        <div className="px-6 pb-6">
          <button
            onClick={handleConfirm}
            disabled={!selected || saving}
            className={`w-full py-3 rounded-xl font-semibold text-base transition-all duration-200
              ${selected
                ? "bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
          >
            {saving ? "Saving…" : "Continue →"}
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">
            You can't change your role later — choose carefully.
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Individual role card ──────────────────────────
function RoleCard({ role, selected, onSelect, emoji, title, description }) {
  const isSelected = selected === role;

  return (
    <button
      onClick={() => onSelect(role)}
      className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-150
        ${isSelected
          ? "border-orange-500 bg-orange-50 shadow-sm"
          : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/40"
        }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl mt-0.5">{emoji}</span>
        <div className="flex-1">
          <p className={`font-semibold text-sm ${isSelected ? "text-orange-600" : "text-gray-800"}`}>
            {title}
          </p>
          <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">{description}</p>
        </div>
        {/* Radio indicator */}
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all
          ${isSelected ? "border-orange-500 bg-orange-500" : "border-gray-300"}`}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>
    </button>
  );
}
