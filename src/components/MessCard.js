// ─────────────────────────────────────────────────
//  MessCard.js  —  src/components/MessCard.js
//  Phase 1 redesign:
//  • 240px photo with gradient overlay
//  • Name + price badge on photo
//  • Availability dot instead of text badge
//  • rounded-3xl corners
//  • hover:scale-105 + shadow-hover
//  • "New" badge for listings < 7 days old
//  • Gradient gender badges
//  • Bookmark SVG icon
//  • Photo carousel with swipe
//  • Zero ESLint errors
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
  bathroom:  { icon: "🚿", label: "Bath" },
  cctv:      { icon: "📹", label: "CCTV" },
  parking:   { icon: "🏍️", label: "Parking" },
  laundry:   { icon: "👕", label: "Laundry" },
};

// ── Is listing new? (< 7 days) ───────────────────
function isNewListing(createdAt) {
  if (!createdAt) return false;
  try {
    const created = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
    const diff    = Date.now() - created.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// ── Bookmark SVG ──────────────────────────────────
function BookmarkSVG({ filled }) {
  return filled ? (
    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
      <path d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-5 h-5">
      <path d="M5 3a2 2 0 0 0-2 2v16l9-4 9 4V5a2 2 0 0 0-2-2H5z" />
    </svg>
  );
}

// ── Photo Carousel ────────────────────────────────
function PhotoCarousel({ photos, name }) {
  const [current,   setCurrent]   = useState(0);
  const touchStart  = useRef(null);

  const placeholder = `https://placehold.co/400x240/FFF7ED/EA580C?text=${encodeURIComponent(name || "Mess")}`;
  const images      = photos && photos.length > 0 ? photos : [placeholder];
  const total       = images.length;

  function prev(e) {
    e.preventDefault(); e.stopPropagation();
    setCurrent(c => (c - 1 + total) % total);
  }
  function next(e) {
    e.preventDefault(); e.stopPropagation();
    setCurrent(c => (c + 1) % total);
  }
  function onTouchStart(e) {
    touchStart.current = e.touches[0].clientX;
  }
  function onTouchEnd(e) {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      diff > 0
        ? setCurrent(c => (c + 1) % total)
        : setCurrent(c => (c - 1 + total) % total);
    }
    touchStart.current = null;
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ height: "240px" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <img
        src={images[current]}
        alt={`${name} — ${current + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
        onError={e => { e.target.src = placeholder; }}
      />

      {/* Gradient overlay — name + price live here */}
      <div className="absolute inset-0 photo-overlay" />

      {/* Carousel controls */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm z-10"
            style={{ background: "rgba(0,0,0,0.35)" }}
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm z-10"
            style={{ background: "rgba(0,0,0,0.35)" }}
          >
            ›
          </button>
          {/* Dot indicators */}
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {images.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-200"
                style={{
                  width:      i === current ? "16px" : "6px",
                  height:     "6px",
                  background: i === current ? "white" : "rgba(255,255,255,0.5)",
                }}
              />
            ))}
          </div>
          {/* Count pill */}
          <div
            className="absolute top-3 left-3 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full z-10"
            style={{ background: "rgba(0,0,0,0.40)" }}
          >
            {current + 1}/{total}
          </div>
        </>
      )}

      {/* Name + price overlaid on photo bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 z-10">
        <p className="text-white font-bold text-base leading-tight drop-shadow line-clamp-1">
          {name}
        </p>
      </div>
    </div>
  );
}

// ── Main MessCard ─────────────────────────────────
export default function MessCard({ mess }) {
  const { currentUser } = useAuth();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!currentUser || !mess?.id) return;
    let cancelled = false;
    async function check() {
      try {
        const snap = await getDoc(doc(db, "users", currentUser.uid, "saved", mess.id));
        if (!cancelled) setSaved(snap.exists());
      } catch {}
    }
    check();
    return () => { cancelled = true; };
  }, [currentUser, mess?.id]);

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

  async function handleShare(e) {
    e.preventDefault(); e.stopPropagation();
    const url  = `${window.location.origin}/mess/${mess.id}`;
    const name = mess.title || mess.name || "Mess";
    const loc  = [mess.area, mess.city || mess.district].filter(Boolean).join(", ");
    const text = `🏠 ${name}${loc ? ` — ${loc}` : ""} | ৳${Number(mess.rent || 0).toLocaleString()}/mo | MessFinder BD`;
    if (navigator.share) {
      try { await navigator.share({ title: name, text, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); alert("Link copied! 📋"); }
      catch { window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank"); }
    }
  }

  function handleCall(e) {
    e.preventDefault(); e.stopPropagation();
    const phone = mess.contact_phone || mess.phone;
    if (!phone) return;
    window.location.href = `tel:${phone}`;
  }

  const {
    id, name, title, city, area, district,
    rent, seats_available, availableSeats,
    gender, facilities = [], amenities = [],
    photos = [], rating, review_count = 0,
    created_at,
  } = mess;

  const displayName   = title || name || "Untitled";
  const displaySeats  = seats_available ?? availableSeats ?? 0;
  const allFacilities = [...new Set([...facilities, ...amenities])];
  const locationLine  = [area, city || district].filter(Boolean).join(" · ");
  const isAvailable   = mess.available ?? displaySeats > 0;
  const isNew         = isNewListing(created_at);

  // Gender badge class
  const genderClass = gender === "female" ? "badge-female"
    : gender === "male" ? "badge-male" : "badge-mixed";
  const genderLabel = gender === "female" ? "👩 Female"
    : gender === "male" ? "👨 Male" : "👥 Mixed";

  return (
    <Link
      to={`/mess/${id}`}
      className="block bg-white rounded-3xl border border-[#E8E8E4] overflow-hidden shadow-card hover:shadow-hover hover:-translate-y-1 hover:scale-[1.01] transition-all duration-250 flex flex-col"
      style={{ willChange: "transform" }}
    >
      {/* ── Photo carousel ── */}
      <div className="relative">
        <PhotoCarousel photos={photos} name={displayName} />

        {/* Top-left badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20">
          {/* Availability dot */}
          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: isAvailable ? "#10B981" : "#EF4444" }}
            />
            <span className="text-[10px] font-semibold text-[#374151]">
              {isAvailable ? `${displaySeats} seat${displaySeats !== 1 ? "s" : ""}` : "Full"}
            </span>
          </div>
          {/* New badge */}
          {isNew && <span className="badge-new">New</span>}
        </div>

        {/* Top-right: gender badge */}
        <div className={`absolute top-3 right-3 z-20 text-xs font-semibold px-2.5 py-1 rounded-full ${genderClass}`}>
          {genderLabel}
        </div>

        {/* Bottom-right: bookmark */}
        <button
          onClick={toggleSave}
          title={saved ? "Remove bookmark" : "Bookmark"}
          className="absolute bottom-3 right-3 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{
            background: saved ? "#F97316" : "rgba(0,0,0,0.35)",
            backdropFilter: "blur(4px)",
          }}
        >
          <BookmarkSVG filled={saved} />
        </button>

        {/* Bottom-left: call button */}
        {(mess.contact_phone || mess.phone) && (
          <button
            onClick={handleCall}
            className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all hover:scale-105"
            style={{ background: "#10B981", boxShadow: "0 2px 8px rgba(16,185,129,0.4)" }}
          >
            📞 Call
          </button>
        )}
      </div>

      {/* ── Card body ── */}
      <div className="p-4 flex flex-col gap-2 flex-1">

        {/* Location */}
        <p className="text-xs text-[#9CA3AF] flex items-center gap-1">
          <span>📍</span>
          <span className="truncate">{locationLine || "Location not specified"}</span>
        </p>

        {/* Facilities */}
        {allFacilities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allFacilities.slice(0, 3).map(f => (
              <span
                key={f}
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ background: "#FFF7ED", color: "#EA580C" }}
              >
                {FACILITY_ICONS[f]?.icon} {FACILITY_ICONS[f]?.label || f}
              </span>
            ))}
            {allFacilities.length > 3 && (
              <span className="text-xs text-[#9CA3AF] py-0.5">
                +{allFacilities.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-[#F3F4F6] flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-extrabold text-orange-500">
              ৳{Number(rent || 0).toLocaleString()}
            </span>
            <span className="text-xs text-[#9CA3AF]">/mo</span>
            {rating > 0 && (
              <span className="ml-2 text-xs font-medium text-amber-500 flex items-center gap-0.5">
                ⭐ {Number(rating).toFixed(1)}
                <span className="text-[#9CA3AF] font-normal">({review_count})</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Share */}
            <button
              onClick={handleShare}
              title="Share"
              className="text-[#9CA3AF] hover:text-orange-500 transition-colors p-1 rounded-lg hover:bg-orange-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="16 6 12 2 8 6" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="12" y1="2" x2="12" y2="15" strokeLinecap="round"/>
              </svg>
            </button>
            <span className="text-sm font-semibold text-orange-500">
              Details →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
