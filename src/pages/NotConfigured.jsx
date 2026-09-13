import React from "react";

export default function NotConfigured() {
  return (
    <div className="shell">
      <div className="onboard">
        <div className="brand-mark">Pretty Amber</div>
        <h1 className="hero">Almost<br />there.</h1>
        <div className="card" style={{ marginTop: 28 }}>
          <p className="reflect">
            The app is running, but it isn't connected to a database yet, so
            nobody can sign in or save anything.
          </p>
          <p className="reflect">
            Add your two Supabase values to a <code>.env</code> file in the project
            root, then restart. <code>.env.example</code> shows the exact format,
            and DEPLOY.md walks through where to find them.
          </p>
          <pre className="code">VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...</pre>
          <p className="fine">
            If you already added them on a hosting provider, redeploy — environment
            variables are read at build time, not at run time.
          </p>
        </div>
      </div>
    </div>
  );
}
