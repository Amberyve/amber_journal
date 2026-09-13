import React, { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { WEEKS, TOTAL_DAYS, weekOf } from "../lib/journal.js";
import {
  fetchProfile, saveProfile, fetchEntries, saveEntry as putEntry,
  fetchWeekly, saveWeekly as putWeekly, clearJournal,
  currentDay, todayISO, hasContent,
} from "../lib/data.js";
import { supabase } from "../lib/supabase.js";
import DayView from "../components/DayView.jsx";
import PagesView from "../components/PagesView.jsx";
// Charts are a big dependency; load them only when Patterns is opened.
const PatternsView = lazy(() => import("../components/PatternsView.jsx"));
import BreatheView from "../components/BreatheView.jsx";
import AccountView from "../components/AccountView.jsx";
import { Label, RuledInput, RuledArea } from "../components/ui.jsx";

const TABS = [
  ["today", "Today"], ["pages", "Pages"], ["patterns", "Patterns"],
  ["breathe", "Breathe"], ["account", "You"],
];

/* Shown once, after sign-up, before the first day opens. */
function Setup({ defaultName, onDone }) {
  const [name, setName] = useState(defaultName || "");
  const [why, setWhy] = useState("");
  const [start, setStart] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    if (!name.trim()) { setErr("Add a name — it's only used to greet you."); return; }
    setBusy(true); setErr("");
    try {
      await onDone({ display_name: name.trim(), why: why.trim(), start_date: start });
    } catch {
      setErr("That didn't save. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="shell">
      <div className="onboard narrow">
        <div className="brand-mark">Pretty Amber</div>
        <h1 className="auth-title">Set up your twelve weeks</h1>
        <div className="card">
          <Label htmlFor="n">What should this journal call you?</Label>
          <RuledInput id="n" value={name} onChange={setName} placeholder="Your name or a nickname" />
          <div style={{ height: 18 }} />
          <Label htmlFor="w">What made you open this? (optional)</Label>
          <RuledArea id="w" value={why} onChange={setWhy} rows={3}
            placeholder="Work has been heavy. I want to sleep better. I want to stop carrying it all." />
          <div style={{ height: 18 }} />
          <Label htmlFor="s">Starting</Label>
          <input id="s" type="date" className="date" value={start}
            onChange={(e) => setStart(e.target.value)} />
          {err && <div className="err">{err}</div>}
          <button className="btn" onClick={go} disabled={busy} style={{ marginTop: 22 }}>
            {busy ? "Setting up…" : "Open day 1"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Journal({ session }) {
  const user = session.user;
  const [profile, setProfile] = useState(null);
  const [entries, setEntries] = useState({});
  const [weekly, setWeekly] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState("today");
  const [day, setDay] = useState(1);

  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const [p, e, w] = await Promise.all([
        fetchProfile(user.id), fetchEntries(user.id), fetchWeekly(user.id),
      ]);
      setProfile(p); setEntries(e); setWeekly(w);
      if (p) setDay(currentDay(p));
    } catch {
      setLoadError("Couldn't load your journal. Check your connection and reload.");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const completeSetup = async (patch) => {
    const saved = await saveProfile(user.id, patch);
    setProfile(saved);
    setDay(currentDay(saved));
  };

  const updateProfile = async (patch) => {
    const saved = await saveProfile(user.id, { ...profile, ...patch });
    setProfile(saved);
  };

  const onSaveEntry = async (d, entry) => {
    const saved = await putEntry(user.id, d, entry);
    setEntries((p) => ({ ...p, [d]: saved }));
  };

  const onSaveWeekly = async (wi, value) => {
    const saved = await putWeekly(user.id, wi, value);
    setWeekly((p) => ({ ...p, [wi]: saved }));
  };

  const onReset = async () => {
    await clearJournal(user.id);
    setEntries({}); setWeekly({}); setTab("today");
    setDay(currentDay(profile));
  };

  if (loading) return <div className="shell"><div className="loading">Opening your journal…</div></div>;

  if (loadError) {
    return (
      <div className="shell">
        <div className="onboard narrow">
          <div className="card">
            <p className="reflect">{loadError}</p>
            <button className="btn" onClick={load}>Try again</button>
            <button className="btn btn-quiet" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  // Profile row exists from the signup trigger but has no start date chosen yet.
  if (!profile || !profile.display_name) {
    return <Setup defaultName={user.user_metadata?.display_name} onDone={completeSetup} />;
  }

  const cur = currentDay(profile);
  const w = WEEKS[weekOf(cur)];
  const written = Object.values(entries).filter(hasContent).length;

  return (
    <div className="shell">
      <header className="header">
        <div className="header-in">
          <div>
            <div className="brand">Pretty Amber</div>
            <div className="greet">
              {profile.display_name}, this is week {weekOf(cur) + 1} — {w.hil}
            </div>
          </div>
          <div className="progress" title={`${written} of ${TOTAL_DAYS} days written`}>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(written / TOTAL_DAYS) * 100}%` }} />
            </div>
            <span>{written}/{TOTAL_DAYS}</span>
          </div>
        </div>
      </header>

      <main className="main">
        {tab === "today" && (
          <DayView day={day} entry={entries[day]} weekly={weekly[weekOf(day)]}
            onSaveEntry={onSaveEntry} onSaveWeekly={onSaveWeekly}
            onNavDay={(d) => setDay(Math.min(TOTAL_DAYS, Math.max(1, d)))} />
        )}
        {tab === "pages" && (
          <PagesView entries={entries} current={cur}
            onOpen={(d) => { setDay(d); setTab("today"); }} />
        )}
        {tab === "patterns" && (
          <Suspense fallback={<div className="loading">Drawing your chart…</div>}>
            <PatternsView entries={entries} />
          </Suspense>
        )}
        {tab === "breathe" && <BreatheView />}
        {tab === "account" && (
          <AccountView profile={profile} entries={entries} email={user.email}
            onUpdate={updateProfile} onReset={onReset} />
        )}
      </main>

      <nav className="nav">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => { if (k === "today") setDay(cur); setTab(k); }}
            className={"navbtn" + (tab === k ? " is-on" : "")}
            aria-current={tab === k ? "page" : undefined}>{l}</button>
        ))}
      </nav>
    </div>
  );
}
