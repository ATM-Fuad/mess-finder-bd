// ─────────────────────────────────────────────────
//  NotifyButton.js
//  src/components/NotifyButton.js
//
//  Shows on FULL messes only.
//  Finder clicks → saves alert to Firestore.
//  When mess becomes available → notification
//  appears in their /notifications page.
// ─────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { doc, setDoc, deleteDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function NotifyButton({ mess }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [subscribed, setSubscribed] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [showToast,  setShowToast]  = useState(false);

  // Check if already subscribed on mount
  useEffect(() => {
    if (!currentUser || !mess?.id) return;
    async function check() {
      try {
        const snap = await getDoc(
          doc(db, "notifications", currentUser.uid, "alerts", mess.id)
        );
        setSubscribed(snap.exists());
      } catch {}
    }
    check();
  }, [currentUser, mess?.id]);

  async function handleToggle() {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    setLoading(true);
    try {
      const alertRef = doc(db, "notifications", currentUser.uid, "alerts", mess.id);

      if (subscribed) {
        // Unsubscribe
        await deleteDoc(alertRef);
        setSubscribed(false);
      } else {
        // Subscribe
        await setDoc(alertRef, {
          messId:     mess.id,
          messTitle:  mess.title || mess.name || "Untitled",
          messArea:   mess.area  || "",
          messCity:   mess.city  || mess.district || "",
          messRent:   mess.rent  || 0,
          userId:     currentUser.uid,
          userEmail:  currentUser.email,
          status:     "waiting",   // "waiting" | "notified"
          seen:       false,
          createdAt:  serverTimestamp(),
          notifiedAt: null,
        });
        setSubscribed(true);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (err) {
      console.error("NotifyButton error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all
          ${subscribed
            ? "border-orange-500 bg-orange-50 text-orange-600 hover:bg-red-50 hover:border-red-400 hover:text-red-500"
            : "border-gray-200 bg-white text-gray-600 hover:border-orange-400 hover:text-orange-500"
          } ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <span className={`text-base ${subscribed ? "animate-none" : ""}`}>
          {subscribed ? "🔔" : "🔕"}
        </span>
        {subscribed ? "Notifying me" : "Notify when available"}
      </button>

      {/* Success toast */}
      {showToast && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-green-500 text-white text-xs font-medium px-4 py-2 rounded-xl shadow-lg whitespace-nowrap">
          ✅ We'll notify you when a seat opens!
        </div>
      )}
    </div>
  );
}
