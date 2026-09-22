import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

export default function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Supabase puts a recovery session in the URL; detectSessionInUrl picks it up.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setValid(Boolean(data.session));
      setReady(true);
    });
  }, []);

  const submit = async (ev) => {
    ev.preventDefault();
    if (password.length < 8) { setError("Passwords need at least 8 characters."); return; }
    setBusy(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setBusy(false); return; }
    nav("/journal", { replace: true });
  };

  if (!ready) return <div className="shell"><div className="loading">Checking your link…</div></div>;

  return (
    <div className="shell">
      <div className="onboard narrow">
        <Link to="/" className="brand-mark link-plain">Amber Journal</Link>
        <h1 className="auth-title">Choose a new password</h1>

        {!valid ? (
          <div className="card">
            <p className="reflect">
              This reset link has expired or was already used. Request a fresh one and
              it'll work.
            </p>
            <Link className="btn btn-quiet" to="/forgot">Send a new link</Link>
          </div>
        ) : (
          <form className="card" onSubmit={submit}>
            <label className="label" htmlFor="np">New password</label>
            <input id="np" type="password" required className="ruled-input" value={password}
              autoComplete="new-password" onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters" />
            {error && <div className="err">{error}</div>}
            <button className="btn" type="submit" disabled={busy} style={{ marginTop: 22 }}>
              {busy ? "Saving…" : "Save password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
