// ─────────────────────────────────────────────────
//  AuthContext.js — with email/password auth
// ─────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole,    setUserRole]    = useState(null);
  const [loading,     setLoading]     = useState(true);

  // ── Helper: create Firestore user doc ───────────
  async function createUserDoc(user, extraData = {}) {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) {
      await setDoc(doc(db, "users", user.uid), {
        uid:       user.uid,
        name:      user.displayName ?? extraData.name ?? "",
        email:     user.email,
        photoURL:  user.photoURL ?? null,
        role:      null,
        createdAt: serverTimestamp(),
        ...extraData,
      });
      return null; // new user — no role yet
    }
    return snap.data().role ?? null;
  }

  // ── Google login ────────────────────────────────
  async function loginWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const role   = await createUserDoc(result.user);
      setUserRole(role);
    } catch (error) {
      console.error("Google login error:", error.message);
      throw error;
    }
  }

  // ── Email/password sign up ──────────────────────
  async function signUpWithEmail(name, email, password) {
    // 1. Create the Firebase Auth account
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user   = result.user;

    // 2. Set display name on the Auth profile
    await updateProfile(user, { displayName: name });

    // 3. Send verification email
    await sendEmailVerification(user);

    // 4. Create Firestore doc
    await createUserDoc(user, { name });

    // Don't set role — role selection modal handles it
    setUserRole(null);
    return user;
  }

  // ── Email/password login ────────────────────────
  async function loginWithEmail(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user   = result.user;

    // Reload to get latest emailVerified status
    await user.reload();

    if (!user.emailVerified) {
      // Sign them out — they must verify first
      await signOut(auth);
      throw new Error("EMAIL_NOT_VERIFIED");
    }

    // Load role
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      setUserRole(snap.exists() ? (snap.data().role ?? null) : null);
    } catch {
      setUserRole(null);
    }

    return user;
  }

  // ── Resend verification email ───────────────────
  async function resendVerificationEmail() {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  }

  // ── Password reset ──────────────────────────────
  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  // ── Save role ───────────────────────────────────
  async function saveUserRole(role) {
    if (!currentUser) return;
    await setDoc(
      doc(db, "users", currentUser.uid),
      { role },
      { merge: true }
    );
    setUserRole(role);
  }

  // ── Logout ──────────────────────────────────────
  async function logout() {
    try {
      await signOut(auth);
      setUserRole(null);
    } catch (error) {
      console.error("Logout error:", error.message);
    }
  }

  // ── Auth state listener ─────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          setUserRole(snap.exists() ? (snap.data().role ?? null) : null);
        } catch {
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    loginWithGoogle,
    signUpWithEmail,
    loginWithEmail,
    resendVerificationEmail,
    resetPassword,
    logout,
    saveUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
