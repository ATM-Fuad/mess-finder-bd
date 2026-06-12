// ─────────────────────────────────────────────────
//  Home.js  —  src/pages/Home.js
//  Phase 1 redesign:
//  • Gradient hero (not flat orange)
//  • Sticky filter → collapses on mobile
//  • MessGridSkeleton instead of "Loading..."
//  • "New" badge system via isNewListing
//  • Warm #FAFAF8 base
//  • Suggestion 22: Featured horizontal strip
//  • Suggestion 26: "New" badge on cards
//  • Zero ESLint errors
// ─────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import MessCard from "../components/MessCard";
import RecentlyViewed from "../components/RecentlyViewed";
import { MessGridSkeleton } from "../components/Skeleton";
import { normalizeSearch, isBangla } from "../utils/banglaMap";

const LOCATIONS = {
  "Dhaka":      { "Dhaka City":["Mirpur","Farmgate","Bashundhara","Uttara","Mohammadpur","Dhanmondi","Badda","Mohakhali","Tejgaon","Rampura","Banasree","Khilgaon"],"Savar":["Jahangirnagar","Ashulia","Hemayetpur","Savar Bazar"],"Gazipur":["Board Bazar","Tongi","Chowrasta","Joydebpur"],"Narayanganj":["Siddhirganj","Fatullah","Rupganj"] },
  "Rajshahi":   { "Rajshahi City":["Binodpur","Kazla","Talaimari","Motihar","Sopura","New Market","Upashahar","Rajpara","Boalia","Shaheb Bazar"],"Puthia":["Baneswar","Puthia Sadar"],"Natore":["Natore Sadar","Singra"] },
  "Mymensingh": { "Mymensingh City":["Sesh Mor","Kevalat Khan","Patgudam","Ganginarpar","Kewatkhali","Bypass","Chorpara","Notun Bazar"],"Netrokona":["Netrokona Sadar","Mohonganj"],"Jamalpur":["Jamalpur Sadar","Islampur"] },
  "Chittagong": { "Chittagong City":["Chawkbazar","GEC Circle","Halishahar","Nasirabad","Agrabad","Pahartali","Oxygen","Muradpur","Sholoshahar"],"Hathazari":["Hathazari Sadar","Fatehabad"],"Patiya":["Patiya Sadar","Karnaphuli"] },
  "Sylhet":     { "Sylhet City":["Zindabazar","Subidbazar","Shibganj","Tilagarh","Akhalia","Ambarkhana","Majortila"],"Moulvibazar":["Moulvibazar Sadar","Sreemangal"],"Habiganj":["Habiganj Sadar","Chunarughat"] },
  "Khulna":     { "Khulna City":["Sonadanga","Boyra","Khalishpur","Rupsha","Daulatpur"],"Jessore":["Jessore Sadar","Chaugachha"] },
  "Barisal":    { "Barisal City":["Natullabad","Rupatali","Sadar Road","Band Road"],"Patuakhali":["Patuakhali Sadar","Baufal"] },
  "Rangpur":    { "Rangpur City":["Modern More","Jahaj Company More","Lalbag","Dhap","Shapla Chottor"],"Dinajpur":["Dinajpur Sadar","Birampur"],"Kurigram":["Kurigram Sadar","Nageshwari"] },
};

// ── Featured strip card ───────────────────────────
function FeaturedCard({ mess }) {
  const photo = mess.photos?.[0] ||
    `https://placehold.co/280x160/FFF7ED/EA580C?text=${encodeURIComponent(mess.title || mess.name || "Mess")}`;
  const locationLine = [mess.area, mess.city || mess.district].filter(Boolean).join(" · ");

  return (
    <Link
      to={`/mess/${mess.id}`}
      className="flex-shrink-0 w-64 rounded-3xl overflow-hidden shadow-card hover:shadow-hover hover:-translate-y-1 transition-all duration-200 relative block"
      style={{ background: "#fff" }}
    >
      <img
        src={photo}
        alt={mess.title || mess.name}
        className="w-full object-cover"
        style={{ height: "140px" }}
        onError={e => { e.target.src = "https://placehold.co/280x160/FFF7ED/EA580C?text=Mess"; }}
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 photo-overlay" style={{ height: "140px" }} />
      {/* Price badge */}
      <div
        className="absolute bottom-16 left-3 px-2.5 py-1 rounded-xl text-white text-xs font-bold"
        style={{ background: "rgba(249,115,22,0.90)" }}
      >
        ৳{Number(mess.rent || 0).toLocaleString()}/mo
      </div>
      <div className="p-3">
        <p className="font-bold text-sm text-[#1A1A1A] truncate">{mess.title || mess.name}</p>
        {locationLine && (
          <p className="text-xs text-[#9CA3AF] mt-0.5 truncate">📍 {locationLine}</p>
        )}
      </div>
    </Link>
  );
}

// ── Main Home ─────────────────────────────────────
export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [messes,       setMesses]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filterOpen,   setFilterOpen]   = useState(false);
  const filterRef = useRef(null);

  const searchQuery      = searchParams.get("q")        ?? "";
  const selectedDivision = searchParams.get("division") ?? "";
  const selectedDistrict = searchParams.get("district") ?? "";
  const selectedArea     = searchParams.get("area")     ?? "";
  const rentRange        = searchParams.get("rent")     ?? "Any Price";
  const genderFilter     = searchParams.get("gender")   ?? "All";

  // Close mobile filter on outside click
  useEffect(() => {
    function handler(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function setParam(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (!value || value === "Any Price" || value === "All") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    }, { replace: true });
  }

  function handleDivisionChange(e) {
    const val = e.target.value;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set("division", val); else next.delete("division");
      next.delete("district");
      next.delete("area");
      return next;
    }, { replace: true });
  }

  function handleDistrictChange(e) {
    const val = e.target.value;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set("district", val); else next.delete("district");
      next.delete("area");
      return next;
    }, { replace: true });
  }

  function clearAll() {
    setSearchParams({}, { replace: true });
    setFilterOpen(false);
  }

  useEffect(() => {
    async function fetchMesses() {
      try {
        const snap = await getDocs(collection(db, "messes"));
        setMesses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("fetchMesses:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMesses();
  }, []);

  const divisions = Object.keys(LOCATIONS);
  const districts = selectedDivision ? Object.keys(LOCATIONS[selectedDivision] ?? {}) : [];
  const areas     = selectedDistrict ? (LOCATIONS[selectedDivision]?.[selectedDistrict] ?? []) : [];

  // Featured: top-rated messes
  const featured = [...messes]
    .filter(m => (m.rating ?? 0) > 0)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 8);

  // Filter logic with Bangla support
  const filteredMesses = messes.filter(mess => {
    const searchTerms = normalizeSearch(searchQuery);
    const matchesSearch = !searchQuery.trim() || searchTerms.some(term => {
      const t = term.toLowerCase();
      return (
        mess.title?.toLowerCase().includes(t)    ||
        mess.name?.toLowerCase().includes(t)     ||
        mess.area?.toLowerCase().includes(t)     ||
        mess.city?.toLowerCase().includes(t)     ||
        mess.district?.toLowerCase().includes(t) ||
        mess.division?.toLowerCase().includes(t)
      );
    });

    const matchesDivision = !selectedDivision || mess.division === selectedDivision;
    const matchesDistrict = !selectedDistrict ||
      mess.city === selectedDistrict || mess.district === selectedDistrict;
    const matchesArea   = !selectedArea   || mess.area === selectedArea;
    const matchesGender = genderFilter === "All" ||
      (mess.gender?.toLowerCase() === genderFilter.toLowerCase());

    let matchesRent = true;
    if      (rentRange === "Under 2000") matchesRent = (mess.rent ?? 0) < 2000;
    else if (rentRange === "2000-4000")  matchesRent = (mess.rent ?? 0) >= 2000 && (mess.rent ?? 0) <= 4000;
    else if (rentRange === "Above 4000") matchesRent = (mess.rent ?? 0) > 4000;

    return matchesSearch && matchesDivision && matchesDistrict &&
           matchesArea && matchesGender && matchesRent;
  });

  const hasActiveFilters = searchQuery || selectedDivision || selectedDistrict ||
    selectedArea || rentRange !== "Any Price" || genderFilter !== "All";

  const activeCount = [
    selectedDivision, selectedDistrict, selectedArea,
    rentRange !== "Any Price" ? rentRange : "",
    genderFilter !== "All" ? genderFilter : "",
  ].filter(Boolean).length;

  const selectCls = "w-full border border-[#E8E8E4] rounded-2xl p-2.5 text-sm text-[#1A1A1A] outline-none focus:border-orange-500 bg-white disabled:bg-[#FAFAF8] disabled:text-[#9CA3AF] transition-colors";

  return (
    <div className="animate-fade-in" style={{ backgroundColor: "#FAFAF8" }}>

      {/* ── Hero with gradient ── */}
      <div
        className="rounded-4xl p-8 md:p-12 mb-8 text-white shadow-glass relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #F97316 0%, #EA580C 55%, #C2410C 100%)",
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-20"
          style={{ background: "rgba(255,255,255,0.3)" }}
        />
        <div
          className="absolute -bottom-12 -left-6 w-36 h-36 rounded-full opacity-10"
          style={{ background: "rgba(255,255,255,0.4)" }}
        />

        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">
            Find the perfect mess 🏠
          </h1>
          <p className="text-orange-100 mb-6 text-sm md:text-base">
            Browse messes across every city, town, and area in Bangladesh
          </p>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center text-[#9CA3AF] text-lg pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setParam("q", e.target.value)}
              placeholder="Search by mess name, city, or area… বাংলায় লিখুন"
              className="w-full bg-white text-[#1A1A1A] rounded-2xl py-4 pl-12 pr-4 outline-none transition-all shadow-soft text-sm md:text-base"
              style={{ caretColor: "#F97316" }}
            />
          </div>

          {/* Bangla hint */}
          {isBangla(searchQuery) && (
            <p className="text-orange-100 text-xs mt-2">
              🔍 বাংলা অনুসন্ধান সক্রিয়
              <span className="opacity-70"> — Searching Bangla against English data</span>
            </p>
          )}
        </div>
      </div>

      {/* ── Recently viewed ── */}
      <RecentlyViewed />

      {/* ── Featured strip ── */}
      {!loading && featured.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
              ⭐ Top Rated Messes
            </h2>
            <Link to="/compare" className="text-xs font-semibold text-orange-500 hover:underline">
              Compare →
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {featured.map(mess => (
              <FeaturedCard key={mess.id} mess={mess} />
            ))}
          </div>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div
        className="bg-white rounded-3xl border border-[#E8E8E4] shadow-soft p-4 mb-6"
        ref={filterRef}
      >
        {/* Mobile: toggle button */}
        <div className="flex items-center justify-between md:hidden mb-0">
          <button
            onClick={() => setFilterOpen(o => !o)}
            className="flex items-center gap-2 text-sm font-semibold text-[#374151] tap-target"
          >
            <span>⚙️</span>
            <span>Filters</span>
            {activeCount > 0 && (
              <span
                className="text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "#F97316" }}
              >
                {activeCount}
              </span>
            )}
            <span
              className="text-xs transition-transform duration-200"
              style={{ transform: filterOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              ▼
            </span>
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="text-xs text-[#9CA3AF] hover:text-red-400 transition-colors"
            >
              Clear ✕
            </button>
          )}
        </div>

        {/* Filter grid — always visible on desktop, toggle on mobile */}
        <div className={`grid grid-cols-2 md:grid-cols-5 gap-3 ${filterOpen ? "mt-4" : "hidden"} md:grid`}>
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">Division</label>
            <select value={selectedDivision} onChange={handleDivisionChange} className={selectCls}>
              <option value="">All Divisions</option>
              {divisions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">District</label>
            <select value={selectedDistrict} onChange={handleDistrictChange}
              disabled={!selectedDivision} className={selectCls}>
              <option value="">All Districts</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">Area</label>
            <select value={selectedArea} onChange={e => setParam("area", e.target.value)}
              disabled={!selectedDistrict} className={selectCls}>
              <option value="">All Areas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">Rent</label>
            <select value={rentRange} onChange={e => setParam("rent", e.target.value)} className={selectCls}>
              <option value="Any Price">Any Price</option>
              <option value="Under 2000">Under ৳2,000</option>
              <option value="2000-4000">৳2,000 – ৳4,000</option>
              <option value="Above 4000">Above ৳4,000</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B7280] mb-1.5">Gender</label>
            <select value={genderFilter} onChange={e => setParam("gender", e.target.value)} className={selectCls}>
              <option value="All">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Result count ── */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-[#6B7280]">
          <span className="font-extrabold text-orange-500">{filteredMesses.length}</span> messes found
        </p>
        <div className="flex items-center gap-3">
          <Link
            to="/compare"
            className="flex items-center gap-1.5 text-xs font-bold text-orange-500 border border-orange-200 hover:border-orange-400 px-3 py-1.5 rounded-xl transition-all hover:bg-orange-50"
          >
            ⚖️ Compare
          </Link>
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="text-xs text-[#9CA3AF] hover:text-red-400 transition-colors font-medium"
            >
              Clear all ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <MessGridSkeleton count={6} />
      ) : filteredMesses.length === 0 ? (
        <div
          className="text-center py-20 rounded-3xl border border-dashed border-[#E8E8E4]"
          style={{ background: "#FFFFFF" }}
        >
          <div className="text-5xl mb-4">📭</div>
          <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">No messes found</h3>
          <p className="text-[#6B7280] text-sm mb-5">
            Try adjusting your filters or searching a different area.
          </p>
          <button
            onClick={clearAll}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-2xl font-semibold text-sm transition-colors"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24 md:pb-6">
          {filteredMesses.map(mess => (
            <MessCard key={mess.id} mess={mess} />
          ))}
        </div>
      )}
    </div>
  );
}
