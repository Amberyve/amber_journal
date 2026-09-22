import React, { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { fetchProfile } from "../lib/data.js";
import Admin from "./Admin.jsx";

/* The console is guarded twice: here, so the wrong person never sees the
   screen, and in the database, so the wrong person gets no data even if they
   reach it another way. The second guard is the one that matters. */
export default function AdminRoute({ session }) {
  const [profile, setProfile] = useState(null);
  const [state, setState] = useState("loading");

  useEffect(() => {
    let alive = true;
    fetchProfile(session.user.id)
      .then((p) => { if (!alive) return; setProfile(p); setState("ready"); })
      .catch(() => { if (alive) setState("error"); });
    return () => { alive = false; };
  }, [session.user.id]);

  if (state === "loading") {
    return <div className="shell"><div className="loading">Checking your access…</div></div>;
  }

  if (state === "error") {
    return (
      <div className="shell">
        <div className="onboard narrow">
          <div className="card">
            <p className="reflect">Couldn't check your access. Reload and try again.</p>
            <Link className="btn btn-quiet" to="/journal">Back to my journal</Link>
          </div>
        </div>
      </div>
    );
  }

  if (profile?.role !== "super_admin") return <Navigate to="/journal" replace />;

  return <Admin profile={profile} />;
}
