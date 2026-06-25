// ─────────────────────────────────────────────────
//  Dashboard.js  —  Phase 2 redesign
//  Universal dashboard for owners and finders
//  • Warm colors, rounded-3xl, skeleton loader
//  • Animated stat counters
//  • Profile tab with save confirmation
//  • Zero ESLint errors
// ─────────────────────────────────────────────────

import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection, query, where, getDocs,
  doc, deleteDoc, updateDoc, setDoc,
  serverTimestamp
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db }      from "../firebase";
import { useAuth }       from "../contexts/AuthContext";
import { DashboardSkeleton } from "../components/Skeleton";

// ── Animated counter ──────────────────────────────
function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const target   = Number(value) || 0;
    const duration = 600;
    const start    = performance.now();

    function tick(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    }

    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [value]);

  return <span className="count-animate">{display}</span>;
}

// ── Stat card ─────────────────────────────────────
function StatCard({ emoji, label, value, accentBg }) {
  return (
    <div
      className="relative bg-white rounded-3xl p-5 border border-[#E8E8E4] shadow-card overflow-hidden"
    >
      <div
        className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10"
        style={{ background: accentBg }}
      />
      <p className="text-2xl mb-2">{emoji}</p>
      <p className="text-3xl font-extrabold text-[#1A1A1A]">
        <AnimatedCounter value={value ?? 0} />
      </p>
      <p className="text-xs text-[#6B7280] mt-1 font-medium">{label}</p>
    </div>
  );
}

// ── Availability toggle ───────────────────────────
function AvailToggle({ available, onChange, loading }) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
      style={{
        background: available ? "#10B981" : "#D1D5DB",
        opacity:    loading   ? 0.5       : 1,
        cursor:     loading   ? "not-allowed" : "pointer",
      }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: available ? "translateX(24px)" : "translateX(4px)" }}
      />
    </button>
  );
}

// ── Delete confirmation modal ─────────────────────
function DeleteModal({ onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl shadow-glass w-full max-w-sm p-6 animate-scale-in">
        <p className="text-3xl mb-2">🗑️</p>
        <h2 className="font-extrabold text-[#1A1A1A] text-lg mb-1">Delete this listing?</h2>
        <p className="text-sm text-[#6B7280] mb-5">
          This can't be undone. The listing will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border border-[#E8E8E4] text-[#6B7280] font-semibold text-sm hover:bg-[#FAFAF8] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Listings tab ──────────────────────────────────
function ListingsTab({ currentUser, userRole }) {
  const navigate = useNavigate();
  const isOwner  = userRole === "owner";

  const [listings,      setListings]      = useState([]);
  const [loadingData,   setLoadingData]   = useState(true);
  const [deletingId,    setDeletingId]    = useState(null);
  const [togglingId,    setTogglingId]    = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      setLoadingData(true);
      try {
        const colName = isOwner ? "messes" : "roommate_requests";
        const field   = isOwner ? "ownerId" : "user_id";
        const q       = query(collection(db, colName), where(field, "==", currentUser.uid));
        const snap    = await getDocs(q);
        setListings(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      } catch (err) { console.error(err); }
      finally { setLoadingData(false); }
    })();
  }, [currentUser, isOwner, userRole]);

  const totalViews = listings.reduce((s,l) => s+(l?.views??0), 0);
  const totalWA    = listings.reduce((s,l) => s+(l?.whatsappClicks??0), 0);
  const totalSeats = isOwner
    ? listings.reduce((s,l) => s+(l?.availableSeats??l?.seats_available??0), 0)
    : null;

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, isOwner?"messes":"roommate_requests", id));
      setListings(prev => prev.filter(l => l.id!==id));
    } catch (err) { console.error(err); }
    setDeletingId(null);
    setConfirmDelete(null);
  }

  async function handleToggle(listing) {
    setTogglingId(listing.id);
    const newVal = !listing.available;
    try {
      await updateDoc(doc(db, "messes", listing.id), { available:newVal });
      setListings(prev => prev.map(l => l.id===listing.id?{...l,available:newVal}:l));

      if (newVal === true) {
        try {
          const watchersSnap = await getDocs(collection(db, "notifications"));
          const notifyPromises = [];
          for (const userDoc of watchersSnap.docs) {
            const { getDoc } = await import("firebase/firestore");
            const alertRef   = doc(db, "notifications", userDoc.id, "alerts", listing.id);
            const alertSnap  = await getDoc(alertRef);
            if (alertSnap.exists() && alertSnap.data().status==="waiting") {
              notifyPromises.push(
                updateDoc(alertRef, {
                  status:"notified", seen:false, notifiedAt:serverTimestamp(),
                })
              );
            }
          }
          await Promise.all(notifyPromises);
        } catch (notifyErr) { console.error("Notification trigger error:", notifyErr); }
      }
    } catch (err) { console.error(err); }
    setTogglingId(null);
  }

  if (loadingData) return <DashboardSkeleton />;

  return (
    <>
      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard emoji="📋" label="Total Listings"    value={listings.length} accentBg="#F97316" />
        <StatCard emoji="👁️" label="Total Views"       value={totalViews}      accentBg="#3B82F6" />
        <StatCard emoji="💬" label="WhatsApp Clicks"   value={totalWA}         accentBg="#10B981" />
        {isOwner && (
          <StatCard emoji="🛏️" label="Available Seats" value={totalSeats}      accentBg="#8B5CF6" />
        )}
      </div>

      {/* Empty state */}
      {listings.length === 0 ? (
        <div
          className="text-center py-20 rounded-3xl border-2 border-dashed border-[#E8E8E4]"
          style={{ background: "white" }}
        >
          <p className="text-5xl mb-3">📭</p>
          <p className="font-bold text-[#1A1A1A] text-lg mb-1">No listings yet</p>
          <p className="text-sm text-[#9CA3AF] mb-5">Post your first listing to get started.</p>
          <Link
            to={isOwner ? "/post" : "/post-roommate"}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-2xl font-bold text-sm transition-colors inline-block"
          >
            + Post Now
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {listings.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-[#E8E8E4] shadow-card p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                {/* Title + badges */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-bold text-[#1A1A1A] text-sm truncate">
                    {item?.title || item?.name ||
                      (item?.listingType==="sublet" ? "🏠 Sublet" : "🤝 Roommate Wanted")}
                  </h3>
                  {isOwner && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: item?.available ? "#D1FAE5" : "#F3F4F6",
                        color:      item?.available ? "#065F46" : "#6B7280",
                      }}
                    >
                      {item?.available ? "Live" : "Full"}
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#9CA3AF]">
                  📍 {[item?.area, item?.city||item?.district].filter(Boolean).join(" · ") || "Location not set"}
                </p>

                {/* Stats row */}
                <div className="flex items-center gap-4 mt-2 text-xs text-[#9CA3AF] flex-wrap">
                  {isOwner && <span>৳{Number(item?.rent||0).toLocaleString()}/mo</span>}
                  {!isOwner && <span>💰 ৳{Number(item?.budget||0).toLocaleString()}/mo budget</span>}
                  <span>👁️ {item?.views??0} views</span>
                  {isOwner && <span>💬 {item?.whatsappClicks??0} WhatsApp</span>}
                  <span>📅 {item?.created_at?.toDate?.()?.toLocaleDateString?.()??'—'}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 sm:flex-col sm:items-end shrink-0">
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9CA3AF]">
                      {item?.available ? "Live" : "Full"}
                    </span>
                    <AvailToggle
                      available={!!item?.available}
                      onChange={() => handleToggle(item)}
                      loading={togglingId===item.id}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {isOwner && (
                    <button
                      onClick={() => navigate(`/mess/${item.id}`)}
                      className="text-xs px-3 py-2 rounded-xl border border-[#E8E8E4] text-[#6B7280] hover:border-orange-300 hover:text-orange-500 font-semibold transition-colors tap-target"
                    >
                      👁️ View
                    </button>
                  )}
                  {!isOwner && (
                    <Link
                      to={`/roommate/${item.id}`}
                      className="text-xs px-3 py-2 rounded-xl border border-[#E8E8E4] text-[#6B7280] hover:border-orange-300 hover:text-orange-500 font-semibold transition-colors tap-target"
                    >
                      👁️ View
                    </Link>
                  )}
                  <button
                    onClick={() => setConfirmDelete(item.id)}
                    className="text-xs px-3 py-2 rounded-xl border border-[#E8E8E4] text-[#6B7280] hover:border-red-300 hover:text-red-400 font-semibold transition-colors tap-target"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <DeleteModal
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          deleting={deletingId===confirmDelete}
        />
      )}
    </>
  );
}

// ── Profile tab ───────────────────────────────────
function ProfileTab({ currentUser }) {
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? "");
  const [phone,       setPhone]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState("");

  useEffect(() => {
    (async () => {
      if (!currentUser?.uid) return;
      try {
        const { getDoc } = await import("firebase/firestore");
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) {
          setPhone(snap.data()?.phone ?? "");
          if (snap.data()?.name) setDisplayName(snap.data().name);
        }
      } catch {}
    })();
  }, [currentUser]);

  async function handleSave(e) {
    e.preventDefault();
    if (!displayName?.trim()) { setError("Display name cannot be empty."); return; }
    setError("");
    setSaving(true);
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      await setDoc(doc(db, "users", currentUser.uid), {
        name: displayName.trim(), phone: phone.trim(), updatedAt: new Date(),
      }, { merge: true });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      setError("Failed to update profile. Please try again.");
    } finally { setSaving(false); }
  }

  const inputCls = "w-full border border-[#E8E8E4] rounded-2xl px-4 py-3 text-sm outline-none text-[#1A1A1A] transition-colors bg-white";

  return (
    <div className="max-w-lg">

      {/* Success banner */}
      {success && (
        <div
          className="mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold border"
          style={{ background:"#F0FDF4", borderColor:"#BBF7D0", color:"#065F46" }}
        >
          <span className="text-lg">✅</span>
          Profile updated successfully!
        </div>
      )}

      {/* Avatar card */}
      <div className="bg-white rounded-3xl border border-[#E8E8E4] shadow-card p-6 mb-5 flex items-center gap-4">
        <img
          src={
            currentUser?.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName??'U')}&background=FED7AA&color=C2410C&size=80`
          }
          alt={currentUser?.displayName ?? "User"}
          className="w-16 h-16 rounded-2xl border-2 border-[#E8E8E4] object-cover shrink-0"
        />
        <div>
          <h3 className="font-extrabold text-[#1A1A1A] text-lg">
            {currentUser?.displayName ?? "No name set"}
          </h3>
          <p className="text-sm text-[#9CA3AF]">{currentUser?.email ?? ""}</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Profile photo managed by Google
          </p>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-3xl border border-[#E8E8E4] shadow-card p-6">
        <h2 className="font-bold text-[#1A1A1A] text-base mb-5">✏️ Edit Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1.5">Display Name *</label>
            <input
              type="text" value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your full name"
              className={inputCls} required
            />
            <p className="text-xs text-[#9CA3AF] mt-1">
              This is how your name appears on listings.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1.5">Phone Number</label>
            <input
              type="tel" value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6B7280] mb-1.5">Email</label>
            <input
              type="email" value={currentUser?.email ?? ""}
              disabled
              className={`${inputCls} opacity-50 cursor-not-allowed`}
            />
            <p className="text-xs text-[#9CA3AF] mt-1">
              Email is managed by Google.
            </p>
          </div>

          {error && (
            <div
              className="text-sm px-4 py-3 rounded-2xl border"
              style={{ background:"#FEF2F2", borderColor:"#FECACA", color:"#991B1B" }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit" disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-2xl font-bold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed tap-target"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────
export default function Dashboard() {
  const { currentUser, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState("listings");

  const isOwner  = userRole === "owner";
  const isFinder = userRole === "finder";

  const tabs = [
    { id:"listings", label: isOwner ? "🏠 My Listings" : "🤝 My Posts" },
    { id:"profile",  label: "👤 Edit Profile" },
  ];

  return (
    <div
      className="min-h-screen pb-28 md:pb-8 animate-fade-in"
      style={{ backgroundColor: "#FAFAF8" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1A1A1A]">
              {isOwner ? "⚙️ Owner Dashboard" : "🎓 My Dashboard"}
            </h1>
            <p className="text-sm text-[#9CA3AF] mt-0.5">
              Welcome back, {currentUser?.displayName?.split(" ")[0] ?? "there"} 👋
            </p>
          </div>
          {isOwner && (
            <Link
              to="/post"
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm transition-colors shadow-card tap-target"
            >
              + Post Mess
            </Link>
          )}
          {isFinder && (
            <Link
              to="/post-roommate"
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm transition-colors shadow-card tap-target"
            >
              + Post Roommate
            </Link>
          )}
        </div>

        {/* Tab bar */}
        <div
          className="flex gap-1.5 mb-6 p-1.5 rounded-2xl w-fit border border-[#E8E8E4] shadow-soft"
          style={{ background: "white" }}
        >
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-5 py-2 rounded-xl text-sm font-bold transition-all tap-target"
              style={{
                background: activeTab===tab.id ? "#F97316" : "transparent",
                color:      activeTab===tab.id ? "white"    : "#6B7280",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "listings" && (
          <ListingsTab currentUser={currentUser} userRole={userRole} />
        )}
        {activeTab === "profile" && (
          <ProfileTab currentUser={currentUser} />
        )}
      </div>
    </div>
  );
}
