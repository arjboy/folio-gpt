import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Publishable values are safe in the browser; env vars override these defaults.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kikpjigkszkclfktzwxu.supabase.co';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_T9URtyvTXkaovy48X4qDYw_Ajz-W4rX';

export const supabaseConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

// One shared client: it keeps the auth session and avoids re-creating listeners.
export function supabase(): SupabaseClient {
  if (!client) client = createClient(url!, key!);
  return client;
}
