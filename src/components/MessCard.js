// ─────────────────────────────────────────────────
//  MessCard.js  –  One card shown in the listing grid
// ─────────────────────────────────────────────────
//  Props it receives:
//    mess  →  one mess object from Firestore

import React, { useState, useEffect } from "react";
import { doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";import { Link } from "react-router-dom";

// Icons for facilities
const FACILITY_ICONS = {
  wifi:       { icon: "📶", label: "WiFi" },
  generator:  { icon: "⚡", label: "Generator" },
  ac:         { icon: "❄️",  label: "AC" },
  meals:      { icon: "🍱", label: "Meals" },
  bathroom:   { icon: "🚿", label: "Attached Bath" },
  cctv:       { icon: "📹", label: "CCTV" },
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
    if (!currentUser) { alert("Please login to save messes!"); return; }
    const ref = doc(db, "users", currentUser.uid, "saved", mess.id);
    if (saved) {
      await deleteDoc(ref);
      setSaved(false);
    } else {
      await setDoc(ref, { mess_id: mess.id, saved_at: new Date() });
      setSaved(true);
    }
  }  const {
    id, name, city, university, rent,
    seats_available, gender, facilities = [],
    photos = [], rating, review_count = 0,
  } = mess;

  // Photo to show — first uploaded, or placeholder
  const photo = photos[0] || `https://placehold.co/400x200/FFF7ED/EA580C?text=${encodeURIComponent(name)}`;

  // Gender badge colour
  const genderStyle = gender === "female"
    ? "bg-pink-100 text-pink-700"
    : gender === "male"
    ? "bg-blue-100 text-blue-700"
    : "bg-purple-100 text-purple-700";

  return (
    <Link
      to={`/mess/${id}`}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
    >
      {/* Photo */}
      <div className="relative">
        <img
          src={photo}
          alt={name}
          className="w-full h-44 object-cover"
          onError={(e) => { e.target.src = `https://placehold.co/400x200/FFF7ED/EA580C?text=No+Photo`; }}
        />

        {/* Vacancy badge */}
        <button
  onClick={toggleSave}
  className="absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center text-lg hover:scale-110 transition-transform"
>
  {saved ? "❤️" : "🤍"}
</button>
        <div className={`absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-full ${seats_available > 0 ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {seats_available > 0 ? `${seats_available} seat${seats_available > 1 ? "s" : ""} available` : "Full"}
        </div>

        {/* Gender badge */}
        <div className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full ${genderStyle}`}>
          {gender === "female" ? "👩 Female" : gender === "male" ? "👨 Male" : "👥 Mixed"}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-2 flex-1">

        {/* Name + rating */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug">{name}</h3>
          {rating > 0 && (
            <span className="flex items-center gap-1 text-sm text-amber-500 font-medium shrink-0">
              ⭐ {rating.toFixed(1)}
              <span className="text-gray-400 font-normal text-xs">({review_count})</span>
            </span>
          )}
        </div>

        {/* Location */}
        <p className="text-sm text-gray-500 flex items-center gap-1">
          <span>📍</span> {city} · Near {university}
        </p>

        {/* Facilities (show first 3) */}
        {facilities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {facilities.slice(0, 3).map((f) => (
              <span key={f} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                {FACILITY_ICONS[f]?.icon} {FACILITY_ICONS[f]?.label || f}
              </span>
            ))}
            {facilities.length > 3 && (
              <span className="text-xs text-gray-400">+{facilities.length - 3} more</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-orange-500">৳{rent.toLocaleString()}</span>
            <span className="text-xs text-gray-400"> /month</span>
          </div>
          <span className="text-sm text-orange-500 font-medium">View details →</span>
        </div>
      </div>
    </Link>
  );
}
