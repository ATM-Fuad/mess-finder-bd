// ─────────────────────────────────────────────────
//  Home.js  –  Main listing page
//  Changes:
//   1. Division / District / Area filters (no university)
//   2. Search bar text updated
//   3. Filter ribbon as collapsible dropdown
//   4. Heart → Bookmark icon
// ─────────────────────────────────────────────────

import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import MessCard from "../components/MessCard";

// ── Bangladesh location data (Division → District → Area) ─
const BANGLADESH_LOCATIONS = {
  "Dhaka": {
    "Dhaka City": ["Mirpur","Farmgate","Bashundhara","Uttara","Mohammadpur","Dhanmondi","Badda","Mohakhali","Tejgaon","Rampura","Banasree","Khilgaon"],
    "Savar": ["Jahangirnagar","Ashulia","Hemayetpur","Savar Bazar"],
    "Gazipur": ["Board Bazar","Tongi","Chowrasta","Joydebpur"],
    "Narayanganj": ["Siddhirganj","Fatullah","Rupganj"],
  },
  "Rajshahi": {
    "Rajshahi City": ["Binodpur","Kazla","Talaimari","Motihar","Sopura","New Market","Upashahar","Rajpara","Boalia","Shaheb Bazar"],
    "Puthia": ["Baneswar","Puthia Sadar"],
    "Natore": ["Natore Sadar","Singra"],
  },
  "Mymensingh": {
    "Mymensingh City": ["Sesh Mor","Kevalat Khan","Patgudam","Ganginarpar","Kewatkhali","Bypass","Chorpara","Notun Bazar"],
    "Netrokona": ["Netrokona Sadar","Mohonganj"],
    "Jamalpur": ["Jamalpur Sadar","Islampur"],
  },
  "Chittagong": {
    "Chittagong City": ["Chawkbazar","GEC Circle","Halishahar","Nasirabad","Agrabad","Pahartali","Oxygen","Muradpur","Sholoshahar"],
    "Hathazari": ["Hathazari Sadar","Fatehabad"],
    "Patiya": ["Patiya Sadar","Karnaphuli"],
  },
  "Sylhet": {
    "Sylhet City": ["Zindabazar","Subidbazar","Shibganj","Tilagarh","Akhalia","Ambarkhana","Majortila"],
    "Moulvibazar": ["Moulvibazar Sadar","Sreemangal"],
    "Habiganj": ["Habiganj Sadar","Chunarughat"],
  },
  "Khulna": {
    "Khulna City": ["Sonadanga","Boyra","Khalishpur","Rupsha","Daulatpur"],
    "Jessore": ["Jessore Sadar","Chaugachha"],
  },
  "Barisal": {
    "Barisal City": ["Natullabad","Rupatali","Sadar Road","Band Road"],
    "Patuakhali": ["Patuakhali Sadar","Baufal"],
  },
  "Rangpur": {
    "Rangpur City": ["Modern More","Jahaj Company More","Lalbag","Dhap","Shapla Chottor"],
    "Dinajpur": ["Dinajpur Sadar","Birampur"],
    "Kurigram": ["Kurigram Sadar","Nageshwari"],
  },
};

export default function Home() {
  const [messes,           setMesses]           = useState([]);
  const [loading,          setLoading]           = useState(true);
  const [searchQuery,      setSearchQuery]       = useState("");
  const [selectedDivision, setSelectedDivision]  = useState("");
  const [selectedDistrict, setSelectedDistrict]  = useState("");
  const [selectedArea,     setSelectedArea]      = useState("");
  const [rentRange,        setRentRange]         = useState("Any Price");
  const [genderFilter,     setGenderFilter]      = useState("All");
  const [filtersOpen,      setFiltersOpen]       = useState(false);
  const filterRef = useRef(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFiltersOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch messes
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

  // Cascading options
  const divisions = Object.keys(BANGLADESH_LOCATIONS);
  const districts  = selectedDivision ? Object.keys(BANGLADESH_LOCATIONS[selectedDivision]) : [];
  const areas      = selectedDistrict ? BANGLADESH_LOCATIONS[selectedDivision][selectedDistrict] : [];

  function handleDivisionChange(e) {
    setSelectedDivision(e.target.value);
    setSelectedDistrict("");
    setSelectedArea("");
  }
  function handleDistrictChange(e) {
    setSelectedDistrict(e.target.value);
    setSelectedArea("");
  }

  // Active filter count for badge
  const activeFilters = [selectedDivision, selectedDistrict, selectedArea, rentRange !== "Any Price" ? rentRange : "", genderFilter !== "All" ? genderFilter : ""].filter(Boolean).length;

  function clearAll() {
    setSelectedDivision(""); setSelectedDistrict(""); setSelectedArea("");
    setRentRange("Any Price"); setGenderFilter("All"); setSearchQuery("");
  }

  // Filtering
  const filteredMesses = messes.filter(mess => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (mess.title  && mess.title.toLowerCase().includes(q))  ||
      (mess.name   && mess.name.toLowerCase().includes(q))   ||
      (mess.area   && mess.area.toLowerCase().includes(q))   ||
      (mess.city   && mess.city.toLowerCase().includes(q));

    // Division maps to mess.district or mess.division
    const matchesDivision = !selectedDivision ||
      mess.division === selectedDivision ||
      mess.district === selectedDivision ||   // some docs may use district for division
      districts.some(d => mess.city === d);   // or city matches a district in this division

    const matchesDistrict = !selectedDistrict || mess.city === selectedDistrict;
    const matchesArea     = !selectedArea     || mess.area === selectedArea;
    const matchesGender   = genderFilter === "All" || (mess.gender && mess.gender.toLowerCase() === genderFilter.toLowerCase());

    let matchesRent = true;
    if      (rentRange === "Under 2000")  matchesRent = mess.rent < 2000;
    else if (rentRange === "2000-4000")   matchesRent = mess.rent >= 2000 && mess.rent <= 4000;
    else if (rentRange === "Above 4000")  matchesRent = mess.rent > 4000;

    return matchesSearch && matchesDivision && matchesDistrict && matchesArea && matchesGender && matchesRent;
  });

  return (
    <div className="animate-fade-in">

      {/* ── Hero / Search ── */}
      <div className="bg-orange-500 rounded-3xl p-8 md:p-12 mb-6 text-white shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Find the perfect mess 🏠</h1>
        <p className="text-orange-100 mb-6">
          Browse messes across every city, town, and student hub in Bangladesh
        </p>
        <div className="relative">
          <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 text-xl pointer-events-none">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by mess name, city, or area…"
            className="w-full bg-white text-gray-900 rounded-xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-orange-300 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* ── Filter dropdown ribbon ── */}
      <div ref={filterRef} className="relative mb-6">
        <div className="flex items-center gap-3">
          {/* Toggle button */}
          <button
            onClick={() => setFiltersOpen(o => !o)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all
              ${filtersOpen || activeFilters > 0
                ? "border-orange-500 bg-orange-50 text-orange-600"
                : "border-gray-200 bg-white text-gray-600 hover:border-orange-300"}`}
          >
            <span>⚙️</span>
            Filters
            {activeFilters > 0 && (
              <span className="bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {activeFilters}
              </span>
            )}
            <span className={`text-xs transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}>▼</span>
          </button>

          {/* Active filter pills */}
          <div className="flex flex-wrap gap-2">
            {selectedDivision && <FilterPill label={selectedDivision} onRemove={() => { setSelectedDivision(""); setSelectedDistrict(""); setSelectedArea(""); }} />}
            {selectedDistrict && <FilterPill label={selectedDistrict} onRemove={() => { setSelectedDistrict(""); setSelectedArea(""); }} />}
            {selectedArea     && <FilterPill label={selectedArea}     onRemove={() => setSelectedArea("")} />}
            {rentRange !== "Any Price" && <FilterPill label={rentRange} onRemove={() => setRentRange("Any Price")} />}
            {genderFilter !== "All"    && <FilterPill label={genderFilter} onRemove={() => setGenderFilter("All")} />}
            {activeFilters > 0 && (
              <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2">
                Clear all ✕
              </button>
            )}
          </div>
        </div>

        {/* Dropdown panel */}
        {filtersOpen && (
          <div className="absolute top-full left-0 mt-2 z-40 bg-white rounded-2xl border border-gray-100 shadow-xl p-5 w-full md:w-auto min-w-full md:min-w-[700px]">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Division</label>
                <select value={selectedDivision} onChange={handleDivisionChange}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-gray-800 outline-none focus:border-orange-500">
                  <option value="">All Divisions</option>
                  {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">District / City</label>
                <select value={selectedDistrict} onChange={handleDistrictChange}
                  disabled={!selectedDivision}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-gray-800 outline-none focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-400">
                  <option value="">All Districts</option>
                  {districts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Area</label>
                <select value={selectedArea} onChange={e => setSelectedArea(e.target.value)}
                  disabled={!selectedDistrict}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-gray-800 outline-none focus:border-orange-500 disabled:bg-gray-50 disabled:text-gray-400">
                  <option value="">All Areas</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Rent range</label>
                <select value={rentRange} onChange={e => setRentRange(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-gray-800 outline-none focus:border-orange-500">
                  <option value="Any Price">Any Price</option>
                  <option value="Under 2000">Under ৳2,000</option>
                  <option value="2000-4000">৳2,000 – ৳4,000</option>
                  <option value="Above 4000">Above ৳4,000</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Gender</label>
                <select value={genderFilter} onChange={e => setGenderFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-gray-800 outline-none focus:border-orange-500">
                  <option value="All">All</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>

            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-gray-50">
              <button
                onClick={() => setFiltersOpen(false)}
                className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                Apply filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Result count */}
      <div className="mb-4 text-sm font-medium text-gray-500">
        <span className="text-orange-500 font-bold">{filteredMesses.length}</span> messes found
      </div>

      {/* ── Listings grid ── */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMesses.map(mess => (
            <MessCard key={mess.id} mess={mess} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Small removable pill for active filters ───────
function FilterPill({ label, onRemove }) {
  return (
    <span className="flex items-center gap-1 bg-orange-100 text-orange-700 text-xs font-medium px-3 py-1.5 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-red-500 transition-colors ml-0.5">✕</button>
    </span>
  );
}
