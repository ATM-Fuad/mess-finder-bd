// ─────────────────────────────────────────────────
//  NotificationBell.js
//  src/components/NotificationBell.js
//  Bell icon with unread badge for Navbar
// ─────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export default function NotificationBell() {
  const { currentUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser) { setUnreadCount(0); return; }

    async function fetchUnread() {
      try {
        const q = query(
          collection(db, "notifications", currentUser.uid, "alerts"),
          where("status", "==", "notified"),
          where("seen",   "==", false)
        );
        const snap = await getDocs(q);
        setUnreadCount(snap.size);
      } catch { setUnreadCount(0); }
    }

    fetchUnread();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <Link
      to="/notifications"
      className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-500 transition-all"
      title="Notifications"
    >
      <span className="text-lg">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
