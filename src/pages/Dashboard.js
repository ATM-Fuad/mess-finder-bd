// ─────────────────────────────────────────────────
//  Dashboard.js — Universal dashboard
//  NEW: "Edit Profile" tab for all users
//       Updates Firebase Auth displayName +
//       Firestore users/{uid} document
// ─────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection, query, where, getDocs,
  doc, deleteDoc, updateDoc, setDoc
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

// ── Shared sub-components ─────────────────────────
function StatCard({ emoji, label, value, accent }) {
  return (
    <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 ${accent}`} />
      <p className="text-2xl mb-2">{emoji}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value ?? 0}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function DeleteModal({ onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6">
        <p className="text-xl mb-1">🗑️</p>
        <h2 className="font-bold text-gray-900 dark:text-white text-lg">Delete this listing?</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-5">This can't be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-60">
            {deleting ? "Deleting…" : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AvailToggle({ available, onChange, loading }) {
  return (
    <button onClick={onChange} disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
        ${available ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"}
        ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${available?"translate-x-6":"translate-x-1"}`} />
    </button>
  );
}

// ── Tab: My Listings ──────────────────────────────
function ListingsTab({ currentUser, userRole }) {
  const navigate = useNavigate();
  const isOwner  = userRole === "owner";
  const isFinder = userRole === "finder";

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
        const q = query(collection(db, colName), where(field, "==", currentUser.uid));
        const snap = await getDocs(q);
        setListings(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      } catch (err) { console.error(err); }
      finally { setLoadingData(false); }
    })();
  }, [currentUser, userRole, isOwner]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalViews = listings.reduce((s,l) => s+(l?.views??0), 0);
  const totalWA    = listings.reduce((s,l) => s+(l?.whatsappClicks??0), 0);
  const totalSeats = isOwner ? listings.reduce((s,l) => s+(l?.availableSeats??l?.seats_available??0), 0) : null;

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, isOwner?"messes":"roommate_requests", id));
      setListings(prev => prev.filter(l => l.id !== id));
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
    } catch (err) { console.error(err); }
    setTogglingId(null);
  }

  return (
    <>
      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard emoji="📋" label="Total Listings"   value={listings.length} accent="bg-orange-500" />
        <StatCard emoji="👁️" label="Total Views"      value={totalViews}      accent="bg-blue-500" />
        <StatCard emoji="💬" label="WhatsApp Clicks"  value={totalWA}         accent="bg-green-500" />
        {isOwner && <StatCard emoji="🛏️" label="Available Seats" value={totalSeats} accent="bg-purple-500" />}
      </div>

      {/* List */}
      {loadingData ? (
        <div className="text-center py-16 text-gray-400">⏳ Loading…</div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 transition-colors">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-semibold text-gray-700 dark:text-gray-300 text-lg">No listings yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-5">Post your first listing to get started.</p>
          <Link to={isOwner?"/post":"/post-roommate"}
            className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors">
            + Post Now
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {listings.map(item => (
            <div key={item.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">
                    {item?.title || item?.name || (item?.listingType==="sublet"?"🏠 Sublet":"🤝 Roommate Wanted")}
                  </h3>
                  {isOwner && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item?.available?"bg-green-100 text-green-700":"bg-gray-100 dark:bg-slate-700 text-gray-500"}`}>
                      {item?.available?"Available":"Full"}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  📍 {[item?.area, item?.city||item?.district].filter(Boolean).join(" · ") || "Location not set"}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                  {isOwner && <span>৳{Number(item?.rent||0).toLocaleString()}/mo</span>}
                  {isFinder && <span>💰 Budget ৳{Number(item?.budget||0).toLocaleString()}/mo</span>}
                  <span>👁️ {item?.views??0} views</span>
                  {isOwner && <span>💬 {item?.whatsappClicks??0} WhatsApp</span>}
                  <span>📅 {item?.created_at?.toDate?.()?.toLocaleDateString?.()??'—'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0">
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{item?.available?"Live":"Full"}</span>
                    <AvailToggle available={!!item?.available} onChange={()=>handleToggle(item)} loading={togglingId===item.id} />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {isOwner && (
                    <button onClick={()=>navigate(`/mess/${item.id}`)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:border-orange-300 hover:text-orange-500 font-medium transition-colors">
                      👁️ View
                    </button>
                  )}
                  {isFinder && (
                    <Link to={`/roommate/${item.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:border-orange-300 hover:text-orange-500 font-medium transition-colors">
                      👁️ View
                    </Link>
                  )}
                  <button onClick={()=>setConfirmDelete(item.id)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:border-red-300 hover:text-red-500 font-medium transition-colors">
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
          onConfirm={()=>handleDelete(confirmDelete)}
          onCancel={()=>setConfirmDelete(null)}
          deleting={deletingId===confirmDelete}
        />
      )}
    </>
  );
}

// ── Tab: Edit Profile ─────────────────────────────
function ProfileTab({ currentUser }) {
  const [displayName, setDisplayName] = useState(currentUser?.displayName ?? "");
  const [phone,       setPhone]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState("");

  // Load existing phone from Firestore on mount
  useEffect(() => {
    (async () => {
      if (!currentUser?.uid) return;
      try {
        const { getDoc } = await import("firebase/firestore");
        const snap = await getDoc(doc(db, "users", currentUser.uid));
        if (snap.exists()) {
          setPhone(snap.data()?.phone ?? "");
          // Also pre-fill display name from Firestore if different
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
      // 1. Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim(),
      });

      // 2. Update Firestore users/{uid}
      await setDoc(doc(db, "users", currentUser.uid), {
        name:      displayName.trim(),
        phone:     phone.trim(),
        updatedAt: new Date(),
      }, { merge: true });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error("Profile update error:", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors";
  const labelCls = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5";

  return (
    <div className="max-w-lg">

      {/* Success banner */}
      {success && (
        <div className="mb-5 flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-xl text-sm font-medium">
          <span className="text-lg">✅</span>
          Profile updated successfully!
        </div>
      )}

      {/* Avatar + info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 mb-5 flex items-center gap-4 transition-colors">
        <img
          src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${currentUser?.displayName??'U'}&size=80`}
          alt={currentUser?.displayName ?? "User"}
          className="w-16 h-16 rounded-2xl border-2 border-orange-100 dark:border-slate-600 object-cover shrink-0"
        />
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">
            {currentUser?.displayName ?? "No name set"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{currentUser?.email ?? ""}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Profile photo is managed by Google
          </p>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-6 transition-colors">
        <h2 className="font-semibold text-gray-800 dark:text-white mb-5">✏️ Edit Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">

          <div>
            <label className={labelCls}>Display Name *</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your full name"
              className={inputCls}
              required
            />
            <p className="text-xs text-gray-400 mt-1">This is how your name appears on your listings.</p>
          </div>

          <div>
            <label className={labelCls}>Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">Used as your default contact number.</p>
          </div>

          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={currentUser?.email ?? ""}
              disabled
              className={`${inputCls} opacity-50 cursor-not-allowed`}
            />
            <p className="text-xs text-gray-400 mt-1">Email is managed by Google and cannot be changed here.</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl border border-red-200 dark:border-red-800">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
  const [activeTab, setActiveTab] = useState("listings"); // "listings" | "profile"

  const isOwner  = userRole === "owner";
  const isFinder = userRole === "finder";

  const tabs = [
    { id:"listings", label: isOwner ? "🏠 My Listings" : "🤝 My Posts" },
    { id:"profile",  label: "👤 Edit Profile" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors pb-28 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isOwner ? "⚙️ Owner Dashboard" : "🎓 My Dashboard"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
              Welcome back, {currentUser?.displayName?.split(" ")[0] ?? "there"} 👋
            </p>
          </div>
          {isOwner  && <Link to="/post" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm">+ Post Mess</Link>}
          {isFinder && <Link to="/post-roommate" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm">+ Post Roommate</Link>}
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-6 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-1.5 w-fit transition-colors">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all
                ${activeTab===tab.id
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"}`}
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
