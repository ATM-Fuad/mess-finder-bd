// ─────────────────────────────────────────────────
//  Notifications.js
//  src/pages/Notifications.js
//  Shows all availability alerts for the current user
// ─────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection, getDocs, doc,
  updateDoc, deleteDoc, query, orderBy
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export default function Notifications() {
  const { currentUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) { setLoading(false); return; }

    async function fetchAlerts() {
      setLoading(true);
      try {
        const q = query(
          collection(db, "notifications", currentUser.uid, "alerts"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAlerts(data);

        // Mark all "notified" ones as seen
        const unseen = data.filter(a => a.status === "notified" && !a.seen);
        await Promise.all(
          unseen.map(a =>
            updateDoc(doc(db, "notifications", currentUser.uid, "alerts", a.id), { seen: true })
          )
        );
      } catch (err) {
        console.error("fetchAlerts:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAlerts();
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  async function removeAlert(alertId) {
    try {
      await deleteDoc(doc(db, "notifications", currentUser.uid, "alerts", alertId));
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (err) {
      console.error("removeAlert:", err);
    }
  }

  // Not logged in
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="text-5xl mb-4">🔔</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Login to see notifications</h2>
        <p className="text-gray-500 mb-6">Get notified when a full mess has a seat open up.</p>
        <button onClick={loginWithGoogle}
          className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors">
          Login with Google
        </button>
      </div>
    );
  }

  const notified = alerts.filter(a => a.status === "notified");
  const waiting  = alerts.filter(a => a.status === "waiting");

  return (
    <div className="max-w-2xl mx-auto pb-28 md:pb-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔔 Notifications</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Availability alerts for messes you're watching
          </p>
        </div>
        {alerts.length > 0 && (
          <span className="text-xs text-gray-400 font-medium">
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="text-5xl mb-4">🔕</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No alerts yet</h3>
          <p className="text-gray-400 text-sm mb-6">
            When a mess you're watching is full, tap<br/>
            "🔔 Notify when available" to get alerted here.
          </p>
          <Link to="/"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors">
            Browse Messes
          </Link>
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── New availability alerts ── */}
          {notified.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2 px-1">
                🎉 Seat Available!
              </p>
              {notified.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onRemove={() => removeAlert(alert.id)}
                  onView={() => navigate(`/mess/${alert.messId}`)}
                  type="notified"
                />
              ))}
            </div>
          )}

          {/* ── Waiting alerts ── */}
          {waiting.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                ⏳ Watching — currently full
              </p>
              {waiting.map(alert => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onRemove={() => removeAlert(alert.id)}
                  onView={() => navigate(`/mess/${alert.messId}`)}
                  type="waiting"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Individual alert card ─────────────────────────
function AlertCard({ alert, onRemove, onView, type }) {
  const isNotified = type === "notified";

  return (
    <div className={`bg-white rounded-2xl border-2 p-5 mb-3 transition-all
      ${isNotified
        ? "border-green-300 shadow-sm shadow-green-100"
        : "border-gray-100"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg
            ${isNotified ? "bg-green-50" : "bg-gray-50"}`}>
            {isNotified ? "🎉" : "⏳"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-sm truncate">
                {alert.messTitle || "Mess"}
              </h3>
              {isNotified && !alert.seen && (
                <span className="text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">
                  NEW
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-0.5">
              📍 {[alert.messArea, alert.messCity].filter(Boolean).join(" · ") || "Location"}
              {alert.messRent ? ` · ৳${Number(alert.messRent).toLocaleString()}/mo` : ""}
            </p>

            {isNotified ? (
              <p className="text-xs text-green-600 font-medium mt-1.5">
                ✅ A seat is now available — check it out!
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1.5">
                Watching for availability…
              </p>
            )}

            {alert.notifiedAt && (
              <p className="text-[10px] text-gray-300 mt-1">
                Notified: {alert.notifiedAt?.toDate?.()?.toLocaleDateString?.() ?? ""}
              </p>
            )}
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-400 transition-colors text-lg shrink-0"
          title="Remove alert"
        >
          ✕
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onView}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-xl text-xs font-semibold transition-colors"
        >
          View Mess →
        </button>
        <button
          onClick={onRemove}
          className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs font-medium hover:border-red-300 hover:text-red-400 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
