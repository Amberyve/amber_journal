import React, { useState } from "react";
import { WEEKS, MOODS, weekOf, dayInWeek } from "../lib/journal.js";
import { hasContent } from "../lib/data.js";
import { supabase } from "../lib/supabase.js";
import { Label, RuledInput, RuledArea } from "./ui.jsx";

export default function AccountView({ profile, entries, email, onUpdate, onReset }) {
  const [name, setName] = useState(profile.display_name || "");
  const [why, setWhy] = useState(profile.why || "");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const written = Object.values(entries).filter(hasContent).length;

  const save = async () => {
    setBusy(true); setErr(""); setMsg("");
    try {
      await onUpdate({ display_name: name.trim() || profile.display_name, why });
      setMsg("Saved");
      setTimeout(() => setMsg(""), 2000);
    } catch {
      setErr("That didn't save. Try again.");
    } finally { setBusy(false); }
  };

  const exportText = () => {
    const lines = [
      `Sip. Smile. Shine. — ${profile.display_name || "my journal"}`,
      `Started ${profile.start_date}`,
      "",
    ];
    Object.keys(entries).map(Number).sort((a, b) => a - b).forEach((d) => {
      const e = entries[d];
      if (!hasContent(e)) return;
      const w = WEEKS[weekOf(d)];
      lines.push(`── Day ${d} · Week ${weekOf(d) + 1} ${w.hil}`);
      const g = [e.g1, e.g2, e.g3].filter(Boolean);
      if (g.length) lines.push(`Grateful for: ${g.join("; ")}`);
      if (e.intention) lines.push(`Intention: ${e.intention}`);
      lines.push(`Prompt: ${w.prompts[dayInWeek(d)]}`);
      if (e.response) lines.push(e.response);
      if (e.evening) lines.push(`Tonight: ${e.evening}`);
      lines.push(`Felt: ${e.mood != null ? MOODS[e.mood] : "—"} · Stress ${e.stress}/10`, "");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sip-smile-shine-journal.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doReset = async () => {
    setBusy(true); setErr("");
    try { await onReset(); setConfirming(false); }
    catch { setErr("Couldn't clear the journal. Try again."); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <h2 className="h2">Your journal</h2>

      <div className="card">
        <Label htmlFor="dn">Name</Label>
        <RuledInput id="dn" value={name} onChange={setName} />
        <div style={{ height: 18 }} />
        <Label htmlFor="why">What made you open this</Label>
        <RuledArea id="why" value={why} onChange={setWhy} rows={3} />
        <p className="fine">
          Signed in as {email} · started {profile.start_date} · {written} days written
        </p>
        {msg && <div className="ok">{msg}</div>}
        {err && <div className="err">{err}</div>}
        <button className="btn" onClick={save} disabled={busy} style={{ marginTop: 16 }}>
          Save changes
        </button>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <Label>Keep a copy</Label>
        <p className="reflect" style={{ marginTop: 4 }}>
          Download everything you've written as a plain text file.
        </p>
        <button className="btn btn-quiet" onClick={exportText}>Download my entries</button>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <Label>Sign out</Label>
        <p className="reflect" style={{ marginTop: 4 }}>
          Your entries stay saved. Sign back in any time to pick up where you left off.
        </p>
        <button className="btn btn-quiet" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>

      <div className="card" style={{ marginTop: 16, marginBottom: 20 }}>
        <Label>Start over</Label>
        <p className="reflect" style={{ marginTop: 4 }}>
          Clears every entry and begins a new twelve weeks. This can't be undone —
          download a copy first if you want to keep it.
        </p>
        {!confirming ? (
          <button className="btn btn-quiet" onClick={() => setConfirming(true)}>Clear my journal</button>
        ) : (
          <div className="confirm">
            <button className="btn btn-danger" onClick={doReset} disabled={busy}>
              {busy ? "Clearing…" : "Yes, clear everything"}
            </button>
            <button className="btn btn-quiet" onClick={() => setConfirming(false)}>Keep it</button>
          </div>
        )}
      </div>
    </div>
  );
}
