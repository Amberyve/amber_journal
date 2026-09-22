import { supabase } from "./supabase.js";

export const PRICE_CENTAVOS = 25000; // ₱250 a year
export const TRIAL_DAYS = 30;

export const pesos = (cents) =>
  "₱" + ((cents || 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 });

export function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric", month: "long", year: "numeric",
  });
}

/* What the reader's account looks like right now. */
export async function fetchBilling() {
  const { data, error } = await supabase.rpc("my_billing");
  if (error) throw error;
  return (data && data[0]) || null;
}

/* Ask the Edge Function for a PayMongo checkout page and go there.
   The function identifies the reader from their own token, so nothing about
   who is paying comes from the browser. */
export async function startCheckout() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in again.");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.checkout_url) {
    throw new Error(body.error || "Could not open the payment page. Try again in a moment.");
  }
  window.location.href = body.checkout_url;
}

/* After PayMongo sends the reader back, the webhook may not have arrived yet.
   Poll briefly rather than claiming success the redirect can't prove. */
export async function waitForPayment({ tries = 12, gap = 2500 } = {}) {
  for (let i = 0; i < tries; i++) {
    try {
      const b = await fetchBilling();
      if (b?.status === "active" && b?.can_write) return b;
    } catch { /* keep trying */ }
    await new Promise((r) => setTimeout(r, gap));
  }
  return null;
}

/* One sentence describing where the account stands. */
export function billingSummary(b) {
  if (!b) return "";
  if (b.plan === "lifetime") return "You have lifetime access.";
  if (b.status === "trialing" && b.can_write) {
    return b.days_left === 0
      ? "Your free month ends today."
      : `Free month — ${b.days_left} ${b.days_left === 1 ? "day" : "days"} left.`;
  }
  if (b.status === "trialing") return "Your free month has ended.";
  if (b.status === "active" && b.current_period_end) {
    return `Paid until ${formatDate(b.current_period_end)}.`;
  }
  if (b.status === "past_due") return "Your last payment didn't go through.";
  if (["canceled", "expired"].includes(b.status)) return "Your subscription has ended.";
  return "";
}
