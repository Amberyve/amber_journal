import React, { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { WEEKS, TOTAL_DAYS, weekOf } from "../lib/journal.js";
import {
  fetchProfile, saveProfile, fetchEntries, saveEntry as putEntry,
  fetchWeekly, saveWeekly as putWeekly, clearJournal,
  currentDay, todayISO, hasContent,
} from "../lib/data.js";
import { supabase } from "../lib/supabase.js";
import { Link, useSearchParams } from "react-router-dom";
import { fetchBilling, waitForPayment, startCheckout } from "../lib/billing.js";
import { Paywall, BillingCard, TrialBar } from "../components/Billing.jsx";
import DayView from "../components/DayView.jsx";
import PagesView from "../components/PagesView.jsx";
// Charts are a big dependency; load them only when Patterns is opened.
const PatternsView = lazy(() => import("../components/PatternsView.jsx"));
import BreatheView from "../components/BreatheView.jsx";
import AccountView from "../components/AccountView.jsx";
import { Label, RuledInput, RuledArea } from "../components/ui.jsx";

const TABS = [
  ["today", "Journal"], ["pages", "Pages"], ["patterns", "Patterns"],
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
        <div className="brand-mark">Amber Journal</div>
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
          <input id="s" type="date" className="date" value={start} max={todayISO()}
            onChange={(e) => setStart(e.target.value)} />
          <p className="fine">
            Day 1 is this date. Each following day opens on its own morning —
            you can catch up on a day you missed, but not write ahead.
          </p>
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
  const [billing, setBilling] = useState(null);
  const [payState, setPayState] = useState("idle");   // idle | checking | ok | slow
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const [p, e, w, b] = await Promise.all([
        fetchProfile(user.id), fetchEntries(user.id), fetchWeekly(user.id),
        fetchBilling().catch(() => null),
      ]);
      setProfile(p); setEntries(e); setWeekly(w); setBilling(b);
      if (p) setDay(currentDay(p));
    } catch {
      setLoadError("Couldn't load your journal. Check your connection and reload.");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  // PayMongo sends the reader back here after checkout. The redirect proves
  // nothing on its own — the webhook does — so wait for the account to
  // actually turn active rather than congratulating them too early.
  useEffect(() => {
    if (params.get("paid") !== "1") return;
    let alive = true;
    setPayState("checking");
    waitForPayment().then((b) => {
      if (!alive) return;
      if (b) { setBilling(b); setPayState("ok"); }
      else setPayState("slow");
      params.delete("paid");
      setParams(params, { replace: true });
    });
    return () => { alive = false; };
  }, [params, setParams]);

  // Phones keep the scroll position when the view changes, which lands the
  // reader halfway down a page they haven't seen yet.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [tab, day]);

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
    // Nothing should be able to write ahead of today, unless this is a staff
    // account walking the flow for testing.
    const staff = profile.role === "admin" || profile.role === "super_admin";
    if (!staff && d > currentDay(profile)) throw new Error("That day hasn't opened yet.");
    const saved = await putEntry(user.id, d, entry);
    setEntries((p) => ({ ...p, [d]: saved }));
  };

  const onSaveWeekly = async (wi, value) => {
    const saved = await putWeekly(user.id, wi, value);
    setWeekly((p) => ({ ...p, [wi]: saved }));
  };

  const goPay = async () => {
    try { await startCheckout(); }
    catch (e) { alert(e.message); }
  };

  const refreshBilling = async () => {
    try { setBilling(await fetchBilling()); } catch { /* leave as is */ }
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
  const written = Object.values(entries).filter(hasContent).length;

  // Admins and super admins can open any day, so the whole flow can be walked
  // through without waiting twelve weeks. It is always labelled, so a test
  // session is never mistaken for how the journal behaves for a reader.
  const isStaff = profile.role === "admin" || profile.role === "super_admin";
  const canWrite = isStaff || billing?.can_write !== false;
  const maxOpenDay = isStaff ? TOTAL_DAYS : cur;
  const testing = isStaff && day > cur;

  // The header follows the day you're actually looking at, so it can never
  // contradict the page below it. On other tabs it falls back to today.
  const headerDay = tab === "today" ? day : cur;
  const headerWeek = weekOf(headerDay);
  const w = WEEKS[headerWeek];

  // Progress is what you've actually written, not time that has passed. Each
  // segment is one week, filled by how many of that week's seven days have
  // something in them. The week you're looking at is ringed.
  const weekSegments = WEEKS.map((_, i) =>
    Array.from({ length: 7 }, (_, j) => i * 7 + j + 1)
      .filter((d) => hasContent(entries[d])).length / 7
  );

  return (
    <div className="shell">
      <header className="header">
        <div className="header-in">
          <div>
            <div className="brand">
              Amber Journal
              {isStaff && (
                <span className={"role-chip is-" + profile.role}>
                  {profile.role === "super_admin" ? "super admin" : "admin"}
                </span>
              )}
            </div>
            <div className="greet">
              {tab === "today" && day > cur
                ? <>Week {headerWeek + 1} — {w.hil}, not open yet</>
                : tab === "today" && day < cur
                  ? <>Looking back at week {headerWeek + 1} — {w.hil}</>
                  : <>{profile.display_name}, this is week {headerWeek + 1} — {w.hil}</>}
            </div>
          </div>
          <div className="progress"
            title={`${written} of ${TOTAL_DAYS} days written`}>
            <div className="weeks" role="img"
              aria-label={`Week ${headerWeek + 1} of ${WEEKS.length}, ${written} days written so far`}>
              {weekSegments.map((fill, i) => (
                <span key={i} className={"wk" + (i === headerWeek ? " is-now" : "")}>
                  <span className="wk-fill" style={{ width: `${fill * 100}%` }} />
                </span>
              ))}
            </div>
            <span>Week {headerWeek + 1} of {WEEKS.length}</span>
          </div>
        </div>
      </header>

      <TrialBar billing={billing} onPay={goPay} />

      {payState === "checking" && (
        <div className="paybar">Confirming your payment with GCash…</div>
      )}
      {payState === "ok" && (
        <div className="paybar is-ok">Payment received. You're set for the year.</div>
      )}
      {payState === "slow" && (
        <div className="paybar">
          GCash is still confirming. This usually takes under a minute — reopen the
          app shortly and it will be active.
        </div>
      )}

      {testing && (
        <div className="testbar">
          Test mode — day {day} hasn't arrived yet. A reader would see it locked.
        </div>
      )}

      <main className="main">
        {tab === "today" && !canWrite && <Paywall billing={billing} />}
        {tab === "today" && canWrite && (
          <DayView userId={user.id} profile={profile} day={day} maxDay={maxOpenDay}
            entry={entries[day]} weekly={weekly[weekOf(day)]}
            onSaveEntry={onSaveEntry} onSaveWeekly={onSaveWeekly}
            onNavDay={(d) => setDay(Math.min(TOTAL_DAYS, Math.max(1, d)))} />
        )}
        {tab === "pages" && (
          <PagesView entries={entries} current={cur} maxOpenDay={maxOpenDay}
            onOpen={(d) => { setDay(d); setTab("today"); }} />
        )}
        {tab === "patterns" && (
          <Suspense fallback={<div className="loading">Drawing your chart…</div>}>
            <PatternsView entries={entries} />
          </Suspense>
        )}
        {tab === "breathe" && <BreatheView />}
        {tab === "account" && (
          <>
            <BillingCard billing={billing} onRefresh={refreshBilling} />
            <AccountView profile={profile} entries={entries} email={user.email}
              onUpdate={updateProfile} onReset={onReset} />
          </>
        )}
      </main>

      <nav className="nav">
        {profile.role === "super_admin" && (
          <Link className="navbtn navbtn-link" to="/admin">Manage</Link>
        )}
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => { if (k === "today") setDay(cur); setTab(k); }}
            className={"navbtn" + (tab === k ? " is-on" : "")}
            aria-current={tab === k ? "page" : undefined}>{l}</button>
        ))}
      </nav>
    </div>
  );
}
