// ─────────────────────────────────────────────────
//  App.js  –  The root of your app + page routing
// ─────────────────────────────────────────────────
//  Each <Route> maps a URL path to a page component.
//  e.g. /post  →  shows the PostMess page
// ─────────────────────────────────────────────────

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar      from "./components/Navbar";
import Home        from "./pages/Home";
import PostMess    from "./pages/PostMess";
import MessDetail  from "./pages/MessDetail";
import Login       from "./pages/Login";
import RoommateBoard from "./pages/RoommateBoard";

function App() {
  return (
    <AuthProvider>           {/* Makes login state available everywhere */}
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />           {/* Shows on every page */}

          <main className="max-w-6xl mx-auto px-4 py-6">
            <Routes>
              <Route path="/"          element={<Home />} />
              <Route path="/post"      element={<PostMess />} />
              <Route path="/mess/:id"  element={<MessDetail />} />
              <Route path="/login"     element={<Login />} />
              <Route path="/roommates" element={<RoommateBoard />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
