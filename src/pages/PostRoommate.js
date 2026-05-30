// ─────────────────────────────────────────────────
//  PostRoommate.js  —  src/pages/PostRoommate.js
//  Finder-only page to post a roommate/sublet listing
//  Feature 2: Role-restricted (finder only)
//  Feature 4: 3-tier area autofill
// ─────────────────────────────────────────────────

import React, { useState } from "react";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const FACILITIES = [
  { id:"wifi",     icon:"📶", label:"WiFi" },
  { id:"ac",       icon:"❄️",  label:"AC" },
  { id:"meals",    icon:"🍱", label:"Meals" },
  { id:"bathroom", icon:"🚿", label:"Attached Bath" },
  { id:"parking",  icon:"🏍️", label:"Parking" },
  { id:"cctv",     icon:"📹", label:"CCTV" },
  { id:"laundry",  icon:"👕", label:"Laundry" },
  { id:"generator",icon:"⚡", label:"Generator" },
];

const LOCATIONS = {
  "Dhaka": {
    "Dhaka City": ["Mirpur","Farmgate","Bashundhara","Uttara","Mohammadpur","Dhanmondi","Badda","Mohakhali","Tejgaon","Rampura","Banasree","Khilgaon"],
    "Savar":      ["Jahangirnagar","Ashulia","Hemayetpur","Savar Bazar"],
    "Gazipur":    ["Board Bazar","Tongi","Chowrasta","Joydebpur"],
    "Narayanganj":["Siddhirganj","Fatullah","Rupganj"],
  },
  "Rajshahi": {
    "Rajshahi City":["Binodpur","Kazla","Talaimari","Motihar","Sopura","New Market","Upashahar","Rajpara","Boalia","Shaheb Bazar"],
    "Puthia":       ["Baneswar","Puthia Sadar"],
    "Natore":       ["Natore Sadar","Singra"],
  },
  "Mymensingh": {
    "Mymensingh City":["Sesh Mor","Kevalat Khan","Patgudam","Ganginarpar","Kewatkhali","Bypass","Chorpara","Notun Bazar"],
    "Netrokona":      ["Netrokona Sadar","Mohonganj"],
    "Jamalpur":       ["Jamalpur Sadar","Islampur"],
  },
  "Chittagong": {
    "Chittagong City":["Chawkbazar","GEC Circle","Halishahar","Nasirabad","Agrabad","Pahartali","Oxygen","Muradpur","Sholoshahar"],
    "Hathazari":      ["Hathazari Sadar","Fatehabad"],
    "Patiya":         ["Patiya Sadar","Karnaphuli"],
  },
  "Sylhet": {
    "Sylhet City":["Zindabazar","Subidbazar","Shibganj","Tilagarh","Akhalia","Ambarkhana","Majortila"],
    "Moulvibazar":["Moulvibazar Sadar","Sreemangal"],
    "Habiganj":   ["Habiganj Sadar","Chunarughat"],
  },
  "Khulna": {
    "Khulna City":["Sonadanga","Boyra","Khalishpur","Rupsha","Daulatpur"],
    "Jessore":    ["Jessore Sadar","Chaugachha"],
  },
  "Barisal": {
    "Barisal City":["Natullabad","Rupatali","Sadar Road","Band Road"],
    "Patuakhali": ["Patuakhali Sadar","Baufal"],
  },
  "Rangpur": {
    "Rangpur City":["Modern More","Jahaj Company More","Lalbag","Dhap","Shapla Chottor"],
    "Dinajpur":   ["Dinajpur Sadar","Birampur"],
    "Kurigram":   ["Kurigram Sadar","Nageshwari"],
  },
};

function parseGoogleMapsURL(url) {
  if (!url) return null;
  try {
    const a = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (a) return { lat:parseFloat(a[1]), lng:parseFloat(a[2]) };
    const b = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (b) return { lat:parseFloat(b[1]), lng:parseFloat(b[2]) };
  } catch {}
  return null;
}

export default function PostRoommate() {
  const { currentUser, userRole, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    listingType:"roommate", division:"", district:"", area:"", customArea:"",
    mapsURL:"", budget:"", gender:"male", personsPerRoom:"1",
    roomSize:"medium", facilities:[], message:"", contact:"",
  });
  const [photos,     setPhotos]     = useState([]);
  const [previews,   setPreviews]   = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [successId,  setSuccessId]  = useState(null);
  const [mapsOk,     setMapsOk]     = useState(false);

  const divisions = Object.keys(LOCATIONS);
  const districts = form.division ? Object.keys(LOCATIONS[form.division]) : [];
  const areas     = form.district ? LOCATIONS[form.division]?.[form.district] ?? [] : [];

  function set(field, val) { setForm(p => ({ ...p, [field]:val })); }

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "division") { setForm(p => ({...p, division:value, district:"", area:"", customArea:""})); return; }
    if (name === "district") { setForm(p => ({...p, district:value, area:"", customArea:""})); return; }
    if (name === "mapsURL")  {
      setForm(p => ({...p, mapsURL:value}));
      setMapsOk(!!parseGoogleMapsURL(value));
      return;
    }
    setForm(p => ({...p, [name]:value}));
  }

  function toggleFacility(id) {
    setForm(p => ({
      ...p,
      facilities: p.facilities.includes(id) ? p.facilities.filter(f=>f!==id) : [...p.facilities, id],
    }));
  }

  function handlePhotos(e) {
    const files = Array.from(e.target.files).slice(0,4);
    setPhotos(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  }

  async function uploadPhoto(file, postId, i) {
    const r = ref(storage, `roommates/${postId}/photo_${i}_${Date.now()}`);
    await uploadBytes(r, file);
    return getDownloadURL(r);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const finalArea = form.area === "other" ? form.customArea : form.area;
    if (!form.budget || !form.contact) { setError("Budget and phone number are required."); return; }
    if (!currentUser) { setError("Please log in first."); return; }
    setSubmitting(true);
    try {
      const coords = parseGoogleMapsURL(form.mapsURL);
      const docRef = await addDoc(collection(db, "roommate_requests"), {
        listingType:   form.listingType,
        division:      form.division,
        district:      form.district,
        city:          form.district,
        area:          finalArea,
        mapsURL:       form.mapsURL || null,
        coordinates:   coords || null,
        budget:        Number(form.budget),
        gender:        form.gender,
        personsPerRoom:form.personsPerRoom,
        roomSize:      form.roomSize,
        facilities:    form.facilities,
        message:       form.message,
        contact:       form.contact,
        photos:        [],
        views:         0,
        user_name:     currentUser?.displayName ?? "Anonymous",
        user_photo:    currentUser?.photoURL ?? null,
        user_id:       currentUser.uid,
        created_at:    serverTimestamp(),
      });
      if (photos.length > 0) {
        const urls = await Promise.all(photos.map((f,i) => uploadPhoto(f, docRef.id, i)));
        await updateDoc(doc(db, "roommate_requests", docRef.id), { photos: urls });
      }
      setSuccessId(docRef.id);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally { setSubmitting(false); }
  }

  // ── Access denied for owners ──────────────────
  if (currentUser && userRole === "owner") {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">🚫</div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Access Denied</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Only <strong>Finders</strong> can post roommate requests.<br/>
          As an owner, use <strong>Post a Mess</strong> to list your property.
        </p>
        <Link to="/post" className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Post a Mess instead →
        </Link>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Login required</h2>
        <p className="text-gray-500 mb-6">Please log in to post a roommate request.</p>
        <button onClick={loginWithGoogle} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Login with Google
        </button>
      </div>
    );
  }

  if (successId) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Posted successfully!</h2>
        <p className="text-gray-500 mb-8">Your roommate listing is live.</p>
        <div className="flex flex-col gap-3">
          <button onClick={() => navigate(`/roommate/${successId}`)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
            View my listing →
          </button>
          <button onClick={() => navigate("/dashboard")}
            className="border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 px-6 py-3 rounded-xl font-medium transition-colors hover:bg-gray-50 dark:hover:bg-slate-700">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const inputCls = "w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors";
  const labelCls = "text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1";

  return (
    <div className="max-w-2xl mx-auto pb-28 md:pb-8">
      <div className="mb-6">
        <Link to="/roommates" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-3">← Back to Roommate Board</Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Post a Roommate Listing</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Find the perfect roommate or post a sublet near you.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Listing type */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 space-y-4 transition-colors">
          <h2 className="font-semibold text-gray-800 dark:text-white">📋 Listing type</h2>
          <div className="flex gap-3">
            {[{val:"roommate",label:"🤝 Roommate Wanted"},{val:"sublet",label:"🏠 Sublet"}].map(opt => (
              <label key={opt.val} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium
                ${form.listingType===opt.val?"border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400":"border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300"}`}>
                <input type="radio" value={opt.val} checked={form.listingType===opt.val} onChange={()=>set("listingType",opt.val)} className="hidden" />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Location — 3-tier */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 space-y-4 transition-colors">
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-white">📍 Location</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select your division → district → area for accurate results.</p>
          </div>
          <div>
            <label className={labelCls}>Division</label>
            <select name="division" value={form.division} onChange={handleChange} className={inputCls}>
              <option value="">Select Division…</option>
              {divisions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>District / City</label>
            <select name="district" value={form.district} onChange={handleChange} disabled={!form.division} className={inputCls}>
              <option value="">Select District…</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Area / Neighbourhood</label>
            <select name="area" value={form.area} onChange={handleChange} disabled={!form.district} className={inputCls}>
              <option value="">Select Area…</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
              <option value="other">Other (type manually)</option>
            </select>
          </div>
          {form.area === "other" && (
            <div>
              <label className={labelCls}>Your area name</label>
              <input name="customArea" value={form.customArea} onChange={handleChange}
                placeholder="e.g. Kazla Para, Binodpur Mor…" className={inputCls} autoFocus />
            </div>
          )}
          <div>
            <label className={labelCls}>Google Maps link <span className="text-gray-300 font-normal">(optional)</span></label>
            <input name="mapsURL" value={form.mapsURL} onChange={handleChange}
              placeholder="Paste Google Maps share link…" className={inputCls} />
            {mapsOk && <p className="text-xs text-green-600 mt-1">✅ Location coordinates found</p>}
            <p className="text-xs text-gray-400 mt-1">📱 Google Maps → Share → Copy link</p>
          </div>
        </div>

        {/* Budget, gender, persons, room size */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 space-y-4 transition-colors">
          <h2 className="font-semibold text-gray-800 dark:text-white">💰 Preferences</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Max budget (৳/month) *</label>
              <input name="budget" type="number" value={form.budget} onChange={handleChange}
                placeholder="5000" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Gender *</label>
              <select name="gender" value={form.gender} onChange={handleChange} className={inputCls}>
                <option value="male">👨 Male</option>
                <option value="female">👩 Female</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Persons per room</label>
              <div className="flex gap-1.5">
                {["1","2","3","4","5"].map(n => (
                  <button key={n} type="button" onClick={()=>set("personsPerRoom",n)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all
                      ${form.personsPerRoom===n?"border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600":"border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-orange-300"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Room size</label>
              <div className="flex gap-1.5">
                {["small","medium","large"].map(s => (
                  <button key={s} type="button" onClick={()=>set("roomSize",s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all capitalize
                      ${form.roomSize===s?"border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600":"border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-orange-300"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Facilities */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 transition-colors">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-3">🏠 Facilities available</h2>
          <div className="grid grid-cols-4 gap-2">
            {FACILITIES.map(f => (
              <label key={f.id} className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 cursor-pointer text-center transition-all
                ${form.facilities.includes(f.id)?"border-orange-500 bg-orange-50 dark:bg-orange-900/20":"border-gray-200 dark:border-slate-600 hover:border-orange-300"}`}>
                <input type="checkbox" checked={form.facilities.includes(f.id)} onChange={()=>toggleFacility(f.id)} className="hidden" />
                <span className="text-xl">{f.icon}</span>
                <span className={`text-[10px] font-medium ${form.facilities.includes(f.id)?"text-orange-600":"text-gray-500 dark:text-gray-400"}`}>{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 transition-colors">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-1">📸 Room photos <span className="text-gray-400 font-normal text-sm">(optional, up to 4)</span></h2>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-5 cursor-pointer hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all mt-3">
            <span className="text-2xl mb-1">📷</span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Click to upload</span>
            <input type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
          </label>
          {previews.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {previews.map((src,i) => <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-slate-600" />)}
            </div>
          )}
        </div>

        {/* Message + Contact */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 space-y-4 transition-colors">
          <h2 className="font-semibold text-gray-800 dark:text-white">📞 About you</h2>
          <div>
            <label className={labelCls}>About yourself / message</label>
            <textarea name="message" value={form.message} onChange={handleChange} rows={3}
              placeholder="About yourself, preferences, move-in date, any rules…"
              className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className={labelCls}>WhatsApp / Phone number *</label>
            <input name="contact" value={form.contact} onChange={handleChange}
              placeholder="01XXXXXXXXX" required className={inputCls} />
          </div>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200 dark:border-red-800">⚠️ {error}</div>}

        <button type="submit" disabled={submitting}
          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
          {submitting ? "Uploading & posting… ⏳" : "🤝 Post my listing"}
        </button>
      </form>
    </div>
  );
}
