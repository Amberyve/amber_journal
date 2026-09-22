import { supabase } from "./supabase.js";
import { TOTAL_DAYS } from "./journal.js";

/* ---------------------------------------------------------------- helpers */

export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export function daysBetween(fromISO, toISO) {
  const a = new Date(fromISO + "T00:00:00");
  const b = new Date(toISO + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

export function currentDay(profile) {
  if (!profile?.start_date) return 1;
  return Math.min(TOTAL_DAYS, Math.max(1, daysBetween(profile.start_date, todayISO()) + 1));
}

/* The calendar date a given day number falls on. */
export function dateForDay(profile, day) {
  const d = new Date(profile.start_date + "T00:00:00");
  d.setDate(d.getDate() + (day - 1));
  return d;
}

/* A day opens on its own date and never before. Past days stay editable so a
   missed morning can be caught up; future days are closed. */
export function isDayOpen(profile, day) {
  return day <= currentDay(profile);
}

export function formatDay(profile, day) {
  return dateForDay(profile, day).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
  });
}

export function emptyEntry() {
  return { g1: "", g2: "", g3: "", intention: "", response: "", evening: "", mood: null, stress: 5 };
}

export const hasContent = (e) =>
  !!e && [e.g1, e.g2, e.g3, e.intention, e.response, e.evening].some((v) => (v || "").trim());

/* ---------------------------------------------------------------- profile */

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveProfile(userId, patch) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...patch }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ---------------------------------------------------------------- entries */

export async function fetchEntries(userId) {
  const { data, error } = await supabase
    .from("entries").select("*").eq("user_id", userId).order("day");
  if (error) throw error;
  const map = {};
  (data || []).forEach((row) => { map[row.day] = row; });
  return map;
}

export async function saveEntry(userId, day, entry) {
  const row = {
    user_id: userId,
    day,
    g1: entry.g1 || "",
    g2: entry.g2 || "",
    g3: entry.g3 || "",
    intention: entry.intention || "",
    response: entry.response || "",
    evening: entry.evening || "",
    mood: entry.mood === null || entry.mood === undefined ? null : entry.mood,
    stress: entry.stress ?? 5,
    entry_date: todayISO(),
  };
  const { data, error } = await supabase
    .from("entries")
    .upsert(row, { onConflict: "user_id,day" })
    .select()
    .single();
  if (error) {
    // The row-level policy blocks days that haven't arrived yet.
    if ((error.code === "42501") || /row-level security/i.test(error.message || "")) {
      throw new Error("That day hasn't opened yet.");
    }
    throw error;
  }
  return data;
}

/* ------------------------------------------------------- weekly intentions */

export async function fetchWeekly(userId) {
  const { data, error } = await supabase
    .from("weekly_intentions").select("*").eq("user_id", userId).order("week");
  if (error) throw error;
  const map = {};
  (data || []).forEach((row) => { map[row.week] = row; });
  return map;
}

export async function saveWeekly(userId, week, value) {
  const { data, error } = await supabase
    .from("weekly_intentions")
    .upsert({
      user_id: userId,
      week,
      intention: value.intention || "",
      small_thing: value.small_thing || "",
    }, { onConflict: "user_id,week" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ reset */

export async function clearJournal(userId) {
  const a = await supabase.from("entries").delete().eq("user_id", userId);
  if (a.error) throw a.error;
  const b = await supabase.from("weekly_intentions").delete().eq("user_id", userId);
  if (b.error) throw b.error;
}
