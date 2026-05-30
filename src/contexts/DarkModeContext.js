// ─────────────────────────────────────────────────
//  DarkModeContext.js
//  src/contexts/DarkModeContext.js
//  Global dark mode — persists to localStorage
// ─────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState } from "react";

const DarkModeContext = createContext();

export function useDarkMode() {
  return useContext(DarkModeContext);
}

export function DarkModeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("messfinder_dark") === "true"; }
    catch { return false; }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try { localStorage.setItem("messfinder_dark", dark); } catch {}
  }, [dark]);

  function toggleDark() { setDark(d => !d); }

  return (
    <DarkModeContext.Provider value={{ dark, toggleDark }}>
      {children}
    </DarkModeContext.Provider>
  );
}
