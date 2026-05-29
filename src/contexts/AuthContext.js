// ─────────────────────────────────────────────────
//  AuthContext.js  –  Tracks who is logged in
// ─────────────────────────────────────────────────
//  This "context" lets ANY component in your app
//  know if a user is logged in, without passing
//  props down through every component manually.
// ─────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

// 1. Create the context
const AuthContext = createContext();

// 2. Custom hook — any component can call useAuth() to get user info
export function useAuth() {
  return useContext(AuthContext);
}

// 3. Provider — wraps your whole app in App.js
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);

  // Sign in with Google popup
  async function loginWithGoogle() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login error:", error.message);
    }
  }

  // Sign out
  async function logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error.message);
    }
  }

  // Listen for login/logout changes automatically
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user); // null = logged out, user object = logged in
      setLoading(false);
    });
    return unsubscribe; // cleanup when component unmounts
  }, []);

  const value = { currentUser, loginWithGoogle, logout };

  // Don't render anything until we know the auth state
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
