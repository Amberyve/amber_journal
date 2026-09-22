// Creates a PayMongo Checkout Session for the signed-in reader and returns the
// URL to send them to. Runs on Supabase Edge Functions (Deno).
//
// The PayMongo secret key lives here, never in the browser.
//
// Deploy:  supabase functions deploy create-checkout
// Secrets: supabase secrets set PAYMONGO_SECRET_KEY=sk_live_... SITE_URL=https://your-domain

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PRICE_CENTAVOS = 25_000; // ₱250.00 for one year
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const secret = Deno.env.get("PAYMONGO_SECRET_KEY");
  const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
  if (!secret) return json({ error: "PAYMONGO_SECRET_KEY is not set" }, 500);
  if (!siteUrl) return json({ error: "SITE_URL is not set" }, 500);

  // Identify the reader from their own token. Never trust a user id sent in
  // the body — that would let anyone buy a subscription for another account.
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return json({ error: "Please sign in again." }, 401);

  const { data: profile } = await supabase
    .from("profiles").select("display_name").eq("id", user.id).maybeSingle();

  const payload = {
    data: {
      attributes: {
        // GCash first; cards and the other wallets are there for anyone
        // without GCash. Remove any you don't want offered.
        payment_method_types: ["gcash", "card", "paymaya", "grab_pay"],
        line_items: [{
          name: "Sip. Smile. Shine. — one year",
          description: "Twelve weeks of guided journaling, and the year to keep it in.",
          amount: PRICE_CENTAVOS,
          currency: "PHP",
          quantity: 1,
        }],
        description: `Amber Journal journal — ${user.email}`,
        send_email_receipt: true,
        show_description: true,
        show_line_items: true,
        success_url: `${siteUrl}/journal?paid=1`,
        cancel_url: `${siteUrl}/journal?paid=0`,
        billing: {
          email: user.email,
          name: profile?.display_name || undefined,
        },
        // This is how the webhook knows whose account to credit.
        metadata: {
          user_id: user.id,
          email: user.email ?? "",
        },
      },
    },
  };

  const res = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
    method: "POST",
    headers: {
      // PayMongo uses HTTP Basic with the secret key as the username and an
      // empty password, so the colon at the end matters.
      Authorization: `Basic ${btoa(`${secret}:`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json();

  if (!res.ok) {
    console.error("paymongo checkout failed", res.status, JSON.stringify(body));
    const detail = body?.errors?.[0]?.detail ?? "Could not start the payment.";
    return json({ error: detail }, 502);
  }

  return json({
    checkout_url: body.data.attributes.checkout_url,
    session_id: body.data.id,
  });
});
