// ─────────────────────────────────────────────────
//  MessDetail.js  —  Phase 2 redesign
//  All features preserved:
//  • Analytics, Q&A, Reviews, Notify, Share
//  • rounded-3xl, warm colors, skeleton loader
//  • Zero ESLint errors
// ─────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  doc, getDoc, collection, getDocs, addDoc,
  serverTimestamp, updateDoc, increment,
  getCountFromServer, setDoc, deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth }           from "../contexts/AuthContext";
import { useLanguage }       from "../contexts/LanguageContext";
import NotifyButton          from "../components/NotifyButton";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { DetailSkeleton }    from "../components/Skeleton";

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
  const color = pct >= 70 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex items-center gap-3">
      <span className="text-base w-6 text-center shrink-0">{icon}</span>
      <span className="text-xs text-[#6B7280] w-32 shrink-0">{label}</span>
      <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: "#F3F4F6" }}>
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold text-[#1A1A1A] w-8 text-right">
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
        <button
          key={s} type="button" onClick={() => onChange(s)}
          className={`text-2xl transition-transform hover:scale-110 ${s <= value ? "text-amber-400" : "text-[#E5E7EB]"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ── Analytics pill ────────────────────────────────
function StatPill({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0 bg-white/15 rounded-2xl px-4 py-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xl font-extrabold text-white leading-none">{value ?? 0}</p>
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
  const { addRecent }   = useRecentlyViewed();

  const [mess,        setMess]        = useState(null);
  const [reviews,     setReviews]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activePhoto, setActivePhoto] = useState(0);
  const [submitting,  setSubmitting]  = useState(false);
  const [savesCount,  setSavesCount]  = useState(null);

  const [catRatings,   setCatRatings]   = useState({ cleanliness:0, waterSupply:0, ownerBehaviour:0, security:0, valueForMoney:0 });
  const [myComment,    setMyComment]    = useState("");
  const [hasVisited,   setHasVisited]   = useState(false);
  const [reportingId,  setReportingId]  = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportSent,   setReportSent]   = useState({});

  const [questions,  setQuestions]  = useState([]);
  const [myQuestion, setMyQuestion] = useState("");
  const [postingQ,   setPostingQ]   = useState(false);
  const [answerMap,  setAnswerMap]  = useState({});
  const [postingAns, setPostingAns] = useState({});
  const [editingAns, setEditingAns] = useState({});
  const [savingEdit, setSavingEdit] = useState({});

  const [isWatching,   setIsWatching]   = useState(false);
  const [watchLoading, setWatchLoading] = useState(false);
  const [watchSuccess, setWatchSuccess] = useState("");

  useEffect(() => {
    async function load() {
      try { await updateDoc(doc(db, "messes", id), { views: increment(1) }); } catch {}
      try {
        const docSnap = await getDoc(doc(db, "messes", id));
        if (docSnap.exists()) {
          setMess({ id: docSnap.id, ...docSnap.data() });
          addRecent(docSnap.id);
        }
        const reviewSnap = await getDocs(collection(db, "messes", id, "reviews"));
        const revs = reviewSnap.docs.map(d => ({ id:d.id, ...d.data() }));
        revs.sort((a,b) => (b.helpfulCount||0) - (a.helpfulCount||0));
        setReviews(revs);
        try {
          const qSnap = await getDocs(collection(db, "messes", id, "questions"));
          const qData = qSnap.docs.map(d => ({ id:d.id, ...d.data() }));
          qData.sort((a,b) => (b.createdAt?.seconds??0) - (a.createdAt?.seconds??0));
          setQuestions(qData);
        } catch { setQuestions([]); }
        try {
          const savesSnap = await getCountFromServer(collection(db, "messes", id, "saves"));
          setSavesCount(savesSnap.data().count);
        } catch { setSavesCount(null); }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

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
          uid: currentUser.uid, email: currentUser.email,
          name: currentUser?.displayName ?? "User",
          messId: id, messTitle: mess?.title ?? mess?.name ?? "This mess",
          created_at: serverTimestamp(),
        });
        setIsWatching(true);
        setWatchSuccess("We'll notify you when a seat opens! 🔔");
      }
      setTimeout(() => setWatchSuccess(""), 3000);
    } catch (err) { console.error(err); }
    finally { setWatchLoading(false); }
  }

  async function handleWhatsApp() {
    try { await updateDoc(doc(db, "messes", id), { whatsappClicks: increment(1) }); } catch {}
  }

  async function markHelpful(reviewId) {
    if (!currentUser) return;
    await updateDoc(doc(db, "messes", id, "reviews", reviewId), { helpfulCount: increment(1) });
    setReviews(prev =>
      [...prev.map(r => r.id===reviewId ? {...r, helpfulCount:(r.helpfulCount||0)+1} : r)]
        .sort((a,b) => (b.helpfulCount||0)-(a.helpfulCount||0))
    );
  }

  async function submitReport(reviewId) {
    if (!reportReason.trim()) return;
    try {
      await addDoc(collection(db, "messes", id, "reports"), {
        reviewId, reportedBy: currentUser.uid, reason: reportReason.trim(),
        messId: id, messOwnerId: mess?.ownerId ?? mess?.owner_id ?? null,
        created_at: serverTimestamp(),
      });
      setReportSent(prev => ({ ...prev, [reviewId]: true }));
      setReportingId(null);
      setReportReason("");
    } catch (err) { console.error(err); }
  }

  async function submitQuestion(e) {
    e.preventDefault();
    if (!currentUser) { navigate("/login"); return; }
    if (!myQuestion.trim()) return;
    setPostingQ(true);
    try {
      const qRef = await addDoc(collection(db, "messes", id, "questions"), {
        question: myQuestion.trim(), askedBy: currentUser.uid,
        askerName: currentUser.displayName ?? "Anonymous",
        askerPhoto: currentUser.photoURL ?? null,
        answers: [], createdAt: serverTimestamp(),
      });
      setQuestions(prev => [{
        id: qRef.id, question: myQuestion.trim(),
        askedBy: currentUser.uid,
        askerName: currentUser.displayName ?? "Anonymous",
        askerPhoto: currentUser.photoURL ?? null,
        answers: [], createdAt: { seconds: Date.now()/1000 },
      }, ...prev]);
      setMyQuestion("");
    } catch (err) { console.error(err); }
    setPostingQ(false);
  }

  async function submitAnswer(qId) {
    const answer = answerMap[qId]?.trim();
    if (!answer || !currentUser) return;
    setPostingAns(prev => ({ ...prev, [qId]: true }));
    try {
      const qRef = doc(db, "messes", id, "questions", qId);
      const newAnswer = {
        text: answer, answeredBy: currentUser.uid,
        answererName: currentUser.displayName ?? "Anonymous",
        answererPhoto: currentUser.photoURL ?? null,
        isOwner: currentUser.uid === (mess?.ownerId ?? mess?.owner_id),
        createdAt: new Date().toISOString(),
      };
      const snap = await getDoc(qRef);
      const existing = snap.data()?.answers ?? [];
      await updateDoc(qRef, { answers: [...existing, newAnswer] });
      setQuestions(prev => prev.map(q =>
        q.id===qId ? { ...q, answers:[...(q.answers??[]), newAnswer] } : q
      ));
      setAnswerMap(prev => ({ ...prev, [qId]: "" }));
    } catch (err) { console.error(err); }
    setPostingAns(prev => ({ ...prev, [qId]: false }));
  }

  async function saveEditedAnswer(qId) {
    const newText = editingAns[qId]?.trim();
    if (!newText) return;
    setSavingEdit(prev => ({ ...prev, [qId]: true }));
    try {
      const qRef = doc(db, "messes", id, "questions", qId);
      const snap = await getDoc(qRef);
      const answers = (snap.data()?.answers??[]).map(a =>
        a.answeredBy===currentUser.uid ? { ...a, text:newText } : a
      );
      await updateDoc(qRef, { answers });
      setQuestions(prev => prev.map(q =>
        q.id===qId
          ? { ...q, answers:q.answers.map(a => a.answeredBy===currentUser.uid ? {...a,text:newText} : a) }
          : q
      ));
      setEditingAns(prev => ({ ...prev, [qId]: null }));
    } catch (err) { console.error(err); }
    setSavingEdit(prev => ({ ...prev, [qId]: false }));
  }

  async function deleteAnswer(qId) {
    if (!window.confirm("Delete your answer?")) return;
    try {
      const qRef = doc(db, "messes", id, "questions", qId);
      const snap = await getDoc(qRef);
      const answers = (snap.data()?.answers??[]).filter(a => a.answeredBy!==currentUser.uid);
      await updateDoc(qRef, { answers });
      setQuestions(prev => prev.map(q =>
        q.id===qId ? { ...q, answers:q.answers.filter(a=>a.answeredBy!==currentUser.uid) } : q
      ));
    } catch (err) { console.error(err); }
  }

  async function deleteQuestion(qId) {
    if (!window.confirm("Delete this question and all its answers?")) return;
    try {
      await deleteDoc(doc(db, "messes", id, "questions", qId));
      setQuestions(prev => prev.filter(q => q.id!==qId));
    } catch (err) { console.error(err); }
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!currentUser) { navigate("/login"); return; }
    if (!Object.values(catRatings).some(v=>v>0)) return;
    setSubmitting(true);
    try {
      const overall = Object.values(catRatings).filter(v=>v>0).reduce((a,b)=>a+b,0)
        / Object.values(catRatings).filter(v=>v>0).length;
      const review = {
        user_id: currentUser.uid, user_name: currentUser.displayName,
        user_photo: currentUser.photoURL, ratings: catRatings,
        overall: Math.round(overall*10)/10, comment: myComment,
        hasVisited, helpfulCount: 0, flagged: false,
        created_at: serverTimestamp(),
      };
      const newRef = await addDoc(collection(db, "messes", id, "reviews"), review);
      const allRevs = [...reviews, review];
      const catAvgs = {};
      RATING_CATEGORIES.forEach(({ key }) => {
        const vals = allRevs.map(r=>r.ratings?.[key]).filter(Boolean);
        catAvgs[key] = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
      });
      const overallAvg = Object.values(catAvgs).reduce((a,b)=>a+b,0)/RATING_CATEGORIES.length;
      await updateDoc(doc(db, "messes", id), {
        rating: Math.round(overallAvg*10)/10,
        review_count: allRevs.length,
        categoryRatings: catAvgs,
      });
      setReviews(prev =>
        [...prev, { ...review, id:newRef.id, created_at:{ toDate:()=>new Date() } }]
          .sort((a,b)=>(b.helpfulCount||0)-(a.helpfulCount||0))
      );
      setCatRatings({ cleanliness:0, waterSupply:0, ownerBehaviour:0, security:0, valueForMoney:0 });
      setMyComment("");
      setHasVisited(false);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  }

  const isOwner = !!(currentUser && mess &&
    currentUser.uid === (mess?.ownerId ?? mess?.owner_id));
  const isFull  = !(mess?.available) ||
    (mess?.availableSeats ?? mess?.seats_available ?? 0) <= 0;

  // ── Loading ───────────────────────────────────────
  if (loading) return <div className="max-w-3xl mx-auto"><DetailSkeleton /></div>;

  // ── Not found ─────────────────────────────────────
  if (!mess) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">😕</div>
      <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">Mess not found</h2>
      <button onClick={()=>navigate(-1)} className="text-orange-500 hover:underline text-sm">
        ← Back to listings
      </button>
    </div>
  );

  const photos  = mess.photos?.length > 0
    ? mess.photos
    : [`https://placehold.co/800x400/FFF7ED/EA580C?text=${encodeURIComponent(mess.name||"Mess")}`];
  const catAvgs = mess.categoryRatings || {};

  const cardCls   = "bg-white rounded-3xl border border-[#E8E8E4] p-6 mb-5 shadow-card";
  const inputCls  = "w-full border border-[#E8E8E4] rounded-2xl px-4 py-3 text-sm outline-none text-[#1A1A1A] transition-colors";
  const sectionH2 = "font-bold text-[#1A1A1A] text-base mb-4";

  return (
    <div className="max-w-3xl mx-auto pb-28 md:pb-8 animate-fade-in">

      {/* ── Back + Share ── */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-[#6B7280] hover:text-orange-500 transition-colors tap-target"
        >
          ← {t("backToListings")}
        </button>
        <button
          onClick={async () => {
            const url  = `${window.location.origin}/mess/${mess.id}`;
            const name = mess.title || mess.name || "Mess";
            const loc  = [mess.area, mess.city||mess.district].filter(Boolean).join(", ");
            const text = `🏠 ${name}${loc?` — ${loc}`:""} | ৳${Number(mess.rent||0).toLocaleString()}/mo | MessFinder BD`;
            if (navigator.share) {
              try { await navigator.share({ title:name, text, url }); } catch {}
            } else {
              try { await navigator.clipboard.writeText(url); alert("Link copied! 📋"); }
              catch { window.open(`https://wa.me/?text=${encodeURIComponent(text+"\n"+url)}`, "_blank"); }
            }
          }}
          className="flex items-center gap-2 text-sm font-semibold text-[#6B7280] hover:text-orange-500 border border-[#E8E8E4] hover:border-orange-300 px-4 py-2 rounded-2xl transition-all tap-target"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          Share
        </button>
      </div>

      {/* ── Photo gallery ── */}
      <div className="rounded-3xl overflow-hidden mb-6 border border-[#E8E8E4] shadow-card">
        <div className="relative">
          <img
            src={photos[activePhoto]}
            alt={mess.name || "Mess"}
            className="w-full object-cover"
            style={{ height: "320px" }}
            onError={e => { e.target.src = "https://placehold.co/800x400/FFF7ED/EA580C?text=No+Photo"; }}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 photo-overlay" />
          {/* Mess name on photo */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4 z-10">
            <h1 className="text-white text-2xl font-extrabold drop-shadow-lg">
              {mess.title ?? mess.name}
            </h1>
            <p className="text-white/80 text-sm mt-0.5">
              📍 {[mess.area, mess.city??mess.district].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>
        {/* Thumbnails */}
        {photos.length > 1 && (
          <div className="flex gap-2 p-3" style={{ background: "#FAFAF8" }}>
            {photos.map((p,i) => (
              <img
                key={i} src={p} alt=""
                onClick={() => setActivePhoto(i)}
                className="w-16 h-12 object-cover rounded-xl cursor-pointer border-2 transition-all"
                style={{ borderColor: i===activePhoto ? "#F97316" : "transparent" }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Owner analytics ── */}
      {isOwner && (
        <div
          className="rounded-3xl p-5 mb-5"
          style={{ background: "linear-gradient(135deg, #F97316, #EA580C)" }}
        >
          <p className="text-sm font-bold text-orange-100 mb-3">📊 Your listing analytics</p>
          <div className="flex gap-3 flex-wrap">
            <StatPill icon="👁️" label="Views"           value={mess.views ?? 0} />
            <StatPill icon="💬" label="WhatsApp Clicks" value={mess.whatsappClicks ?? 0} />
            <StatPill icon="🔖" label="Bookmarks"       value={savesCount ?? 0} />
            <StatPill icon="🔔" label="Watching"        value={mess.watcherCount ?? 0} />
          </div>
        </div>
      )}

      {/* ── Main info ── */}
      <div className={cardCls}>
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Availability */}
          <span
            className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
            style={{
              background: !isFull ? "#D1FAE5" : "#fef6e2",
              color:      !isFull ? "#065F46" : "#991B1B",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: !isFull ? "#10B981" : "#EF4444" }}
            />
            {!isFull
              ? `${mess.availableSeats ?? mess.seats_available ?? 0} seat(s) available`
              : "Currently full"
            }
          </span>
          {/* Gender */}
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full
            ${mess.gender==="female" ? "badge-female" : mess.gender==="male" ? "badge-male" : "badge-mixed"}`}>
            {mess.gender==="female" ? "👩 Female only"
              : mess.gender==="male" ? "👨 Male only" : "👥 Mixed"}
          </span>
        </div>

        {/* Price + rating */}
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl font-extrabold text-orange-500">
              ৳{Number(mess.rent||0).toLocaleString()}
            </span>
            <span className="text-[#9CA3AF] text-sm"> {t("perMonth")}</span>
            {mess.seats_total && (
              <span className="text-[#9CA3AF] text-sm ml-2">
                · {mess.seats_total} seats total
              </span>
            )}
          </div>
          {(mess.rating??0) > 0 && (
            <div className="text-right">
              <div className="text-lg font-bold text-amber-500">⭐ {mess.rating}</div>
              <div className="text-xs text-[#9CA3AF]">{mess.review_count} {t("reviews")}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Rating breakdown ── */}
      {(mess.review_count ?? 0) > 0 && (
        <div className={cardCls}>
          <h2 className={sectionH2}>📊 Rating breakdown</h2>
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
      {[...(mess.facilities||[]), ...(mess.amenities||[])].length > 0 && (
        <div className={cardCls}>
          <h2 className={sectionH2}>🏠 {t("facilities")}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[...new Set([...(mess.facilities||[]), ...(mess.amenities||[])])].map(f => (
              <div
                key={f}
                className="flex items-center gap-2 text-sm font-medium px-3 py-2.5 rounded-2xl"
                style={{ background: "#FFF7ED", color: "#EA580C" }}
              >
                <span>{FACILITY_ICONS[f] || "✓"}</span>
                <span className="capitalize">{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Description ── */}
      {mess.description && (
        <div className={cardCls}>
          <h2 className={sectionH2}>📝 {t("aboutMess")}</h2>
          <p className="text-sm text-[#6B7280] leading-relaxed">{mess.description}</p>
        </div>
      )}

      {/* ── Address + Maps ── */}
      {(mess.address || mess.mapsURL) && (
        <div className={cardCls}>
          <h2 className={sectionH2}>📍 {t("address")}</h2>
          {mess.address && (
            <p className="text-sm text-[#6B7280] mb-2">{mess.address}</p>
          )}
          {mess.mapsURL && (
            <a
              href={mess.mapsURL} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-orange-500 font-semibold hover:underline"
            >
              🗺️ Open in Google Maps
            </a>
          )}
        </div>
      )}

      {/* ── Contact ── */}
      <div
        className="rounded-3xl p-6 mb-5 text-white"
        style={{ background: "linear-gradient(135deg, #0048e4, #0094d8)" }}
      >
        <h2 className="font-bold text-lg mb-1">{t("interested")}</h2>
        <p className="text-orange-100 text-sm mb-4">{t("contactOwner")}</p>
        <div className="flex flex-wrap gap-3">
          <a
            href={`https://wa.me/880${mess.contact_phone?.replace(/^0/,"")}?text=${encodeURIComponent(
              `আসসালামু আলাইকুম, আমি MessFinder BD অ্যাপ থেকে আপনার "${mess.title||mess.name||"মেস"}" মেসটি দেখেছি। আমি একটি সিট নিতে আগ্রহী। সিট কি এখনো পাওয়া যাচ্ছে? ভাড়া ও অন্যান্য বিষয়ে একটু জানাবেন?`
            )}`}
            target="_blank" rel="noreferrer"
            onClick={handleWhatsApp}
            className="inline-flex items-center gap-2 bg-white text-green-600 font-bold px-5 py-2.5 rounded-2xl hover:bg-orange-50 transition-colors text-sm tap-target border border-green-600"
          >
            {t("whatsapp")}
          </a>
          {mess.contact_phone && (
            <a
              href={`tel:${mess.contact_phone}`}
              className="inline-flex items-center gap-2 font-bold px-5 py-2.5 rounded-2xl transition-colors text-red-600 tap-target border border-orange-600"
              style={{ background: "rgb(255, 255, 255)" }}
            >
              {t("callOwner")}
            </a>
          )}
        </div>
        {/* Pre-filled message preview */}
        <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: "rgba(0, 0, 0, 0.24)" }}>
          <p className="text-orange-100 text-xs font-semibold mb-1">💬 Pre-filled message:</p>
          <p className="text-white text-xs leading-relaxed">
            আসসালামু আলাইকুম, আমি MessFinder BD অ্যাপ থেকে আপনার মেসটি দেখেছি।
            আমি একটি সিট নিতে আগ্রহী। সিট কি এখনো পাওয়া যাচ্ছে?
          </p>
        </div>
      </div>

      {/* ── Notify when full ── */}
      {isFull && !isOwner && (
        <div className={`${cardCls} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
          <div>
            <p className="font-bold text-[#1A1A1A] text-sm">🔴 This mess is currently full</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Get notified the moment a seat opens up
            </p>
          </div>
          <NotifyButton mess={mess} />
        </div>
      )}

      {/* ── Watch toggle (inline) ── */}
      {!isFull && !isOwner && currentUser && (
        <div className={`${cardCls} flex items-center justify-between`}>
          <div>
            <p className="font-bold text-[#1A1A1A] text-sm">🔔 Watch this mess</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Get notified if it becomes full or availability changes
            </p>
          </div>
          <button
            onClick={toggleWatch}
            disabled={watchLoading}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl border-2 transition-all tap-target"
            style={{
              borderColor: isWatching ? "#F97316" : "#E8E8E4",
              background:  isWatching ? "#FFF7ED" : "white",
              color:       isWatching ? "#EA580C" : "#6B7280",
            }}
          >
            {watchLoading ? "…" : isWatching ? "🔔 Watching" : "🔕 Watch"}
          </button>
          {watchSuccess && (
            <p className="text-xs text-green-600 mt-1">{watchSuccess}</p>
          )}
        </div>
      )}

      {/* ── Reviews ── */}
      <div className={cardCls}>
        <h2 className={sectionH2}>⭐ {t("reviews")} ({reviews.length})</h2>

        {reviews.length > 0 ? (
          <div className="space-y-5 mb-6">
            {reviews.map(r => (
              <div key={r.id} className="border-b border-[#F3F4F6] pb-5 last:border-0">
                <div className="flex items-start gap-3">
                  <img
                    src={r.user_photo || `https://ui-avatars.com/api/?name=${r.user_name??'U'}`}
                    alt={r.user_name ?? "User"}
                    className="w-9 h-9 rounded-full shrink-0 border-2 border-[#E8E8E4]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#1A1A1A]">{r.user_name ?? "Anonymous"}</span>
                        {r.hasVisited
                          ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:"#D1FAE5", color:"#065F46" }}>✅ Visited</span>
                          : <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background:"#F3F4F6", color:"#9CA3AF" }}>Unverified</span>
                        }
                      </div>
                      <span className="text-xs font-bold text-amber-500">
                        ⭐ {r.overall?.toFixed(1) || r.rating?.toFixed(1) || "—"}
                      </span>
                    </div>

                    {/* Per-category mini bars */}
                    {r.ratings && (
                      <div className="grid gap-1 mt-2 mb-2">
                        {RATING_CATEGORIES.map(cat => r.ratings[cat.key] > 0 && (
                          <div key={cat.key} className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                            <span className="w-4">{cat.icon}</span>
                            <div className="flex-1 rounded-full h-1" style={{ background:"#F3F4F6" }}>
                              <div className="h-1 rounded-full bg-amber-400" style={{ width:`${(r.ratings[cat.key]/5)*100}%` }} />
                            </div>
                            <span className="w-6 text-right">{r.ratings[cat.key]}/5</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {r.comment && (
                      <p className="text-sm text-[#6B7280] leading-relaxed mt-1">{r.comment}</p>
                    )}

                    {/* Helpful + Report */}
                    <div className="flex items-center gap-4 mt-2">
                      <button
                        onClick={() => markHelpful(r.id)}
                        className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-orange-500 transition-colors"
                      >
                        👍 {t("helpful")} {r.helpfulCount > 0 && `(${r.helpfulCount})`}
                      </button>
                      {currentUser && !reportSent[r.id] && r.user_id !== currentUser.uid && (
                        <button
                          onClick={() => { setReportingId(r.id); setReportReason(""); }}
                          className="text-xs text-[#D1D5DB] hover:text-red-400 transition-colors"
                        >
                          🚩 Report
                        </button>
                      )}
                      {reportSent[r.id] && (
                        <span className="text-xs text-[#D1D5DB]">🚩 Reported</span>
                      )}
                    </div>

                    {/* Report form */}
                    {reportingId === r.id && (
                      <div className="mt-3 rounded-2xl p-3 border" style={{ background:"#FEF2F2", borderColor:"#FECACA" }}>
                        <p className="text-xs font-bold text-red-600 mb-2">Why are you reporting this?</p>
                        <div className="flex flex-col gap-1.5 mb-2">
                          {["Fake or spam","Never visited this mess","Offensive content","Competitor sabotage"].map(reason => (
                            <label key={reason} className="flex items-center gap-2 text-xs text-[#6B7280] cursor-pointer">
                              <input
                                type="radio" name={`report-${r.id}`} value={reason}
                                checked={reportReason===reason}
                                onChange={() => setReportReason(reason)}
                                className="accent-orange-500"
                              />
                              {reason}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => submitReport(r.id)} disabled={!reportReason}
                            className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50"
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => setReportingId(null)}
                            className="text-xs text-[#9CA3AF] hover:text-[#6B7280] px-3 py-1.5"
                          >
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
          <p className="text-sm text-[#9CA3AF] mb-6">{t("noReviews")}</p>
        )}

        {/* Write review form */}
        {currentUser && !isOwner ? (
          <form onSubmit={submitReview} className="border-t border-[#F3F4F6] pt-5">
            <h3 className="text-sm font-bold text-[#1A1A1A] mb-1">{t("writeReview")}</h3>
            <p className="text-xs text-[#9CA3AF] mb-4">
              Your honest experience helps other students make better decisions.
            </p>

            {/* Visited checkbox */}
            <label
              className="flex items-start gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all mb-4"
              style={{
                borderColor: hasVisited ? "#10B981" : "#E8E8E4",
                background:  hasVisited ? "#F0FDF4" : "white",
              }}
            >
              <input
                type="checkbox" checked={hasVisited}
                onChange={e => setHasVisited(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-green-500"
              />
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">
                  I confirm I have personally visited or lived in this mess ✅
                </p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Unchecked reviews show as "Unverified". Visitors trust verified reviews more.
                </p>
              </div>
            </label>

            {/* Category ratings */}
            <div className="space-y-3 mb-4">
              {RATING_CATEGORIES.map(cat => (
                <div key={cat.key} className="flex items-center gap-3">
                  <span className="text-base w-5">{cat.icon}</span>
                  <span className="text-xs text-[#6B7280] w-32 shrink-0">{t(cat.labelKey)}</span>
                  <StarPicker
                    value={catRatings[cat.key]}
                    onChange={val => setCatRatings(prev => ({ ...prev, [cat.key]:val }))}
                  />
                </div>
              ))}
            </div>

            <textarea
              value={myComment}
              onChange={e => setMyComment(e.target.value)}
              rows={2}
              placeholder={t("reviewPlaceholder")}
              className={`${inputCls} resize-none mb-3`}
            />
            <button
              type="submit"
              disabled={!Object.values(catRatings).some(v=>v>0) || submitting}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed tap-target"
            >
              {submitting ? t("submitting") : t("submitReview")}
            </button>
          </form>
        ) : currentUser && isOwner ? (
          <p className="text-sm text-[#9CA3AF] border-t border-[#F3F4F6] pt-4">
            Owners cannot review their own mess.
          </p>
        ) : (
          <p className="text-sm text-[#6B7280] border-t border-[#F3F4F6] pt-4">
            <Link to="/login" className="text-orange-500 font-bold">{t("login")}</Link> {t("loginToReview")}
          </p>
        )}
      </div>

      {/* ── Q&A Section ── */}
      <div className={cardCls}>
        <h2 className={sectionH2}>❓ Questions & Answers</h2>
        <p className="text-xs text-[#9CA3AF] mb-5">
          Ask anything about this mess — the owner will answer.
        </p>

        {questions.length > 0 ? (
          <div className="space-y-4 mb-6">
            {questions.map(q => (
              <div
                key={q.id}
                className="rounded-2xl p-4 border border-[#E8E8E4]"
              >
                {/* Question */}
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={q.askerPhoto || `https://ui-avatars.com/api/?name=${q.askerName??'U'}`}
                    alt={q.askerName ?? "User"}
                    className="w-7 h-7 rounded-full shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1A1A1A]">{q.askerName ?? "Anonymous"}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:"#EFF6FF", color:"#1D4ED8" }}>Question</span>
                      </div>
                      {isOwner && (
                        <button
                          onClick={() => deleteQuestion(q.id)}
                          className="text-[10px] text-[#D1D5DB] hover:text-red-400 transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-[#374151] mt-1 leading-relaxed">{q.question}</p>
                  </div>
                </div>

                {/* Answers */}
                {(q.answers??[]).length > 0 && (
                  <div className="ml-10 space-y-2 mb-3">
                    {q.answers.map((ans, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <img
                          src={ans.answererPhoto || `https://ui-avatars.com/api/?name=${ans.answererName??'U'}`}
                          alt={ans.answererName ?? "User"}
                          className="w-6 h-6 rounded-full shrink-0"
                        />
                        <div className="flex-1 rounded-2xl px-3 py-2" style={{ background:"#FFF7ED" }}>
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#1A1A1A]">{ans.answererName ?? "Anonymous"}</span>
                              {ans.isOwner && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white">Owner</span>
                              )}
                            </div>
                            {isOwner && ans.answeredBy === currentUser?.uid && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setEditingAns(prev => ({
                                    ...prev, [q.id]: prev[q.id]===null||prev[q.id]===undefined ? ans.text : null
                                  }))}
                                  className="text-[10px] text-orange-400 hover:text-orange-600 font-bold"
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  onClick={() => deleteAnswer(q.id)}
                                  className="text-[10px] text-[#D1D5DB] hover:text-red-400 font-bold"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>
                          {isOwner && editingAns[q.id]!==null && editingAns[q.id]!==undefined && ans.answeredBy===currentUser?.uid ? (
                            <div className="flex gap-2 mt-1">
                              <input
                                type="text"
                                value={editingAns[q.id]}
                                onChange={e => setEditingAns(prev => ({ ...prev, [q.id]:e.target.value }))}
                                className="flex-1 border border-orange-300 rounded-xl px-2 py-1 text-xs outline-none bg-white"
                                autoFocus
                                onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); saveEditedAnswer(q.id); } }}
                              />
                              <button
                                onClick={() => saveEditedAnswer(q.id)}
                                disabled={!editingAns[q.id]?.trim() || savingEdit[q.id]}
                                className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-xl disabled:opacity-50"
                              >
                                {savingEdit[q.id] ? "…" : "Save"}
                              </button>
                              <button
                                onClick={() => setEditingAns(prev => ({ ...prev, [q.id]:null }))}
                                className="text-[#9CA3AF] text-[10px] px-1"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs text-[#6B7280] leading-relaxed">{ans.text}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Answer input — owner only */}
                {currentUser && currentUser.uid===(mess?.ownerId??mess?.owner_id) && (
                  <div className="ml-10 flex gap-2 mt-2">
                    <input
                      type="text"
                      value={answerMap[q.id] ?? ""}
                      onChange={e => setAnswerMap(prev => ({ ...prev, [q.id]:e.target.value }))}
                      placeholder="Write your answer as the owner…"
                      className="flex-1 border border-[#E8E8E4] rounded-xl px-3 py-2 text-xs outline-none transition-colors"
                      onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); submitAnswer(q.id); } }}
                    />
                    <button
                      onClick={() => submitAnswer(q.id)}
                      disabled={!answerMap[q.id]?.trim() || postingAns[q.id]}
                      className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {postingAns[q.id] ? "…" : "Answer"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#9CA3AF] mb-5">No questions yet — be the first to ask!</p>
        )}

        {/* Ask a question — non-owners only */}
        {currentUser && !isOwner ? (
          <form onSubmit={submitQuestion} className="border-t border-[#F3F4F6] pt-4">
            <p className="text-xs font-bold text-[#1A1A1A] mb-2">Ask a question</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={myQuestion}
                onChange={e => setMyQuestion(e.target.value)}
                placeholder="e.g. Is parking available? Is gas included in rent?"
                className={`flex-1 ${inputCls}`}
              />
              <button
                type="submit"
                disabled={!myQuestion.trim() || postingQ}
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold px-4 py-2.5 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap tap-target"
              >
                {postingQ ? "…" : "Ask →"}
              </button>
            </div>
          </form>
        ) : !currentUser ? (
          <p className="text-sm text-[#6B7280] border-t border-[#F3F4F6] pt-4">
            <Link to="/login" className="text-orange-500 font-bold">Login</Link> to ask a question.
          </p>
        ) : null}
      </div>

    </div>
  );
}
