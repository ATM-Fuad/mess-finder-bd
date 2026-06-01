// ─────────────────────────────────────────────────
//  firebase.js
//  Simplified — uses getFirestore instead of
//  initializeFirestore to avoid cache conflicts
// ─────────────────────────────────────────────────

import { initializeApp }              from "firebase/app";
import { getFirestore }               from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage }                  from "firebase/storage";

const firebaseConfig = {
  apiKey:            "AIzaSyC6IudcK9pd9dKSVVhWifwIXDp1qXhwnqU",
  authDomain:        "mess-finder-bd-f0dd3.firebaseapp.com",
  projectId:         "mess-finder-bd-f0dd3",
  storageBucket:     "mess-finder-bd-f0dd3.firebasestorage.app",
  messagingSenderId: "514254442627",
  appId:             "1:514254442627:web:849ab193e99ff96bba8bb6",
};

const app = initializeApp(firebaseConfig);

export const db             = getFirestore(app);
export const auth           = getAuth(app);
export const storage        = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
