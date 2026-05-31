// ─────────────────────────────────────────────────
//  PostMess.js — photos removed (no Storage needed)
// ─────────────────────────────────────────────────

import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const FACILITIES_LIST = [
  { id:"wifi",      icon:"📶", label:"WiFi" },
  { id:"generator", icon:"⚡", label:"Generator" },
  { id:"ac",        icon:"❄️",  label:"AC" },
  { id:"meals",     icon:"🍱", label:"Meals Included" },
  { id:"bathroom",  icon:"🚿", label:"Attached Bathroom" },
  { id:"cctv",      icon:"📹", label:"CCTV" },
  { id:"parking",   icon:"🏍️", label:"Parking" },
  { id:"laundry",   icon:"👕", label:"Laundry" },
];

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

function parseGoogleMapsURL(url) {
  if (!url) return null;
  try {
    const a = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (a) return { lat: parseFloat(a[1]), lng: parseFloat(a[2]) };
    const b = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (b) return { lat: parseFloat(b[1]), lng: parseFloat(b[2]) };
  } catch {}
  return null;
}

function Toast({ message }) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] bg-green-500 text-white px-6 py-3 rounded-2xl shadow-xl font-semibold text-sm flex items-center gap-2">
      ✅ {message}
    </div>
  );
}

export default function PostMess() {
  const { currentUser, userRole, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:"", division:"", district:"", area:"", customArea:"",
    mapsURL:"", rent:"", seats_total:"", seats_available:"",
    gender:"male", contact_phone:"", description:"", facilities:[], address:"",
  });

  const [mapsCoords, setMapsCoords] = useState(null);
  const [mapsError,  setMapsError]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [toast,      setToast]      = useState("");

  const divisions = Object.keys(LOCATIONS);
  const districts = form.division ? Object.keys(LOCATIONS[form.division] ?? {}) : [];
  const areas     = form.district ? (LOCATIONS[form.division]?.[form.district] ?? []) : [];

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "division") { setForm(p => ({...p, division:value, district:"", area:"", customArea:""})); return; }
    if (name === "district") { setForm(p => ({...p, district:value, area:"", customArea:""})); return; }
    if (name === "mapsURL") {
      setForm(p => ({...p, mapsURL:value}));
      if (!value) { setMapsCoords(null); setMapsError(""); return; }
      const c = parseGoogleMapsURL(value);
      if (c) { setMapsCoords(c); setMapsError(""); }
      else if (value.includes("goo.gl") || value.includes("maps.app")) {
        setMapsCoords(null); setMapsError("Short URL — coordinates can't be previewed.");
      } else if (value.length > 15) {
        setMapsCoords(null); setMapsError("Paste a full Google Maps share link for best results.");
      }
      return;
    }
    setForm(p => ({...p, [name]:value}));
  }

  function toggleFacility(id) {
    setForm(p => ({
      ...p,
      facilities: p.facilities.includes(id)
        ? p.facilities.filter(f => f !== id)
        : [...p.facilities, id],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const finalArea = form.area === "other" ? form.customArea?.trim() : form.area;

    if (!form.name?.trim() || !form.division || !form.district || !form.rent || !form.contact_phone?.trim()) {
      setError("Please fill in: Mess name, Division, District, Rent, and Phone.");
      return;
    }
    if (!currentUser) { setError("Please log in first."); return; }

    setSubmitting(true);

    try {
      const seatsAvailable = Number(form.seats_available) || 0;
      const coords = parseGoogleMapsURL(form.mapsURL);

      await addDoc(collection(db, "messes"), {
        title:           form.name.trim(),
        name:            form.name.trim(),
        division:        form.division,
        city:            form.district,
        district:        form.district,
        area:            finalArea ?? "",
        address:         form.address?.trim() ?? "",
        mapsURL:         form.mapsURL || null,
        coordinates:     coords || null,
        rent:            Number(form.rent),
        seats_total:     Number(form.seats_total) || 0,
        seats_available: seatsAvailable,
        availableSeats:  seatsAvailable,
        available:       seatsAvailable > 0,
        views:           0,
        whatsappClicks:  0,
        gender:          form.gender,
        description:     form.description?.trim() ?? "",
        contact_phone:   form.contact_phone.trim(),
        facilities:      form.facilities,
        amenities:       form.facilities,
        photos:          [],
        rating:          0,
        review_count:    0,
        featured:        false,
        ownerId:         currentUser.uid,
        owner_id:        currentUser.uid,
        owner_name:      currentUser?.displayName ?? "Owner",
        created_at:      serverTimestamp(),
      });

      setSubmitting(false);
      setToast("Ad Posted Successfully! 🎉");
      setTimeout(() => navigate("/dashboard"), 1500);

    } catch (err) {
      console.error("PostMess submit error:", err);
      setError("Something went wrong. Please try again. (" + (err?.message ?? "unknown error") + ")");
      setSubmitting(false);
    }
  }

  // ── Access guards ──
  if (currentUser && userRole === "finder") {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">🚫</div>
        <h2 className="text-xl font-bold text-gray-800  mb-2">Access Denied</h2>
        <p className="text-gray-500  mb-6">
          Only <strong>Owners</strong> can post mess listings.<br/>
          As a finder, use <strong>Post Roommate</strong> instead.
        </p>
        <Link to="/post-roommate" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Post Roommate instead →
        </Link>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-xl font-bold text-gray-800  mb-2">Login required</h2>
        <p className="text-gray-500  mb-6">You need to be logged in to post a mess listing.</p>
        <button onClick={loginWithGoogle} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-28 md:pb-8">
      {toast && <Toast message={toast} />}

      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-3">← Back to listings</Link>
        <h1 className="text-2xl font-bold text-gray-900 ">Post a Mess Listing</h1>
        <p className="text-gray-500  text-sm mt-1">Fill in the details — anyone looking for a mess in your area will find it here.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic Info */}
        <section className="bg-white  rounded-2xl border border-gray-100  p-5 space-y-4 transition-colors">
          <h2 className="font-semibold text-gray-800 ">📋 Basic information</h2>
          <div>
            <label className="label">Mess name *</label>
            <input name="name" value={form.name} onChange={handleChange}
              placeholder="e.g. Al-Amin Mess, Noor Hostel…" className="input" required />
          </div>
          <div>
            <label className="label">Full Address</label>
            <input name="address" value={form.address} onChange={handleChange}
              placeholder="House no, Road no, Block…" className="input" />
          </div>
        </section>

        {/* Location */}
        <section className="bg-white  rounded-2xl border border-gray-100  p-5 space-y-4 transition-colors">
          <div>
            <h2 className="font-semibold text-gray-800 ">📍 Location</h2>
            <p className="text-xs text-gray-400 mt-0.5">Division → District → Area</p>
          </div>
          <div>
            <label className="label">Division *</label>
            <select name="division" value={form.division} onChange={handleChange} className="input" required>
              <option value="">Select Division…</option>
              {divisions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">District / City *</label>
            <select name="district" value={form.district} onChange={handleChange}
              disabled={!form.division} className="input" required>
              <option value="">Select District…</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Area / Neighbourhood</label>
            <select name="area" value={form.area} onChange={handleChange}
              disabled={!form.district} className="input">
              <option value="">Select Area…</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
              <option value="other">Other (type manually)</option>
            </select>
          </div>
          {form.area === "other" && (
            <div>
              <label className="label">Your area name</label>
              <input name="customArea" value={form.customArea} onChange={handleChange}
                placeholder="e.g. Kazla Para, Binodpur Mor…" className="input" autoFocus />
            </div>
          )}
          <div>
            <label className="label">Google Maps link <span className="text-gray-300 font-normal ml-1">(optional)</span></label>
            <input name="mapsURL" value={form.mapsURL} onChange={handleChange}
              placeholder="Paste Google Maps share link…" className="input" />
            <p className="text-xs text-gray-400 mt-1.5">📱 Google Maps → Share → Copy link → paste here</p>
            {mapsCoords && (
              <div className="mt-2 flex items-center gap-2 bg-green-50  border border-green-200  rounded-xl px-3 py-2">
                <span className="text-green-500 text-sm">✅</span>
                <span className="text-xs text-green-700  font-medium">
                  Location found: {mapsCoords.lat?.toFixed(5)}, {mapsCoords.lng?.toFixed(5)}
                </span>
              </div>
            )}
            {mapsError && (
              <div className="mt-2 flex items-start gap-2 bg-amber-50  border border-amber-200  rounded-xl px-3 py-2">
                <span className="text-amber-500 text-sm">⚠️</span>
                <span className="text-xs text-amber-700 ">{mapsError}</span>
              </div>
            )}
          </div>
        </section>

        {/* Rent & Seats */}
        <section className="bg-white  rounded-2xl border border-gray-100  p-5 space-y-4 transition-colors">
          <h2 className="font-semibold text-gray-800 ">💰 Rent & seats</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Monthly rent (৳) *</label>
              <input name="rent" value={form.rent} onChange={handleChange}
                type="number" placeholder="4500" className="input" required />
            </div>
            <div>
              <label className="label">Total seats</label>
              <input name="seats_total" value={form.seats_total} onChange={handleChange}
                type="number" placeholder="10" className="input" />
            </div>
            <div>
              <label className="label">Seats available</label>
              <input name="seats_available" value={form.seats_available} onChange={handleChange}
                type="number" placeholder="2" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Gender policy</label>
            <div className="flex gap-3">
              {["male","female"].map(g => (
                <label key={g} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${form.gender===g?"border-orange-500 bg-orange-50  text-orange-700":"border-gray-200  text-gray-600 "}`}>
                  <input type="radio" name="gender" value={g} checked={form.gender===g} onChange={handleChange} className="hidden" />
                  {g==="male" ? "👨 Male" : "👩 Female"}
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* Facilities */}
        <section className="bg-white  rounded-2xl border border-gray-100  p-5 transition-colors">
          <h2 className="font-semibold text-gray-800  mb-3">🏠 Facilities</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FACILITIES_LIST.map(f => (
              <label key={f.id} className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm
                ${form.facilities.includes(f.id)
                  ? "border-orange-500 bg-orange-50  text-orange-700  font-medium"
                  : "border-gray-200  text-gray-600 "}`}>
                <input type="checkbox" checked={form.facilities.includes(f.id)}
                  onChange={() => toggleFacility(f.id)} className="hidden" />
                <span>{f.icon}</span> {f.label}
              </label>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white  rounded-2xl border border-gray-100  p-5 space-y-4 transition-colors">
          <h2 className="font-semibold text-gray-800 ">📞 Contact</h2>
          <div>
            <label className="label">WhatsApp / Phone number *</label>
            <input name="contact_phone" value={form.contact_phone} onChange={handleChange}
              placeholder="01XXXXXXXXX" className="input" required />
            <p className="text-xs text-gray-400 mt-1">This number shows as a direct call button on your listing.</p>
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              rows={3} placeholder="Any extra details, rules, nearby landmarks…"
              className="input resize-none" />
          </div>
        </section>

        {error && (
          <div className="bg-red-50  text-red-600  text-sm px-4 py-3 rounded-xl border border-red-200 ">
            ⚠️ {error}
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
          {submitting ? "Posting… ⏳" : "🏠 Post my mess listing"}
        </button>
      </form>

      <style>{`
        .label { display:block; font-size:.75rem; font-weight:500; color:#6B7280; margin-bottom:.375rem; }
        .input { width:100%; border:1.5px solid #E5E7EB; border-radius:.75rem; padding:.6rem .875rem; font-size:.875rem; color:#111827; background:white; outline:none; transition:border-color .15s; }
        .input:focus { border-color:#F97316; }
        .dark .input { background:#1e293b; border-color:#475569; color:#f1f5f9; }
        .dark .label { color:#94a3b8; }
      `}</style>
    </div>
  );
}
