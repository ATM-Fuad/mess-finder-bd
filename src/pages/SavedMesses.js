import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import MessCard from "../components/MessCard";
import { Link } from "react-router-dom";

export default function SavedMesses() {
  const { currentUser, loginWithGoogle } = useAuth();
  const [savedMesses, setSavedMesses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSaved() {
      if (!currentUser) { setLoading(false); return; }
      try {
        const savedSnap = await getDocs(
          collection(db, "users", currentUser.uid, "saved")
        );
        const messPromises = savedSnap.docs.map(d =>
          getDoc(doc(db, "messes", d.data().mess_id))
        );
        const messSnaps = await Promise.all(messPromises);
        const messes = messSnaps
          .filter(s => s.exists())
          .map(s => ({ id: s.id, ...s.data() }));
        setSavedMesses(messes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSaved();
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">❤️</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Login to see saved messes
        </h2>
        <p className="text-gray-500 mb-6">
          Save messes by clicking the 🤍 heart on any listing
        </p>
        <button
          onClick={loginWithGoogle}
          className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600"
        >
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">❤️ Saved Messes</h1>
        <p className="text-gray-500 text-sm mt-1">
          Messes you saved — click ❤️ to unsave
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : savedMesses.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🤍</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No saved messes yet
          </h3>
          <p className="text-gray-400 mb-6">
            Browse messes and click the 🤍 heart to save them here
          </p>
          <Link
            to="/"
            className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600"
          >
            Browse Messes
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {savedMesses.map(mess => (
            <MessCard key={mess.id} mess={mess} />
          ))}
        </div>
      )}
    </div>
  );
}