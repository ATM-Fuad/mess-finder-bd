// ─────────────────────────────────────────────────
//  SavedMesses.js  —  Phase 2 redesign
//  • Warm colors, rounded-3xl
//  • MessGridSkeleton while loading
//  • Warm empty state
//  • Zero ESLint errors
// ─────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { Link } from "react-router-dom";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import MessCard from "../components/MessCard";
import { MessGridSkeleton } from "../components/Skeleton";

export default function SavedMesses() {
  const { currentUser, loginWithGoogle } = useAuth();
  const [savedMesses, setSavedMesses] = useState([]);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    async function fetchSaved() {
      if (!currentUser) { setLoading(false); return; }
      try {
        const savedSnap = await getDocs(
          collection(db, "users", currentUser.uid, "saved")
        );
        const messPromises = savedSnap.docs.map(d =>
          getDoc(doc(db, "messes", d.data().mess_id))
        );
        const messSnaps = await Promise.all(messPromises);
        setSavedMesses(
          messSnaps
            .filter(s => s.exists())
            .map(s => ({ id: s.id, ...s.data() }))
        );
      } catch (err) {
        console.error("fetchSaved:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSaved();
  }, [currentUser]);

  // ── Not logged in ─────────────────────────────────
  if (!currentUser) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center px-4 animate-fade-in"
        style={{ backgroundColor: "#FAFAF8" }}
      >
        <div className="text-center max-w-sm">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 text-4xl"
            style={{ background: "#FFF7ED" }}
          >
            🔖
          </div>
          <h2 className="text-xl font-extrabold text-[#1A1A1A] mb-2">
            Login to see bookmarks
          </h2>
          <p className="text-[#6B7280] text-sm mb-6">
            Bookmark messes by tapping 🔖 on any listing — they'll be saved here for later.
          </p>
          <button
            onClick={loginWithGoogle}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-colors tap-target"
          >
            Login with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 md:pb-6 animate-fade-in" style={{ backgroundColor: "#FAFAF8" }}>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[#1A1A1A] flex items-center gap-2">
              🔖 Bookmarked Messes
            </h1>
            <p className="text-[#6B7280] text-sm mt-1">
              Messes you saved — tap 🔖 on a listing to remove
            </p>
          </div>
          {savedMesses.length > 0 && (
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: "#FFF7ED", color: "#EA580C" }}
            >
              {savedMesses.length} saved
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <MessGridSkeleton count={3} />
      ) : savedMesses.length === 0 ? (
        <div
          className="text-center py-20 rounded-3xl border-2 border-dashed border-[#E8E8E4]"
          style={{ background: "white" }}
        >
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl"
            style={{ background: "#FFF7ED" }}
          >
            🔖
          </div>
          <h3 className="text-lg font-extrabold text-[#1A1A1A] mb-2">
            No bookmarks yet
          </h3>
          <p className="text-[#6B7280] text-sm mb-6 max-w-xs mx-auto">
            Browse messes and tap the 🔖 icon on any listing to save it here for later.
          </p>
          <Link
            to="/"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-colors tap-target inline-block"
          >
            Browse Messes →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedMesses.map(mess => (
            <MessCard key={mess.id} mess={mess} />
          ))}
        </div>
      )}
    </div>
  );
}
