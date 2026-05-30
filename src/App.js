// ─────────────────────────────────────────────────
//  App.js — final with all contexts + routes
// ─────────────────────────────────────────────────

import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth }          from "./contexts/AuthContext";
import { LanguageProvider }               from "./contexts/LanguageContext";
import { DarkModeProvider, useDarkMode }  from "./contexts/DarkModeContext";
import Navbar                             from "./components/Navbar";
import BottomNav                          from "./components/BottomNav";
import RoleSelectionModal                 from "./components/RoleSelectionModal";
import ProtectedRoute                     from "./components/ProtectedRoute";
import Home                               from "./pages/Home";
import PostMess                           from "./pages/PostMess";
import PostRoommate                       from "./pages/PostRoommate";
import MessDetail                         from "./pages/MessDetail";
import RoommateDetail                     from "./pages/RoommateDetail";
import Login                              from "./pages/Login";
import RoommateBoard                      from "./pages/RoommateBoard";
import SavedMesses                        from "./pages/SavedMesses";
import Dashboard                          from "./pages/Dashboard";

function AppInner() {
  const { currentUser, userRole } = useAuth();
  // ── FIX: use "dark" not "darkMode" — matches DarkModeContext value shape ──
  const { dark }           = useDarkMode();
  const needsRoleSelection = currentUser && userRole === null;

  // Apply/remove "dark" class on <html> so Tailwind dark: variants work globally.
  // DarkModeContext already does this via useLayoutEffect, so this useEffect is
  // a safety net in case AppInner mounts after the context's first run.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-slate-950 dark:text-white transition-colors duration-200">
      <Navbar />
      {needsRoleSelection && <RoleSelectionModal />}

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          {/* Public */}
          <Route path="/"              element={<Home />} />
          <Route path="/mess/:id"      element={<MessDetail />} />
          <Route path="/roommates"     element={<RoommateBoard />} />
          <Route path="/roommate/:id"  element={<RoommateDetail />} />
          <Route path="/login"         element={<Login />} />
          <Route path="/saved"         element={<SavedMesses />} />

          {/* Owner only */}
          <Route path="/post" element={
            <ProtectedRoute requiredRole="owner"><PostMess /></ProtectedRoute>
          } />

          {/* Finder only */}
          <Route path="/post-roommate" element={
            <ProtectedRoute requiredRole="finder"><PostRoommate /></ProtectedRoute>
          } />

          {/* Any logged-in user — role-aware inside */}
          <Route path="/dashboard" element={
            <ProtectedRoute requiredRole="any"><Dashboard /></ProtectedRoute>
          } />
        </Routes>
      </main>

      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <DarkModeProvider>
      <LanguageProvider>
        <AuthProvider>
          <Router>
            <AppInner />
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </DarkModeProvider>
  );
}

export default App;
