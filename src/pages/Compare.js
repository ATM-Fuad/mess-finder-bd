// ─────────────────────────────────────────────────
//  Compare.js  —  Phase 2 redesign
//  • Warm colors, rounded-3xl, shadow-card
//  • Green highlight on best values
//  • Pre-filled WhatsApp message
//  • Zero ESLint errors
// ─────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";

const FACILITY_ICONS = {
  wifi:      { icon:"📶", label:"WiFi" },
  generator: { icon:"⚡", label:"Generator" },
  ac:        { icon:"❄️",  label:"AC" },
  meals:     { icon:"🍱", label:"Meals" },
  bathroom:  { icon:"🚿", label:"Attached Bath" },
  cctv:      { icon:"📹", label:"CCTV" },
  parking:   { icon:"🏍️", label:"Parking" },
  laundry:   { icon:"👕", label:"Laundry" },
};
const ALL_FACILITIES = Object.keys(FACILITY_ICONS);

const WHATSAPP_MSG = encodeURIComponent(
  "আসসালামু আলাইকুম, আমি MessFinder BD অ্যাপ থেকে আপনার মেসটি দেখেছি। আমি একটি সিট নিতে আগ্রহী। সিট কি এখনো পাওয়া যাচ্ছে? ভাড়া ও অন্যান্য বিষয়ে একটু জানাবেন?"
);

function bestOf(messes, key, lower) {
  const vals = messes.map(m => Number(m?.[key] ?? 0)).filter(v => !isNaN(v));
  if (!vals.length) return null;
  return lower ? Math.min(...vals) : Math.max(...vals);
}

// ── Highlighted cell ──────────────────────────────
function CellHighlight({ value, best, lower, children }) {
  const isBest = best !== null && (lower ? value <= best : value >= best);
  return (
    <td
      className="px-4 py-4 text-center text-sm align-top"
      style={{
        borderRight:  "1px solid #F3F4F6",
        background:   isBest ? "#F0FDF4" : "white",
        color:        isBest ? "#065F46" : "#374151",
        fontWeight:   isBest ? "700" : "400",
      }}
    >
      {children}
      {isBest && (
        <span
          className="block text-[10px] mt-0.5 font-bold"
          style={{ color: "#10B981" }}
        >
          {lower ? "✅ Lowest" : "✅ Best"}
        </span>
      )}
    </td>
  );
}

// ── Mess selector ─────────────────────────────────
function MessSelector({ allMesses, selected, onSelect, onRemove, index }) {
  const [query, setQuery] = useState("");
  const [open,  setOpen]  = useState(false);

  const filtered = allMesses
    .filter(m => !selected.find(s => s?.id === m.id))
    .filter(m => {
      const q = query.toLowerCase();
      return !q ||
        (m.title||m.name||"").toLowerCase().includes(q) ||
        (m.area||"").toLowerCase().includes(q) ||
        (m.city||m.district||"").toLowerCase().includes(q);
    })
    .slice(0, 6);

  if (selected[index]) {
    const mess = selected[index];
    return (
      <div
        className="flex items-center gap-2 rounded-2xl px-3 py-2.5 border-2"
        style={{ background:"#FFF7ED", borderColor:"#FED7AA" }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1A1A1A] truncate">{mess.title||mess.name}</p>
          <p className="text-xs text-[#9CA3AF] truncate">
            📍 {[mess.area, mess.city||mess.district].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          onClick={() => onRemove(index)}
          className="text-[#9CA3AF] hover:text-red-400 transition-colors text-lg shrink-0 tap-target"
        >
          ✕
        </button>
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
        className="w-full border-2 border-dashed border-[#E8E8E4] rounded-2xl px-4 py-3 text-sm outline-none text-[#1A1A1A] bg-white transition-colors"
        style={{ caretColor: "#F97316" }}
      />
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-[#E8E8E4] shadow-glass z-50 overflow-hidden">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[#9CA3AF]">No messes found</p>
          ) : filtered.map(m => (
            <button
              key={m.id} type="button"
              onClick={() => { onSelect(index, m); setQuery(""); setOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm transition-colors hover:bg-[#FFF7ED]"
              style={{ borderBottom:"1px solid #F3F4F6" }}
            >
              <p className="font-bold text-[#1A1A1A]">{m.title||m.name}</p>
              <p className="text-xs text-[#9CA3AF]">
                📍 {[m.area, m.city||m.district].filter(Boolean).join(" · ")} · ৳{Number(m.rent||0).toLocaleString()}/mo
              </p>
            </button>
          ))}
          <button
            type="button" onClick={() => setOpen(false)}
            className="w-full text-center text-xs text-[#D1D5DB] py-2 hover:text-[#9CA3AF]"
          >
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
  const [selected,  setSelected]  = useState([null, null, null]);

  useEffect(() => {
    async function fetchMesses() {
      try {
        const snap = await getDocs(collection(db, "messes"));
        setAllMesses(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    fetchMesses();
  }, []);

  function handleSelect(index, mess) {
    setSelected(prev => prev.map((s,i) => i===index ? mess : s));
  }
  function handleRemove(index) {
    setSelected(prev => prev.map((s,i) => i===index ? null : s));
  }

  const activeMesses = selected.filter(Boolean);
  const bestRent     = bestOf(activeMesses, "rent",           true);
  const bestSeats    = bestOf(activeMesses, "availableSeats", false);
  const bestRating   = bestOf(activeMesses, "rating",         false);
  const bestViews    = bestOf(activeMesses, "views",          false);

  const rows = [
    {
      label: "📍 Location",
      render: m => [m.area, m.city||m.district].filter(Boolean).join(" · ") || "—",
      plain: true,
    },
    {
      label: "💰 Monthly Rent",
      render: m => `৳${Number(m.rent||0).toLocaleString()}`,
      highlight: true, key:"rent", lower:true, best:bestRent,
      rawValue: m => Number(m.rent||0),
    },
    {
      label: "🛏️ Available Seats",
      render: m => `${m.availableSeats??m.seats_available??0} seat(s)`,
      highlight: true, key:"availableSeats", lower:false, best:bestSeats,
      rawValue: m => Number(m.availableSeats??m.seats_available??0),
    },
    {
      label: "⭐ Rating",
      render: m => m.rating > 0
        ? `⭐ ${Number(m.rating).toFixed(1)} (${m.review_count??0} reviews)`
        : "No reviews yet",
      highlight: true, key:"rating", lower:false, best:bestRating,
      rawValue: m => Number(m.rating||0),
    },
    {
      label: "👤 Gender Policy",
      render: m => m.gender==="male" ? "👨 Male only"
        : m.gender==="female" ? "👩 Female only" : "👥 Mixed",
      plain: true,
    },
    {
      label: "✅ Availability",
      render: m => (m.available||(m.availableSeats??m.seats_available??0)>0)
        ? "✅ Available" : "🔴 Full",
      plain: true,
    },
    {
      label: "👁️ Total Views",
      render: m => `${m.views??0} views`,
      highlight: true, key:"views", lower:false, best:bestViews,
      rawValue: m => Number(m.views||0),
    },
    { label:"🏠 Facilities", facilities:true },
    { label:"📞 Contact",    contact:true    },
  ];

  return (
    <div
      className="max-w-5xl mx-auto pb-28 md:pb-8 animate-fade-in"
      style={{ backgroundColor: "#FAFAF8" }}
    >
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/"
          className="flex items-center gap-1 text-sm text-[#9CA3AF] hover:text-orange-500 transition-colors mb-3"
        >
          ← Back to listings
        </Link>
        <h1 className="text-2xl font-extrabold text-[#1A1A1A]">⚖️ Compare Messes</h1>
        <p className="text-[#6B7280] text-sm mt-1">
          Select up to 3 messes. Green highlights show the best value.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#9CA3AF]">Loading messes…</div>
      ) : (
        <>
          {/* Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {[0,1,2].map(i => (
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
            <div
              className="text-center py-20 rounded-3xl border-2 border-dashed border-[#E8E8E4]"
              style={{ background: "white" }}
            >
              <div
                className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl"
                style={{ background:"#FFF7ED" }}
              >
                ⚖️
              </div>
              <p className="font-extrabold text-[#1A1A1A] text-lg">
                Select at least 2 messes to compare
              </p>
              <p className="text-[#6B7280] text-sm mt-1">
                Search and pick messes from the boxes above
              </p>
            </div>
          ) : (
            <div
              className="bg-white rounded-3xl border border-[#E8E8E4] shadow-card overflow-hidden"
            >
              <table className="w-full table-fixed">
                <thead>
                  <tr style={{ borderBottom:"2px solid #F3F4F6" }}>
                    {/* Label column */}
                    <th
                      className="px-4 py-4 text-left text-xs font-extrabold uppercase tracking-wide w-32"
                      style={{ color:"#9CA3AF", borderRight:"1px solid #F3F4F6" }}
                    >
                      Category
                    </th>
                    {/* Mess columns */}
                    {activeMesses.map(mess => {
                      const photo = mess.photos?.[0] ||
                        `https://placehold.co/200x120/FFF7ED/EA580C?text=${encodeURIComponent(mess.title||mess.name||"Mess")}`;
                      return (
                        <th
                          key={mess.id}
                          className="px-4 py-4"
                          style={{ borderRight:"1px solid #F3F4F6" }}
                        >
                          <img
                            src={photo}
                            alt={mess.title||mess.name}
                            className="w-full object-cover rounded-2xl mb-2"
                            style={{ height:"100px" }}
                            onError={e => { e.target.src="https://placehold.co/200x120/FFF7ED/EA580C?text=Mess"; }}
                          />
                          <Link
                            to={`/mess/${mess.id}`}
                            className="text-sm font-extrabold hover:text-orange-500 transition-colors block truncate"
                            style={{ color:"#1A1A1A" }}
                          >
                            {mess.title||mess.name}
                          </Link>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      style={{
                        borderBottom: "1px solid #F3F4F6",
                        background:   rowIdx%2===0 ? "white" : "#FAFAF8",
                      }}
                    >
                      {/* Row label */}
                      <td
                        className="px-4 py-4 text-xs font-extrabold align-top w-32"
                        style={{ color:"#6B7280", borderRight:"1px solid #F3F4F6" }}
                      >
                        {row.label}
                      </td>

                      {/* Facilities row */}
                      {row.facilities && activeMesses.map(mess => {
                        const facs = [...new Set([...(mess.amenities||[]), ...(mess.facilities||[])])];
                        return (
                          <td
                            key={mess.id}
                            className="px-4 py-4 align-top"
                            style={{ borderRight:"1px solid #F3F4F6" }}
                          >
                            {ALL_FACILITIES.map(fId => {
                              const has = facs.includes(fId);
                              const f   = FACILITY_ICONS[fId];
                              return (
                                <div
                                  key={fId}
                                  className="flex items-center gap-1.5 text-xs mb-1"
                                  style={{ color: has ? "#059669" : "#D1D5DB" }}
                                >
                                  <span>{has ? "✅" : "❌"}</span>
                                  <span>{f.icon} {f.label}</span>
                                </div>
                              );
                            })}
                          </td>
                        );
                      })}

                      {/* Contact row */}
                      {row.contact && activeMesses.map(mess => (
                        <td
                          key={mess.id}
                          className="px-4 py-4 align-top text-center"
                          style={{ borderRight:"1px solid #F3F4F6" }}
                        >
                          <div className="flex flex-col gap-2">
                            {mess.contact_phone ? (
                              <>
                                <a
                                  href={`https://wa.me/880${mess.contact_phone.replace(/^0/,"")}?text=${WHATSAPP_MSG}`}
                                  target="_blank" rel="noreferrer"
                                  className="inline-flex items-center justify-center gap-1.5 text-white text-xs font-bold px-3 py-2 rounded-2xl transition-colors tap-target"
                                  style={{ background:"#22C55E" }}
                                >
                                  💬 WhatsApp
                                </a>
                                <a
                                  href={`tel:${mess.contact_phone}`}
                                  className="inline-flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-2xl transition-colors tap-target"
                                >
                                  📞 Call
                                </a>
                              </>
                            ) : (
                              <span className="text-xs" style={{ color:"#D1D5DB" }}>No contact</span>
                            )}
                            <Link
                              to={`/mess/${mess.id}`}
                              className="text-xs font-bold hover:underline"
                              style={{ color:"#F97316" }}
                            >
                              View →
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
                              <td
                                key={mess.id}
                                className="px-4 py-4 text-center text-sm align-top"
                                style={{ color:"#374151", borderRight:"1px solid #F3F4F6" }}
                              >
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
