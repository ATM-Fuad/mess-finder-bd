// ─────────────────────────────────────────────────
//  useRecentlyViewed.js
//  src/hooks/useRecentlyViewed.js
//
//  Stores last 5 viewed mess IDs in localStorage.
//  Returns { recentIds, addRecent, clearRecent }
// ─────────────────────────────────────────────────

import { useState, useEffect } from "react";

const KEY      = "messfinder_recently_viewed";
const MAX_ITEMS = 5;

export function useRecentlyViewed() {
  const [recentIds, setRecentIds] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(recentIds));
    } catch {}
  }, [recentIds]);

  function addRecent(messId) {
    if (!messId) return;
    setRecentIds(prev => {
      // Remove if already in list (move to front)
      const filtered = prev.filter(id => id !== messId);
      // Add to front, keep max 5
      return [messId, ...filtered].slice(0, MAX_ITEMS);
    });
  }

  function clearRecent() {
    setRecentIds([]);
    try { localStorage.removeItem(KEY); } catch {}
  }

  return { recentIds, addRecent, clearRecent };
}
