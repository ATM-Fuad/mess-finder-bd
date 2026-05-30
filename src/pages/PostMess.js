// ─────────────────────────────────────────────────
//  PostMess.js
//  Fix 1: Photos save correctly to Firestore
//  Fix 2: Success screen → redirect to mess detail
//  Fix 3: Remove "mixed" gender option
// ─────────────────────────────────────────────────

import React, { useState } from "react";
import { collection, addDoc, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
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

function parseGoogleMapsURL(url) {
  if (!url) return null;
  try {
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    const dMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dMatch) return { lat: parseFloat(dMatch[1]), lng: parseFloat(dMatch[2]) };
    return null;
  } catch { return null; }
}

export default function PostMess() {
  const { currentUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name:"", division:"", district:"", area:"", customArea:"",
    mapsURL:"", rent:"", seats_total:"", seats_available:"",
    gender:"male", contact_phone:"", description:"", facilities:[], address:"",
  });

  const [mapsCoords, setMapsCoords] = useState(null);
  const [mapsError,  setMapsError]  = useState("");
  const [photos,     setPhotos]     = useState([]);
  const [previews,   setPreviews]   = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [successId,  setSuccessId]  = useState(null); // ← Fix 2: success state

  const divisions = Object.keys(BANGLADESH_LOCATIONS);
  const districts = form.division ? Object.keys(BANGLADESH_LOCATIONS[form.division]) : [];
  const areas     = form.district ? BANGLADESH_LOCATIONS[form.division][form.district] : [];

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "division") { setForm(p => ({ ...p, division:value, district:"", area:"", customArea:"" })); return; }
    if (name === "district") { setForm(p => ({ ...p, district:value, area:"", customArea:"" })); return; }
    if (name === "mapsURL") {
      setForm(p => ({ ...p, mapsURL:value }));
      if (!value) { setMapsCoords(null); setMapsError(""); return; }
      const c = parseGoogleMapsURL(value);
      if (c) { setMapsCoords(c); setMapsError(""); }
      else if (value.includes("goo.gl")||value.includes("maps.app")) { setMapsCoords(null); setMapsError("Short URL — will be saved but can't preview coordinates."); }
      else if (value.length > 15) { setMapsCoords(null); setMapsError("Paste a full Google Maps share link for best results."); }
      return;
    }
    setForm(p => ({ ...p, [name]:value }));
  }

  function toggleFacility(id) {
    setForm(p => ({
      ...p,
      facilities: p.facilities.includes(id) ? p.facilities.filter(f=>f!==id) : [...p.facilities, id],
    }));
  }

  function handlePhotos(e) {
    const files = Array.from(e.target.files).slice(0,5);
    setPhotos(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  }

  async function uploadPhoto(file, messId, index) {
    const fileRef = ref(storage, `messes/${messId}/photo_${index}_${Date.now()}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const finalArea = form.area === "other" ? form.customArea : form.area;
    if (!form.name||!form.division||!form.district||!form.rent||!form.contact_phone) {
      setError("Please fill in: Mess name, Division, District, Rent, and Phone."); return;
    }
    if (!currentUser) { setError("Please log in first."); return; }
    setSubmitting(true);
    try {
      const seatsAvailable = Number(form.seats_available)||0;
      const coords = parseGoogleMapsURL(form.mapsURL);

      // Create document first (need ID for photo paths)
      const docRef = await addDoc(collection(db, "messes"), {
        title:form.name, name:form.name,
        division:form.division, city:form.district, district:form.district,
        area:finalArea, address:form.address,
        mapsURL:form.mapsURL||null, coordinates:coords||null,
        rent:Number(form.rent),
        seats_total:Number(form.seats_total)||0,
        seats_available:seatsAvailable, availableSeats:seatsAvailable,
        available:seatsAvailable>0, views:0,
        gender:form.gender,
        description:form.description, contact_phone:form.contact_phone,
        facilities:form.facilities, amenities:form.facilities,
        photos:[], // placeholder — updated below
        rating:0, review_count:0, featured:false,
        ownerId:currentUser.uid, owner_id:currentUser.uid,
        owner_name:currentUser.displayName,
        created_at:serverTimestamp(),
      });

      // ── Fix 1: Upload photos then update the doc with real URLs ──
      if (photos.length > 0) {
        const photoURLs = await Promise.all(
          photos.map((file, i) => uploadPhoto(file, docRef.id, i))
        );
        await updateDoc(doc(db, "messes", docRef.id), { photos: photoURLs });
      }

      setSuccessId(docRef.id); // ← Fix 2: show success screen
    } catch (err) {
      console.error("Error posting mess:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Fix 2: Success screen ─────────────────────
  if (successId) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Mess posted successfully!</h2>
        <p className="text-gray-500 mb-8">Your listing is now live and visible to students across Bangladesh.</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(`/mess/${successId}`)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            View my listing →
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-gray-500 hover:text-gray-700 px-6 py-3 rounded-xl font-medium transition-colors border border-gray-200"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Login required</h2>
        <p className="text-gray-500 mb-6">You need to be logged in to post a mess listing.</p>
        <button onClick={loginWithGoogle} className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-28 md:pb-8">
      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-3">← Back to listings</Link>
        <h1 className="text-2xl font-bold text-gray-900">Post a Mess Listing</h1>
        <p className="text-gray-500 text-sm mt-1">Fill in the details below. Anyone looking for a mess in your area will find it here.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">📋 Basic information</h2>
          <div>
            <label className="label">Mess name *</label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Al-Amin Mess, Noor Hostel…" className="input" required />
          </div>
          <div>
            <label className="label">Full Address</label>
            <input name="address" value={form.address} onChange={handleChange} placeholder="House no, Road no, Block…" className="input" />
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-gray-800">📍 Location</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select your division and district — then pick the area.</p>
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
            <select name="district" value={form.district} onChange={handleChange} disabled={!form.division} className="input" required>
              <option value="">Select District…</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Area / Neighbourhood</label>
            <select name="area" value={form.area} onChange={handleChange} disabled={!form.district} className="input">
              <option value="">Select Area…</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
              <option value="other">Other (type manually)</option>
            </select>
          </div>
          {form.area === "other" && (
            <div>
              <label className="label">Your area name</label>
              <input name="customArea" value={form.customArea} onChange={handleChange} placeholder="e.g. Kazla Para, Binodpur Mor…" className="input" autoFocus />
            </div>
          )}
          <div>
            <label className="label">Google Maps link <span className="text-gray-300 font-normal ml-1">(optional)</span></label>
            <input name="mapsURL" value={form.mapsURL} onChange={handleChange} placeholder="Paste Google Maps share link here…" className="input" />
            <p className="text-xs text-gray-400 mt-1.5">📱 Google Maps → find your mess → tap <strong>Share</strong> → <strong>Copy link</strong></p>
            {mapsCoords && (
              <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <span className="text-green-500 text-sm">✅</span>
                <span className="text-xs text-green-700 font-medium">Location found: {mapsCoords.lat.toFixed(5)}, {mapsCoords.lng.toFixed(5)}</span>
              </div>
            )}
            {mapsError && (
              <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <span className="text-amber-500 text-sm">⚠️</span>
                <span className="text-xs text-amber-700">{mapsError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Rent & Seats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">💰 Rent & seats</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Monthly rent (৳) *</label>
              <input name="rent" value={form.rent} onChange={handleChange} type="number" placeholder="4500" className="input" required />
            </div>
            <div>
              <label className="label">Total seats</label>
              <input name="seats_total" value={form.seats_total} onChange={handleChange} type="number" placeholder="10" className="input" />
            </div>
            <div>
              <label className="label">Seats available</label>
              <input name="seats_available" value={form.seats_available} onChange={handleChange} type="number" placeholder="2" className="input" />
            </div>
          </div>

          {/* Fix 3: Male / Female only — no Mixed */}
          <div>
            <label className="label">Gender policy</label>
            <div className="flex gap-3">
              {["male","female"].map(g => (
                <label key={g} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${form.gender===g ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-600"}`}>
                  <input type="radio" name="gender" value={g} checked={form.gender===g} onChange={handleChange} className="hidden" />
                  {g==="male" ? "👨 Male" : "👩 Female"}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Facilities */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">🏠 Facilities</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FACILITIES_LIST.map(f => (
              <label key={f.id} className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm
                ${form.facilities.includes(f.id) ? "border-orange-500 bg-orange-50 text-orange-700 font-medium" : "border-gray-200 text-gray-600"}`}>
                <input type="checkbox" checked={form.facilities.includes(f.id)} onChange={() => toggleFacility(f.id)} className="hidden" />
                <span>{f.icon}</span> {f.label}
              </label>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-1">📸 Photos (up to 5)</h2>
          <p className="text-xs text-gray-400 mb-3">Messes with photos get 4× more inquiries</p>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-6 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all">
            <span className="text-3xl mb-2">📷</span>
            <span className="text-sm font-medium text-gray-600">Click to upload photos</span>
            <span className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB each</span>
            <input type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
          </label>
          {previews.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {previews.map((src,i) => (
                <img key={i} src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
              ))}
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">📞 Contact</h2>
          <div>
            <label className="label">WhatsApp / Phone number *</label>
            <input name="contact_phone" value={form.contact_phone} onChange={handleChange} placeholder="01XXXXXXXXX" className="input" required />
            <p className="text-xs text-gray-400 mt-1">This number will show as a direct call button on your listing.</p>
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3}
              placeholder="Any extra details about your mess, rules, nearby landmarks…" className="input resize-none" />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">⚠️ {error}</div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
          {submitting ? "Uploading photos & posting… ⏳" : "🏠 Post my mess listing"}
        </button>
      </form>

      <style>{`
        .label{display:block;font-size:.75rem;font-weight:500;color:#6B7280;margin-bottom:.25rem}
        .input{width:100%;border:1.5px solid #E5E7EB;border-radius:.75rem;padding:.6rem .875rem;font-size:.875rem;color:#111827;outline:none;transition:border-color .15s}
        .input:focus{border-color:#F97316}
      `}</style>
    </div>
  );
}
