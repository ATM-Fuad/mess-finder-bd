// ─────────────────────────────────────────────────
//  App.js  –  The root of your app + page routing
// ─────────────────────────────────────────────────

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth }   from "./contexts/AuthContext";
import Navbar                      from "./components/Navbar";
import RoleSelectionModal          from "./components/RoleSelectionModal";
import ProtectedRoute              from "./components/ProtectedRoute";   // ← NEW
import Home                        from "./pages/Home";
import PostMess                    from "./pages/PostMess";
import MessDetail                  from "./pages/MessDetail";
import Login                       from "./pages/Login";
import RoommateBoard               from "./pages/RoommateBoard";
import SavedMesses                 from "./pages/SavedMesses";
import Dashboard                   from "./pages/Dashboard";             // ← NEW

function AppInner() {
  const { currentUser, userRole } = useAuth();
  const needsRoleSelection = currentUser && userRole === null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Blocks UI until new user picks a role */}
      {needsRoleSelection && <RoleSelectionModal />}

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/post"      element={<PostMess />} />
          <Route path="/mess/:id"  element={<MessDetail />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/roommates" element={<RoommateBoard />} />
          <Route path="/saved"     element={<SavedMesses />} />

          {/* ── Protected: owners only ── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="owner">
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppInner />
      </Router>
    </AuthProvider>
  );
}

export default App;
