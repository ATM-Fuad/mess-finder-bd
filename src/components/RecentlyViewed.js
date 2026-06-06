// ─────────────────────────────────────────────────
//  RecentlyViewed.js
//  src/components/RecentlyViewed.js
//
//  Horizontal scroll strip shown on Home page.
//  Fetches the last 5 viewed messes from Firestore
//  and renders compact cards.
// ─────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";

export default function RecentlyViewed() {
  const { recentIds, clearRecent } = useRecentlyViewed();
  const [messes,  setMesses]  = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!recentIds?.length) { setMesses([]); return; }

    async function fetchRecent() {
      setLoading(true);
      try {
        const results = await Promise.all(
          recentIds.map(async id => {
            try {
              const snap = await getDoc(doc(db, "messes", id));
              return snap.exists() ? { id: snap.id, ...snap.data() } : null;
            } catch { return null; }
          })
        );
        // Filter nulls (deleted messes), preserve order
        setMesses(results.filter(Boolean));
      } catch (err) {
        console.error("RecentlyViewed fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecent();
  }, [recentIds]);

  // Don't render if nothing to show
  if (!recentIds?.length || loading || messes.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          🕐 Recently Viewed
        </h2>
        <button
          onClick={clearRecent}
          className="text-xs text-gray-400 hover:text-red-400 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {messes.map(mess => (
          <RecentCard key={mess.id} mess={mess} />
        ))}
      </div>
    </div>
  );
}

// ── Compact card ──────────────────────────────────
function RecentCard({ mess }) {
  const displayName  = mess?.title || mess?.name || "Untitled";
  const locationLine = [mess?.area, mess?.city || mess?.district].filter(Boolean).join(" · ");
  const photo        = mess?.photos?.[0] ||
    `https://placehold.co/160x100/FFF7ED/EA580C?text=${encodeURIComponent(displayName)}`;

  const isAvailable  = mess?.available ?? ((mess?.seats_available ?? mess?.availableSeats ?? 0) > 0);

  return (
    <Link
      to={`/mess/${mess.id}`}
      className="flex-shrink-0 w-40 bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Photo */}
      <div className="relative">
        <img
          src={photo}
          alt={displayName}
          className="w-full h-24 object-cover"
          onError={e => { e.target.src = `https://placehold.co/160x100/FFF7ED/EA580C?text=Mess`; }}
        />
        {/* Availability dot */}
        <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${isAvailable ? "bg-green-400" : "bg-red-400"}`} />
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-semibold text-gray-900 truncate">{displayName}</p>
        {locationLine && (
          <p className="text-[10px] text-gray-400 truncate mt-0.5">📍 {locationLine}</p>
        )}
        <p className="text-xs font-bold text-orange-500 mt-1">
          ৳{Number(mess?.rent || 0).toLocaleString()}
          <span className="text-[10px] font-normal text-gray-400">/mo</span>
        </p>
      </div>
    </Link>
  );
}
