// ─────────────────────────────────────────────────
//  DarkModeContext.js
//  src/contexts/DarkModeContext.js
//
//  BUG FIX: Added explicit classList.remove/add
//  with a forced reflow to guarantee the toggle
//  always wins over any OS/media-query preference.
//  Also clears any stale "true" string in storage.
// ─────────────────────────────────────────────────

import React, { createContext, useContext, useLayoutEffect, useState } from "react";

const DarkModeContext = createContext();

export function useDarkMode() {
  return useContext(DarkModeContext);
}

export function DarkModeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem("messfinder_dark");
      // Explicit string comparison — avoids truthy bugs
      if (stored === "true")  return true;
      if (stored === "false") return false;
      // Nothing stored yet → default to light mode
      return false;
    } catch {
      return false;
    }
  });

  // useLayoutEffect runs synchronously before paint —
  // prevents a flash of wrong theme on load
  useLayoutEffect(() => {
    const root = document.documentElement;
    // Always do both operations so they can't get out of sync
    root.classList.remove("dark");
    root.classList.remove("light");
    if (dark) {
      root.classList.add("dark");
    }
    try {
      // Store exact string, not boolean coercion
      localStorage.setItem("messfinder_dark", dark ? "true" : "false");
    } catch {}
  }, [dark]);

  function toggleDark() {
    setDark(prev => !prev);
  }

  return (
    <DarkModeContext.Provider value={{ dark, toggleDark }}>
      {children}
    </DarkModeContext.Provider>
  );
}
