// ─────────────────────────────────────────────────
//  ProtectedRoute.js
//  src/components/ProtectedRoute.js
//
//  Wraps any route that requires a specific role.
//  Usage in App.js:
//    <Route path="/dashboard" element={
//      <ProtectedRoute requiredRole="owner">
//        <Dashboard />
//      </ProtectedRoute>
//    } />
// ─────────────────────────────────────────────────

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, userRole, userLoading } = useAuth();

  // Still resolving auth state — render nothing yet
  if (userLoading) return null;

  // Not logged in → send to login
  if (!currentUser) return <Navigate to="/login" replace />;

  // Logged in but wrong role → send to login
  if (requiredRole && userRole !== requiredRole) return <Navigate to="/login" replace />;

  return children;
}
