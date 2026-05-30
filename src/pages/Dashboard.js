// ─────────────────────────────────────────────────
//  Dashboard.js — Universal dashboard
//  Owner  → sees their mess listings
//  Finder → sees their roommate post(s)
//  Both   → Title, Date, Views, Edit, Delete
//  Security: only author (ownerId/user_id === uid)
// ─────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection, query, where, getDocs,
  doc, deleteDoc, updateDoc, increment
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

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

function AvailToggle({ available, onChange, loading }) {
  return (
    <button onClick={onChange} disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
        ${available ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"}
        ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
        ${available ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

// ── Owner listing row ─────────────────────────────
function MessRow({ listing, onToggle, onEdit, onDeleteRequest, toggling }) {
  const amenities = [...new Set([...(listing?.amenities||[]), ...(listing?.facilities||[])])];
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">{listing?.title || listing?.name || "Untitled"}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${listing?.available ? "bg-green-100 text-green-700" : "bg-gray-100 dark:bg-slate-700 text-gray-500"}`}>
            {listing?.available ? "Available" : "Full"}
          </span>
          {listing?.gender && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 font-medium capitalize">{listing.gender}</span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          📍 {[listing?.area, listing?.city || listing?.district].filter(Boolean).join(" · ") || "Location not set"}
        </p>
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {amenities.slice(0,4).map(a => (
              <span key={a} className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">{a}</span>
            ))}
            {amenities.length > 4 && <span className="text-xs text-gray-400">+{amenities.length-4} more</span>}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span>🛏️ {listing?.availableSeats ?? listing?.seats_available ?? 0} seats</span>
          <span>👁️ {listing?.views ?? 0} views</span>
          <span>💬 {listing?.whatsappClicks ?? 0} WhatsApp</span>
          <span>৳{Number(listing?.rent || 0).toLocaleString()}/mo</span>
        </div>
      </div>
      <div className="flex items-center gap-4 sm:flex-col sm:items-end shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">{listing?.available ? "Available" : "Full"}</span>
          <AvailToggle available={!!listing?.available} onChange={onToggle} loading={toggling} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:border-orange-300 hover:text-orange-500 font-medium transition-colors">
            ✏️ Edit
          </button>
          <button onClick={onDeleteRequest}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:border-red-300 hover:text-red-500 font-medium transition-colors">
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Finder roommate post row ──────────────────────
function RoommateRow({ post, onEdit, onDeleteRequest }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-gray-900 dark:text-white text-base">
            {post?.listingType === "sublet" ? "🏠 Sublet" : "🤝 Roommate Wanted"}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${post?.gender==="female"?"bg-pink-100 text-pink-700":"bg-blue-100 text-blue-700"}`}>
            {post?.gender==="female"?"👩 Female":"👨 Male"}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          📍 {post?.area || "Area not set"}
        </p>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span>💰 ৳{Number(post?.budget||0).toLocaleString()}/mo</span>
          {post?.personsPerRoom && <span>👤 {post.personsPerRoom}/room</span>}
          {post?.roomSize && <span className="capitalize">📐 {post.roomSize}</span>}
          <span>👁️ {post?.views ?? 0} views</span>
          <span>📅 {post?.created_at?.toDate?.()?.toLocaleDateString?.() ?? "—"}</span>
        </div>
        {post?.message && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-1">{post.message}</p>
        )}
      </div>
      <div className="flex items-center gap-2 sm:flex-col sm:items-end shrink-0">
        <Link to={`/roommate/${post?.id}`}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:border-orange-300 hover:text-orange-500 font-medium transition-colors">
          👁️ View
        </Link>
        <button onClick={onDeleteRequest}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:border-red-300 hover:text-red-500 font-medium transition-colors">
          🗑️ Delete
        </button>
      </div>
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────
function DeleteModal({ onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-6 transition-colors">
        <p className="text-xl mb-1">🗑️</p>
        <h2 className="font-bold text-gray-900 dark:text-white text-lg">Delete this listing?</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-5">This can't be undone. The listing will be permanently removed.</p>
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

// ── Main Dashboard ────────────────────────────────
export default function Dashboard() {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  const [listings,      setListings]      = useState([]);
  const [loadingData,   setLoadingData]   = useState(true);
  const [deletingId,    setDeletingId]    = useState(null);
  const [togglingId,    setTogglingId]    = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const isOwner  = userRole === "owner";
  const isFinder = userRole === "finder";

  useEffect(() => {
    if (!currentUser) return;
    fetchListings();
  }, [currentUser, userRole]);

  async function fetchListings() {
    setLoadingData(true);
    try {
      if (isOwner) {
        const q = query(collection(db, "messes"),
          where("ownerId", "==", currentUser.uid));
        const snap = await getDocs(q);
        setListings(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      } else if (isFinder) {
        const q = query(collection(db, "roommate_requests"),
          where("user_id", "==", currentUser.uid));
        const snap = await getDocs(q);
        setListings(snap.docs.map(d => ({ id:d.id, ...d.data() })));
      }
    } catch (err) { console.error("fetchListings:", err); }
    setLoadingData(false);
  }

  // Metrics
  const totalListings = listings.length;
  const totalViews    = listings.reduce((s,l) => s + (l?.views ?? 0), 0);
  const totalWA       = listings.reduce((s,l) => s + (l?.whatsappClicks ?? 0), 0);
  const totalSeats    = isOwner
    ? listings.reduce((s,l) => s + (l?.availableSeats ?? l?.seats_available ?? 0), 0)
    : null;

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      const colName = isOwner ? "messes" : "roommate_requests";
      await deleteDoc(doc(db, colName, id));
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err) { console.error(err); }
    setDeletingId(null);
    setConfirmDelete(null);
  }

  async function handleToggle(listing) {
    setTogglingId(listing.id);
    const newVal = !listing.available;
    try {
      await updateDoc(doc(db, "messes", listing.id), { available: newVal });
      setListings(prev => prev.map(l => l.id === listing.id ? { ...l, available:newVal } : l));
    } catch (err) { console.error(err); }
    setTogglingId(null);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors pb-28 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isOwner ? "⚙️ Owner Dashboard" : "🎓 My Dashboard"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
              {isOwner ? "Manage listings, track views, control availability."
                       : "Manage your roommate and sublet posts."}
            </p>
          </div>
          {isOwner && (
            <Link to="/post"
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm">
              + Post New Mess
            </Link>
          )}
          {isFinder && (
            <Link to="/post-roommate"
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm">
              + Post Roommate
            </Link>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard emoji="📋" label="Total Listings" value={totalListings} accent="bg-orange-500" />
          <StatCard emoji="👁️" label="Total Views"    value={totalViews}    accent="bg-blue-500" />
          <StatCard emoji="💬" label="WhatsApp Clicks" value={totalWA}      accent="bg-green-500" />
          {isOwner && <StatCard emoji="🛏️" label="Available Seats" value={totalSeats} accent="bg-purple-500" />}
        </div>

        {/* Listings */}
        {loadingData ? (
          <div className="text-center py-20 text-gray-400">⏳ Loading your listings…</div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 transition-colors">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold text-gray-700 dark:text-gray-300 text-lg">No listings yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-5">Post your first listing to get started.</p>
            <Link to={isOwner ? "/post" : "/post-roommate"}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors">
              + Post Now
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {listings.map(item => (
              isOwner ? (
                <MessRow key={item.id} listing={item}
                  onToggle={() => handleToggle(item)}
                  onEdit={() => navigate(`/post?edit=${item.id}`)}
                  onDeleteRequest={() => setConfirmDelete(item.id)}
                  toggling={togglingId === item.id}
                />
              ) : (
                <RoommateRow key={item.id} post={item}
                  onDeleteRequest={() => setConfirmDelete(item.id)}
                />
              )
            ))}
          </div>
        )}
      </div>

      {confirmDelete && (
        <DeleteModal
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          deleting={deletingId === confirmDelete}
        />
      )}
    </div>
  );
}
