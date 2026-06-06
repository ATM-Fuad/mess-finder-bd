// ─────────────────────────────────────────────────
//  MessDetail.js
//  Plan 2: "Notify me when available" button
//  + visited verification checkbox
//  + report review system
// ─────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  doc, getDoc, collection, getDocs, addDoc,
  serverTimestamp, updateDoc, increment,
  getCountFromServer, setDoc, deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import NotifyButton from "../components/NotifyButton";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";

const FACILITY_ICONS = {
  wifi:"📶", generator:"⚡", ac:"❄️", meals:"🍱",
  bathroom:"🚿", cctv:"📹", parking:"🏍️", laundry:"👕",
};

const RATING_CATEGORIES = [
  { key:"cleanliness",    labelKey:"cleanliness",    icon:"🧹" },
  { key:"waterSupply",    labelKey:"waterSupply",    icon:"💧" },
  { key:"ownerBehaviour", labelKey:"ownerBehaviour", icon:"🤝" },
  { key:"security",       labelKey:"security",       icon:"🔒" },
  { key:"valueForMoney",  labelKey:"valueForMoney",  icon:"💰" },
];

// ── Rating bar ────────────────────────────────────
function RatingBar({ label, icon, value }) {
  const pct   = value ? Math.round((value / 5) * 100) : 0;
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      <span className="text-base w-6 text-center shrink-0">{icon}</span>
      <span className="text-xs text-gray-600 w-32 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width:`${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">
        {value ? value.toFixed(1) : "—"}
      </span>
    </div>
  );
}

// ── Star picker ───────────────────────────────────
function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          className={`text-xl transition-transform hover:scale-110 ${s <= value ? "text-amber-400" : "text-gray-200"}`}>
          ★
        </button>
      ))}
    </div>
  );
}

// ── Stat pill (owner analytics) ───────────────────
function StatPill({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-3 flex-1 min-w-0">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-lg font-bold text-white leading-none">{value ?? 0}</p>
        <p className="text-[10px] text-orange-100 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────
export default function MessDetail() {
  const { id }          = useParams();
  const { currentUser } = useAuth();
  const { t }           = useLanguage();
  const navigate        = useNavigate();
  const { addRecent }   = useRecentlyViewed(); // ← Plan 5

  const [mess,        setMess]        = useState(null);
  const [reviews,     setReviews]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [submitting,  setSubmitting]  = useState(false);
  const [savesCount,  setSavesCount]  = useState(null);

  // Review state
  const [catRatings,   setCatRatings]   = useState({ cleanliness:0, waterSupply:0, ownerBehaviour:0, security:0, valueForMoney:0 });
  const [myComment,    setMyComment]    = useState("");
  const [hasVisited,   setHasVisited]   = useState(false);
  const [reportingId,  setReportingId]  = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSent,   setReportSent]   = useState({});

  // Plan 2: notification state
  const [isWatching,    setIsWatching]    = useState(false);
  const [watchLoading,  setWatchLoading]  = useState(false);
  const [watchSuccess,  setWatchSuccess]  = useState("");

  // ── Fetch mess + reviews ─────────────────────────
  useEffect(() => {
    async function load() {
      try {
        await updateDoc(doc(db, "messes", id), { views: increment(1) });
      } catch {}
      try {
        const docSnap = await getDoc(doc(db, "messes", id));
        if (docSnap.exists()) {
          setMess({ id: docSnap.id, ...docSnap.data() });
          addRecent(docSnap.id); // ← Plan 5: track recently viewed
        }

        const reviewSnap = await getDocs(collection(db, "messes", id, "reviews"));
        const revs = reviewSnap.docs.map(d => ({ id:d.id, ...d.data() }));
        revs.sort((a, b) => (b.helpfulCount||0) - (a.helpfulCount||0));
        setReviews(revs);

        try {
          const savesSnap = await getCountFromServer(collection(db, "messes", id, "saves"));
          setSavesCount(savesSnap.data().count);
        } catch { setSavesCount(null); }

      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Check if current user is already watching ───
  useEffect(() => {
    async function checkWatching() {
      if (!currentUser) return;
      try {
        const snap = await getDoc(doc(db, "messes", id, "notifications", currentUser.uid));
        setIsWatching(snap.exists());
      } catch {}
    }
    checkWatching();
  }, [id, currentUser]);

  // ── Toggle availability watch ────────────────────
  async function toggleWatch() {
    if (!currentUser) { navigate("/login"); return; }
    setWatchLoading(true);
    setWatchSuccess("");
    try {
      const ref = doc(db, "messes", id, "notifications", currentUser.uid);
      if (isWatching) {
        await deleteDoc(ref);
        setIsWatching(false);
        setWatchSuccess("Removed from your alerts.");
      } else {
        await setDoc(ref, {
          uid:       currentUser.uid,
          email:     currentUser.email,
          name:      currentUser?.displayName ?? "User",
          messId:    id,
          messTitle: mess?.title ?? mess?.name ?? "This mess",
          created_at: serverTimestamp(),
        });
        setIsWatching(true);
        setWatchSuccess("We'll notify you when a seat opens! 🔔");
      }
      setTimeout(() => setWatchSuccess(""), 3000);
    } catch (err) { console.error(err); }
    finally { setWatchLoading(false); }
  }

  // ── WhatsApp click tracker ───────────────────────
  async function handleWhatsApp() {
    try { await updateDoc(doc(db, "messes", id), { whatsappClicks: increment(1) }); } catch {}
  }

  // ── Helpful vote ─────────────────────────────────
  async function markHelpful(reviewId) {
    if (!currentUser) return;
    await updateDoc(doc(db, "messes", id, "reviews", reviewId), { helpfulCount: increment(1) });
    setReviews(prev =>
      [...prev.map(r => r.id === reviewId ? { ...r, helpfulCount:(r.helpfulCount||0)+1 } : r)]
        .sort((a,b) => (b.helpfulCount||0) - (a.helpfulCount||0))
    );
  }

  // ── Report review ────────────────────────────────
  async function submitReport(reviewId) {
    if (!reportReason.trim()) return;
    try {
      await addDoc(collection(db, "messes", id, "reports"), {
        reviewId,
        reportedBy:  currentUser.uid,
        reason:      reportReason.trim(),
        messId:      id,
        messOwnerId: mess?.ownerId ?? mess?.owner_id ?? null,
        created_at:  serverTimestamp(),
      });
      setReportSent(prev => ({ ...prev, [reviewId]: true }));
      setReportingId(null);
      setReportReason("");
    } catch (err) { console.error(err); }
  }

  // ── Submit review ────────────────────────────────
  async function submitReview(e) {
    e.preventDefault();
    if (!currentUser) { navigate("/login"); return; }
    if (!Object.values(catRatings).some(v => v > 0)) return;
    setSubmitting(true);
    try {
      const overall = Object.values(catRatings).filter(v=>v>0).reduce((a,b)=>a+b,0)
        / Object.values(catRatings).filter(v=>v>0).length;

      const review = {
        user_id:      currentUser.uid,
        user_name:    currentUser.displayName,
        user_photo:   currentUser.photoURL,
        ratings:      catRatings,
        overall:      Math.round(overall * 10) / 10,
        comment:      myComment,
        hasVisited:   hasVisited,
        helpfulCount: 0,
        flagged:      false,
        created_at:   serverTimestamp(),
      };
      const newRef = await addDoc(collection(db, "messes", id, "reviews"), review);

      const allRevs = [...reviews, review];
      const catAvgs = {};
      RATING_CATEGORIES.forEach(({ key }) => {
        const vals = allRevs.map(r => r.ratings?.[key]).filter(Boolean);
        catAvgs[key] = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
      });
      const overallAvg = Object.values(catAvgs).reduce((a,b)=>a+b,0) / RATING_CATEGORIES.length;

      await updateDoc(doc(db, "messes", id), {
        rating:          Math.round(overallAvg * 10) / 10,
        review_count:    allRevs.length,
        categoryRatings: catAvgs,
      });

      setReviews(prev =>
        [...prev, { ...review, id:newRef.id, created_at:{ toDate:()=>new Date() } }]
          .sort((a,b) => (b.helpfulCount||0)-(a.helpfulCount||0))
      );
      setCatRatings({ cleanliness:0, waterSupply:0, ownerBehaviour:0, security:0, valueForMoney:0 });
      setMyComment("");
      setHasVisited(false);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  }

  const isOwner = currentUser && mess &&
    currentUser.uid === (mess?.ownerId ?? mess?.owner_id);
  const isFull  = !(mess?.available) ||
    (mess?.availableSeats ?? mess?.seats_available ?? 0) <= 0;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-bounce">🏠</div>
        <p className="text-gray-500">{t("loading")}</p>
      </div>
    </div>
  );

  if (!mess) return (
    <div className="text-center py-20">
      <div className="text-4xl mb-3">😕</div>
      <h2 className="text-lg font-semibold text-gray-700">Mess not found</h2>
      <button onClick={() => navigate(-1)} className="text-orange-500 mt-2 inline-block hover:underline">
        ← Back to listings
      </button>
    </div>
  );

  const photos  = mess.photos?.length > 0
    ? mess.photos
    : [`https://placehold.co/800x400/FFF7ED/EA580C?text=${encodeURIComponent(mess.name||"Mess")}`];
  const catAvgs = mess.categoryRatings || {};

  return (
    <div className="max-w-3xl mx-auto pb-28 md:pb-8">

      {/* Back + Share row */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)}
          className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1">
          ← {t("backToListings")}
        </button>

        {/* Share button */}
        <button
          onClick={async () => {
            const url  = `${window.location.origin}/mess/${mess.id}`;
            const name = mess.title || mess.name || "Mess";
            const loc  = [mess.area, mess.city || mess.district].filter(Boolean).join(", ");
            const text = `🏠 ${name}${loc ? ` — ${loc}` : ""} | ৳${Number(mess.rent||0).toLocaleString()}/mo | MessFinder BD`;
            if (navigator.share) {
              try { await navigator.share({ title: name, text, url }); } catch {}
            } else {
              try {
                await navigator.clipboard.writeText(url);
                alert("Link copied! 📋");
              } catch {
                window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank");
              }
            }
          }}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-orange-500 border border-gray-200 hover:border-orange-400 px-4 py-2 rounded-xl transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          Share this mess
        </button>
      </div>

      {/* ── Photo gallery ── */}
      <div className="rounded-2xl overflow-hidden mb-6 bg-gray-100">
        <img src={photos[activePhoto]} alt={mess.name}
          className="w-full h-64 md:h-80 object-cover"
          onError={e => { e.target.src = "https://placehold.co/800x400/FFF7ED/EA580C?text=No+Photo"; }} />
        {photos.length > 1 && (
          <div className="flex gap-2 p-3">
            {photos.map((p,i) => (
              <img key={i} src={p} alt="" onClick={() => setActivePhoto(i)}
                className={`w-16 h-12 object-cover rounded-lg cursor-pointer border-2 transition-all ${i===activePhoto?"border-orange-500":"border-transparent"}`} />
            ))}
          </div>
        )}
      </div>

      {/* ── Owner analytics ── */}
      {isOwner && (
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-5 mb-5">
          <p className="text-sm font-semibold text-orange-100 mb-3">📊 Your listing analytics</p>
          <div className="flex gap-3 flex-wrap">
            <StatPill icon="👁️" label="Views"           value={mess.views ?? 0} />
            <StatPill icon="💬" label="WhatsApp Clicks" value={mess.whatsappClicks ?? 0} />
            <StatPill icon="🔖" label="Bookmarks"       value={savesCount ?? 0} />
            <StatPill icon="🔔" label="Watching"        value={mess.watcherCount ?? 0} />
          </div>
        </div>
      )}

      {/* ── Main info ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{mess.title ?? mess.name}</h1>
            <p className="text-gray-500 text-sm mt-1">
              📍 {[mess.area, mess.city ?? mess.district].filter(Boolean).join(", ")}
            </p>
          </div>
          {(mess.rating ?? 0) > 0 && (
            <div className="text-right shrink-0">
              <div className="text-xl font-bold text-amber-500">⭐ {mess.rating}</div>
              <div className="text-xs text-gray-400">{mess.review_count} {t("reviews")}</div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`text-sm font-medium px-3 py-1 rounded-full
            ${!isFull ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {!isFull
              ? `✅ ${mess.availableSeats ?? mess.seats_available} ${t("seatsAvailable")}`
              : `❌ ${t("full")}`}
          </span>
          <span className={`text-sm font-medium px-3 py-1 rounded-full
            ${mess.gender==="female"?"bg-pink-100 text-pink-700":mess.gender==="male"?"bg-blue-100 text-blue-700":"bg-purple-100 text-purple-700"}`}>
            {mess.gender==="female"?"👩 Female only":mess.gender==="male"?"👨 Male only":"👥 Mixed"}
          </span>
        </div>

        <div className="border-t border-gray-50 pt-4">
          <span className="text-3xl font-bold text-orange-500">৳{Number(mess.rent??0).toLocaleString()}</span>
          <span className="text-gray-400 text-sm"> {t("perMonth")}</span>
          {mess.seats_total && <span className="text-gray-400 text-sm ml-3">· {mess.seats_total} seats total</span>}
        </div>
      </div>

      {/* ── Plan 2: Notify me when available ── */}
      {!isOwner && isFull && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔔</span>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-0.5">This mess is currently full</h3>
              <p className="text-sm text-gray-500 mb-3">
                Get notified inside the app as soon as a seat becomes available.
              </p>
              <button
                onClick={toggleWatch}
                disabled={watchLoading}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${isWatching
                    ? "bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-500 border border-gray-200"
                    : "bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {watchLoading ? "…" : isWatching ? "🔕 Remove alert" : "🔔 Notify me when available"}
              </button>
              {watchSuccess && (
                <p className="text-sm text-green-600 font-medium mt-2">{watchSuccess}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Also show notify button even if not full — for finders who want to track */}
      {!isOwner && !isFull && currentUser && (
        <div className="flex items-center justify-end mb-5">
          <button
            onClick={toggleWatch}
            disabled={watchLoading}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all
              ${isWatching
                ? "border-orange-300 bg-orange-50 text-orange-600"
                : "border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500"
              }`}
          >
            {isWatching ? "🔔 Watching" : "🔔 Watch this mess"}
          </button>
          {watchSuccess && <p className="text-xs text-green-600 ml-2">{watchSuccess}</p>}
        </div>
      )}

      {/* ── Rating breakdown ── */}
      {(mess.review_count ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">📊 Rating breakdown</h2>
          <div className="space-y-3">
            {RATING_CATEGORIES.map(cat => (
              <RatingBar key={cat.key} icon={cat.icon} label={t(cat.labelKey)} value={catAvgs[cat.key]} />
            ))}
          </div>
        </div>
      )}

      {/* ── Facilities ── */}
      {(mess.facilities ?? mess.amenities ?? []).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <h2 className="font-semibold text-gray-800 mb-3">🏠 {t("facilities")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...new Set([...(mess.facilities||[]), ...(mess.amenities||[])])].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-700 bg-orange-50 px-3 py-2 rounded-xl">
                <span>{FACILITY_ICONS[f] ?? "✓"}</span>
                <span className="capitalize">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Description ── */}
      {mess.description && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <h2 className="font-semibold text-gray-800 mb-2">📝 {t("aboutMess")}</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{mess.description}</p>
        </div>
      )}

      {/* ── Address + Maps ── */}
      {(mess.address || mess.mapsURL) && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <h2 className="font-semibold text-gray-800 mb-2">📍 {t("address")}</h2>
          {mess.address && <p className="text-gray-600 text-sm mb-2">{mess.address}</p>}
          {mess.mapsURL && (
            <a href={mess.mapsURL} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-orange-500 font-medium hover:underline">
              🗺️ Open in Google Maps
            </a>
          )}
        </div>
      )}

      {/* ── Contact ── */}
      <div className="bg-orange-500 rounded-2xl p-6 mb-5 text-white">
        <h2 className="font-semibold text-lg mb-1">{t("interested")}</h2>
        <p className="text-orange-100 text-sm mb-4">{t("contactOwner")}</p>
        <div className="flex flex-wrap gap-3">
          <a
            href={`https://wa.me/880${mess.contact_phone?.replace(/^0/,"")}?text=${encodeURIComponent(
              `আসসালামু আলাইকুম, আমি MessFinder BD অ্যাপ থেকে আপনার "${mess.title || mess.name || "মেস"}" মেসটি দেখেছি। আমি একটি সিট নিতে আগ্রহী। সিট কি এখনো পাওয়া যাচ্ছে? ভাড়া ও অন্যান্য বিষয়ে একটু জানাবেন?`
            )}`}
            target="_blank" rel="noreferrer"
            onClick={handleWhatsApp}
            className="inline-flex items-center gap-2 bg-white text-orange-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-50 transition-colors text-sm"
          >
            {t("whatsapp")}
          </a>
          {mess.contact_phone && (
            <a href={`tel:${mess.contact_phone}`}
              className="inline-flex items-center gap-2 bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-700 transition-colors text-sm border border-orange-400">
              {t("callOwner")}
            </a>
          )}
        </div>
        {/* Message preview */}
        <div className="mt-4 bg-orange-600/40 rounded-xl px-4 py-3">
          <p className="text-orange-100 text-xs font-medium mb-1">💬 Pre-filled message:</p>
          <p className="text-white text-xs leading-relaxed">
            আসসালামু আলাইকুম, আমি MessFinder BD অ্যাপ থেকে আপনার মেসটি দেখেছি। আমি একটি সিট নিতে আগ্রহী। সিট কি এখনো পাওয়া যাচ্ছে? ভাড়া ও অন্যান্য বিষয়ে একটু জানাবেন?
          </p>
        </div>
      </div>

      {/* ── Notify when available — only for full messes, not shown to owner ── */}
      {!(mess.available ?? ((mess.seats_available ?? mess.availableSeats ?? 0) > 0)) && !isOwner && (
        <div className="bg-white rounded-2xl border-2 border-orange-100 p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-800 text-sm">🔴 This mess is currently full</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Get notified the moment a seat opens up — no VPN, no checking back manually.
            </p>
          </div>
          <NotifyButton mess={mess} />
        </div>
      )}

      {/* ── Reviews ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
        <h2 className="font-semibold text-gray-800 mb-4">⭐ {t("reviews")} ({reviews.length})</h2>

        {reviews.length > 0 ? (
          <div className="space-y-5 mb-6">
            {reviews.map(r => (
              <div key={r.id} className="border-b border-gray-50 pb-5 last:border-0">
                <div className="flex items-start gap-3 mb-2">
                  <img src={r.user_photo || `https://ui-avatars.com/api/?name=${r.user_name}`}
                    alt={r.user_name} className="w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-800">{r.user_name}</span>
                        {r.hasVisited
                          ? <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✅ Visited</span>
                          : <span className="text-[10px] font-medium bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Unverified</span>
                        }
                      </div>
                      <span className="text-xs text-amber-500 font-semibold">
                        ⭐ {r.overall?.toFixed(1) || r.rating?.toFixed(1) || "—"}
                      </span>
                    </div>

                    {r.ratings && (
                      <div className="mt-2 grid grid-cols-1 gap-1">
                        {RATING_CATEGORIES.map(cat => r.ratings[cat.key] > 0 && (
                          <div key={cat.key} className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-4">{cat.icon}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-1">
                              <div className="bg-amber-400 h-1 rounded-full" style={{ width:`${(r.ratings[cat.key]/5)*100}%` }} />
                            </div>
                            <span className="w-6 text-right">{r.ratings[cat.key]}/5</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {r.comment && <p className="text-sm text-gray-600 mt-2">{r.comment}</p>}

                    <div className="flex items-center gap-4 mt-2">
                      <button onClick={() => markHelpful(r.id)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-500 transition-colors">
                        👍 {t("helpful")} {r.helpfulCount > 0 && `(${r.helpfulCount})`}
                      </button>
                      {currentUser && !reportSent[r.id] && r.user_id !== currentUser.uid && (
                        <button onClick={() => { setReportingId(r.id); setReportReason(""); }}
                          className="flex items-center gap-1 text-xs text-gray-300 hover:text-red-400 transition-colors">
                          🚩 Report
                        </button>
                      )}
                      {reportSent[r.id] && <span className="text-xs text-gray-300">🚩 Reported</span>}
                    </div>

                    {reportingId === r.id && (
                      <div className="mt-3 bg-red-50 border border-red-100 rounded-xl p-3">
                        <p className="text-xs font-semibold text-red-600 mb-2">Why are you reporting this?</p>
                        <div className="flex flex-col gap-1.5 mb-2">
                          {["Fake or spam","Never visited this mess","Offensive content","Competitor sabotage"].map(reason => (
                            <label key={reason} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                              <input type="radio" name={`report-${r.id}`} value={reason}
                                checked={reportReason===reason} onChange={() => setReportReason(reason)}
                                className="accent-orange-500" />
                              {reason}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => submitReport(r.id)} disabled={!reportReason}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                            Submit Report
                          </button>
                          <button onClick={() => setReportingId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm mb-6">{t("noReviews")}</p>
        )}

        {/* Write review form */}
        {currentUser ? (
          <form onSubmit={submitReview} className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">{t("writeReview")}</h3>
            <p className="text-xs text-gray-400 mb-4">Your honest experience helps other students.</p>

            <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all mb-4
              ${hasVisited ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-orange-300"}`}>
              <input type="checkbox" checked={hasVisited} onChange={e => setHasVisited(e.target.checked)}
                className="mt-0.5 accent-green-500 w-4 h-4 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-700">I confirm I have personally visited or lived in this mess ✅</p>
                <p className="text-xs text-gray-400 mt-0.5">Unchecked reviews show as "Unverified". Verified reviews are trusted more.</p>
              </div>
            </label>

            <div className="space-y-3 mb-4">
              {RATING_CATEGORIES.map(cat => (
                <div key={cat.key} className="flex items-center gap-3">
                  <span className="text-base w-5">{cat.icon}</span>
                  <span className="text-xs text-gray-600 w-32 shrink-0">{t(cat.labelKey)}</span>
                  <StarPicker value={catRatings[cat.key]} onChange={val => setCatRatings(prev => ({ ...prev, [cat.key]:val }))} />
                </div>
              ))}
            </div>

            <textarea value={myComment} onChange={e => setMyComment(e.target.value)}
              rows={2} placeholder={t("reviewPlaceholder")}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-400 mb-3 resize-none" />

            <button type="submit"
              disabled={!Object.values(catRatings).some(v => v > 0) || submitting}
              className="bg-orange-500 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? t("submitting") : t("submitReview")}
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-500 border-t border-gray-100 pt-4">
            <Link to="/login" className="text-orange-500 font-medium">Login</Link> {t("loginToReview")}
          </p>
        )}
      </div>
    </div>
  );
}
