// ─────────────────────────────────────────────────
//  MessDetail.js
//  Feature 5: View/WhatsApp/Saves analytics (owner)
//  Feature 7: 5-category ratings + bar chart
//             + Helpful votes → best reviews rise up
//  Feature 8: Bangla translations via useLanguage
// ─────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  doc, getDoc, collection, getDocs, addDoc,
  serverTimestamp, updateDoc, increment, getCountFromServer
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

const FACILITY_ICONS = {
  wifi:"📶", generator:"⚡", ac:"❄️", meals:"🍱",
  bathroom:"🚿", cctv:"📹", parking:"🏍️", laundry:"👕",
};

const RATING_CATEGORIES = [
  { key: "cleanliness",    labelKey: "cleanliness",    icon: "🧹" },
  { key: "waterSupply",    labelKey: "waterSupply",    icon: "💧" },
  { key: "ownerBehaviour", labelKey: "ownerBehaviour", icon: "🤝" },
  { key: "security",       labelKey: "security",       icon: "🔒" },
  { key: "valueForMoney",  labelKey: "valueForMoney",  icon: "💰" },
];

// ── Rating bar chart for one category ────────────
function RatingBar({ label, icon, value }) {
  const pct = value ? Math.round((value / 5) * 100) : 0;
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      <span className="text-base w-6 text-center shrink-0">{icon}</span>
      <span className="text-xs text-gray-600 w-32 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">
        {value ? value.toFixed(1) : "—"}
      </span>
    </div>
  );
}

// ── Star picker for one category ─────────────────
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

// ── Analytic stat card ────────────────────────────
function StatPill({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 flex-1 min-w-0">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-lg font-bold text-gray-900 leading-none">{value ?? 0}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function MessDetail() {
  const { id }          = useParams();
  const { currentUser } = useAuth();
  const { t }           = useLanguage();
  const navigate        = useNavigate();

  const [mess,        setMess]        = useState(null);
  const [reviews,     setReviews]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [submitting,  setSubmitting]  = useState(false);
  const [savesCount,  setSavesCount]  = useState(null);

  // Per-category ratings state
  const [catRatings, setCatRatings] = useState({
    cleanliness: 0, waterSupply: 0, ownerBehaviour: 0, security: 0, valueForMoney: 0,
  });
  const [myComment, setMyComment] = useState("");

  // ── Fetch mess + reviews + saves count ──────────
  useEffect(() => {
    async function load() {
      try {
        // Increment views
        await updateDoc(doc(db, "messes", id), { views: increment(1) });

        const docSnap = await getDoc(doc(db, "messes", id));
        if (docSnap.exists()) setMess({ id: docSnap.id, ...docSnap.data() });

        const reviewSnap = await getDocs(collection(db, "messes", id, "reviews"));
        const revs = reviewSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort by helpfulCount desc
        revs.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0));
        setReviews(revs);

        // Count saves (only shown to owner on their own listing)
        try {
          const savesSnap = await getCountFromServer(
            collection(db, "messes", id, "saves")
          );
          setSavesCount(savesSnap.data().count);
        } catch { setSavesCount(null); }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // ── Track WhatsApp click ───────────────────────
  async function handleWhatsApp() {
    await updateDoc(doc(db, "messes", id), { whatsappClicks: increment(1) });
  }

  // ── Mark review as helpful ─────────────────────
  async function markHelpful(reviewId) {
    if (!currentUser) return;
    const ref = doc(db, "messes", id, "reviews", reviewId);
    await updateDoc(ref, { helpfulCount: increment(1) });
    setReviews(prev =>
      [...prev.map(r => r.id === reviewId ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r)]
        .sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0))
    );
  }

  // ── Submit 5-category review ───────────────────
  async function submitReview(e) {
    e.preventDefault();
    if (!currentUser) { navigate("/login"); return; }
    const hasRating = Object.values(catRatings).some(v => v > 0);
    if (!hasRating) return;
    setSubmitting(true);

    try {
      const overall = Object.values(catRatings).filter(v => v > 0).reduce((a, b) => a + b, 0)
        / Object.values(catRatings).filter(v => v > 0).length;

      const review = {
        user_id:      currentUser.uid,
        user_name:    currentUser.displayName,
        user_photo:   currentUser.photoURL,
        ratings:      catRatings,
        overall:      Math.round(overall * 10) / 10,
        comment:      myComment,
        helpfulCount: 0,
        created_at:   serverTimestamp(),
      };
      const newRef = await addDoc(collection(db, "messes", id, "reviews"), review);

      // Recalculate category averages across all reviews
      const allRevs = [...reviews, review];
      const catAvgs = {};
      RATING_CATEGORIES.forEach(({ key }) => {
        const vals = allRevs.map(r => r.ratings?.[key]).filter(Boolean);
        catAvgs[key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      });
      const overallAvg = Object.values(catAvgs).reduce((a, b) => a + b, 0) / RATING_CATEGORIES.length;

      await updateDoc(doc(db, "messes", id), {
        rating:        Math.round(overallAvg * 10) / 10,
        review_count:  allRevs.length,
        categoryRatings: catAvgs,
      });

      setReviews(prev =>
        [...prev, { ...review, id: newRef.id, created_at: { toDate: () => new Date() } }]
          .sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0))
      );
      setCatRatings({ cleanliness: 0, waterSupply: 0, ownerBehaviour: 0, security: 0, valueForMoney: 0 });
      setMyComment("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  const isOwner = currentUser && mess && currentUser.uid === (mess.ownerId || mess.owner_id);

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
      <Link to="/" className="text-orange-500 mt-2 inline-block">{t("backToListings")}</Link>
    </div>
  );

  const photos = mess.photos?.length > 0
    ? mess.photos
    : [`https://placehold.co/800x400/FFF7ED/EA580C?text=${encodeURIComponent(mess.name || "Mess")}`];

  const catAvgs = mess.categoryRatings || {};

  return (
    <div className="max-w-3xl mx-auto pb-28 md:pb-8">

      <Link to="/" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4">
        {t("backToListings")}
      </Link>

      {/* ── Photo gallery ── */}
      <div className="rounded-2xl overflow-hidden mb-6 bg-gray-100">
        <img src={photos[activePhoto]} alt={mess.name} className="w-full h-64 md:h-80 object-cover" />
        {photos.length > 1 && (
          <div className="flex gap-2 p-3">
            {photos.map((p, i) => (
              <img key={i} src={p} alt="" onClick={() => setActivePhoto(i)}
                className={`w-16 h-12 object-cover rounded-lg cursor-pointer border-2 transition-all ${i === activePhoto ? "border-orange-500" : "border-transparent"}`} />
            ))}
          </div>
        )}
      </div>

      {/* ── Owner analytics panel ── */}
      {isOwner && (
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-5 mb-5 text-white">
          <p className="text-sm font-semibold text-orange-100 mb-3">📊 Your listing analytics</p>
          <div className="flex gap-3 flex-wrap">
            <StatPill icon="👁️" label={t("totalViews")}    value={mess.views ?? 0} />
            <StatPill icon="💬" label={t("totalWhatsApp")} value={mess.whatsappClicks ?? 0} />
            <StatPill icon="🔖" label={t("totalSaves")}    value={savesCount ?? mess.savesCount ?? 0} />
          </div>
        </div>
      )}

      {/* ── Main info ── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{mess.title || mess.name}</h1>
            <p className="text-gray-500 text-sm mt-1">
              📍 {[mess.area, mess.city || mess.district].filter(Boolean).join(", ")}
            </p>
          </div>
          {mess.rating > 0 && (
            <div className="text-right shrink-0">
              <div className="text-xl font-bold text-amber-500">⭐ {mess.rating}</div>
              <div className="text-xs text-gray-400">{mess.review_count} {t("reviews")}</div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${(mess.seats_available || mess.availableSeats) > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {(mess.seats_available || mess.availableSeats) > 0
              ? `✅ ${mess.seats_available || mess.availableSeats} ${t("seatsAvailable")}`
              : `❌ ${t("full")}`}
          </span>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${mess.gender === "female" ? "bg-pink-100 text-pink-700" : mess.gender === "male" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
            {mess.gender === "female" ? "👩 Female only" : mess.gender === "male" ? "👨 Male only" : "👥 Mixed"}
          </span>
        </div>

        <div className="border-t border-gray-50 pt-4">
          <span className="text-3xl font-bold text-orange-500">৳{Number(mess.rent || 0).toLocaleString()}</span>
          <span className="text-gray-400 text-sm"> {t("perMonth")}</span>
          {mess.seats_total && <span className="text-gray-400 text-sm ml-3">· {mess.seats_total} seats total</span>}
        </div>
      </div>

      {/* ── Category rating bar chart ── */}
      {mess.review_count > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">📊 Rating breakdown</h2>
          <div className="space-y-3">
            {RATING_CATEGORIES.map(cat => (
              <RatingBar
                key={cat.key}
                icon={cat.icon}
                label={t(cat.labelKey)}
                value={catAvgs[cat.key]}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Facilities ── */}
      {(mess.facilities || mess.amenities)?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <h2 className="font-semibold text-gray-800 mb-3">🏠 {t("facilities")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...new Set([...(mess.facilities||[]), ...(mess.amenities||[])])].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-700 bg-orange-50 px-3 py-2 rounded-xl">
                <span>{FACILITY_ICONS[f] || "✓"}</span>
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
            href={`https://wa.me/880${mess.contact_phone?.replace(/^0/, "")}`}
            target="_blank" rel="noreferrer"
            onClick={handleWhatsApp}
            className="inline-flex items-center gap-2 bg-white text-orange-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-50 transition-colors text-sm"
          >
            {t("whatsapp")}
          </a>
          {mess.contact_phone && (
            <a
              href={`tel:${mess.contact_phone}`}
              className="inline-flex items-center gap-2 bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-700 transition-colors text-sm border border-orange-400"
            >
              {t("callOwner")}
            </a>
          )}
        </div>
      </div>

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
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-800">{r.user_name}</span>
                      <span className="text-xs text-amber-500 font-semibold">
                        ⭐ {r.overall?.toFixed(1) || r.rating?.toFixed(1) || "—"}
                      </span>
                    </div>

                    {/* Per-category mini bars */}
                    {r.ratings && (
                      <div className="mt-2 grid grid-cols-1 gap-1">
                        {RATING_CATEGORIES.map(cat => r.ratings[cat.key] > 0 && (
                          <div key={cat.key} className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="w-4">{cat.icon}</span>
                            <div className="flex-1 bg-gray-100 rounded-full h-1">
                              <div className="bg-amber-400 h-1 rounded-full" style={{ width: `${(r.ratings[cat.key]/5)*100}%` }} />
                            </div>
                            <span className="w-6 text-right">{r.ratings[cat.key]}/5</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {r.comment && <p className="text-sm text-gray-600 mt-2">{r.comment}</p>}

                    {/* Helpful button */}
                    <button
                      onClick={() => markHelpful(r.id)}
                      className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-500 transition-colors"
                    >
                      👍 {t("helpful")} {r.helpfulCount > 0 && `(${r.helpfulCount})`}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm mb-6">{t("noReviews")}</p>
        )}

        {/* Write a review */}
        {currentUser ? (
          <form onSubmit={submitReview} className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">{t("writeReview")}</h3>

            {/* 5-category star pickers */}
            <div className="space-y-3 mb-4">
              {RATING_CATEGORIES.map(cat => (
                <div key={cat.key} className="flex items-center gap-3">
                  <span className="text-base w-5">{cat.icon}</span>
                  <span className="text-xs text-gray-600 w-32 shrink-0">{t(cat.labelKey)}</span>
                  <StarPicker
                    value={catRatings[cat.key]}
                    onChange={val => setCatRatings(prev => ({ ...prev, [cat.key]: val }))}
                  />
                </div>
              ))}
            </div>

            <textarea
              value={myComment}
              onChange={e => setMyComment(e.target.value)}
              rows={2}
              placeholder={t("reviewPlaceholder")}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-400 mb-3 resize-none"
            />
            <button
              type="submit"
              disabled={!Object.values(catRatings).some(v => v > 0) || submitting}
              className="bg-orange-500 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
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
