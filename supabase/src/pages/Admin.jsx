import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  listUsers, getStats, setRole, setSubscription,
  ROLES, PLANS, STATUSES, pesos, relativeDate,
} from "../lib/admin.js";
import { TOTAL_DAYS } from "../lib/journal.js";

const TABS = [["people", "People"], ["billing", "Subscriptions"], ["settings", "Settings"]];

function Stat({ value, label }) {
  return <div className="stat"><b>{value}</b><span>{label}</span></div>;
}

/* ------------------------------------------------------------ one person */
function PersonCard({ row, onRole, onSub, busyId }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(row.plan);
  const [status, setStatus] = useState(row.status);
  const [amount, setAmount] = useState(String((row.amount_cents || 0) / 100));
  const [end, setEnd] = useState(row.current_period_end || "");
  const [note, setNote] = useState("");
  const busy = busyId === row.id;

  const save = () => onSub(row.id, {
    plan, status,
    amount_cents: Math.round(Number(amount) * 100),
    current_period_end: end || null,
    note,
  }).then(() => setOpen(false));

  return (
    <div className="person">
      <div className="person-top">
        <div className="person-who">
          <div className="person-name">{row.display_name || "—"}</div>
          <div className="person-mail">{row.email}</div>
        </div>
        <div className="person-tags">
          {row.role !== "user" && <span className={"tag tag-" + row.role}>
            {row.role === "super_admin" ? "super admin" : "admin"}
          </span>}
          <span className={"tag tag-plan is-" + row.status}>
            {row.status === "trialing" ? "free month"
              : row.plan === "free" ? "free" : `${row.plan} · ${row.status}`}
          </span>
        </div>
      </div>

      <div className="person-meta">
        <span>{row.days_written} of {TOTAL_DAYS} days written</span>
        <span>active {relativeDate(row.last_active)}</span>
        <span>joined {relativeDate(row.joined_at)}</span>
        {row.status === "trialing" && row.trial_ends_at &&
          <span>free until {row.trial_ends_at}</span>}
        {row.current_period_end && <span>paid to {row.current_period_end}</span>}
        {row.amount_cents > 0 && <span>{pesos(row.amount_cents)}</span>}
      </div>

      <div className="person-actions">
        <label className="mini">
          <span>Access</span>
          <select className="select" value={row.role} disabled={busy}
            onChange={(e) => onRole(row.id, e.target.value)}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </label>
        <button className="btn btn-quiet person-btn" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "Edit subscription"}
        </button>
      </div>

      {open && (
        <div className="sub-edit">
          <div className="sub-grid">
            <label className="mini"><span>Plan</span>
              <select className="select" value={plan} onChange={(e) => setPlan(e.target.value)}>
                {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="mini"><span>Status</span>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUSES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="mini"><span>Amount (₱)</span>
              <input className="select" inputMode="decimal" value={amount}
                onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="mini"><span>Renews / ends</span>
              <input className="select" type="date" value={end || ""}
                onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
          <label className="mini"><span>Note</span>
            <input className="select" value={note} placeholder="GCash ref, comp account, refund…"
              onChange={(e) => setNote(e.target.value)} />
          </label>
          <button className="btn" onClick={save} disabled={busy} style={{ marginTop: 12 }}>
            {busy ? "Saving…" : "Save subscription"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ page */
export default function Admin({ profile }) {
  const [tab, setTab] = useState("people");
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [u, s] = await Promise.all([listUsers(), getStats()]);
      setRows(u); setStats(s);
    } catch (e) {
      setError(e.message || "Couldn't load the console.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRole = async (id, role) => {
    setBusyId(id); setError("");
    try { await setRole(id, role); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  const onSub = async (id, patch) => {
    setBusyId(id); setError("");
    try { await setSubscription(id, patch); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusyId(null); }
  };

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle && !(`${r.email} ${r.display_name}`.toLowerCase().includes(needle))) return false;
      if (filter === "paying") return r.plan !== "free" && r.status === "active";
      if (filter === "free") return r.plan === "free";
      if (filter === "attention") return ["past_due", "expired"].includes(r.status);
      if (filter === "staff") return r.role !== "user";
      return true;
    });
  }, [rows, q, filter]);

  return (
    <div className="shell">
      <header className="header">
        <div className="header-in">
          <div>
            <div className="brand">Amber Journal</div>
            <div className="greet">Management console</div>
          </div>
          <Link className="btn btn-outline header-back" to="/journal">My journal</Link>
        </div>
      </header>

      <main className="main main-wide">
        <nav className="subnav">
          {TABS.map(([k, l]) => (
            <button key={k} className={"subnav-btn" + (tab === k ? " is-on" : "")}
              onClick={() => setTab(k)}>{l}</button>
          ))}
        </nav>

        {error && <div className="card" style={{ marginBottom: 16 }}>
          <p className="err" style={{ marginTop: 0 }}>{error}</p>
          <button className="btn btn-quiet" onClick={load}>Try again</button>
        </div>}

        {loading ? <div className="loading">Loading the console…</div> : (
          <>
            {tab === "people" && (
              <>
                <div className="stats">
                  <Stat value={stats?.total_users ?? 0} label="people" />
                  <Stat value={stats?.active_this_week ?? 0} label="wrote this week" />
                  <Stat value={stats?.new_this_week ?? 0} label="joined this week" />
                </div>

                <div className="filters">
                  <input className="select search" placeholder="Search name or email"
                    value={q} onChange={(e) => setQ(e.target.value)} />
                  <div className="chips">
                    {[["all", "All"], ["paying", "Paying"], ["free", "Free"],
                      ["attention", "Needs attention"], ["staff", "Staff"]].map(([k, l]) => (
                      <button key={k} className={"chip" + (filter === k ? " is-on" : "")}
                        onClick={() => setFilter(k)}>{l}</button>
                    ))}
                  </div>
                </div>

                <p className="sub">{shown.length} of {rows.length} shown</p>

                {shown.length === 0
                  ? <div className="card"><p className="reflect" style={{ margin: 0 }}>
                      Nobody matches that. Clear the search or pick a different filter.
                    </p></div>
                  : shown.map((r) => (
                      <PersonCard key={r.id} row={r} onRole={onRole} onSub={onSub} busyId={busyId} />
                    ))}
              </>
            )}

            {tab === "billing" && (
              <>
                <div className="stats">
                  <Stat value={stats?.paying ?? 0} label="paying" />
                  <Stat value={pesos(stats?.mrr_cents)} label="monthly recurring" />
                  <Stat value={stats?.past_due ?? 0} label="past due" />
                </div>

                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="label">Subscribers</div>
                  {rows.filter((r) => r.plan !== "free").length === 0 ? (
                    <p className="reflect" style={{ margin: "8px 0 0" }}>
                      No paid subscriptions yet. Set one from the People tab, or connect a
                      payment provider so they're created automatically.
                    </p>
                  ) : (
                    <div className="table">
                      <div className="tr th">
                        <span>Person</span><span>Plan</span><span>Amount</span><span>Renews</span>
                      </div>
                      {rows.filter((r) => r.plan !== "free").map((r) => (
                        <div className="tr" key={r.id}>
                          <span>
                            <b>{r.display_name || "—"}</b>
                            <em>{r.email}</em>
                          </span>
                          <span className={"tag tag-plan is-" + r.status}>{r.plan} · {r.status}</span>
                          <span>{pesos(r.amount_cents)}</span>
                          <span>{r.current_period_end || "—"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="label">How payments work now</div>
                  <p className="reflect">
                    New readers get thirty days free, then ₱250 for a year, paid by GCash
                    through PayMongo. The renewal date is set when the payment actually
                    lands — the webhook is what grants access, not the redirect back from
                    GCash.
                  </p>
                  <p className="reflect">
                    Paying early extends the existing end date rather than replacing it, so
                    nobody loses days they already paid for.
                  </p>
                  <p className="reflect" style={{ marginBottom: 0 }}>
                    You can still set a plan by hand from the People tab — useful for a
                    comped account, a refund, or someone who paid you another way.
                  </p>
                </div>
              </>
            )}

            {tab === "settings" && (
              <>
                <div className="card">
                  <div className="label">What each level can do</div>
                  <div className="roles">
                    {ROLES.map((r) => (
                      <div className="role-row" key={r.value}>
                        <b>{r.label}</b>
                        <span>{r.hint}</span>
                        <em>{rows.filter((x) => x.role === r.value).length}</em>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card" style={{ marginTop: 16 }}>
                  <div className="label">Journal entries stay private</div>
                  <p className="reflect" style={{ marginBottom: 0 }}>
                    No level — including this one — can read what people write. The console
                    works from counts and dates only. That's enforced by the database
                    policies, not by this screen, so it holds even against a direct API
                    call. If you ever need to change it, say so on the sign-up page first.
                  </p>
                </div>

                <div className="card" style={{ marginTop: 16, marginBottom: 24 }}>
                  <div className="label">Totals</div>
                  <div className="roles">
                    <div className="role-row"><b>Entries written</b><span>across everyone</span>
                      <em>{stats?.entries_total ?? 0}</em></div>
                    <div className="role-row"><b>Trialing</b><span>not yet paying</span>
                      <em>{stats?.trialing ?? 0}</em></div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
