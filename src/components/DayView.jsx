import React, { useEffect, useState } from "react";
import { WEEKS, MOODS, TOTAL_DAYS, weekOf, dayInWeek } from "../lib/journal.js";
import { emptyEntry } from "../lib/data.js";
import { Label, RuledInput, RuledArea } from "./ui.jsx";

export default function DayView({ day, entry, weekly, onSaveEntry, onSaveWeekly, onNavDay }) {
  const wi = weekOf(day);
  const w = WEEKS[wi];
  const prompt = w.prompts[dayInWeek(day)];
  const isWeekStart = dayInWeek(day) === 0;

  const [e, setE] = useState(entry || emptyEntry());
  const [wk, setWk] = useState(weekly || { intention: "", small_thing: "" });
  const [state, setState] = useState("idle");

  useEffect(() => { setE(entry || emptyEntry()); setState("idle"); }, [day, entry]);
  useEffect(() => { setWk(weekly || { intention: "", small_thing: "" }); }, [wi, weekly]);

  const set = (k) => (v) => { setE((p) => ({ ...p, [k]: v })); setState("idle"); };

  const save = async () => {
    setState("saving");
    try {
      await onSaveEntry(day, e);
      if (isWeekStart) await onSaveWeekly(wi, wk);
      setState("saved");
      setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 2400);
    } catch {
      setState("error");
    }
  };

  return (
    <div>
      <div className="daynav">
        <button className="ghost" onClick={() => onNavDay(day - 1)} disabled={day <= 1}
          aria-label="Previous day">←</button>
        <div className="daynav-mid">
          <div className="daynum">Day {day}</div>
          <div className="weekname">Week {wi + 1} · {w.hil}</div>
        </div>
        <button className="ghost" onClick={() => onNavDay(day + 1)} disabled={day >= TOTAL_DAYS}
          aria-label="Next day">→</button>
      </div>

      <div className="card">
        <p className="quote">“{w.quote}”</p>

        {isWeekStart && (
          <div className="weekopen">
            <p className="reflect">{w.reflect}</p>
            <Label htmlFor="wi">{w.intention}</Label>
            <RuledInput id="wi" value={wk.intention}
              onChange={(v) => setWk((p) => ({ ...p, intention: v }))}
              placeholder="One line is enough" />
            <div style={{ height: 14 }} />
            <Label htmlFor="ws">One small thing I'll do about it</Label>
            <RuledInput id="ws" value={wk.small_thing}
              onChange={(v) => setWk((p) => ({ ...p, small_thing: v }))}
              placeholder="Something you could do before Wednesday" />
          </div>
        )}

        <div style={{ height: 22 }} />
        <Label>Three things I'm grateful for</Label>
        <RuledInput num={1} value={e.g1} onChange={set("g1")} />
        <RuledInput num={2} value={e.g2} onChange={set("g2")} />
        <RuledInput num={3} value={e.g3} onChange={set("g3")} />

        <div style={{ height: 20 }} />
        <Label htmlFor="int">Today, my one intention is</Label>
        <RuledInput id="int" value={e.intention} onChange={set("intention")} />

        <div style={{ height: 26 }} />
        <p className="prompt">{prompt}</p>
        <RuledArea value={e.response} onChange={set("response")} rows={6}
          placeholder="Short answers are correct answers." />

        <div style={{ height: 18 }} />
        <Label>Tonight — the best thing about today</Label>
        <RuledArea value={e.evening} onChange={set("evening")} rows={2} />

        <div className="divider" />

        <Label>How today felt</Label>
        <div className="moods">
          {MOODS.map((m, i) => (
            <button key={m} type="button"
              aria-pressed={e.mood === i}
              className={"mood" + (e.mood === i ? " is-on" : "")}
              onClick={() => set("mood")(e.mood === i ? null : i)}>{m}</button>
          ))}
        </div>

        <div style={{ height: 20 }} />
        <Label htmlFor="stress">Stress right now — {e.stress}/10</Label>
        <input id="stress" type="range" min="1" max="10" value={e.stress} className="range"
          onChange={(ev) => set("stress")(Number(ev.target.value))} />
        <div className="rangeends"><span>calm</span><span>overwhelmed</span></div>

        <button className="btn" onClick={save} style={{ marginTop: 26 }} disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save this day"}
        </button>
        {state === "error" && (
          <div className="err">That didn't save. Check your connection and press save again.</div>
        )}
      </div>
    </div>
  );
}
