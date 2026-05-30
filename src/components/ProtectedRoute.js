// ─────────────────────────────────────────────────
//  ProtectedRoute.js
//  requiredRole: "owner" | "finder" | "any"
//  If "any" — any logged-in user is allowed
// ─────────────────────────────────────────────────

import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, userRole, userLoading } = useAuth();
  if (userLoading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (requiredRole && requiredRole !== "any" && userRole !== requiredRole)
    return <Navigate to="/login" replace />;
  return children;
}
