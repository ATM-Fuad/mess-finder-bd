// ─────────────────────────────────────────────────
//  App.js — final with all contexts + routes
// ─────────────────────────────────────────────────

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth }   from "./contexts/AuthContext";
import { LanguageProvider }        from "./contexts/LanguageContext";
import Navbar                      from "./components/Navbar";
import BottomNav                   from "./components/BottomNav";
import RoleSelectionModal          from "./components/RoleSelectionModal";
import ProtectedRoute              from "./components/ProtectedRoute";
import Home                        from "./pages/Home";
import PostMess                    from "./pages/PostMess";
import PostRoommate                from "./pages/PostRoommate";
import MessDetail                  from "./pages/MessDetail";
import RoommateDetail              from "./pages/RoommateDetail";
import Login                       from "./pages/Login";
import RoommateBoard               from "./pages/RoommateBoard";
import SavedMesses                 from "./pages/SavedMesses";
import Dashboard                   from "./pages/Dashboard";
import Signup                      from "./pages/Signup";
import Notifications               from "./pages/Notifications";

function AppInner() {
  const { currentUser, userRole } = useAuth();
  const needsRoleSelection = currentUser && userRole === null;

  return (
    <div className="min-h-screen bg-gray-50">
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
          <Route path="/signup"        element={<Signup />} />
          <Route path="/notifications" element={<Notifications />} />
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
