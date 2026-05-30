// ─────────────────────────────────────────────────
//  Dashboard.js
//  src/pages/Dashboard.js
//
//  Owner-only dashboard. Shows metrics + listings
//  with edit, delete, and availability toggle.
// ─────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

// ── Helpers ───────────────────────────────────────
function StatCard({ emoji, label, value, accent }) {
  return (
    <div className={`relative bg-white rounded-2xl p-5 shadow-sm border border-gray-100 overflow-hidden`}>
      {/* Decorative circle */}
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 ${accent}`} />
      <p className="text-2xl mb-2">{emoji}</p>
      <p className="text-3xl font-bold text-gray-900">{value ?? "—"}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function AvailabilityToggle({ available, onChange, loading }) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none
        ${available ? "bg-green-500" : "bg-gray-300"}
        ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
          ${available ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );
}

// ── Main component ────────────────────────────────
export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [listings,      setListings]      = useState([]);
  const [loadingData,   setLoadingData]   = useState(true);
  const [deletingId,    setDeletingId]    = useState(null);
  const [togglingId,    setTogglingId]    = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // id of listing pending confirm

// ── Fetch owner's listings ────────────────────
  useEffect(() => {
    if (!currentUser) return;
    async function fetchListings() {
      setLoadingData(true);
      try {
        const q = query(
          collection(db, "messes"),
          where("ownerId", "==", currentUser.uid)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setListings(data);
      } catch (err) {
        console.error("fetchListings error:", err);
      }
      setLoadingData(false);
    }
    fetchListings();
  }, [currentUser]);

  // ── Derived metrics ───────────────────────────
  const totalListings      = listings.length;
  const totalSeats         = listings.reduce((sum, l) => sum + (l.availableSeats ?? 0), 0);
  const totalViews         = listings.reduce((sum, l) => sum + (l.views ?? 0), 0);

  // ── Delete listing ────────────────────────────
  async function handleDelete(id) {
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "messes", id));
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err) {
      console.error("Delete error:", err);
    }
    setDeletingId(null);
    setConfirmDelete(null);
  }

  // ── Toggle availability ───────────────────────
  async function handleToggle(listing) {
    setTogglingId(listing.id);
    const newVal = !listing.available;
    try {
      await updateDoc(doc(db, "messes", listing.id), { available: newVal });
      setListings(prev =>
        prev.map(l => l.id === listing.id ? { ...l, available: newVal } : l)
      );
    } catch (err) {
      console.error("Toggle error:", err);
    }
    setTogglingId(null);
  }

  // ── Render ────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Manage your listings, track views, and control availability.
            </p>
          </div>
          <Link
            to="/post"
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm"
          >
            + Post New Mess
          </Link>
        </div>

        {/* ── Metrics bar ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard emoji="🏠" label="Total Listings"        value={totalListings} accent="bg-orange-500" />
          <StatCard emoji="🛏️" label="Total Available Seats" value={totalSeats}    accent="bg-green-500"  />
          <StatCard emoji="👁️" label="Total Views"           value={totalViews}    accent="bg-blue-500"   />
        </div>

        {/* ── Listings ── */}
        {loadingData ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">⏳</p>
            <p className="font-medium">Loading your listings…</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-4xl mb-3">🏚️</p>
            <p className="font-semibold text-gray-700 text-lg">No listings yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-5">Post your first mess to get started.</p>
            <Link
              to="/post"
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              + Post a Mess
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {listings.map((listing) => (
              <ListingRow
                key={listing.id}
                listing={listing}
                onToggle={() => handleToggle(listing)}
                onEdit={() => navigate(`/post?edit=${listing.id}`)}
                onDeleteRequest={() => setConfirmDelete(listing.id)}
                toggling={togglingId === listing.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <p className="text-xl mb-1">🗑️</p>
            <h2 className="font-bold text-gray-900 text-lg">Delete this listing?</h2>
            <p className="text-gray-500 text-sm mt-1 mb-5">
              This can't be undone. The listing will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deletingId === confirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors"
              >
                {deletingId === confirmDelete ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Individual listing row ────────────────────────
function ListingRow({ listing, onToggle, onEdit, onDeleteRequest, toggling }) {
  const amenities = listing.amenities ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">

      {/* Left — info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-gray-900 text-base truncate">{listing.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
            ${listing.available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
            {listing.available ? "Available" : "Full"}
          </span>
          {listing.gender && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium capitalize">
              {listing.gender}
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500 mt-1">
          📍 {listing.area ?? listing.location} · {listing.city}
          {listing.nearUniversity && ` · Near ${listing.nearUniversity}`}
        </p>

        {/* Amenity badges */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {amenities.slice(0, 4).map(a => (
              <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{a}</span>
            ))}
            {amenities.length > 4 && (
              <span className="text-xs text-gray-400">+{amenities.length - 4} more</span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span>🛏️ {listing.availableSeats ?? 0} seats available</span>
          <span>👁️ {listing.views ?? 0} views</span>
          <span>৳{(listing.rent ?? 0).toLocaleString()}/month</span>
        </div>
      </div>

      {/* Right — controls */}
      <div className="flex items-center gap-4 sm:flex-col sm:items-end shrink-0">

        {/* Availability toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {listing.available ? "Available" : "Full"}
          </span>
          <AvailabilityToggle
            available={!!listing.available}
            onChange={onToggle}
            loading={toggling}
          />
        </div>

        {/* Edit / Delete */}
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-orange-300 hover:text-orange-500 font-medium transition-colors"
          >
            ✏️ Edit
          </button>
          <button
            onClick={onDeleteRequest}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500 font-medium transition-colors"
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
}
