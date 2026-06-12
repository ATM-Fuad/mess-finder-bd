// ─────────────────────────────────────────────────
//  App.js
//  Phase 1 redesign:
//  • Warm #FAFAF8 base
//  • Smooth fade-in on every route change
//  • All routes preserved
//  • Zero ESLint errors
// ─────────────────────────────────────────────────

import React, { useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LanguageProvider }      from "./contexts/LanguageContext";
import Navbar                    from "./components/Navbar";
import BottomNav                 from "./components/BottomNav";
import RoleSelectionModal        from "./components/RoleSelectionModal";
import ProtectedRoute            from "./components/ProtectedRoute";
import Home                      from "./pages/Home";
import PostMess                  from "./pages/PostMess";
import PostRoommate              from "./pages/PostRoommate";
import MessDetail                from "./pages/MessDetail";
import RoommateDetail            from "./pages/RoommateDetail";
import Login                     from "./pages/Login";
import RoommateBoard             from "./pages/RoommateBoard";
import SavedMesses               from "./pages/SavedMesses";
import Dashboard                 from "./pages/Dashboard";
import Signup                    from "./pages/Signup";
import Notifications             from "./pages/Notifications";
import Compare                   from "./pages/Compare";

// ── Fade wrapper — triggers on every route change ─
function FadeWrapper({ children }) {
  const location  = useLocation();
  const ref       = useRef(null);
  const prevPath  = useRef(location.pathname);

  useEffect(() => {
    if (prevPath.current === location.pathname) return;
    prevPath.current = location.pathname;

    const el = ref.current;
    if (!el) return;

    // Scroll to top on navigation
    window.scrollTo({ top: 0, behavior: "instant" });

    // Apply fade-in animation
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";

    requestAnimationFrame(() => {
      el.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      el.style.opacity    = "1";
      el.style.transform  = "translateY(0)";
    });
  }, [location.pathname]);

  return (
    <div ref={ref} style={{ opacity: 1 }}>
      {children}
    </div>
  );
}

// ── Inner app ─────────────────────────────────────
function AppInner() {
  const { currentUser, userRole } = useAuth();
  const needsRoleSelection = currentUser && userRole === null;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#FAFAF8" }}
    >
      <Navbar />
      {needsRoleSelection && <RoleSelectionModal />}

      <main className="max-w-6xl mx-auto px-4 py-6">
        <FadeWrapper>
          <Routes>
            {/* ── Public ── */}
            <Route path="/"              element={<Home />} />
            <Route path="/mess/:id"      element={<MessDetail />} />
            <Route path="/roommates"     element={<RoommateBoard />} />
            <Route path="/roommate/:id"  element={<RoommateDetail />} />
            <Route path="/login"         element={<Login />} />
            <Route path="/signup"        element={<Signup />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/compare"       element={<Compare />} />
            <Route path="/saved"         element={<SavedMesses />} />

            {/* ── Owner only ── */}
            <Route path="/post" element={
              <ProtectedRoute requiredRole="owner">
                <PostMess />
              </ProtectedRoute>
            } />

            {/* ── Finder only ── */}
            <Route path="/post-roommate" element={
              <ProtectedRoute requiredRole="finder">
                <PostRoommate />
              </ProtectedRoute>
            } />

            {/* ── Any logged-in user ── */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredRole="any">
                <Dashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </FadeWrapper>
      </main>

      <BottomNav />
    </div>
  );
}

// ── Root ──────────────────────────────────────────
function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <AppInner />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
