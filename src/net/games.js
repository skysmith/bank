import { supabase } from "./supabase.js";

export function makeCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createGameRow(code, state) {
  const { error } = await supabase.from("games").insert({
    code,
    state,
    version: 0
  });
  if (error) throw error;
}

export async function fetchGameRow(code) {
  const { data, error } = await supabase
    .from("games")
    .select("code,state,version,updated_at")
    .eq("code", code)
    .single();

  if (error) throw error;
  return data;
}

// optimistic lock: only update if version matches
export async function updateGameRow(code, nextState, expectedVersion) {
  const { data, error } = await supabase
    .from("games")
    .update({
      state: nextState,
      version: expectedVersion + 1
    })
    .eq("code", code)
    .eq("version", expectedVersion)
    .select("code,state,version,updated_at")
    .single();

  if (error) throw error;
  return data;
}

export function subscribeToGame(code, onRow) {
  const channel = supabase
    .channel(`game:${code}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "games", filter: `code=eq.${code}` },
      (payload) => {
        if (payload?.new) onRow(payload.new);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}