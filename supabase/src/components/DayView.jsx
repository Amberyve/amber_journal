import React, { useEffect, useState } from "react";
import { WEEKS, MOODS, MOOD_STRESS, TOTAL_DAYS, weekOf, dayInWeek } from "../lib/journal.js";
import { emptyEntry, hasContent, formatDay } from "../lib/data.js";
import { Label, RuledInput, RuledArea } from "./ui.jsx";

/* Phone browsers discard background tabs without warning. Keep an unsaved
   entry in local storage so a half-written morning survives a phone call. */
const draftKey = (userId, day) => `sss:draft:${userId}:${day}`;

function readDraft(userId, day) {
  try {
    const raw = localStorage.getItem(draftKey(userId, day));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeDraft(userId, day, value) {
  try { localStorage.setItem(draftKey(userId, day), JSON.stringify(value)); } catch { /* private mode */ }
}

function clearDraft(userId, day) {
  try { localStorage.removeItem(draftKey(userId, day)); } catch { /* ignore */ }
}

export default function DayView({ userId, profile, day, maxDay, entry, weekly, onSaveEntry, onSaveWeekly, onNavDay }) {
  const wi = weekOf(day);
  const w = WEEKS[wi];
  const prompt = w.prompts[dayInWeek(day)];
  const isWeekStart = dayInWeek(day) === 0;
  const locked = day > maxDay;

  const [e, setE] = useState(entry || emptyEntry());
  const [wk, setWk] = useState(weekly || { intention: "", small_thing: "" });
  const [state, setState] = useState("idle");

  // Until the reader drags the slider themselves, the stress level follows the
  // mood they pick. A day that was already saved counts as deliberate, so we
  // never overwrite a value they chose on an earlier visit.
  const [stressTouched, setStressTouched] = useState(false);
  const [stressAuto, setStressAuto] = useState(false);

  const [restored, setRestored] = useState(false);

  useEffect(() => {
    const saved = entry || emptyEntry();
    const draft = readDraft(userId, day);
    // A draft only wins if it actually differs from what's on the server.
    const useDraft = draft && JSON.stringify({ ...saved, ...draft }) !== JSON.stringify(saved);
    setE(useDraft ? { ...saved, ...draft } : saved);
    setRestored(Boolean(useDraft));
    setStressTouched(hasContent(entry));
    setStressAuto(false);
    setState("idle");
  }, [day, entry, userId]);

  // Keep the draft current as they type, without hammering storage.
  useEffect(() => {
    if (state === "saving") return;
    const t = setTimeout(() => {
      if (hasContent(e) || e.mood !== null) writeDraft(userId, day, e);
    }, 600);
    return () => clearTimeout(t);
  }, [e, userId, day, state]);

  useEffect(() => { setWk(weekly || { intention: "", small_thing: "" }); }, [wi, weekly]);

  const set = (k) => (v) => { setE((p) => ({ ...p, [k]: v })); setState("idle"); };

  const pickMood = (i) => {
    const next = e.mood === i ? null : i;
    setE((p) => {
      const shouldFollow = next !== null && !stressTouched;
      return { ...p, mood: next, stress: shouldFollow ? MOOD_STRESS[next] : p.stress };
    });
    setStressAuto(next !== null && !stressTouched);
    setState("idle");
  };

  const dragStress = (v) => {
    setStressTouched(true);
    setStressAuto(false);
    setE((p) => ({ ...p, stress: v }));
    setState("idle");
  };

  const save = async () => {
    setState("saving");
    try {
      await onSaveEntry(day, e);
      if (isWeekStart) await onSaveWeekly(wi, wk);
      clearDraft(userId, day);
      setRestored(false);
      setState("saved");
      setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 2400);
    } catch {
      setState("error");
    }
  };

  const nav = (
    <div className="daynav">
      <button className="ghost" onClick={() => onNavDay(day - 1)} disabled={day <= 1}
        aria-label="Previous day">←</button>
      <div className="daynav-mid">
        <div className="daynum">Day {day}</div>
        <div className="weekname">Week {wi + 1} · {w.hil}</div>
      </div>
      <button className="ghost" onClick={() => onNavDay(day + 1)}
        disabled={day >= TOTAL_DAYS || day >= maxDay}
        aria-label="Next day">→</button>
    </div>
  );

  if (locked) {
    return (
      <div>
        {nav}
        <div className="card card-locked">
          <p className="locked-date">{formatDay(profile, day)}</p>
          <p className="locked-head">This page opens on the day itself.</p>
          <p className="reflect">
            A journal only works if it's written in the present. Come back that
            morning and this page will be waiting, with its own question.
          </p>
          <button className="btn btn-quiet" onClick={() => onNavDay(maxDay)}>
            Go to today
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {nav}

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
              onClick={() => pickMood(i)}>{m}</button>
          ))}
        </div>

        <div style={{ height: 20 }} />
        <Label htmlFor="stress">Stress right now — {e.stress}/10</Label>
        <input id="stress" type="range" min="1" max="10" value={e.stress} className="range"
          onChange={(ev) => dragStress(Number(ev.target.value))} />
        <div className="rangeends"><span>calm</span><span>overwhelmed</span></div>
        {stressAuto && (
          <p className="hint">Set from how the day felt. Drag it if that's not right.</p>
        )}

        <button className="btn" onClick={save} style={{ marginTop: 26 }} disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save this day"}
        </button>
        {state === "error" && (
          <div className="err">
            That didn't save — you may be offline. What you wrote is kept on this
            phone, so press save again once you have signal.
          </div>
        )}
        {restored && state !== "saved" && (
          <p className="hint">Picked up where you left off. Press save when you're done.</p>
        )}
      </div>
    </div>
  );
}
