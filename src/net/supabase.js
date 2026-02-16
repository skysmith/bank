import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging (safe — only logs first part of key)
console.log("SUPABASE_URL:", url);
console.log("SUPABASE_KEY_HEAD:", key ? key.slice(0, 20) : "undefined");

// Basic validation
if (!url) {
  throw new Error("VITE_SUPABASE_URL is missing. Check .env.local and restart Vite.");
}

if (!key) {
  throw new Error("VITE_SUPABASE_ANON_KEY is missing. Check .env.local and restart Vite.");
}

// Extra guard: make sure we're not accidentally using a secret key
if (key.startsWith("sb_secret_")) {
  throw new Error("You are using a secret key in the frontend. Use the publishable key instead.");
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: false
  }
});