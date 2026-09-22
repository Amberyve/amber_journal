import React, { useState } from "react";
import { startCheckout, pesos, formatDate, billingSummary, PRICE_CENTAVOS } from "../lib/billing.js";

function PayButton({ label, onError, quiet }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); onError("");
    try { await startCheckout(); }         // navigates away on success
    catch (e) { onError(e.message); setBusy(false); }
  };
  return (
    <button className={"btn" + (quiet ? " btn-quiet" : "")} onClick={go} disabled={busy}>
      {busy ? "Opening GCash…" : label}
    </button>
  );
}

/* Shown in place of the day's page once the free month is over. Reading stays
   open — Pages, Patterns and Breathe all still work. Only writing stops. */
export function Paywall({ billing }) {
  const [err, setErr] = useState("");
  const ended = billing?.status === "trialing";

  return (
    <div className="card card-locked">
      <p className="locked-date">{ended ? "Your free month has ended" : "Subscription needed"}</p>
      <p className="locked-head">
        {ended ? "Keep the mornings going." : "Renew to keep writing."}
      </p>

      <p className="reflect">
        {ended
          ? "You had thirty days free. To carry on writing, it's ₱250 for a whole year — about twenty-one pesos a month, or one cup of coffee."
          : "Your access has lapsed. ₱250 covers another full year."}
      </p>

      <ul className="paywall-list">
        <li>All twelve weeks and eighty-four prompts</li>
        <li>Your stress patterns over the whole year</li>
        <li>Everything you've already written stays exactly where it is</li>
      </ul>

      <PayButton label="Pay ₱250 with GCash" onError={setErr} />
      {err && <div className="err">{err}</div>}

      <p className="fine">
        Paid once a year, not monthly. You can also pay by card, Maya or GrabPay on
        the same page. Nothing is charged automatically — we'll remind you before
        the year is up.
      </p>
    </div>
  );
}

/* The billing section inside the You tab. */
export function BillingCard({ billing, onRefresh }) {
  const [err, setErr] = useState("");
  if (!billing) return null;

  const lifetime = billing.plan === "lifetime";
  const trialing = billing.status === "trialing";
  const active = billing.status === "active";

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Subscription</div>

      <p className="billing-state">{billingSummary(billing)}</p>

      <div className="billing-rows">
        <div><span>Plan</span><b>{lifetime ? "Lifetime" : trialing ? "Free month" : "₱250 a year"}</b></div>
        {trialing && billing.trial_ends_at && (
          <div><span>Free until</span><b>{formatDate(billing.trial_ends_at)}</b></div>
        )}
        {active && billing.current_period_end && (
          <div><span>Renews on</span><b>{formatDate(billing.current_period_end)}</b></div>
        )}
        {billing.amount_cents > 0 && (
          <div><span>Last paid</span><b>{pesos(billing.amount_cents)}</b></div>
        )}
        {billing.provider && (
          <div><span>Paid through</span><b>{billing.provider === "paymongo" ? "GCash / PayMongo" : billing.provider}</b></div>
        )}
      </div>

      {!lifetime && (
        <>
          <PayButton
            label={active ? "Extend by a year — ₱250" : `Pay ${pesos(PRICE_CENTAVOS)} with GCash`}
            onError={setErr}
            quiet={active}
          />
          {err && <div className="err">{err}</div>}
          <p className="fine">
            {active
              ? "Paying early adds a year to your current end date — you won't lose the days you've already paid for."
              : "One payment covers a full year."}
          </p>
        </>
      )}

      {onRefresh && (
        <button className="btn btn-quiet" onClick={onRefresh}>Refresh status</button>
      )}
    </div>
  );
}

/* A thin strip at the top of the app while the free month runs down. */
export function TrialBar({ billing, onPay }) {
  if (!billing || billing.plan === "lifetime") return null;
  if (billing.status !== "trialing" || !billing.can_write) return null;
  if (billing.days_left > 7) return null;   // only nag in the last week

  return (
    <div className="trialbar">
      {billing.days_left === 0
        ? "Your free month ends today."
        : `Free month ends in ${billing.days_left} ${billing.days_left === 1 ? "day" : "days"}.`}
      <button className="trialbar-btn" onClick={onPay}>Keep it going — ₱250/year</button>
    </div>
  );
}
