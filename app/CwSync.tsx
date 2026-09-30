'use client';

import { useLayoutEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const STORE_KEY = 'cw-store-v3';
const STORE_ID = 'main';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kikpjigkszkclfktzwxu.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_T9URtyvTXkaovy48X4qDYw_Ajz-W4rX';

export default function CwSync() {
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const storage = window.localStorage;
    const originalSetItem = storage.setItem.bind(storage);
    const originalRemoveItem = storage.removeItem.bind(storage);
    let ready = false;
    let loading = true;
    let queued: string | null = null;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    const save = (raw: string) => {
      if (!ready) { queued = raw; return; }
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(async () => {
        try {
          const data = JSON.parse(raw);
          await supabase.from('restaurant_store').upsert({ id: STORE_ID, data, updated_at: new Date().toISOString() });
        } catch (e) {
          console.error('Restaurant data sync failed', e);
        }
      }, 150);
    };

    storage.setItem = ((key: string, value: string) => {
      originalSetItem(key, value);
      if (key === STORE_KEY) save(value);
    }) as Storage['setItem'];

    storage.removeItem = ((key: string) => {
      originalRemoveItem(key);
      if (key === STORE_KEY && ready) {
        void supabase.from('restaurant_store').delete().eq('id', STORE_ID);
      }
    }) as Storage['removeItem'];

    const sync = async () => {
      try {
        const { data: remote, error } = await supabase
          .from('restaurant_store')
          .select('data,updated_at')
          .eq('id', STORE_ID)
          .maybeSingle();
        if (error) throw error;

        const localRaw = storage.getItem(STORE_KEY);
        const local = localRaw ? JSON.parse(localRaw) : null;
        const remoteData = remote?.data as any;

        if (remoteData && typeof remoteData === 'object') {
          // The database is the source of truth after the first successful sync.
          originalSetItem(STORE_KEY, JSON.stringify(remoteData));
          ready = true;
          queued = null;
          window.dispatchEvent(new CustomEvent('cw-store-synced'));
          return;
        }

        // First run: preserve any existing browser data by migrating it into Supabase.
        ready = true;
        if (local) {
          await supabase.from('restaurant_store').upsert({ id: STORE_ID, data: local, updated_at: new Date().toISOString() });
          queued = null;
        } else if (queued) {
          const data = JSON.parse(queued);
          await supabase.from('restaurant_store').upsert({ id: STORE_ID, data, updated_at: new Date().toISOString() });
          queued = null;
        }
      } catch (e) {
        console.error('Restaurant database sync unavailable; browser persistence remains active.', e);
        ready = true;
        if (queued) save(queued);
      } finally {
        loading = false;
      }
    };

    void sync();

    return () => {
      storage.setItem = originalSetItem;
      storage.removeItem = originalRemoveItem;
      if (saveTimer) clearTimeout(saveTimer);
      loading = false;
    };
  }, []);

  return null;
}
