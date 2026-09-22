import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { MOODS } from "../lib/journal.js";
import { hasContent } from "../lib/data.js";

const SAGE = "#6E8055", AMBER = "#C88F3E", RULE = "#D9CCB6", MUTED = "#8A7A68", PAPER = "#F7F0E5", INK = "#2E2721";
const SANS = 'Karla, system-ui, -apple-system, sans-serif';
/* Chart labels sit on the same ladder as the CSS: 11px micro, 12px label. */
const T_MICRO = 11, T_LABEL = 12;

export default function PatternsView({ entries }) {
  const rows = Object.keys(entries).map(Number).sort((a, b) => a - b)
    .filter((d) => hasContent(entries[d]) || entries[d]?.mood != null)
    .map((d) => ({ day: d, stress: entries[d].stress, mood: entries[d].mood }));

  if (rows.length < 2) {
    return (
      <div>
        <h2 className="h2">What the weeks show</h2>
        <div className="card">
          <p className="reflect" style={{ margin: 0 }}>
            Patterns need a few days to appear. Write two or three entries and the
            stress line starts here.
          </p>
        </div>
      </div>
    );
  }

  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const stresses = rows.map((r) => r.stress);
  const half = Math.ceil(stresses.length / 2);
  const trend = avg(stresses.slice(half)) - avg(stresses.slice(0, half));
  const calmest = rows.reduce((a, b) => (b.stress < a.stress ? b : a));
  const counts = MOODS.map((_, i) => rows.filter((r) => r.mood === i).length);
  const topMood = counts.indexOf(Math.max(...counts));
  const hasMoods = Math.max(...counts) > 0;

  const maxDay = Math.max(...rows.map((r) => r.day));
  let streak = 0;
  for (let d = maxDay; d >= 1; d--) { if (hasContent(entries[d])) streak++; else break; }

  return (
    <div>
      <h2 className="h2">What the weeks show</h2>
      <p className="sub">Only you can see this.</p>

      <div className="stats">
        <div className="stat"><b>{rows.length}</b><span>days written</span></div>
        <div className="stat"><b>{streak}</b><span>in a row</span></div>
        <div className="stat"><b>{avg(stresses).toFixed(1)}</b><span>average stress</span></div>
      </div>

      <div className="card" style={{ paddingTop: 20 }}>
        <div className="label">Stress over time</div>
        <div style={{ height: 220, marginTop: 8, marginLeft: -18 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows}>
              <CartesianGrid stroke={RULE} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: T_MICRO, fontFamily: SANS }}
                axisLine={{ stroke: RULE }} tickLine={false} />
              <YAxis domain={[0, 10]} ticks={[0, 5, 10]}
                tick={{ fill: MUTED, fontSize: T_MICRO, fontFamily: SANS }}
                axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: PAPER, border: `1px solid ${RULE}`, borderRadius: 4,
                  fontFamily: SANS, fontSize: T_LABEL, color: INK }}
                labelFormatter={(d) => `Day ${d}`} formatter={(v) => [`${v}/10`, "stress"]} />
              <Line type="monotone" dataKey="stress" stroke={SAGE} strokeWidth={2}
                dot={{ r: 3, fill: AMBER, stroke: "none" }} activeDot={{ r: 5, fill: AMBER }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">What that adds up to</div>
        <ul className="list">
          <li>
            {Math.abs(trend) < 0.4
              ? "Your stress has been roughly level across these entries."
              : trend < 0
                ? `Stress is trending down — about ${Math.abs(trend).toFixed(1)} points lower in the second half than the first.`
                : `Stress is trending up — about ${trend.toFixed(1)} points higher in the second half. Worth asking what changed.`}
          </li>
          <li>Your calmest entry so far was day {calmest.day}, at {calmest.stress}/10. What was different that day?</li>
          {hasMoods && <li>Most days you described as “{MOODS[topMood]}”.</li>}
        </ul>
      </div>

      <p className="fine" style={{ marginTop: 18 }}>
        This is a journal, not a clinical tool. If stress is staying high or getting
        harder to manage, that's worth talking through with a doctor or counselor.
      </p>
    </div>
  );
}
