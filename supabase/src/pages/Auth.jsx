import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";

const COPY = {
  signin: { title: "Welcome back", action: "Sign in" },
  signup: { title: "Start your twelve weeks", action: "Create account" },
  forgot: { title: "Reset your password", action: "Send reset link" },
};

/* Supabase returns terse errors. Turn them into something a person can act on. */
function readable(message = "") {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Check both, or reset your password.";
  if (m.includes("email not confirmed")) return "Confirm your email first — check your inbox for the link we sent.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "There's already an account with this email. Sign in instead, or reset the password.";
  if (m.includes("password should be at least")) return "Passwords need at least 8 characters.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Wait a minute and try again.";
  if (m.includes("fetch")) return "Can't reach the server. Check your connection and try again.";
  return message || "Something went wrong. Try again.";
}

export default function Auth({ mode }) {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (ev) => {
    ev.preventDefault();
    setError(""); setNotice(""); setBusy(true);

    try {
      if (mode === "signup") {
        if (password.length < 8) throw new Error("Password should be at least 8 characters");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/journal`,
          },
        });
        if (error) throw error;
        if (data.session) nav("/journal", { replace: true });
        else setNotice(`Check ${email.trim()} for a confirmation link. Open it and you're in.`);
      }

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(), password,
        });
        if (error) throw error;
        nav("/journal", { replace: true });
      }

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset`,
        });
        if (error) throw error;
        setNotice(`If an account exists for ${email.trim()}, a reset link is on its way.`);
      }
    } catch (err) {
      setError(readable(err.message));
    } finally {
      setBusy(false);
    }
  };

  const c = COPY[mode];

  return (
    <div className="shell">
      <div className="onboard narrow">
        <Link to="/" className="brand-mark link-plain">Amber Journal</Link>
        <h1 className="auth-title">{c.title}</h1>

        <form className="card" onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label className="label" htmlFor="name">What should the journal call you?</label>
              <input id="name" className="ruled-input" value={name} autoComplete="name"
                onChange={(e) => setName(e.target.value)} placeholder="Your name or a nickname" />
              <div style={{ height: 18 }} />
            </>
          )}

          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="ruled-input" value={email}
            autoComplete="email" onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />

          {mode !== "forgot" && (
            <>
              <div style={{ height: 18 }} />
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" required className="ruled-input" value={password}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : ""} />
            </>
          )}

          {error && <div className="err">{error}</div>}
          {notice && <div className="ok">{notice}</div>}

          <button className="btn" type="submit" disabled={busy} style={{ marginTop: 22 }}>
            {busy ? "Working…" : c.action}
          </button>

          <div className="auth-links">
            {mode === "signin" && (
              <>
                <Link to="/signup">Create an account</Link>
                <Link to="/forgot">Forgot password</Link>
              </>
            )}
            {mode === "signup" && <Link to="/signin">I already have an account</Link>}
            {mode === "forgot" && <Link to="/signin">Back to sign in</Link>}
          </div>
        </form>

        <p className="fine" style={{ maxWidth: "28rem" }}>
          Only you can read what you write here. Nobody else, including the owner
          of this page, can see your entries.
        </p>
      </div>
    </div>
  );
}
