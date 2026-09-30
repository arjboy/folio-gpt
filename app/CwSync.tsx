'use client';

import { useLayoutEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const STORE_KEY = 'cw-store-v3';
const STORE_ID = 'main';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kikpjigkszkclfktzwxu.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_T9URtyvTXkaovy48X4qDYw_Ajz-W4rX';

declare global { interface Window { __cwSyncReady?: boolean } }

export default function CwSync() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const storage = window.localStorage;
    const originalSetItem = storage.setItem.bind(storage);
    let ready = false;
    let queued: string | null = null;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const save = (raw: string) => {
      if (!ready) { queued = raw; return; }
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try {
          const data = JSON.parse(raw);
          const { error } = await supabase.from('restaurant_store').upsert({ id: STORE_ID, data, updated_at: new Date().toISOString() });
          if (error) throw error;
        } catch (e) { console.error('Restaurant data sync failed', e); }
      }, 200);
    };

    storage.setItem = ((key: string, value: string) => {
      originalSetItem(key, value);
      if (key === STORE_KEY) save(value);
    }) as Storage['setItem'];

    const publishLoaded = (data: unknown, persistQueued = true) => {
      window.__cwSyncReady = true;
      ready = true;
      window.dispatchEvent(new CustomEvent('cw-store-loaded', { detail: data }));
      if (persistQueued && queued) { const pending = queued; queued = null; save(pending); }
    };

    const sync = async () => {
      try {
        const { data: remote, error } = await supabase.from('restaurant_store').select('data,updated_at').eq('id', STORE_ID).maybeSingle();
        if (error) throw error;
        const localRaw = storage.getItem(STORE_KEY);
        const remoteData = remote?.data as any;

        if (remoteData && typeof remoteData === 'object') {
          // Supabase is authoritative. Never write the pre-sync seeded state back over it.
          queued = null;
          originalSetItem(STORE_KEY, JSON.stringify(remoteData));
          publishLoaded(remoteData, false);
          return;
        }

        if (localRaw) {
          const local = JSON.parse(localRaw);
          const { error: upsertError } = await supabase.from('restaurant_store').upsert({ id: STORE_ID, data: local, updated_at: new Date().toISOString() });
          if (upsertError) throw upsertError;
          publishLoaded(local);
        } else {
          publishLoaded(null);
        }
      } catch (e) {
        console.error('Restaurant database sync unavailable; browser persistence remains active.', e);
        window.__cwSyncReady = true;
        ready = true;
        if (queued) { const pending = queued; queued = null; save(pending); }
      }
    };

    void sync();
    return () => { storage.setItem = originalSetItem; if (saveTimer) clearTimeout(saveTimer); };
  }, []);
  return null;
}
