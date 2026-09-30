import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

// One shared client: it keeps the auth session and avoids re-creating listeners.
export function supabase(): SupabaseClient {
  if (!client) client = createClient(url!, key!);
  return client;
}
