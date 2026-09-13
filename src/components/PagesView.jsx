import React from "react";
import { WEEKS } from "../lib/journal.js";
import { hasContent } from "../lib/data.js";

export default function PagesView({ entries, current, onOpen }) {
  const written = Object.values(entries).filter(hasContent).length;

  return (
    <div>
      <h2 className="h2">Your pages</h2>
      <p className="sub">
        {written === 0
          ? "Nothing written yet. Open today and put one line down."
          : `${written} ${written === 1 ? "day" : "days"} written. Gaps are part of the record — leave them.`}
      </p>

      {WEEKS.map((w, wi) => (
        <div key={wi} className="weekblock">
          <div className="weekhead">
            <span className="weekhead-n">Week {wi + 1}</span>
            <span className="weekhead-t">{w.hil} · {w.en}</span>
          </div>
          <div className="daygrid">
            {Array.from({ length: 7 }, (_, i) => {
              const d = wi * 7 + i + 1;
              const filled = hasContent(entries[d]);
              const isNow = d === current;
              return (
                <button key={d} onClick={() => onOpen(d)}
                  aria-label={`Day ${d}${filled ? ", written" : ", empty"}`}
                  className={"daychip" + (filled ? " is-filled" : "") + (isNow ? " is-now" : "")}>
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
