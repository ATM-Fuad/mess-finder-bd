// ─────────────────────────────────────────────────
//  Home.js  –  Main listing page
// ─────────────────────────────────────────────────
//  Shows all messes from Firestore.
//  Users can filter by city, university, rent, gender.
// ─────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import MessCard from "../components/MessCard";
import { Link } from "react-router-dom";

// ── Data for filter dropdowns ───────────────────
const CITIES = ["All Cities", "Dhaka", "Chittagong", "Rajshahi", "Sylhet", "Khulna", "Mymensingh"];

const UNIVERSITIES = {
  "All Cities":   ["All Universities"],
  "Dhaka":        ["All Universities","NSU","BRAC","DIU","AIUB","UIU","DU","BUET","BRACU","IUB","East West"],
  "Chittagong":   ["All Universities","CUET","CU","IIUC","BGC Trust","Premier"],
  "Rajshahi":     ["All Universities","RU","RUET","NSTU"],
  "Sylhet":       ["All Universities","SUST","Leading","MetroPolitan"],
  "Khulna":       ["All Universities","KU","KUET","NWU"],
  "Mymensingh":   ["All Universities","BAU","BSMRSTU"],
};

const RENT_RANGES = [
  { label: "Any Price",      min: 0,     max: Infinity },
  { label: "Under ৳3,000",   min: 0,     max: 3000 },
  { label: "৳3,000–৳6,000", min: 3000,  max: 6000 },
  { label: "৳6,000–৳10,000",min: 6000,  max: 10000 },
  { label: "Above ৳10,000", min: 10000, max: Infinity },
];

// ── Demo listings shown before real data loads ──
const DEMO_MESSES = [
  { id:"d1", name:"Al-Amin Mess", city:"Dhaka", university:"NSU", rent:4500, seats_available:2, gender:"male",   facilities:["wifi","generator","meals"], photos:[], rating:4.3, review_count:12 },
  { id:"d2", name:"Siddika Ladies Hostel", city:"Dhaka", university:"BRAC", rent:6000, seats_available:1, gender:"female", facilities:["wifi","ac","bathroom","cctv"], photos:[], rating:4.7, review_count:28 },
  { id:"d3", name:"Noor Mansion", city:"Chittagong", university:"CUET", rent:3500, seats_available:3, gender:"male", facilities:["wifi","generator"], photos:[], rating:4.0, review_count:7 },
  { id:"d4", name:"Green View Mess", city:"Rajshahi", university:"RU", rent:2800, seats_available:0, gender:"mixed", facilities:["wifi","meals"], photos:[], rating:4.1, review_count:15 },
  { id:"d5", name:"Comfort Ladies Mess", city:"Dhaka", university:"DIU", rent:5000, seats_available:2, gender:"female", facilities:["wifi","ac","meals","bathroom"], photos:[], rating:4.5, review_count:19 },
  { id:"d6", name:"Savar Mess BD", city:"Dhaka", university:"AIUB", rent:3200, seats_available:4, gender:"male", facilities:["generator","wifi"], photos:[], rating:3.8, review_count:5 },
];

export default function Home() {
  const [messes,     setMesses]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [city,       setCity]       = useState("All Cities");
  const [university, setUniversity] = useState("All Universities");
  const [rentRange,  setRentRange]  = useState(0);   // index into RENT_RANGES
  const [gender,     setGender]     = useState("all");

  // ── Fetch messes from Firestore ─────────────────
  useEffect(() => {
    async function fetchMesses() {
      try {
        const q = query(collection(db, "messes"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // If no data yet, show demo listings so the page isn't empty
        setMesses(data.length > 0 ? data : DEMO_MESSES);
      } catch (err) {
        console.error("Error fetching messes:", err);
        setMesses(DEMO_MESSES); // fallback to demo
      } finally {
        setLoading(false);
      }
    }
    fetchMesses();
  }, []);

  // ── Filter logic ────────────────────────────────
  const { min, max } = RENT_RANGES[rentRange];
  const filtered = messes.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                        m.city.toLowerCase().includes(search.toLowerCase()) ||
                        m.university.toLowerCase().includes(search.toLowerCase());
    const matchCity   = city === "All Cities"        || m.city === city;
    const matchUni    = university === "All Universities" || m.university === university;
    const matchRent   = m.rent >= min && m.rent <= max;
    const matchGender = gender === "all"             || m.gender === gender;
    return matchSearch && matchCity && matchUni && matchRent && matchGender;
  });

  // Reset university when city changes
  function handleCityChange(newCity) {
    setCity(newCity);
    setUniversity("All Universities");
  }

  return (
    <div>

      {/* ── Hero Banner ──────────────────────────── */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 md:p-10 mb-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Find the perfect mess 🏠
        </h1>
        <p className="text-orange-100 mb-6 text-sm md:text-base">
          {messes.length}+ messes listed across all major university cities in Bangladesh
        </p>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-3 bg-white rounded-xl px-4 py-3">
            <span className="text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by name, city, or university..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 outline-none text-gray-700 text-sm placeholder-gray-400"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400 hover:text-gray-600">✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {/* City */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">City</label>
            <select
              value={city}
              onChange={e => handleCityChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-400"
            >
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* University */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">University</label>
            <select
              value={university}
              onChange={e => setUniversity(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-400"
            >
              {(UNIVERSITIES[city] || ["All Universities"]).map(u => <option key={u}>{u}</option>)}
            </select>
          </div>

          {/* Rent */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Rent range</label>
            <select
              value={rentRange}
              onChange={e => setRentRange(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-400"
            >
              {RENT_RANGES.map((r, i) => <option key={i} value={i}>{r.label}</option>)}
            </select>
          </div>

          {/* Gender */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Gender</label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-orange-400"
            >
              <option value="all">All</option>
              <option value="male">Male only</option>
              <option value="female">Female only</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{filtered.length}</span> mess{filtered.length !== 1 ? "es" : ""} found
          </p>
          {(city !== "All Cities" || university !== "All Universities" || rentRange !== 0 || gender !== "all" || search) && (
            <button
              onClick={() => { setCity("All Cities"); setUniversity("All Universities"); setRentRange(0); setGender("all"); setSearch(""); }}
              className="text-sm text-orange-500 hover:text-orange-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Mess Grid ────────────────────────────── */}
      {loading ? (
        // Loading skeleton
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="h-44 bg-gray-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(mess => <MessCard key={mess.id} mess={mess} />)}
        </div>
      ) : (
        // Empty state
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No messes found</h3>
          <p className="text-gray-400 mb-6">Try changing your filters or be the first to post in this area!</p>
          <Link to="/post" className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors">
            + Post the first mess
          </Link>
        </div>
      )}

    </div>
  );
}
