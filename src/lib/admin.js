import { supabase } from "./supabase.js";

/* Everything here goes through SECURITY DEFINER functions that check
   is_super_admin() in the database. A non-admin calling them gets nothing
   back — the guard is not in this file, it's in Postgres. */

export const ROLES = [
  { value: "user", label: "User", hint: "Their own journal only" },
  { value: "admin", label: "Admin", hint: "Can open locked days for testing" },
  { value: "super_admin", label: "Super admin", hint: "Full management access" },
];

export const PLANS = ["free", "monthly", "yearly", "lifetime"];
export const STATUSES = ["trialing", "active", "past_due", "canceled", "expired"];

export async function listUsers() {
  const { data, error } = await supabase.rpc("admin_list_users");
  if (error) throw error;
  return data || [];
}

export async function getStats() {
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) throw error;
  return (data && data[0]) || null;
}

export async function setRole(userId, role) {
  const { error } = await supabase.rpc("admin_set_role", { p_user: userId, p_role: role });
  if (error) throw new Error(friendly(error.message));
}

export async function setSubscription(userId, { plan, status, amount_cents, current_period_end, note }) {
  const { error } = await supabase.rpc("admin_set_subscription", {
    p_user: userId,
    p_plan: plan,
    p_status: status,
    p_amount_cents: Math.round(Number(amount_cents) || 0),
    p_period_end: current_period_end || null,
    p_note: note || "",
  });
  if (error) throw new Error(friendly(error.message));
}

function friendly(msg = "") {
  if (/cannot remove your own/i.test(msg)) return "You can't remove your own super admin access.";
  if (/not allowed/i.test(msg)) return "That account doesn't have management access.";
  return msg || "Something went wrong.";
}

/* ------------------------------------------------------------------ money */
/* Amounts are stored in centavos so there is no floating point in the data. */

export const pesos = (cents) =>
  "₱" + ((cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function relativeDate(iso) {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
}
