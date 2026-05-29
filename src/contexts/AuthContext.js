// ─────────────────────────────────────────────────
//  AuthContext.js  –  Tracks who is logged in
//  + Role system (owner / finder)
// ─────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";   // ← NEW
import { auth, db, googleProvider } from "../firebase";                       // ← added db

// 1. Create the context
const AuthContext = createContext();

// 2. Custom hook — any component can call useAuth() to get user info
export function useAuth() {
  return useContext(AuthContext);
}

// 3. Provider — wraps your whole app in App.js
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole,    setUserRole]    = useState(null);  // ← NEW: "owner" | "finder" | null
  const [loading,     setLoading]     = useState(true);

  // ── Sign in with Google popup ───────────────────
  async function loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user   = result.user;

      // Check if this user already has a Firestore doc
      const snap = await getDoc(doc(db, "users", user.uid));

      if (!snap.exists()) {
        // Brand new user → create doc with role: null (modal will ask them)
        await setDoc(doc(db, "users", user.uid), {
          uid:       user.uid,
          name:      user.displayName,
          email:     user.email,
          photoURL:  user.photoURL,
          role:      null,
          createdAt: serverTimestamp(),
        });
        setUserRole(null); // triggers RoleSelectionModal
      } else {
        setUserRole(snap.data().role ?? null);
      }
    } catch (error) {
      console.error("Login error:", error.message);
    }
  }

  // ── Save chosen role to Firestore ───────────────  ← NEW
  async function saveUserRole(role) {
    if (!currentUser) return;
    await setDoc(
      doc(db, "users", currentUser.uid),
      { role },
      { merge: true }   // only update the role field, keep everything else
    );
    setUserRole(role);
  }

  // ── Sign out ────────────────────────────────────
  async function logout() {
    try {
      await signOut(auth);
      setUserRole(null); // ← NEW: clear role on logout
    } catch (error) {
      console.error("Logout error:", error.message);
    }
  }

  // ── Listen for login/logout changes automatically ──
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Returning user — load their role from Firestore
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          setUserRole(snap.exists() ? (snap.data().role ?? null) : null);
        } catch (err) {
          console.error("Role fetch error:", err);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ── Expose to the rest of the app ──────────────
  const value = {
    currentUser,
    userRole,       // ← NEW
    loginWithGoogle,
    logout,
    saveUserRole,   // ← NEW
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
