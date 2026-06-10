// ─────────────────────────────────────────────────
//  Compare.js  —  src/pages/Compare.js
//  Plan 8: Side-by-side mess comparison
//  Route: /compare
//  User selects up to 3 messes from a searchable
//  list, then sees a full comparison table.
// ─────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";

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

const ALL_FACILITIES = Object.keys(FACILITY_ICONS);

const WHATSAPP_MSG = encodeURIComponent(
  "আসসালামু আলাইকুম, আমি MessFinder BD অ্যাপ থেকে আপনার মেসটি দেখেছি। আমি একটি সিট নিতে আগ্রহী। সিট কি এখনো পাওয়া যাচ্ছে? ভাড়া ও অন্যান্য বিষয়ে একটু জানাবেন?"
);

// ── Helper: best / worst highlight ───────────────
function bestOf(messes, key, lower = false) {
  // lower = true means lower value is better (e.g. rent)
  const vals = messes.map(m => Number(m?.[key] ?? 0)).filter(v => !isNaN(v));
  if (!vals.length) return null;
  return lower ? Math.min(...vals) : Math.max(...vals);
}

function CellHighlight({ value, best, lower, children }) {
  const isBest = lower ? value <= best : value >= best;
  return (
    <td className={`px-4 py-4 text-center text-sm align-top border-r border-gray-100 last:border-0
      ${isBest && best !== null ? "bg-green-50 font-semibold text-green-700" : "text-gray-700"}`}>
      {children}
      {isBest && best !== null && (
        <span className="block text-[10px] text-green-500 font-normal mt-0.5">
          {lower ? "✅ Lowest" : "✅ Best"}
        </span>
      )}
    </td>
  );
}

// ── Mess selector dropdown ────────────────────────
function MessSelector({ allMesses, selected, onSelect, onRemove, index }) {
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState(false);

  const filtered = allMesses
    .filter(m => !selected.find(s => s?.id === m.id))
    .filter(m => {
      const q = query.toLowerCase();
      return !q ||
        (m.title || m.name || "").toLowerCase().includes(q) ||
        (m.area  || "").toLowerCase().includes(q) ||
        (m.city  || m.district || "").toLowerCase().includes(q);
    })
    .slice(0, 6);

  if (selected[index]) {
    const mess = selected[index];
    return (
      <div className="flex items-center gap-2 bg-orange-50 border-2 border-orange-200 rounded-xl px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{mess.title || mess.name}</p>
          <p className="text-xs text-gray-500 truncate">
            📍 {[mess.area, mess.city || mess.district].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button onClick={() => onRemove(index)}
          className="text-gray-400 hover:text-red-400 transition-colors text-lg shrink-0">✕</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={`Search mess ${index + 1}…`}
        className="w-full border-2 border-dashed border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 bg-white transition-colors"
      />
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">No messes found</p>
          ) : filtered.map(m => (
            <button key={m.id} type="button"
              onClick={() => { onSelect(index, m); setQuery(""); setOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm hover:bg-orange-50 transition-colors border-b border-gray-50 last:border-0">
              <p className="font-medium text-gray-800">{m.title || m.name}</p>
              <p className="text-xs text-gray-400">
                📍 {[m.area, m.city || m.district].filter(Boolean).join(" · ")} · ৳{Number(m.rent || 0).toLocaleString()}/mo
              </p>
            </button>
          ))}
          <button type="button" onClick={() => setOpen(false)}
            className="w-full text-center text-xs text-gray-300 py-2 hover:text-gray-500">
            Close
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Compare page ─────────────────────────────
export default function Compare() {
  const [allMesses, setAllMesses] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState([null, null, null]); // up to 3

  useEffect(() => {
    async function fetch() {
      try {
        const snap = await getDocs(collection(db, "messes"));
        setAllMesses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    fetch();
  }, []);

  function handleSelect(index, mess) {
    setSelected(prev => prev.map((s, i) => i === index ? mess : s));
  }

  function handleRemove(index) {
    setSelected(prev => prev.map((s, i) => i === index ? null : s));
  }

  const activeMesses = selected.filter(Boolean);
  const bestRent     = bestOf(activeMesses, "rent", true);
  const bestSeats    = bestOf(activeMesses, "availableSeats");
  const bestRating   = bestOf(activeMesses, "rating");
  const bestViews    = bestOf(activeMesses, "views");

  // ── Comparison rows config ────────────────────
  const rows = [
    {
      label: "📍 Location",
      render: m => [m.area, m.city || m.district].filter(Boolean).join(" · ") || "—",
      plain: true,
    },
    {
      label: "💰 Monthly Rent",
      render: m => `৳${Number(m.rent || 0).toLocaleString()}`,
      highlight: true, key: "rent", lower: true, best: bestRent,
      rawValue: m => Number(m.rent || 0),
    },
    {
      label: "🛏️ Available Seats",
      render: m => `${m.availableSeats ?? m.seats_available ?? 0} seat(s)`,
      highlight: true, key: "availableSeats", lower: false, best: bestSeats,
      rawValue: m => Number(m.availableSeats ?? m.seats_available ?? 0),
    },
    {
      label: "⭐ Rating",
      render: m => m.rating > 0 ? `⭐ ${Number(m.rating).toFixed(1)} (${m.review_count ?? 0} reviews)` : "No reviews yet",
      highlight: true, key: "rating", lower: false, best: bestRating,
      rawValue: m => Number(m.rating || 0),
    },
    {
      label: "👤 Gender Policy",
      render: m => m.gender === "male" ? "👨 Male only"
        : m.gender === "female" ? "👩 Female only" : "👥 Mixed",
      plain: true,
    },
    {
      label: "✅ Availability",
      render: m => m.available || (m.availableSeats ?? m.seats_available ?? 0) > 0
        ? "✅ Available" : "🔴 Full",
      plain: true,
    },
    {
      label: "👁️ Total Views",
      render: m => `${m.views ?? 0} views`,
      highlight: true, key: "views", lower: false, best: bestViews,
      rawValue: m => Number(m.views || 0),
    },
    {
      label: "🏠 Facilities",
      render: null, // handled separately
      facilities: true,
    },
    {
      label: "📞 Contact",
      render: null, // handled separately
      contact: true,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-28 md:pb-8">

      {/* Header */}
      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-3">
          ← Back to listings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">⚖️ Compare Messes</h1>
        <p className="text-gray-500 text-sm mt-1">
          Select up to 3 messes to compare side by side. Green highlights show the best value.
        </p>
      </div>

      {/* Mess selectors */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading messes…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {[0, 1, 2].map(i => (
              <MessSelector
                key={i}
                allMesses={allMesses}
                selected={selected}
                onSelect={handleSelect}
                onRemove={handleRemove}
                index={i}
              />
            ))}
          </div>

          {/* Comparison table */}
          {activeMesses.length < 2 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
              <p className="text-4xl mb-3">⚖️</p>
              <p className="font-semibold text-gray-700 text-lg">Select at least 2 messes to compare</p>
              <p className="text-gray-400 text-sm mt-1">
                Search and pick messes from the boxes above
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Table header — mess photos + names */}
              <table className="w-full table-fixed">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-4 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide w-32">
                      Category
                    </th>
                    {activeMesses.map(mess => {
                      const photo = mess.photos?.[0] ||
                        `https://placehold.co/200x120/FFF7ED/EA580C?text=${encodeURIComponent(mess.title || mess.name || "Mess")}`;
                      return (
                        <th key={mess.id} className="px-4 py-4 border-r border-gray-100 last:border-0">
                          <img src={photo} alt={mess.title || mess.name}
                            className="w-full h-24 object-cover rounded-xl mb-2"
                            onError={e => { e.target.src = "https://placehold.co/200x120/FFF7ED/EA580C?text=Mess"; }} />
                          <Link to={`/mess/${mess.id}`}
                            className="text-sm font-bold text-gray-900 hover:text-orange-500 transition-colors line-clamp-1 block">
                            {mess.title || mess.name}
                          </Link>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className={`border-b border-gray-50 last:border-0 ${rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      {/* Row label */}
                      <td className="px-4 py-4 text-xs font-semibold text-gray-500 align-top w-32 border-r border-gray-100">
                        {row.label}
                      </td>

                      {/* Facilities row */}
                      {row.facilities && activeMesses.map(mess => {
                        const facilities = [...new Set([...(mess.amenities || []), ...(mess.facilities || [])])];
                        return (
                          <td key={mess.id} className="px-4 py-4 align-top border-r border-gray-100 last:border-0">
                            {ALL_FACILITIES.map(fId => {
                              const has = facilities.includes(fId);
                              const f   = FACILITY_ICONS[fId];
                              return (
                                <div key={fId} className={`flex items-center gap-1.5 text-xs mb-1
                                  ${has ? "text-green-600" : "text-gray-200"}`}>
                                  <span>{has ? "✅" : "❌"}</span>
                                  <span>{f.icon} {f.label}</span>
                                </div>
                              );
                            })}
                          </td>
                        );
                      })}

                      {/* Contact / WhatsApp row */}
                      {row.contact && activeMesses.map(mess => (
                        <td key={mess.id} className="px-4 py-4 align-top text-center border-r border-gray-100 last:border-0">
                          <div className="flex flex-col gap-2">
                            {mess.contact_phone ? (
                              <>
                                <a
                                  href={`https://wa.me/880${mess.contact_phone.replace(/^0/, "")}?text=${WHATSAPP_MSG}`}
                                  target="_blank" rel="noreferrer"
                                  className="inline-flex items-center justify-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                                >
                                  💬 WhatsApp
                                </a>
                                <a
                                  href={`tel:${mess.contact_phone}`}
                                  className="inline-flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                                >
                                  📞 Call
                                </a>
                              </>
                            ) : (
                              <span className="text-xs text-gray-300">No contact</span>
                            )}
                            <Link to={`/mess/${mess.id}`}
                              className="text-xs text-orange-500 hover:underline font-medium">
                              View details →
                            </Link>
                          </div>
                        </td>
                      ))}

                      {/* Regular rows */}
                      {!row.facilities && !row.contact && (
                        row.highlight
                          ? activeMesses.map(mess => (
                              <CellHighlight
                                key={mess.id}
                                value={row.rawValue(mess)}
                                best={row.best}
                                lower={row.lower}
                              >
                                {row.render(mess)}
                              </CellHighlight>
                            ))
                          : activeMesses.map(mess => (
                              <td key={mess.id}
                                className="px-4 py-4 text-center text-sm text-gray-700 align-top border-r border-gray-100 last:border-0">
                                {row.render(mess)}
                              </td>
                            ))
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
