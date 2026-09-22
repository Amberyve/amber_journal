// Receives payment events from PayMongo and marks the subscription paid.
//
// This is the only thing that grants access. The browser redirect after
// checkout is just a redirect — anyone can visit that URL — so nothing is
// unlocked there. The webhook is the source of truth.
//
// Deploy:  supabase functions deploy paymongo-webhook --no-verify-jwt
//          (--no-verify-jwt because PayMongo calls it, not a signed-in user;
//           the signature check below is what authenticates the request)
// Secrets: supabase secrets set PAYMONGO_WEBHOOK_SECRET=whsk_...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const enc = new TextEncoder();

/* PayMongo sends:  Paymongo-Signature: t=<unix>,te=<test sig>,li=<live sig>
   The signed payload is `${t}.${rawBody}`, HMAC-SHA256 with the webhook
   secret. `te` is present for test-mode keys, `li` for live ones. */
async function signatureIsValid(raw: string, header: string, secret: string) {
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const i = kv.indexOf("=");
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  ) as Record<string, string>;

  const t = parts.t;
  const sent = parts.li || parts.te;
  if (!t || !sent) return false;

  // Reject anything older than five minutes, so a captured request can't be
  // replayed later.
  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(age) || age > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${raw}`));
  const expected = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  // Constant-time compare.
  if (expected.length !== sent.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sent.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Use POST", { status: 405 });

  const secret = Deno.env.get("PAYMONGO_WEBHOOK_SECRET");
  if (!secret) {
    console.error("PAYMONGO_WEBHOOK_SECRET is not set");
    return new Response("not configured", { status: 500 });
  }

  const raw = await req.text();
  const sig = req.headers.get("paymongo-signature") ?? "";

  if (!(await signatureIsValid(raw, sig, secret))) {
    console.warn("rejected a webhook with a bad signature");
    return new Response("bad signature", { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }

  const type = event?.data?.attributes?.type ?? "";
  const resource = event?.data?.attributes?.data ?? {};
  const attr = resource?.attributes ?? {};

  // Only these mean money actually arrived.
  const paidEvents = ["payment.paid", "checkout_session.payment.paid", "link.payment.paid"];
  if (!paidEvents.includes(type)) {
    return new Response(JSON.stringify({ ignored: type }), { status: 200 });
  }

  // The user id travels in metadata, set when the checkout session was made.
  const metadata = attr.metadata
    ?? attr.payments?.[0]?.attributes?.metadata
    ?? attr.data?.attributes?.metadata
    ?? {};
  const userId = metadata.user_id;

  if (!userId) {
    console.error("paid event with no user_id in metadata", type, resource?.id);
    // 200 so PayMongo stops retrying something we can never resolve.
    return new Response("no user_id", { status: 200 });
  }

  const paymentObj = attr.payments?.[0]?.attributes ?? attr;
  const amount = Number(paymentObj.amount ?? attr.amount ?? 0);
  const ref = attr.payments?.[0]?.id ?? resource?.id ?? null;
  const method = paymentObj.source?.type
    ?? paymentObj.payment_method_used
    ?? attr.payment_method_used
    ?? null;
  const paidAtSec = Number(paymentObj.paid_at ?? attr.paid_at ?? 0);
  const paidOn = new Date((paidAtSec ? paidAtSec * 1000 : Date.now()))
    .toISOString().slice(0, 10);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Same payment delivered twice must not add two years. The unique index on
  // (provider, provider_ref) makes the second insert fail, and we stop there.
  if (ref) {
    const { data: seen } = await admin
      .from("payments").select("id").eq("provider", "paymongo").eq("provider_ref", ref).maybeSingle();
    if (seen) {
      return new Response(JSON.stringify({ duplicate: ref }), { status: 200 });
    }
  }

  const { data: periodEnd, error: applyErr } = await admin.rpc("apply_payment", {
    p_user: userId,
    p_amount_cents: amount,
    p_ref: ref,
    p_paid_on: paidOn,
  });

  if (applyErr) {
    console.error("apply_payment failed", applyErr);
    // 500 so PayMongo retries; the subscription is not yet updated.
    return new Response("could not apply payment", { status: 500 });
  }

  await admin.from("payments").insert({
    user_id: userId,
    amount_cents: amount,
    currency: attr.currency ?? "PHP",
    provider: "paymongo",
    provider_ref: ref,
    method,
    paid_at: new Date(paidAtSec ? paidAtSec * 1000 : Date.now()).toISOString(),
    period_end: periodEnd,
    raw: event,
  });

  console.log(`paid: user=${userId} amount=${amount} until=${periodEnd} via=${method}`);
  return new Response(JSON.stringify({ ok: true, period_end: periodEnd }), { status: 200 });
});
