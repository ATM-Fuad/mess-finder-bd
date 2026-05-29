// ─────────────────────────────────────────────────
//  firebase.js  –  Your Firebase connection
// ─────────────────────────────────────────────────
//
//  HOW TO FILL THIS IN:
//  1. Go to console.firebase.google.com
//  2. Open your project → Click the </> (Web) icon
//  3. Register your app → Copy the firebaseConfig object
//  4. Paste the values below, replacing each "REPLACE_ME"
//
// ─────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            "AIzaSyC6IudcK9pd9dKSVVhWifwIXDp1qXhwnqU",
  authDomain:        "mess-finder-bd-f0dd3.firebaseapp.com",
  projectId:         "mess-finder-bd-f0dd3",
  storageBucket:     "mess-finder-bd-f0dd3.firebasestorage.app",
  messagingSenderId: "514254442627",
  appId:             "1:514254442627:web:849ab193e99ff96bba8bb6",
};

// Initialize Firebase
const app      = initializeApp(firebaseConfig);

// Export the services your app will use
export const db       = getFirestore(app);   // Database
export const auth     = getAuth(app);        // Login/logout
export const storage  = getStorage(app);     // Photo uploads
export const googleProvider = new GoogleAuthProvider();
