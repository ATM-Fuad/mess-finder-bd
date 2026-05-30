// ─────────────────────────────────────────────────
//  App.js — final with all contexts + routes
// ─────────────────────────────────────────────────

import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth }                  from "./contexts/AuthContext";
import { LanguageProvider }                        from "./contexts/LanguageContext";
import { DarkModeProvider, useDarkMode }           from "./contexts/DarkModeContext";
import Navbar                                      from "./components/Navbar";
import BottomNav                                   from "./components/BottomNav";
import RoleSelectionModal                          from "./components/RoleSelectionModal";
import ProtectedRoute                              from "./components/ProtectedRoute";
import Home                                        from "./pages/Home";
import PostMess                                    from "./pages/PostMess";
import PostRoommate                                from "./pages/PostRoommate";
import MessDetail                                  from "./pages/MessDetail";
import RoommateDetail                              from "./pages/RoommateDetail";
import Login                                       from "./pages/Login";
import RoommateBoard                               from "./pages/RoommateBoard";
import SavedMesses                                 from "./pages/SavedMesses";
import Dashboard                                   from "./pages/Dashboard";

function AppInner() {
  const { currentUser, userRole } = useAuth();
  const { darkMode }              = useDarkMode();
  const needsRoleSelection        = currentUser && userRole === null;

  // ── KEY FIX: apply/remove "dark" class on <html> so all
  //    Tailwind dark: variants activate across the whole app ──
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

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
