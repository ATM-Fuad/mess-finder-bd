// ─────────────────────────────────────────────────
//  RoommateBoard.js  –  Students looking for roommates
// ─────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import { collection, getDocs, addDoc, serverTimestamp, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";

export default function RoommateBoard() {
  const { currentUser, loginWithGoogle } = useAuth();
  const [posts,      setPosts]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    university: "", budget: "", area: "", gender: "male",
    message: "", contact: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, "roommate_requests"), orderBy("created_at", "desc"));
        const snap = await getDocs(q);
        setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { /* show empty */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentUser) { loginWithGoogle(); return; }
    setSubmitting(true);
    try {
      const newPost = {
        ...form, budget: Number(form.budget),
        user_name:  currentUser.displayName,
        user_photo: currentUser.photoURL,
        user_id:    currentUser.uid,
        created_at: serverTimestamp(),
      };
      await addDoc(collection(db, "roommate_requests"), newPost);
      setPosts(prev => [{ ...newPost, id: Date.now().toString(), created_at: { toDate: () => new Date() } }, ...prev]);
      setForm({ university:"", budget:"", area:"", gender:"male", message:"", contact:"" });
      setShowForm(false);
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 Roommate Board</h1>
          <p className="text-gray-500 text-sm mt-1">Find students looking for a roommate near your university</p>
        </div>
        <button
          onClick={() => currentUser ? setShowForm(true) : loginWithGoogle()}
          className="bg-orange-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-orange-600 transition-colors text-sm"
        >
          + Post Request
        </button>
      </div>

      {/* Post form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Post a roommate request</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">University</label>
                <input value={form.university} onChange={e => setForm(p=>({...p,university:e.target.value}))}
                  placeholder="e.g. NSU, BRAC..." required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Max budget (৳/month)</label>
                <input type="number" value={form.budget} onChange={e => setForm(p=>({...p,budget:e.target.value}))}
                  placeholder="5000" required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Preferred area</label>
                <input value={form.area} onChange={e => setForm(p=>({...p,area:e.target.value}))}
                  placeholder="e.g. Bashundhara, Mirpur..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Gender</label>
                <select value={form.gender} onChange={e => setForm(p=>({...p,gender:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400">
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Message (optional)</label>
              <textarea value={form.message} onChange={e => setForm(p=>({...p,message:e.target.value}))}
                rows={2} placeholder="About yourself, preferences, when you need to move in..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">WhatsApp number</label>
              <input value={form.contact} onChange={e => setForm(p=>({...p,contact:e.target.value}))}
                placeholder="01XXXXXXXXX" required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting}
                className="bg-orange-500 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
                {submitting ? "Posting..." : "Post request"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Posts list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-500">No roommate requests yet. Be the first!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {posts.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <img src={p.user_photo || `https://ui-avatars.com/api/?name=${p.user_name}`}
                  alt={p.user_name} className="w-9 h-9 rounded-full" />
                <div>
                  <div className="text-sm font-semibold text-gray-800">{p.user_name}</div>
                  <div className="text-xs text-gray-400">{p.university}</div>
                </div>
                <span className={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${p.gender === "female" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"}`}>
                  {p.gender === "female" ? "👩 Female" : "👨 Male"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs mb-3">
                <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-full">💰 Up to ৳{Number(p.budget).toLocaleString()}/mo</span>
                {p.area && <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">📍 {p.area}</span>}
              </div>
              {p.message && <p className="text-sm text-gray-600 mb-3 leading-relaxed">{p.message}</p>}
              <a href={`https://wa.me/880${p.contact?.replace(/^0/, "")}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-green-600 font-medium hover:text-green-700">
                💬 WhatsApp
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
