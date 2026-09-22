import React from "react";
import { Link } from "react-router-dom";
import Cup from "../components/Cup.jsx";
import { WEEKS } from "../lib/journal.js";

export default function Landing() {
  return (
    <div className="cover-shell">

      {/* ---------- the cover ---------- */}
      <section className="cover">
        <span className="cover-frame" aria-hidden="true" />
        <span className="cover-frame-inner" aria-hidden="true" />

        <div className="cover-inner">
          <p className="cover-brand">Amber Journal</p>
          <span className="cover-tick" aria-hidden="true" />

          <Cup className="cover-cup" size={190} tone="var(--sage)" strokeWidth={3.4} />

          <h1 className="cover-title">
            <span>Sip.</span>
            <span>Smile.</span>
            <span className="shine">Shine.</span>
          </h1>

          <span className="cover-rule" aria-hidden="true" />

          <p className="cover-sub">A 12-Week Guided Journal</p>
          <p className="cover-sub-2">for coffee, gratitude, and small beginnings</p>

          <div className="cover-cta">
            <Link className="btn btn-ink" to="/signup">Start your twelve weeks</Link>
            <Link className="btn btn-line" to="/signin">I already have an account</Link>
          </div>

          <p className="cover-foot">84 mornings &nbsp;·&nbsp; 3 minutes a day</p>
          <div className="cover-cups" aria-hidden="true">
            <Cup size={40} tone="var(--amber)" strokeWidth={5} steam={true} />
            <Cup size={40} tone="var(--amber)" strokeWidth={5} steam={true} />
            <Cup size={40} tone="var(--amber)" strokeWidth={5} steam={true} />
          </div>
        </div>
      </section>

      {/* ---------- inside ---------- */}
      <section className="inside">
        <div className="inside-in">
          <h2 className="inside-h">
            Three minutes.<br />One cup.<br /><span className="amber">Twelve weeks.</span>
          </h2>
          <p className="inside-p">
            Most journals fail because they ask for more than a real morning has
            in it. This one asks for about as long as coffee takes to cool.
          </p>
          <p className="inside-p">
            Three things you're grateful for, one intention, one honest question.
            A single line in the evening. That's the whole thing.
          </p>

          <div className="weeks-list">
            {WEEKS.map((w, i) => (
              <div className="wk-row" key={i}>
                <span className="wk-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="wk-hil">{w.hil}</span>
                <span className="wk-en">{w.en}</span>
              </div>
            ))}
          </div>
          <p className="inside-note">
            A Hiligaynon word to sit with each week, and a different question every day.
          </p>
        </div>
      </section>

      {/* ---------- what it does ---------- */}
      <section className="points">
        <div className="points-in">
          <div className="pt">
            <h3>It only opens on the day</h3>
            <p>
              You can catch up on a morning you missed, but you can't write ahead.
              A journal is only worth reading back if it was written in the present.
            </p>
          </div>
          <div className="pt">
            <h3>See where the stress goes</h3>
            <p>
              Rate the day as you write it. Over twelve weeks the app shows you the
              line — which days were calmest, and what was different about them.
            </p>
          </div>
          <div className="pt">
            <h3>Something for the hard moments</h3>
            <p>
              A breathing timer and a grounding exercise, for the days when writing
              isn't what you need first.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- close ---------- */}
      <footer className="close">
        <div className="close-in">
          <Cup size={64} tone="var(--amber-soft)" strokeWidth={4.5} />
          <p className="close-line">Start with tomorrow morning.</p>
          <Link className="btn btn-amber close-btn" to="/signup">Create your journal</Link>
          <p className="fine close-fine">
            Your entries are private to your account. This is a journal, not a
            clinical tool — if stress is staying high, please talk to a doctor or
            counselor.
          </p>
          <p className="close-brand">Amber Journal &nbsp;·&nbsp; Sip. Smile. Shine.</p>
        </div>
      </footer>
    </div>
  );
}
