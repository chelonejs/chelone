import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * A real client that makes no network call on creation. `persistSession: false`
 * keeps the session in memory and `autoRefreshToken: false` keeps the refresh
 * ticker from starting.
 */
export const testClient = (): SupabaseClient =>
  createClient("http://localhost:54321", "anon-key", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
