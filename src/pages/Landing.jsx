import React from "react";
import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="shell">
      <div className="onboard">
        <div className="brand-mark">Pretty Amber</div>

        <h1 className="hero">
          Sip.<br />Smile.<br /><span className="amber">Shine.</span>
        </h1>

        <p className="hero-sub">
          Twelve weeks of three-minute mornings. Three things you're grateful for,
          one intention, one honest question — and a record of how the stress moves.
        </p>

        <div className="cta-row">
          <Link className="btn btn-amber" to="/signup">Start your twelve weeks</Link>
          <Link className="btn btn-outline" to="/signin">I already have an account</Link>
        </div>

        <div className="landing-points">
          <div className="lp">
            <h3>Three minutes, not thirty</h3>
            <p>
              Journals fail because they ask for more than a real morning has in it.
              This one asks for about as long as coffee takes to cool.
            </p>
          </div>
          <div className="lp">
            <h3>A Hiligaynon word each week</h3>
            <p>
              Pagsugod. Pahuway. Kaisog. Pagbuhi. Twelve themes to sit with, one
              week at a time, with a different question every day.
            </p>
          </div>
          <div className="lp">
            <h3>See where the stress goes</h3>
            <p>
              Rate the day, and the app shows you the line over twelve weeks —
              which days were calmest, and what changed.
            </p>
          </div>
        </div>

        <p className="fine landing-fine">
          Your entries are private to your account. This is a journal, not a
          clinical tool — if stress is staying high, please talk to a doctor or
          counsellor.
        </p>
      </div>
    </div>
  );
}
