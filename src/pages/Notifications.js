// ─────────────────────────────────────────────────
//  Notifications.js  —  Phase 2 redesign
//  • Warm colors, rounded-3xl
//  • NotificationsSkeleton while loading
//  • Green glow on notified cards
//  • Zero ESLint errors
// ─────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection, getDocs, doc,
  updateDoc, deleteDoc, query, orderBy
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { NotificationsSkeleton } from "../components/Skeleton";

// ── Alert card ────────────────────────────────────
function AlertCard({ alert, onRemove, onView, type }) {
  const isNotified = type === "notified";

  return (
    <div
      className="bg-white rounded-3xl p-5 mb-3 border-2 transition-all shadow-card"
      style={{
        borderColor: isNotified ? "#86EFAC" : "#E8E8E4",
        boxShadow:   isNotified
          ? "0 4px 20px rgba(16,185,129,0.12), 0 1px 4px rgba(0,0,0,0.04)"
          : "var(--shadow-card)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">

          {/* Icon */}
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-xl"
            style={{ background: isNotified ? "#F0FDF4" : "#FAFAF8" }}
          >
            {isNotified ? "🎉" : "⏳"}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-[#1A1A1A] text-sm truncate">
                {alert.messTitle || "Mess"}
              </h3>
              {isNotified && !alert.seen && (
                <span
                  className="text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full"
                  style={{ background: "#10B981" }}
                >
                  NEW
                </span>
              )}
            </div>

            <p className="text-xs text-[#9CA3AF] mt-0.5">
              📍 {[alert.messArea, alert.messCity].filter(Boolean).join(" · ") || "Location"}
              {alert.messRent ? ` · ৳${Number(alert.messRent).toLocaleString()}/mo` : ""}
            </p>

            {isNotified ? (
              <p className="text-xs font-bold mt-1.5" style={{ color: "#059669" }}>
                ✅ A seat is now available — check it out!
              </p>
            ) : (
              <p className="text-xs text-[#9CA3AF] mt-1.5">
                Watching for availability…
              </p>
            )}

            {alert.notifiedAt && (
              <p className="text-[10px] text-[#D1D5DB] mt-1">
                Notified: {alert.notifiedAt?.toDate?.()?.toLocaleDateString?.() ?? ""}
              </p>
            )}
          </div>
        </div>

        {/* Remove X */}
        <button
          onClick={onRemove}
          className="text-[#D1D5DB] hover:text-red-400 transition-colors text-lg shrink-0 tap-target"
          title="Remove alert"
        >
          ✕
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onView}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-2xl text-xs font-bold transition-colors tap-target"
        >
          View Mess →
        </button>
        <button
          onClick={onRemove}
          className="px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors tap-target"
          style={{ border: "1.5px solid #E8E8E4", color: "#9CA3AF" }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────
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

        // Mark notified alerts as seen
        const unseen = data.filter(a => a.status === "notified" && !a.seen);
        await Promise.all(
          unseen.map(a =>
            updateDoc(
              doc(db, "notifications", currentUser.uid, "alerts", a.id),
              { seen: true }
            )
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
            🔔
          </div>
          <h2 className="text-xl font-extrabold text-[#1A1A1A] mb-2">
            Login to see notifications
          </h2>
          <p className="text-[#6B7280] text-sm mb-6">
            Get notified when a full mess has a seat open up.
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

  const notified = alerts.filter(a => a.status === "notified");
  const waiting  = alerts.filter(a => a.status === "waiting");

  return (
    <div
      className="max-w-2xl mx-auto pb-28 md:pb-8 animate-fade-in"
      style={{ backgroundColor: "#FAFAF8" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1A1A]">
            🔔 Notifications
          </h1>
          <p className="text-[#6B7280] text-sm mt-0.5">
            Availability alerts for messes you're watching
          </p>
        </div>
        {alerts.length > 0 && (
          <span
            className="text-xs font-bold px-3 py-1.5 rounded-full"
            style={{ background: "#FFF7ED", color: "#EA580C" }}
          >
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <NotificationsSkeleton />
      ) : alerts.length === 0 ? (
        <div
          className="text-center py-20 rounded-3xl border-2 border-dashed border-[#E8E8E4]"
          style={{ background: "white" }}
        >
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl"
            style={{ background: "#FAFAF8" }}
          >
            🔕
          </div>
          <h3 className="text-lg font-extrabold text-[#1A1A1A] mb-2">No alerts yet</h3>
          <p className="text-[#6B7280] text-sm mb-6 max-w-xs mx-auto">
            When a mess you're watching is full, tap<br />
            "🔔 Notify when available" to get alerted here.
          </p>
          <Link
            to="/"
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-colors tap-target inline-block"
          >
            Browse Messes
          </Link>
        </div>
      ) : (
        <div className="space-y-2">

          {/* Notified */}
          {notified.length > 0 && (
            <div>
              <p
                className="text-xs font-extrabold uppercase tracking-wide mb-3 px-1"
                style={{ color: "#059669" }}
              >
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

          {/* Waiting */}
          {waiting.length > 0 && (
            <div className={notified.length > 0 ? "mt-4" : ""}>
              <p
                className="text-xs font-extrabold uppercase tracking-wide mb-3 px-1"
                style={{ color: "#9CA3AF" }}
              >
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
