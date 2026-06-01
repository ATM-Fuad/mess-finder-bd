// ─────────────────────────────────────────────────
//  firebase.js  —  src/firebase.js
//
//  NETWORK FIX: Uses initializeFirestore with
//  persistentLocalCache so the app loads from
//  cache instantly if ISP routing to Google
//  servers is slow or temporarily blocked.
//
//  persistentLocalCache  →  IndexedDB on browser
//  persistentSingleTabManager → single-tab mode
//  (safe for CRA / React 19 apps)
// ─────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

// ── Your Firebase project config ──────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyC6IudcK9pd9dKSVVhWifwIXDp1qXhwnqU",
  authDomain:        "mess-finder-bd-f0dd3.firebaseapp.com",
  projectId:         "mess-finder-bd-f0dd3",
  storageBucket:     "mess-finder-bd-f0dd3.firebasestorage.app",
  messagingSenderId: "514254442627",
  appId:             "1:514254442627:web:849ab193e99ff96bba8bb6",
};

// ── Initialize Firebase app ───────────────────────
const app = initializeApp(firebaseConfig);

// ── Firestore with offline persistence ───────────
//
//  Instead of getFirestore(app), we use
//  initializeFirestore() with persistentLocalCache.
//
//  What this does:
//  • Caches all Firestore reads in IndexedDB
//  • App loads cached listings instantly on
//    next visit even if Firebase is unreachable
//  • Queued writes sync automatically when
//    the connection restores
//  • Zero impact on normal online usage
//
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({
      forceOwnership: true,  // avoids tab-lock issues in dev
    }),
  }),
});

// ── Auth ──────────────────────────────────────────
export const auth          = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// ── Storage ───────────────────────────────────────
export const storage = getStorage(app);
