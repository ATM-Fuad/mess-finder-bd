// ─────────────────────────────────────────────────
//  MessCard.js  –  One card in the listing grid
//  Changes:
//   • Heart → Bookmark icon
//   • Location shows area/city, no university
//   • Direct call button
// ─────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

const FACILITY_ICONS = {
  wifi:      { icon: "📶", label: "WiFi" },
  generator: { icon: "⚡", label: "Generator" },
  ac:        { icon: "❄️",  label: "AC" },
  meals:     { icon: "🍱", label: "Meals" },
  bathroom:  { icon: "🚿", label: "Attached Bath" },
  cctv:      { icon: "📹", label: "CCTV" },
  parking:   { icon: "🏍️", label: "Parking" },
  laundry:   { icon: "👕", label: "Laundry" },
};

export default function MessCard({ mess }) {
  const { currentUser } = useAuth();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function checkSaved() {
      if (!currentUser) return;
      const ref = doc(db, "users", currentUser.uid, "saved", mess.id);
      const snap = await getDoc(ref);
      setSaved(snap.exists());
    }
    checkSaved();
  }, [currentUser, mess.id]);

  async function toggleSave(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) { alert("Please login to bookmark messes!"); return; }
    const ref = doc(db, "users", currentUser.uid, "saved", mess.id);
    if (saved) {
      await deleteDoc(ref);
      setSaved(false);
    } else {
      await setDoc(ref, { mess_id: mess.id, saved_at: new Date() });
      setSaved(true);
    }
  }

  function handleCall(e) {
    e.preventDefault();
    e.stopPropagation();
    const phone = mess.contact_phone || mess.phone;
    if (!phone) { alert("No phone number listed for this mess."); return; }
    window.location.href = `tel:${phone}`;
  }

  const {
    id, name, title, city, area, rent,
    seats_available, availableSeats, gender,
    facilities = [], amenities = [],
    photos = [], rating, review_count = 0,
  } = mess;

  const displayName    = title || name;
  const displaySeats   = seats_available ?? availableSeats ?? 0;
  const allFacilities  = [...new Set([...facilities, ...amenities])];

  // Location line — area + city, no university
  const locationLine = [area, city].filter(Boolean).join(" · ");

  const photo = photos[0] ||
    `https://placehold.co/400x200/FFF7ED/EA580C?text=${encodeURIComponent(displayName || "Mess")}`;

  const genderStyle = gender === "female"
    ? "bg-pink-100 text-pink-700"
    : gender === "male"
    ? "bg-blue-100 text-blue-700"
    : "bg-purple-100 text-purple-700";

  const genderLabel = gender === "female" ? "👩 Female"
    : gender === "male" ? "👨 Male" : "👥 Mixed";

  return (
    <Link
      to={`/mess/${id}`}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
    >
      {/* ── Photo ── */}
      <div className="relative">
        <img
          src={photo}
          alt={displayName}
          className="w-full h-44 object-cover"
          onError={e => { e.target.src = "https://placehold.co/400x200/FFF7ED/EA580C?text=No+Photo"; }}
        />

        {/* Vacancy badge */}
        <div className={`absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-full
          ${displaySeats > 0 ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {displaySeats > 0 ? `${displaySeats} seat${displaySeats > 1 ? "s" : ""} available` : "Full"}
        </div>

        {/* Gender badge */}
        <div className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full ${genderStyle}`}>
          {genderLabel}
        </div>

        {/* ── Bookmark button (replaces heart) ── */}
        <button
          onClick={toggleSave}
          title={saved ? "Remove bookmark" : "Bookmark this mess"}
          className={`absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full shadow-md flex items-center justify-center text-base transition-all hover:scale-110
            ${saved ? "bg-orange-500 text-white" : "bg-white text-gray-400 hover:text-orange-500"}`}
        >
          {saved ? "🔖" : "🔖"}
          {/* Filled vs outline via opacity */}
          <span className="sr-only">{saved ? "Bookmarked" : "Bookmark"}</span>
        </button>

        {/* ── Direct call button ── */}
        {(mess.contact_phone || mess.phone) && (
          <button
            onClick={handleCall}
            title="Call owner"
            className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md transition-colors"
          >
            📞 Call
          </button>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="p-4 flex flex-col gap-2 flex-1">

        {/* Name + rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug">{displayName}</h3>
          {rating > 0 && (
            <span className="flex items-center gap-1 text-sm text-amber-500 font-medium shrink-0">
              ⭐ {rating.toFixed(1)}
              <span className="text-gray-400 font-normal text-xs">({review_count})</span>
            </span>
          )}
        </div>

        {/* Location — area + city only, no university */}
        <p className="text-sm text-gray-500 flex items-center gap-1">
          <span>📍</span> {locationLine || "Location not specified"}
        </p>

        {/* Facilities */}
        {allFacilities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allFacilities.slice(0, 3).map(f => (
              <span key={f} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                {FACILITY_ICONS[f]?.icon} {FACILITY_ICONS[f]?.label || f}
              </span>
            ))}
            {allFacilities.length > 3 && (
              <span className="text-xs text-gray-400">+{allFacilities.length - 3} more</span>
            )}
          </div>
        )}

        {/* Price + view details */}
        <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-orange-500">৳{(rent || 0).toLocaleString()}</span>
            <span className="text-xs text-gray-400"> /month</span>
          </div>
          <span className="text-sm text-orange-500 font-medium">View details →</span>
        </div>
      </div>
    </Link>
  );
}
