// ─────────────────────────────────────────────────
//  RoommateBoard.js — Full rebuild
//  • No university field — location (area + maps URL)
//  • Listing type: Roommate Wanted / Sublet
//  • Facilities checkboxes
//  • Photo upload (optional, carousel on card)
//  • Person per room (1-5)
//  • Room size (Small/Medium/Large)
//  • Cards with photo carousel
//  • Click card → detail page (modal)
//  • Filters: type, gender, area, budget
//  • Direct Call + WhatsApp on card
// ─────────────────────────────────────────────────

import React, { useEffect, useState, useRef } from "react";
import {
  collection, getDocs, addDoc, serverTimestamp,
  orderBy, query, doc, updateDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

// ── Constants ─────────────────────────────────────
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

const FACILITY_MAP = Object.fromEntries(FACILITIES.map(f => [f.id, f]));

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

// ── Photo Carousel (same as MessCard) ─────────────
function PhotoCarousel({ photos, name, height = "200px" }) {
  const [current, setCurrent] = useState(0);
  const touchStart = useRef(null);
  const placeholder = `https://placehold.co/400x200/EFF6FF/3B82F6?text=${encodeURIComponent(name||"Room")}`;
  const imgs = photos?.length > 0 ? photos : [placeholder];
  const total = imgs.length;

  function prev(e) { e.preventDefault(); e.stopPropagation(); setCurrent(c=>(c-1+total)%total); }
  function next(e) { e.preventDefault(); e.stopPropagation(); setCurrent(c=>(c+1)%total); }
  function onTouchStart(e) { touchStart.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? setCurrent(c=>(c+1)%total) : setCurrent(c=>(c-1+total)%total);
    touchStart.current = null;
  }

  return (
    <div className="relative overflow-hidden bg-blue-50 w-full" style={{ height }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <img src={imgs[current]} alt={name}
        className="w-full h-full object-cover transition-opacity duration-200"
        onError={e => { e.target.src = placeholder; }} />
      {total > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 text-white rounded-full flex items-center justify-center text-xs z-10">‹</button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 text-white rounded-full flex items-center justify-center text-xs z-10">›</button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {imgs.map((_,i) => (
              <div key={i} className={`rounded-full transition-all ${i===current?"w-4 h-1.5 bg-white":"w-1.5 h-1.5 bg-white/50"}`} />
            ))}
          </div>
          <div className="absolute top-2 left-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full z-10">{current+1}/{total}</div>
        </>
      )}
    </div>
  );
}

// ── Roommate Detail Modal ─────────────────────────
function RoommateDetailModal({ post, onClose }) {
  if (!post) return null;
  const facilities = post.facilities || [];

  function handleCall(e) {
    e.stopPropagation();
    if (!post.contact) return;
    window.location.href = `tel:${post.contact}`;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm px-0 sm:px-4"
      onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Photo carousel */}
        <PhotoCarousel photos={post.photos} name={post.user_name} height="240px" />

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-black/40 text-white rounded-full flex items-center justify-center text-sm z-20">✕</button>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <img src={post.user_photo || `https://ui-avatars.com/api/?name=${post.user_name}`}
              alt={post.user_name} className="w-12 h-12 rounded-full border-2 border-blue-100" />
            <div>
              <h2 className="font-bold text-gray-900 text-lg">{post.user_name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${post.gender==="female"?"bg-pink-100 text-pink-700":"bg-blue-100 text-blue-700"}`}>
                  {post.gender==="female"?"👩 Female":"👨 Male"}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${post.listingType==="sublet"?"bg-purple-100 text-purple-700":"bg-green-100 text-green-700"}`}>
                  {post.listingType==="sublet"?"🏠 Sublet":"🤝 Roommate Wanted"}
                </span>
              </div>
            </div>
          </div>

          {/* Key details grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-orange-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 mb-0.5">Budget</p>
              <p className="font-bold text-orange-500">৳{Number(post.budget||0).toLocaleString()}<span className="text-xs font-normal text-gray-400">/mo</span></p>
            </div>
            {post.area && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">Area</p>
                <p className="font-semibold text-gray-800 text-sm">📍 {post.area}</p>
              </div>
            )}
            {post.personsPerRoom && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">Persons / Room</p>
                <p className="font-semibold text-gray-800">👤 {post.personsPerRoom}</p>
              </div>
            )}
            {post.roomSize && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">Room Size</p>
                <p className="font-semibold text-gray-800 capitalize">📐 {post.roomSize}</p>
              </div>
            )}
          </div>

          {/* Facilities */}
          {facilities.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Facilities</p>
              <div className="flex flex-wrap gap-2">
                {facilities.map(f => (
                  <span key={f} className="text-xs bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                    {FACILITY_MAP[f]?.icon} {FACILITY_MAP[f]?.label || f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          {post.message && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-xs font-medium text-gray-500 mb-1">About</p>
              <p className="text-sm text-gray-700 leading-relaxed">{post.message}</p>
            </div>
          )}

          {/* Maps link */}
          {post.mapsURL && (
            <a href={post.mapsURL} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-sm text-orange-500 font-medium mb-4 hover:underline">
              🗺️ Open location in Google Maps
            </a>
          )}

          {/* CTA buttons */}
          <div className="flex gap-3">
            <a href={`https://wa.me/880${post.contact?.replace(/^0/,"")}`}
              target="_blank" rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
              💬 WhatsApp
            </a>
            {post.contact && (
              <button onClick={handleCall}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                📞 Call
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Roommate Card ─────────────────────────────────
function RoommateCard({ post, onClick }) {
  const facilities = (post.facilities || []).slice(0, 3);

  function handleCall(e) {
    e.stopPropagation();
    if (post.contact) window.location.href = `tel:${post.contact}`;
  }
  function handleWA(e) {
    e.stopPropagation();
    window.open(`https://wa.me/880${post.contact?.replace(/^0/,"")}`, "_blank");
  }

  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col">

      {/* Photo carousel */}
      <div className="relative">
        <PhotoCarousel photos={post.photos} name={post.user_name} height="200px" />

        {/* Type badge */}
        <div className={`absolute top-3 left-3 z-10 text-xs font-semibold px-2 py-1 rounded-full
          ${post.listingType==="sublet"?"bg-purple-500 text-white":"bg-green-500 text-white"}`}>
          {post.listingType==="sublet"?"🏠 Sublet":"🤝 Roommate"}
        </div>

        {/* Gender badge */}
        <div className={`absolute top-3 right-3 z-10 text-xs font-semibold px-2 py-1 rounded-full
          ${post.gender==="female"?"bg-pink-100 text-pink-700":"bg-blue-100 text-blue-700"}`}>
          {post.gender==="female"?"👩 Female":"👨 Male"}
        </div>

        {/* Quick action buttons */}
        <div className="absolute bottom-3 left-3 right-3 flex justify-between z-10">
          {post.contact && (
            <button onClick={handleCall}
              className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow transition-colors">
              📞 Call
            </button>
          )}
          {post.contact && (
            <button onClick={handleWA}
              className="flex items-center gap-1 bg-white/90 text-green-600 text-xs font-semibold px-3 py-1.5 rounded-full shadow transition-colors">
              💬 WhatsApp
            </button>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2">
          <img src={post.user_photo || `https://ui-avatars.com/api/?name=${post.user_name}`}
            alt={post.user_name} className="w-7 h-7 rounded-full shrink-0" />
          <span className="font-semibold text-gray-900 text-sm truncate">{post.user_name}</span>
        </div>

        {post.area && (
          <p className="text-xs text-gray-500 flex items-center gap-1">📍 {post.area}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full font-medium">
            💰 ৳{Number(post.budget||0).toLocaleString()}/mo
          </span>
          {post.personsPerRoom && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">👤 {post.personsPerRoom}/room</span>
          )}
          {post.roomSize && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">📐 {post.roomSize}</span>
          )}
        </div>

        {facilities.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {facilities.map(f => (
              <span key={f} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                {FACILITY_MAP[f]?.icon} {FACILITY_MAP[f]?.label||f}
              </span>
            ))}
            {(post.facilities||[]).length > 3 && (
              <span className="text-xs text-gray-400">+{post.facilities.length-3} more</span>
            )}
          </div>
        )}

        {post.message && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{post.message}</p>
        )}

        <div className="mt-auto pt-2 border-t border-gray-50 text-xs text-orange-500 font-medium">
          Tap to view details →
        </div>
      </div>
    </div>
  );
}

// ── Post Form ─────────────────────────────────────
function PostForm({ onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({
    listingType:"roommate", area:"", mapsURL:"",
    budget:"", gender:"male", personsPerRoom:"1",
    roomSize:"medium", facilities:[], message:"", contact:"",
  });
  const [photos,   setPhotos]   = useState([]);
  const [previews, setPreviews] = useState([]);
  const [mapsOk,   setMapsOk]   = useState(false);

  function set(field, val) { setForm(p => ({ ...p, [field]: val })); }

  function handleMapsURL(val) {
    set("mapsURL", val);
    setMapsOk(!!parseGoogleMapsURL(val));
  }

  function toggleFacility(id) {
    setForm(p => ({
      ...p,
      facilities: p.facilities.includes(id)
        ? p.facilities.filter(f=>f!==id)
        : [...p.facilities, id],
    }));
  }

  function handlePhotos(e) {
    const files = Array.from(e.target.files).slice(0,4);
    setPhotos(files);
    setPreviews(files.map(f=>URL.createObjectURL(f)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await onSubmit(form, photos);
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-400 bg-white transition-colors";
  const labelCls = "text-xs font-medium text-gray-500 block mb-1";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
      <h2 className="font-bold text-gray-900 text-lg mb-5">Post a listing</h2>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Listing type */}
        <div>
          <label className={labelCls}>Listing type *</label>
          <div className="flex gap-3">
            {[
              {val:"roommate", label:"🤝 Roommate Wanted"},
              {val:"sublet",   label:"🏠 Sublet"},
            ].map(opt => (
              <label key={opt.val} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm font-medium
                ${form.listingType===opt.val?"border-orange-500 bg-orange-50 text-orange-700":"border-gray-200 text-gray-600"}`}>
                <input type="radio" value={opt.val} checked={form.listingType===opt.val} onChange={()=>set("listingType",opt.val)} className="hidden" />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className={labelCls}>Area / Location *</label>
            <input value={form.area} onChange={e=>set("area",e.target.value)}
              placeholder="e.g. Binodpur, Kazla, Mirpur 10…" required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Google Maps link <span className="text-gray-300 font-normal">(optional)</span></label>
            <input value={form.mapsURL} onChange={e=>handleMapsURL(e.target.value)}
              placeholder="Paste Google Maps share link…" className={inputCls} />
            {mapsOk && <p className="text-xs text-green-600 mt-1">✅ Location coordinates found</p>}
            <p className="text-xs text-gray-400 mt-1">📱 Google Maps → Share → Copy link</p>
          </div>
        </div>

        {/* Budget + Gender */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Max budget (৳/month) *</label>
            <input type="number" value={form.budget} onChange={e=>set("budget",e.target.value)}
              placeholder="5000" required className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Gender *</label>
            <select value={form.gender} onChange={e=>set("gender",e.target.value)} className={inputCls}>
              <option value="male">👨 Male</option>
              <option value="female">👩 Female</option>
            </select>
          </div>
        </div>

        {/* Persons per room + Room size */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Persons per room</label>
            <div className="flex gap-1.5">
              {["1","2","3","4","5"].map(n => (
                <button key={n} type="button" onClick={()=>set("personsPerRoom",n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all
                    ${form.personsPerRoom===n?"border-orange-500 bg-orange-50 text-orange-600":"border-gray-200 text-gray-500 hover:border-orange-300"}`}>
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
                    ${form.roomSize===s?"border-orange-500 bg-orange-50 text-orange-600":"border-gray-200 text-gray-500 hover:border-orange-300"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Facilities */}
        <div>
          <label className={labelCls}>Facilities available</label>
          <div className="grid grid-cols-4 gap-2">
            {FACILITIES.map(f => (
              <label key={f.id} className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 cursor-pointer text-center transition-all
                ${form.facilities.includes(f.id)?"border-orange-500 bg-orange-50":"border-gray-200 hover:border-orange-300"}`}>
                <input type="checkbox" checked={form.facilities.includes(f.id)} onChange={()=>toggleFacility(f.id)} className="hidden" />
                <span className="text-lg">{f.icon}</span>
                <span className={`text-[10px] font-medium ${form.facilities.includes(f.id)?"text-orange-600":"text-gray-500"}`}>{f.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div>
          <label className={labelCls}>Photos <span className="text-gray-300 font-normal">(optional, up to 4)</span></label>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-4 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all">
            <span className="text-2xl mb-1">📷</span>
            <span className="text-xs font-medium text-gray-600">Click to upload room photos</span>
            <input type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />
          </label>
          {previews.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {previews.map((src,i) => (
                <img key={i} src={src} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
              ))}
            </div>
          )}
        </div>

        {/* Message */}
        <div>
          <label className={labelCls}>About yourself / Message</label>
          <textarea value={form.message} onChange={e=>set("message",e.target.value)}
            rows={3} placeholder="About yourself, preferences, when you need to move in, any rules…"
            className={`${inputCls} resize-none`} />
        </div>

        {/* Contact */}
        <div>
          <label className={labelCls}>WhatsApp / Phone number *</label>
          <input value={form.contact} onChange={e=>set("contact",e.target.value)}
            placeholder="01XXXXXXXXX" required className={inputCls} />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" disabled={submitting}
            className="bg-orange-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors">
            {submitting ? "Posting…" : "Post listing"}
          </button>
          <button type="button" onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2.5 rounded-xl border border-gray-200 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────
export default function RoommateBoard() {
  const { currentUser, loginWithGoogle } = useAuth();
  const [posts,      setPosts]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected,   setSelected]   = useState(null);

  // Filters
  const [filterType,   setFilterType]   = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [filterArea,   setFilterArea]   = useState("");

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "roommate_requests"), orderBy("created_at","desc"));
        const snap = await getDocs(q);
        setPosts(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  async function uploadPhoto(file, postId, index) {
    const fileRef = ref(storage, `roommates/${postId}/photo_${index}_${Date.now()}`);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  }

  async function handleSubmit(form, photos) {
    if (!currentUser) { loginWithGoogle(); return; }
    setSubmitting(true);
    try {
      const coords = parseGoogleMapsURL(form.mapsURL);
      const docRef = await addDoc(collection(db, "roommate_requests"), {
        ...form,
        budget:       Number(form.budget),
        coordinates:  coords || null,
        user_name:    currentUser.displayName,
        user_photo:   currentUser.photoURL,
        user_id:      currentUser.uid,
        photos:       [],
        created_at:   serverTimestamp(),
      });

      // Upload photos
      let photoURLs = [];
      if (photos.length > 0) {
        photoURLs = await Promise.all(photos.map((f,i) => uploadPhoto(f, docRef.id, i)));
        await updateDoc(doc(db, "roommate_requests", docRef.id), { photos: photoURLs });
      }

      const newPost = {
        ...form, budget:Number(form.budget),
        photos: photoURLs,
        user_name:currentUser.displayName,
        user_photo:currentUser.photoURL,
        user_id:currentUser.uid,
        id:docRef.id,
        created_at:{ toDate:()=>new Date() },
      };
      setPosts(prev => [newPost, ...prev]);
      setShowForm(false);
    } catch(err) { console.error(err); }
    finally { setSubmitting(false); }
  }

  const filtered = posts.filter(p => {
    if (filterType !== "all" && p.listingType !== filterType) return false;
    if (filterGender !== "all" && p.gender !== filterGender) return false;
    if (filterArea && !p.area?.toLowerCase().includes(filterArea.toLowerCase())) return false;
    return true;
  });

  const selectCls = "border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 bg-white";

  return (
    <div className="pb-28 md:pb-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤝 Roommate Finder</h1>
          <p className="text-gray-500 text-sm mt-1">Find roommates or sublets across Bangladesh</p>
        </div>
        <button
          onClick={() => currentUser ? setShowForm(s=>!s) : loginWithGoogle()}
          className="bg-orange-500 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-orange-600 transition-colors text-sm shadow-sm"
        >
          + Post Listing
        </button>
      </div>

      {/* Post form */}
      {showForm && (
        <PostForm
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          submitting={submitting}
        />
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)} className={selectCls+" w-full"}>
              <option value="all">All listings</option>
              <option value="roommate">🤝 Roommate Wanted</option>
              <option value="sublet">🏠 Sublet</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Gender</label>
            <select value={filterGender} onChange={e=>setFilterGender(e.target.value)} className={selectCls+" w-full"}>
              <option value="all">All</option>
              <option value="male">👨 Male</option>
              <option value="female">👩 Female</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Area</label>
            <input value={filterArea} onChange={e=>setFilterArea(e.target.value)}
              placeholder="e.g. Binodpur, Mirpur…"
              className={selectCls+" w-full"} />
          </div>
        </div>
      </div>

      {/* Result count */}
      <div className="mb-4 text-sm text-gray-500">
        <span className="text-orange-500 font-bold">{filtered.length}</span> listings found
      </div>

      {/* Cards grid */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="text-4xl mb-3">🤝</div>
          <p className="text-gray-500 font-medium">No listings found</p>
          <p className="text-gray-400 text-sm mt-1">Try different filters or be the first to post!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(p => (
            <RoommateCard key={p.id} post={p} onClick={()=>setSelected(p)} />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selected && <RoommateDetailModal post={selected} onClose={()=>setSelected(null)} />}
    </div>
  );
}
