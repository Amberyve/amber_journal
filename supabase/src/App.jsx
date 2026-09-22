import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase, configured } from "./lib/supabase.js";
import Landing from "./pages/Landing.jsx";
import Auth from "./pages/Auth.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Journal from "./pages/Journal.jsx";
import AdminRoute from "./pages/AdminRoute.jsx";
import NotConfigured from "./pages/NotConfigured.jsx";

function Loading({ text = "Opening your journal…" }) {
  return <div className="shell"><div className="loading">{text}</div></div>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!configured) { setReady(true); return; }
    let alive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  if (!configured) return <NotConfigured />;
  if (!ready) return <Loading />;

  const signedIn = Boolean(session?.user);

  return (
    <Routes>
      <Route path="/" element={signedIn ? <Navigate to="/journal" replace /> : <Landing />} />
      <Route path="/signin" element={signedIn ? <Navigate to="/journal" replace /> : <Auth mode="signin" />} />
      <Route path="/signup" element={signedIn ? <Navigate to="/journal" replace /> : <Auth mode="signup" />} />
      <Route path="/forgot" element={<Auth mode="forgot" />} />
      <Route path="/reset" element={<ResetPassword />} />
      <Route
        path="/admin"
        element={signedIn ? <AdminRoute session={session} /> : <Navigate to="/signin" replace />}
      />
      <Route
        path="/journal"
        element={signedIn ? <Journal session={session} /> : <Navigate to="/signin" replace state={{ from: location }} />}
      />
      <Route path="*" element={<Navigate to={signedIn ? "/journal" : "/"} replace />} />
    </Routes>
  );
}
