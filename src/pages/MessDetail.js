// ─────────────────────────────────────────────────
//  MessDetail.js  –  Full detail page for one mess
// ─────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

const FACILITY_ICONS = {
  wifi:"📶", generator:"⚡", ac:"❄️", meals:"🍱",
  bathroom:"🚿", cctv:"📹", parking:"🏍️", laundry:"👕",
};

export default function MessDetail() {
  const { id }          = useParams();  // gets the mess ID from the URL
  const { currentUser } = useAuth();
  const navigate        = useNavigate();

  const [mess,       setMess]       = useState(null);
  const [reviews,    setReviews]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activePhoto,setActivePhoto]= useState(0);
  const [myRating,   setMyRating]   = useState(0);
  const [myComment,  setMyComment]  = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch mess + reviews ───────────────────────
  useEffect(() => {
    async function load() {
      try {
        const docSnap = await getDoc(doc(db, "messes", id));
        if (docSnap.exists()) {
          setMess({ id: docSnap.id, ...docSnap.data() });
        }
        const reviewSnap = await getDocs(collection(db, "messes", id, "reviews"));
        setReviews(reviewSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // ── Submit a review ────────────────────────────
  async function submitReview(e) {
    e.preventDefault();
    if (!currentUser) { navigate("/login"); return; }
    if (myRating === 0) return;
    setSubmitting(true);

    try {
      const review = {
        user_id:    currentUser.uid,
        user_name:  currentUser.displayName,
        user_photo: currentUser.photoURL,
        rating:     myRating,
        comment:    myComment,
        created_at: serverTimestamp(),
      };
      await addDoc(collection(db, "messes", id, "reviews"), review);

      // Recalculate average rating
      const allRatings = [...reviews.map(r => r.rating), myRating];
      const avg = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;
      await updateDoc(doc(db, "messes", id), {
        rating: Math.round(avg * 10) / 10,
        review_count: allRatings.length,
      });

      setReviews(prev => [...prev, { ...review, id: Date.now().toString(), created_at: { toDate: () => new Date() } }]);
      setMyRating(0);
      setMyComment("");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-bounce">🏠</div>
        <p className="text-gray-500">Loading mess details...</p>
      </div>
    </div>
  );

  if (!mess) return (
    <div className="text-center py-20">
      <div className="text-4xl mb-3">😕</div>
      <h2 className="text-lg font-semibold text-gray-700">Mess not found</h2>
      <Link to="/" className="text-orange-500 mt-2 inline-block">← Back to listings</Link>
    </div>
  );

  const photos = mess.photos?.length > 0
    ? mess.photos
    : ["https://placehold.co/800x400/FFF7ED/EA580C?text=" + encodeURIComponent(mess.name)];

  return (
    <div className="max-w-3xl mx-auto">

      {/* Back */}
      <Link to="/" className="text-sm text-gray-500 hover:text-orange-500 flex items-center gap-1 mb-4">
        ← Back to listings
      </Link>

      {/* ── Photo Gallery ─── */}
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

      {/* ── Main Info ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">{mess.name}</h1>
            <p className="text-gray-500 text-sm mt-1">📍 {mess.area && `${mess.area}, `}{mess.city} · Near {mess.university}</p>
          </div>
          {mess.rating > 0 && (
            <div className="text-right">
              <div className="text-xl font-bold text-amber-500">⭐ {mess.rating}</div>
              <div className="text-xs text-gray-400">{mess.review_count} review{mess.review_count !== 1 ? "s" : ""}</div>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${mess.seats_available > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {mess.seats_available > 0 ? `✅ ${mess.seats_available} seat(s) available` : "❌ Currently full"}
          </span>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${mess.gender === "female" ? "bg-pink-100 text-pink-700" : mess.gender === "male" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
            {mess.gender === "female" ? "👩 Female only" : mess.gender === "male" ? "👨 Male only" : "👥 Mixed"}
          </span>
        </div>

        {/* Price */}
        <div className="border-t border-gray-50 pt-4">
          <span className="text-3xl font-bold text-orange-500">৳{Number(mess.rent).toLocaleString()}</span>
          <span className="text-gray-400 text-sm"> / month</span>
          {mess.seats_total && <span className="text-gray-400 text-sm ml-3">· {mess.seats_total} seats total</span>}
        </div>
      </div>

      {/* ── Facilities ─── */}
      {mess.facilities?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <h2 className="font-semibold text-gray-800 mb-3">🏠 Facilities</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {mess.facilities.map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-700 bg-orange-50 px-3 py-2 rounded-xl">
                <span>{FACILITY_ICONS[f] || "✓"}</span>
                <span className="capitalize">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Description ─── */}
      {mess.description && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <h2 className="font-semibold text-gray-800 mb-2">📝 About this mess</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{mess.description}</p>
        </div>
      )}

      {/* ── Address ─── */}
      {mess.address && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
          <h2 className="font-semibold text-gray-800 mb-2">📍 Address</h2>
          <p className="text-gray-600 text-sm">{mess.address}, {mess.area}, {mess.city}</p>
        </div>
      )}

      {/* ── Contact Button ─── */}
      <div className="bg-orange-500 rounded-2xl p-6 mb-5 text-white">
        <h2 className="font-semibold text-lg mb-1">Interested in this mess?</h2>
        <p className="text-orange-100 text-sm mb-4">Contact the owner directly on WhatsApp</p>
        <a
          href={`https://wa.me/880${mess.contact_phone?.replace(/^0/, "")}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 bg-white text-orange-600 font-semibold px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors"
        >
          💬 WhatsApp the owner
        </a>
      </div>

      {/* ── Reviews ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-5">
        <h2 className="font-semibold text-gray-800 mb-4">⭐ Reviews ({reviews.length})</h2>

        {/* Existing reviews */}
        {reviews.length > 0 ? (
          <div className="space-y-4 mb-6">
            {reviews.map(r => (
              <div key={r.id} className="border-b border-gray-50 pb-4 last:border-0">
                <div className="flex items-center gap-3 mb-1">
                  <img src={r.user_photo || `https://ui-avatars.com/api/?name=${r.user_name}`}
                    alt={r.user_name} className="w-8 h-8 rounded-full" />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{r.user_name}</div>
                    <div className="text-amber-400 text-xs">{"⭐".repeat(r.rating)}</div>
                  </div>
                </div>
                {r.comment && <p className="text-sm text-gray-600 ml-11">{r.comment}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm mb-6">No reviews yet. Be the first to review!</p>
        )}

        {/* Write a review */}
        {currentUser ? (
          <form onSubmit={submitReview} className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Write a review</h3>

            {/* Star rating */}
            <div className="flex gap-1 mb-3">
              {[1,2,3,4,5].map(star => (
                <button key={star} type="button" onClick={() => setMyRating(star)}
                  className={`text-2xl transition-transform hover:scale-110 ${star <= myRating ? "text-amber-400" : "text-gray-300"}`}>
                  ★
                </button>
              ))}
            </div>

            <textarea
              value={myComment}
              onChange={e => setMyComment(e.target.value)}
              rows={2}
              placeholder="Share your experience with this mess..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-orange-400 mb-3 resize-none"
            />
            <button
              type="submit"
              disabled={myRating === 0 || submitting}
              className="bg-orange-500 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit review"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-gray-500 border-t border-gray-100 pt-4">
            <Link to="/login" className="text-orange-500 font-medium">Login</Link> to write a review.
          </p>
        )}
      </div>

    </div>
  );
}
