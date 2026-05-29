// ─────────────────────────────────────────────────
//  PostMess.js  –  Form to post a new mess listing
// ─────────────────────────────────────────────────

import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
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

const CITIES = ["Dhaka","Chittagong","Rajshahi","Sylhet","Khulna","Mymensingh","Comilla","Barisal"];

export default function PostMess() {
  const { currentUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Form state — one object for all fields
  const [form, setForm] = useState({
    name:            "",
    city:            "Dhaka",
    area:            "",
    university:      "",
    rent:            "",
    seats_total:     "",
    seats_available: "",
    gender:          "male",
    contact_phone:   "",
    description:     "",
    facilities:      [],
    address:         "",
  });

  const [photos,     setPhotos]     = useState([]);   // File objects
  const [previews,   setPreviews]   = useState([]);   // Local preview URLs
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  // ── Handle text/select inputs ──────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  // ── Toggle facilities checkboxes ───────────────
  function toggleFacility(id) {
    setForm(prev => ({
      ...prev,
      facilities: prev.facilities.includes(id)
        ? prev.facilities.filter(f => f !== id)
        : [...prev.facilities, id],
    }));
  }

  // ── Handle photo selection ─────────────────────
  function handlePhotos(e) {
    const files = Array.from(e.target.files).slice(0, 5); // max 5 photos
    setPhotos(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  }

  // ── Upload one photo to Firebase Storage ───────
  async function uploadPhoto(file, messId, index) {
    const fileRef = ref(storage, `messes/${messId}/photo_${index}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }

  // ── Submit the form ────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Basic validation
    if (!form.name || !form.university || !form.rent || !form.contact_phone) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!currentUser) {
      setError("Please log in first to post a listing.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create the mess document first (we need the ID for photo paths)
      const docRef = await addDoc(collection(db, "messes"), {
        ...form,
        rent:            Number(form.rent),
        seats_total:     Number(form.seats_total),
        seats_available: Number(form.seats_available),
        photos:          [],          // will update after upload
        rating:          0,
        review_count:    0,
        featured:        false,
        owner_id:        currentUser.uid,
        owner_name:      currentUser.displayName,
        created_at:      serverTimestamp(),
      });

      // 2. Upload photos and get their download URLs
      let photoURLs = [];
      if (photos.length > 0) {
        photoURLs = await Promise.all(
          photos.map((file, i) => uploadPhoto(file, docRef.id, i))
        );
        // Update the document with photo URLs
        const { updateDoc, doc } = await import("firebase/firestore");
        await updateDoc(doc(db, "messes", docRef.id), { photos: photoURLs });
      }

      // 3. Done! Go to the new listing
      navigate(`/mess/${docRef.id}`);

    } catch (err) {
      console.error("Error posting mess:", err);
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  // ── If not logged in, show login prompt ────────
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Login required</h2>
        <p className="text-gray-500 mb-6">You need to be logged in to post a mess listing.</p>
        <button
          onClick={loginWithGoogle}
          className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
        >
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-3">
          ← Back to listings
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Post a Mess Listing</h1>
        <p className="text-gray-500 text-sm mt-1">Fill in the details below. Students across Bangladesh will be able to find your mess.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Basic Info ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">📋 Basic information</h2>

          <div>
            <label className="label">Mess name *</label>
            <input name="name" value={form.name} onChange={handleChange}
              placeholder="e.g. Al-Amin Mess, Noor Hostel..."
              className="input" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">City *</label>
              <select name="city" value={form.city} onChange={handleChange} className="input">
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Area / Thana</label>
              <input name="area" value={form.area} onChange={handleChange}
                placeholder="e.g. Bashundhara, Mirpur 10..."
                className="input" />
            </div>
          </div>

          <div>
            <label className="label">Nearest University *</label>
            <input name="university" value={form.university} onChange={handleChange}
              placeholder="e.g. NSU, BRAC, DU, BUET..."
              className="input" required />
          </div>

          <div>
            <label className="label">Full Address</label>
            <input name="address" value={form.address} onChange={handleChange}
              placeholder="House no, Road no, Block..."
              className="input" />
          </div>
        </div>

        {/* ── Rent & Availability ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">💰 Rent & seats</h2>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Monthly rent (৳) *</label>
              <input name="rent" value={form.rent} onChange={handleChange}
                type="number" placeholder="4500"
                className="input" required />
            </div>
            <div>
              <label className="label">Total seats</label>
              <input name="seats_total" value={form.seats_total} onChange={handleChange}
                type="number" placeholder="10"
                className="input" />
            </div>
            <div>
              <label className="label">Seats available</label>
              <input name="seats_available" value={form.seats_available} onChange={handleChange}
                type="number" placeholder="2"
                className="input" />
            </div>
          </div>

          <div>
            <label className="label">Gender policy</label>
            <div className="flex gap-3">
              {["male","female","mixed"].map(g => (
                <label key={g} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${form.gender === g ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-600"}`}>
                  <input type="radio" name="gender" value={g} checked={form.gender === g} onChange={handleChange} className="hidden" />
                  {g === "male" ? "👨 Male" : g === "female" ? "👩 Female" : "👥 Mixed"}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Facilities ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">🏠 Facilities</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FACILITIES_LIST.map(f => (
              <label key={f.id}
                className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm ${form.facilities.includes(f.id) ? "border-orange-500 bg-orange-50 text-orange-700 font-medium" : "border-gray-200 text-gray-600"}`}
              >
                <input type="checkbox" checked={form.facilities.includes(f.id)}
                  onChange={() => toggleFacility(f.id)} className="hidden" />
                <span>{f.icon}</span> {f.label}
              </label>
            ))}
          </div>
        </div>

        {/* ── Photos ── */}
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
              {previews.map((src, i) => (
                <img key={i} src={src} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
              ))}
            </div>
          )}
        </div>

        {/* ── Contact & Description ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">📞 Contact</h2>

          <div>
            <label className="label">WhatsApp / Phone number *</label>
            <input name="contact_phone" value={form.contact_phone} onChange={handleChange}
              placeholder="01XXXXXXXXX"
              className="input" required />
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              rows={3}
              placeholder="Any extra details about your mess, rules, nearby landmarks..."
              className="input resize-none" />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200">
            ⚠️ {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Posting... please wait ⏳" : "🏠 Post my mess listing"}
        </button>

      </form>

      {/* Inline Tailwind-compatible label/input styles */}
      <style>{`
        .label { display:block; font-size:0.75rem; font-weight:500; color:#6B7280; margin-bottom:0.25rem; }
        .input { width:100%; border:1.5px solid #E5E7EB; border-radius:0.75rem; padding:0.6rem 0.875rem; font-size:0.875rem; color:#111827; outline:none; transition:border-color 0.15s; }
        .input:focus { border-color:#F97316; }
      `}</style>
    </div>
  );
}
