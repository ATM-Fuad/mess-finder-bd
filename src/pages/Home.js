// ─────────────────────────────────────────────────
//  Home.js
//  FIX: Filters persist via URL search params
//  so going back from MessDetail restores them.
// ─────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import MessCard from "../components/MessCard";

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

export default function Home() {
  // ── Persist filters in URL so back-navigation restores them ──
  const [searchParams, setSearchParams] = useSearchParams();

  const [messes,  setMesses]  = useState([]);
  const [loading, setLoading] = useState(true);

  // Read filter values from URL params (default to empty)
  const searchQuery       = searchParams.get("q")        ?? "";
  const selectedDivision  = searchParams.get("division") ?? "";
  const selectedDistrict  = searchParams.get("district") ?? "";
  const selectedArea      = searchParams.get("area")     ?? "";
  const rentRange         = searchParams.get("rent")     ?? "Any Price";
  const genderFilter      = searchParams.get("gender")   ?? "All";

  // Helper — update one param without clearing others
  function setParam(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (!value || value === "Any Price" || value === "All") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    }, { replace: true }); // replace so back button goes to previous page, not previous filter state
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
  }

  // Fetch messes once
  useEffect(() => {
    async function fetchMesses() {
      try {
        const snap = await getDocs(collection(db, "messes"));
        setMesses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching messes:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMesses();
  }, []);

  // Cascading dropdowns
  const divisions = Object.keys(LOCATIONS);
  const districts = selectedDivision ? Object.keys(LOCATIONS[selectedDivision] ?? {}) : [];
  const areas     = selectedDistrict ? (LOCATIONS[selectedDivision]?.[selectedDistrict] ?? []) : [];

  // Filter logic
  const filteredMesses = messes.filter(mess => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      (mess.title?.toLowerCase().includes(q))  ||
      (mess.name?.toLowerCase().includes(q))   ||
      (mess.area?.toLowerCase().includes(q))   ||
      (mess.city?.toLowerCase().includes(q))   ||
      (mess.district?.toLowerCase().includes(q));

    const matchesDivision = !selectedDivision || mess.division === selectedDivision;
    const matchesDistrict = !selectedDistrict ||
      mess.city === selectedDistrict || mess.district === selectedDistrict;
    const matchesArea     = !selectedArea || mess.area === selectedArea;
    const matchesGender   = genderFilter === "All" ||
      (mess.gender?.toLowerCase() === genderFilter.toLowerCase());

    let matchesRent = true;
    if      (rentRange === "Under 2000")  matchesRent = (mess.rent ?? 0) < 2000;
    else if (rentRange === "2000-4000")   matchesRent = (mess.rent ?? 0) >= 2000 && (mess.rent ?? 0) <= 4000;
    else if (rentRange === "Above 4000")  matchesRent = (mess.rent ?? 0) > 4000;

    return matchesSearch && matchesDivision && matchesDistrict &&
           matchesArea && matchesGender && matchesRent;
  });

  const selectCls = "w-full border border-gray-200 rounded-xl p-2.5 text-sm text-gray-800 outline-none focus:border-orange-500 bg-white disabled:bg-gray-50 disabled:text-gray-400 transition-colors";

  const hasActiveFilters = searchQuery || selectedDivision || selectedDistrict ||
    selectedArea || rentRange !== "Any Price" || genderFilter !== "All";

  return (
    <div>
      {/* Hero */}
      <div className="bg-orange-500 rounded-3xl p-8 md:p-12 mb-8 text-white shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Find the perfect mess 🏠</h1>
        <p className="text-orange-100 mb-6">
          Browse messes across every city, town, and area in Bangladesh
        </p>
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 text-xl pointer-events-none">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setParam("q", e.target.value)}
            placeholder="Search by mess name, city, or area…"
            className="w-full bg-white text-gray-900 rounded-xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-orange-300 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Division</label>
            <select value={selectedDivision} onChange={handleDivisionChange} className={selectCls}>
              <option value="">All Divisions</option>
              {divisions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">District / City</label>
            <select value={selectedDistrict} onChange={handleDistrictChange}
              disabled={!selectedDivision} className={selectCls}>
              <option value="">All Districts</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Area</label>
            <select value={selectedArea} onChange={e => setParam("area", e.target.value)}
              disabled={!selectedDistrict} className={selectCls}>
              <option value="">All Areas</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Rent range</label>
            <select value={rentRange} onChange={e => setParam("rent", e.target.value)} className={selectCls}>
              <option value="Any Price">Any Price</option>
              <option value="Under 2000">Under ৳2,000</option>
              <option value="2000-4000">৳2,000 – ৳4,000</option>
              <option value="Above 4000">Above ৳4,000</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Gender</label>
            <select value={genderFilter} onChange={e => setParam("gender", e.target.value)} className={selectCls}>
              <option value="All">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
      </div>

      {/* Result count + clear */}
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="text-gray-500">
          <span className="text-orange-500 font-bold">{filteredMesses.length}</span> messes found
        </span>
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-gray-400 hover:text-red-500 transition-colors text-xs font-medium">
            Clear all filters ✕
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 font-medium">Loading messes…</div>
      ) : filteredMesses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <span className="text-4xl">📭</span>
          <h3 className="text-lg font-bold text-gray-800 mt-4">No messes found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your filters or searching a different area.</p>
          <button onClick={clearAll} className="mt-4 text-orange-500 font-semibold hover:underline">
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
