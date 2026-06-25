// ─────────────────────────────────────────────────
//  RoommateBoard.js  —  Phase 2 redesign
//  • Warm colors, rounded-3xl, shadow-card
//  • Photo carousel on cards
//  • Bottom-sheet modal on mobile
//  • Filters: type, gender, area, budget
//  • RoommateCardSkeleton while loading
//  • Zero ESLint errors
// ─────────────────────────────────────────────────

import React, { useEffect, useState, useRef } from "react";
import {
  collection, getDocs, query, orderBy
} from "firebase/firestore";
import { db } from "../firebase";
import { RoommateCardSkeleton } from "../components/Skeleton";

const FACILITIES = [
  { id:"wifi",      icon:"📶", label:"WiFi" },
  { id:"ac",        icon:"❄️",  label:"AC" },
  { id:"meals",     icon:"🍱", label:"Meals" },
  { id:"bathroom",  icon:"🚿", label:"Attached Bath" },
  { id:"parking",   icon:"🏍️", label:"Parking" },
  { id:"cctv",      icon:"📹", label:"CCTV" },
  { id:"laundry",   icon:"👕", label:"Laundry" },
  { id:"generator", icon:"⚡", label:"Generator" },
];
const FACILITY_MAP = Object.fromEntries(FACILITIES.map(f => [f.id, f]));

// ── Photo carousel ────────────────────────────────
function PhotoCarousel({ photos, name }) {
  const [current,  setCurrent]  = useState(0);
  const touchStart = useRef(null);
  const placeholder = `https://placehold.co/400x200/EFF6FF/3B82F6?text=${encodeURIComponent(name || "Room")}`;
  const imgs  = photos?.length > 0 ? photos : [placeholder];
  const total = imgs.length;

  function prev(e) { e.preventDefault(); e.stopPropagation(); setCurrent(c => (c-1+total)%total); }
  function next(e) { e.preventDefault(); e.stopPropagation(); setCurrent(c => (c+1)%total); }
  function onTouchStart(e) { touchStart.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0
      ? setCurrent(c => (c+1)%total)
      : setCurrent(c => (c-1+total)%total);
    touchStart.current = null;
  }

  return (
    <div
      className="relative overflow-hidden w-full"
      style={{ height: "200px", background: "#EFF6FF" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <img
        src={imgs[current]}
        alt={`${name} — ${current + 1}`}
        className="w-full h-full object-cover transition-opacity duration-200"
        onError={e => { e.target.src = placeholder; }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 photo-overlay" />

      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm z-10"
            style={{ background: "rgba(0,0,0,0.40)" }}
          >‹</button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-white text-sm z-10"
            style={{ background: "rgba(0,0,0,0.40)" }}
          >›</button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {imgs.map((_, i) => (
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
          <div
            className="absolute top-2 left-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10"
            style={{ background: "rgba(0,0,0,0.40)" }}
          >
            {current+1}/{total}
          </div>
        </>
      )}
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────
function RoommateDetailModal({ post, onClose }) {
  if (!post) return null;
  const facilities = post.facilities || [];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-glass max-h-[90vh] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Photo */}
        <div className="rounded-t-3xl overflow-hidden">
          <PhotoCarousel photos={post.photos} name={post.user_name} />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm z-20 font-bold"
          style={{ background: "rgba(0,0,0,0.45)" }}
        >
          ✕
        </button>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <img
              src={post.user_photo || `https://ui-avatars.com/api/?name=${post.user_name ?? "U"}&background=FED7AA&color=C2410C`}
              alt={post.user_name ?? "User"}
              className="w-12 h-12 rounded-2xl border-2 border-[#E8E8E4] object-cover"
            />
            <div>
              <h2 className="font-extrabold text-[#1A1A1A] text-lg">{post.user_name ?? "Anonymous"}</h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full
                  ${post.gender === "female" ? "badge-female" : "badge-male"}`}>
                  {post.gender === "female" ? "👩 Female" : "👨 Male"}
                </span>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={post.listingType === "sublet"
                    ? { background:"#EDE9FE", color:"#6D28D9" }
                    : { background:"#D1FAE5", color:"#065F46" }}
                >
                  {post.listingType === "sublet" ? "🏠 Sublet" : "🤝 Roommate Wanted"}
                </span>
              </div>
            </div>
          </div>

          {/* Key details */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-2xl p-3" style={{ background:"#FFF7ED" }}>
              <p className="text-xs text-[#9CA3AF] mb-0.5">Budget</p>
              <p className="font-extrabold text-orange-500">
                ৳{Number(post.budget||0).toLocaleString()}
                <span className="text-xs font-normal text-[#9CA3AF]">/mo</span>
              </p>
            </div>
            {post.area && (
              <div className="rounded-2xl p-3" style={{ background:"#FAFAF8" }}>
                <p className="text-xs text-[#9CA3AF] mb-0.5">Area</p>
                <p className="font-bold text-[#1A1A1A] text-sm">📍 {post.area}</p>
              </div>
            )}
            {post.personsPerRoom && (
              <div className="rounded-2xl p-3" style={{ background:"#FAFAF8" }}>
                <p className="text-xs text-[#9CA3AF] mb-0.5">Persons / Room</p>
                <p className="font-bold text-[#1A1A1A]">👤 {post.personsPerRoom}</p>
              </div>
            )}
            {post.roomSize && (
              <div className="rounded-2xl p-3" style={{ background:"#FAFAF8" }}>
                <p className="text-xs text-[#9CA3AF] mb-0.5">Room Size</p>
                <p className="font-bold text-[#1A1A1A] capitalize">📐 {post.roomSize}</p>
              </div>
            )}
          </div>

          {/* Facilities */}
          {facilities.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-[#6B7280] mb-2">Facilities</p>
              <div className="flex flex-wrap gap-2">
                {facilities.map(f => (
                  <span
                    key={f}
                    className="text-xs font-medium px-3 py-1 rounded-full"
                    style={{ background:"#FFF7ED", color:"#EA580C" }}
                  >
                    {FACILITY_MAP[f]?.icon} {FACILITY_MAP[f]?.label || f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          {post.message && (
            <div className="rounded-2xl p-4 mb-4" style={{ background:"#FAFAF8" }}>
              <p className="text-xs font-bold text-[#6B7280] mb-1">About</p>
              <p className="text-sm text-[#374151] leading-relaxed">{post.message}</p>
            </div>
          )}

          {/* Maps link */}
          {post.mapsURL && (
            <a
              href={post.mapsURL} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-sm text-orange-500 font-bold mb-4 hover:underline"
            >
              🗺️ Open location in Google Maps
            </a>
          )}

          {/* CTA buttons */}
          <div className="flex gap-3">
            <a
              href={`https://wa.me/880${post.contact?.replace(/^0/, "")}`}
              target="_blank" rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 text-white font-bold py-3 rounded-2xl text-sm transition-colors tap-target"
              style={{ background:"#22C55E" }}
            >
              💬 WhatsApp
            </a>
            {post.contact && (
              <a
                href={`tel:${post.contact}`}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-2xl text-sm transition-colors tap-target"
              >
                📞 Call
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Roommate Card ─────────────────────────────────
function RoommateCard({ post, onClick }) {
  const locationLine = [post.area, post.city || post.district].filter(Boolean).join(" · ");

  return (
    <div
      onClick={() => onClick(post)}
      className="bg-white rounded-3xl border border-[#E8E8E4] shadow-card hover:shadow-hover hover:-translate-y-1 transition-all duration-200 overflow-hidden cursor-pointer"
      style={{ willChange: "transform" }}
    >
      {/* Photo */}
      <div className="relative">
        <PhotoCarousel photos={post.photos} name={post.user_name ?? "Room"} />

        {/* Type badge */}
        <div
          className="absolute top-3 left-3 z-20 text-[10px] font-extrabold px-2.5 py-1 rounded-full"
          style={post.listingType === "sublet"
            ? { background:"rgba(237,233,254,0.92)", color:"#6D28D9" }
            : { background:"rgba(209,250,229,0.92)", color:"#065F46" }}
        >
          {post.listingType === "sublet" ? "🏠 Sublet" : "🤝 Roommate"}
        </div>

        {/* Gender badge */}
        <div
          className={`absolute top-3 right-3 z-20 text-[10px] font-extrabold px-2.5 py-1 rounded-full
            ${post.gender === "female" ? "badge-female" : "badge-male"}`}
        >
          {post.gender === "female" ? "👩 Female" : "👨 Male"}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <img
            src={post.user_photo || `https://ui-avatars.com/api/?name=${post.user_name ?? "U"}&background=FED7AA&color=C2410C`}
            alt={post.user_name ?? "User"}
            className="w-7 h-7 rounded-full border-2 border-[#E8E8E4] object-cover shrink-0"
          />
          <span className="text-sm font-bold text-[#1A1A1A] truncate">
            {post.user_name ?? "Anonymous"}
          </span>
        </div>

        {locationLine && (
          <p className="text-xs text-[#9CA3AF] mb-2 flex items-center gap-1">
            <span>📍</span>
            <span className="truncate">{locationLine}</span>
          </p>
        )}

        {/* Facilities pills */}
        {(post.facilities ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {(post.facilities ?? []).slice(0, 3).map(f => (
              <span
                key={f}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background:"#FFF7ED", color:"#EA580C" }}
              >
                {FACILITY_MAP[f]?.icon} {FACILITY_MAP[f]?.label || f}
              </span>
            ))}
            {(post.facilities ?? []).length > 3 && (
              <span className="text-[10px] text-[#9CA3AF] py-0.5">
                +{(post.facilities ?? []).length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-3"
          style={{ borderTop: "1px solid #F3F4F6" }}
        >
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-extrabold text-orange-500">
              ৳{Number(post.budget || 0).toLocaleString()}
            </span>
            <span className="text-xs text-[#9CA3AF]">/mo</span>
          </div>
          <span className="text-xs font-bold text-orange-500">View →</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Board ────────────────────────────────────
export default function RoommateBoard() {
  const [posts,       setPosts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null);
  const [typeFilter,  setTypeFilter]  = useState("all");
  const [genderFilter,setGenderFilter]= useState("all");
  const [areaFilter,  setAreaFilter]  = useState("");

  useEffect(() => {
    async function fetchPosts() {
      try {
        const q    = query(collection(db, "roommate_requests"), orderBy("created_at", "desc"));
        const snap = await getDocs(q);
        setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    fetchPosts();
  }, []);

  const filtered = posts.filter(p => {
    const matchType   = typeFilter   === "all" || p.listingType === typeFilter;
    const matchGender = genderFilter === "all" || p.gender === genderFilter;
    const matchArea   = !areaFilter  ||
      p.area?.toLowerCase().includes(areaFilter.toLowerCase()) ||
      p.city?.toLowerCase().includes(areaFilter.toLowerCase());
    return matchType && matchGender && matchArea;
  });

  const selectCls = "border border-[#E8E8E4] rounded-2xl px-3 py-2 text-sm text-[#1A1A1A] outline-none bg-white transition-colors";

  return (
    <div className="animate-fade-in" style={{ backgroundColor: "#FAFAF8" }}>

      {/* Header */}
      <div
        className="rounded-3xl p-6 md:p-8 mb-6 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 55%, #4338CA 100%)" }}
      >
        {/* Decorative circle */}
        <div
          className="absolute -top-6 -right-6 w-36 h-36 rounded-full opacity-20"
          style={{ background: "rgba(255,255,255,0.3)" }}
        />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold mb-1">🤝 Roommate Board</h1>
          <p className="text-indigo-100 text-sm">
            Find a roommate or post a sublet listing
          </p>
          <p className="text-indigo-200 text-xs mt-2 font-medium">
            {posts.length} listings
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-[#E8E8E4] shadow-soft p-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1.5">Type</label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
              <option value="all">All Types</option>
              <option value="roommate">🤝 Roommate Wanted</option>
              <option value="sublet">🏠 Sublet</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1.5">Gender</label>
            <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)} className={selectCls}>
              <option value="all">All</option>
              <option value="male">👨 Male</option>
              <option value="female">👩 Female</option>
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-bold text-[#6B7280] mb-1.5">Search area</label>
            <input
              type="text" value={areaFilter}
              onChange={e => setAreaFilter(e.target.value)}
              placeholder="Area or city…"
              className={`w-full ${selectCls}`}
            />
          </div>
        </div>
      </div>

      {/* Result count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-[#6B7280]">
          <span className="font-extrabold text-orange-500">{filtered.length}</span> listings found
        </p>
        {(typeFilter !== "all" || genderFilter !== "all" || areaFilter) && (
          <button
            onClick={() => { setTypeFilter("all"); setGenderFilter("all"); setAreaFilter(""); }}
            className="text-xs text-[#9CA3AF] hover:text-red-400 transition-colors font-medium"
          >
            Clear ✕
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <RoommateCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-20 rounded-3xl border border-dashed border-[#E8E8E4]"
          style={{ background: "white" }}
        >
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No listings found</h3>
          <p className="text-[#6B7280] text-sm">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24 md:pb-6">
          {filtered.map(post => (
            <RoommateCard key={post.id} post={post} onClick={setSelected} />
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <RoommateDetailModal post={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
