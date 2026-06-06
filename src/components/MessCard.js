// ─────────────────────────────────────────────────
//  MessCard.js
//  Feature 3: Bookmark icon (filled/outline via SVG)
//  Feature 4: Photo carousel — swipe/click through
//             photos directly on the card (220px tall)
// ─────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";
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

// ── Photo Carousel ────────────────────────────────
function PhotoCarousel({ photos, name }) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(null);

  const placeholder = `https://placehold.co/400x220/FFF7ED/EA580C?text=${encodeURIComponent(name || "Mess")}`;
  const images = photos && photos.length > 0 ? photos : [placeholder];
  const total  = images.length;

  function prev(e) {
    e.preventDefault(); e.stopPropagation();
    setCurrent(c => (c - 1 + total) % total);
  }
  function next(e) {
    e.preventDefault(); e.stopPropagation();
    setCurrent(c => (c + 1) % total);
  }
  function goTo(e, i) {
    e.preventDefault(); e.stopPropagation();
    setCurrent(i);
  }

  // Touch / swipe support
  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? setCurrent(c => (c+1)%total) : setCurrent(c => (c-1+total)%total);
    touchStartX.current = null;
  }

  return (
    <div
      className="relative w-full overflow-hidden bg-orange-50"
      style={{ height: "220px" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Image */}
      <img
        src={images[current]}
        alt={`${name} — ${current + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
        onError={e => { e.target.src = placeholder; }}
      />

      {/* Prev / Next arrows — only if multiple photos */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center text-xs hover:bg-black/60 transition-colors z-10"
          >‹</button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center text-xs hover:bg-black/60 transition-colors z-10"
          >›</button>

          {/* Dot indicators */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={e => goTo(e, i)}
                className={`rounded-full transition-all duration-200 ${i === current ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`}
              />
            ))}
          </div>

          {/* Photo count pill */}
          <div className="absolute top-2 left-2 bg-black/40 text-white text-[10px] font-medium px-2 py-0.5 rounded-full z-10">
            {current + 1}/{total}
          </div>
        </>
      )}
    </div>
  );
}

// ── Bookmark icon SVGs ────────────────────────────
function BookmarkIcon({ filled }) {
  return filled ? (
    <svg viewBox="0 0 24 24" fill="#F97316" className="w-5 h-5">
      <path d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" className="w-5 h-5">
      <path d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z"/>
    </svg>
  );
}

// ── Main MessCard ─────────────────────────────────
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
    e.preventDefault(); e.stopPropagation();
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
    e.preventDefault(); e.stopPropagation();
    const phone = mess.contact_phone || mess.phone;
    if (!phone) { alert("No phone number listed."); return; }
    window.location.href = `tel:${phone}`;
  }

  async function handleShare(e) {
    e.preventDefault(); e.stopPropagation();
    const url   = `${window.location.origin}/mess/${mess.id}`;
    const name  = mess.title || mess.name || "Mess";
    const area  = [mess.area, mess.city || mess.district].filter(Boolean).join(", ");
    const text  = `🏠 ${name}${area ? ` — ${area}` : ""} | ৳${Number(mess.rent||0).toLocaleString()}/mo | MessFinder BD`;

    if (navigator.share) {
      // Native share sheet — works on mobile (WhatsApp, Facebook, etc.)
      try {
        await navigator.share({ title: name, text, url });
      } catch {}
    } else {
      // Fallback — copy link to clipboard
      try {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard! 📋");
      } catch {
        // Last resort
        window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank");
      }
    }
  }

  const {
    id, name, title, city, area, district, rent,
    seats_available, availableSeats, gender,
    facilities = [], amenities = [],
    photos = [], rating, review_count = 0,
  } = mess;

  const displayName   = title || name;
  const displaySeats  = seats_available ?? availableSeats ?? 0;
  const allFacilities = [...new Set([...facilities, ...amenities])];
  const locationLine  = [area, city || district].filter(Boolean).join(" · ");

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
      {/* ── Photo carousel ── */}
      <div className="relative">
        <PhotoCarousel photos={photos} name={displayName} />

        {/* Vacancy badge */}
        <div className={`absolute top-3 left-3 text-xs font-semibold px-2 py-1 rounded-full z-10
          ${displaySeats > 0 ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {displaySeats > 0 ? `${displaySeats} seat${displaySeats > 1 ? "s" : ""} available` : "Full"}
        </div>

        {/* Gender badge */}
        <div className={`absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-full z-10 ${genderStyle}`}>
          {genderLabel}
        </div>

        {/* Bookmark button — SVG icon */}
        <button
          onClick={toggleSave}
          title={saved ? "Remove bookmark" : "Bookmark this mess"}
          className={`absolute bottom-3 right-3 z-10 w-9 h-9 rounded-full shadow-md flex items-center justify-center transition-all hover:scale-110
            ${saved ? "bg-orange-500" : "bg-white"}`}
        >
          <BookmarkIcon filled={saved} />
        </button>

        {/* Call button */}
        {(mess.contact_phone || mess.phone) && (
          <button
            onClick={handleCall}
            className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-md transition-colors"
          >
            📞 Call
          </button>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="p-4 flex flex-col gap-2 flex-1">

        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2 leading-snug">{displayName}</h3>
          {rating > 0 && (
            <span className="flex items-center gap-1 text-sm text-amber-500 font-medium shrink-0">
              ⭐ {rating.toFixed(1)}
              <span className="text-gray-400 font-normal text-xs">({review_count})</span>
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500 flex items-center gap-1">
          <span>📍</span> {locationLine || "Location not specified"}
        </p>

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

        <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
          <div>
            <span className="text-xl font-bold text-orange-500">৳{(rent || 0).toLocaleString()}</span>
            <span className="text-xs text-gray-400"> /month</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Share button */}
            <button
              onClick={handleShare}
              title="Share this mess"
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors px-2 py-1 rounded-lg hover:bg-orange-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              Share
            </button>
            <span className="text-sm text-orange-500 font-medium">View details →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
