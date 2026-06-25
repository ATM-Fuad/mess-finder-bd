// ─────────────────────────────────────────────────
//  RoommateDetail.js  —  src/pages/RoommateDetail.js
//  Full-page detail view for a roommate post
//  Route: /roommate/:id
//  Feature 3: mirrors /mess/:id layout
// ─────────────────────────────────────────────────

import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase";

const FACILITY_ICONS = {
  wifi:"📶", generator:"⚡", ac:"❄️", meals:"🍱",
  bathroom:"🚿", cctv:"📹", parking:"🏍️", laundry:"👕",
};

function PhotoCarousel({ photos, name }) {
  const [current, setCurrent] = useState(0);
  const touchStart = useRef(null);
  const placeholder = `https://placehold.co/800x400/EFF6FF/3B82F6?text=${encodeURIComponent(name||"Room")}`;
  const imgs = photos?.length > 0 ? photos : [placeholder];
  const total = imgs.length;

  function prev() { setCurrent(c => (c-1+total)%total); }
  function next() { setCurrent(c => (c+1)%total); }
  function onTouchStart(e) { touchStart.current = e.touches[0].clientX; }
  function onTouchEnd(e) {
    if (!touchStart.current) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStart.current = null;
  }

  return (
    <div className="rounded-2xl overflow-hidden mb-6 bg-blue-50 dark:bg-slate-800 relative" style={{height:"280px"}}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <img src={imgs[current]} alt={name}
        className="w-full h-full object-cover transition-opacity duration-200"
        onError={e => { e.target.src = placeholder; }} />
      {total > 1 && (
        <>
          <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors">‹</button>
          <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-black/60 transition-colors">›</button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {imgs.map((_,i) => (
              <button key={i} onClick={()=>setCurrent(i)}
                className={`rounded-full transition-all ${i===current?"w-5 h-2 bg-white":"w-2 h-2 bg-white/50"}`} />
            ))}
          </div>
          <div className="absolute top-3 left-3 bg-black/40 text-white text-xs px-2 py-1 rounded-full">{current+1}/{total}</div>
        </>
      )}
    </div>
  );
}

export default function RoommateDetail() {
  const { id }   = useParams();
  const [post,    setPost]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Increment views
        await updateDoc(doc(db, "roommate_requests", id), { views: increment(1) });
        const snap = await getDoc(doc(db, "roommate_requests", id));
        if (snap.exists()) setPost({ id:snap.id, ...snap.data() });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-bounce">🤝</div>
        <p className="text-gray-500 dark:text-gray-400">Loading listing…</p>
      </div>
    </div>
  );

  if (!post) return (
    <div className="text-center py-20">
      <div className="text-4xl mb-3">😕</div>
      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Listing not found</h2>
      <Link to="/roommates" className="text-orange-500 mt-2 inline-block">← Back to Roommate Board</Link>
    </div>
  );

  const facilities = post?.facilities ?? [];
  const locationLine = [post?.area, post?.city || post?.district, post?.division].filter(Boolean).join(", ");

  return (
    <div className="max-w-3xl mx-auto pb-28 md:pb-8">
      <Link to="/roommates" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4">
        ← Back to Roommate Board
      </Link>

      {/* Photo carousel */}
      <PhotoCarousel photos={post.photos} name={post?.user_name} />

      {/* Main info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 mb-5 transition-colors">
        <div className="flex items-start gap-4 mb-4">
          <img src={post?.user_photo || `https://ui-avatars.com/api/?name=${post?.user_name??'U'}`}
            alt={post?.user_name} className="w-14 h-14 rounded-2xl object-cover border-2 border-orange-100 dark:border-slate-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{post?.user_name ?? "Anonymous"}</h1>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${post?.listingType==="sublet"?"bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300":"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"}`}>
                {post?.listingType==="sublet"?"🏠 Sublet":"🤝 Roommate Wanted"}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${post?.gender==="female"?"bg-pink-100 text-pink-700":"bg-blue-100 text-blue-700"}`}>
                {post?.gender==="female"?"👩 Female":"👨 Male"}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-orange-500">৳{Number(post?.budget??0).toLocaleString()}</div>
            <div className="text-xs text-gray-400">/month max</div>
          </div>
        </div>

        {/* Location */}
        {locationLine && (
          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1.5 mb-4">
            📍 {locationLine}
          </p>
        )}

        {/* Detail grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {post?.personsPerRoom && (
            <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{post.personsPerRoom}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Persons/Room</p>
            </div>
          )}
          {post?.roomSize && (
            <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{post.roomSize}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Room Size</p>
            </div>
          )}
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-white">{post?.views ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Views</p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {post?.created_at?.toDate?.()?.toLocaleDateString?.() ?? "—"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Posted</p>
          </div>
        </div>
      </div>

      {/* Facilities */}
      {facilities.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 mb-5 transition-colors">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-3">🏠 Facilities</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {facilities.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-xl">
                <span>{FACILITY_ICONS[f] ?? "✓"}</span>
                <span className="capitalize">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* About */}
      {post?.message && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 mb-5 transition-colors">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-2">📝 About</h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{post.message}</p>
        </div>
      )}

      {/* Maps link */}
      {post?.mapsURL && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 mb-5 transition-colors">
          <h2 className="font-semibold text-gray-800 dark:text-white mb-2">📍 Location</h2>
          <a href={post.mapsURL} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-orange-500 font-medium hover:underline">
            🗺️ Open in Google Maps
          </a>
        </div>
      )}

      {/* Contact CTA */}
      <div className="bg-orange-500 rounded-2xl p-6 mb-5 text-white">
        <h2 className="font-semibold text-lg mb-1">Interested in this listing?</h2>
        <p className="text-orange-100 text-sm mb-4">Contact directly via WhatsApp or phone call.</p>
        <div className="flex flex-wrap gap-3">
          <a href={`https://wa.me/880${(post?.contact??"").replace(/^0/,"")}`}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-white text-orange-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-50 transition-colors text-sm">
            💬 WhatsApp
          </a>
          {post?.contact && (
            <a href={`tel:${post.contact}`}
              className="inline-flex items-center gap-2 bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors text-sm border border-orange-400">
              📞 Call
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
