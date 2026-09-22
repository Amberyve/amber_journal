import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

const placeholderPatterns = [
  "your-project",
  "your-anon-public-key",
  "your-supabase",
  "placeholder",
  "example.com",
  "xxxx",
  "replace-me",
];

const isPlaceholderValue = (value) => {
  if (!value || typeof value !== "string") return true;

  const normalized = value.trim().toLowerCase();
  return placeholderPatterns.some((pattern) => normalized.includes(pattern));
};

export const configured = Boolean(
  url &&
  key &&
  !isPlaceholderValue(url) &&
  !isPlaceholderValue(key)
);

export const supabase = configured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
