'use client';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, WalletCards, CalendarDays, BarChart3, Settings as SettingsIcon, Plus, RefreshCw } from 'lucide-react';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useData } from '@/lib/data';
import Dashboard from './screens/Dashboard';
import Orders from './screens/Orders';
import Menu from './screens/Menu';
import Chefs from './screens/Chefs';
import Expenses from './screens/Expenses';
import Calendar from './screens/Calendar';
import Reports from './screens/Reports';
import Settings from './screens/Settings';

const nav = [['Dashboard', LayoutDashboard], ['Orders', ShoppingBag], ['Menu', UtensilsCrossed], ['Chefs', Users], ['Expenses', WalletCards], ['Calendar', CalendarDays], ['Reports', BarChart3], ['Settings', SettingsIcon]] as const;

export default function Home() {
  const [page, setPage] = useState('Dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabaseConfigured);
  const [authError, setAuthError] = useState('');
  const [toast, setToast] = useState<{ msg: string; kind: string } | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const sb = supabase();
    // No login for now: reuse the stored session, or start an anonymous one so RLS lets requests through.
    sb.auth.getSession().then(async ({ data }) => {
      if (data.session) { setSession(data.session); }
      else {
        const r = await sb.auth.signInAnonymously();
        if (r.error) setAuthError(r.error.message); else setSession(r.data.session);
      }
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { if (s) setSession(s); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const authed = Boolean(session);
  const { data, loading, error, refresh } = useData(authed);
  const notify = (msg: string, kind: 'ok' | 'err' = 'ok') => { setToast({ msg, kind }); setTimeout(() => setToast(null), 3500); };
  const common = { data, notify, refresh };

  if (!supabaseConfigured) return <div className="login"><div className="card"><h1>Setup needed</h1><p className="errtxt">NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set on this deployment.</p></div></div>;
  if (!ready) return null;
  if (!authed) return <div className="login"><div className="card"><h1>Can't connect</h1><p className="errtxt">{authError || 'Could not start a session.'} Enable anonymous sign-ins in Supabase → Authentication → Sign In / Providers.</p></div></div>;

  const hour = Number(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const s = data.settings;
  const hm = (t: string | null) => t ? new Date('1970-01-01T' + t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';

  return <div className="app">
    <aside><div className="brand"><b>🍜 {s?.name || 'The Chinese Wala'}</b><small>Restaurant OS</small></div>
      <nav>{nav.map(([n, I]) => <button className={page === n ? 'sel' : ''} onClick={() => setPage(n)} key={n}><I size={17} />{n}</button>)}</nav>
      <div className="open">● Restaurant open<br /><b>{s ? `${hm(s.opening_time)} — ${hm(s.closing_time)}` : ''}</b></div>
      <div className="user"><span>A</span><div><b>Owner</b><small>Full access</small></div></div></aside>
    <main><header><div><small>Restaurant management / {page}</small><h1>{page === 'Dashboard' ? `${greet}, Owner 👋` : page}</h1><p>Simple, fast operations for {s?.name || 'The Chinese Wala'}.</p></div>
      <div className="hbtns"><button className="ghostbtn" aria-label="Refresh" onClick={() => refresh().then(() => notify('Refreshed'))}><RefreshCw size={14} /></button><button className="primary" onClick={() => setPage('Orders')}><Plus size={16} /> New Order</button></div></header>
      {error && <p className="errtxt">Could not load data: {error}</p>}
      {loading ? <div className="empty"><p>Loading your restaurant…</p></div>
        : page === 'Dashboard' ? <Dashboard data={data} setPage={setPage} />
        : page === 'Orders' ? <Orders {...common} />
        : page === 'Menu' ? <Menu {...common} />
        : page === 'Chefs' ? <Chefs {...common} />
        : page === 'Expenses' ? <Expenses {...common} />
        : page === 'Calendar' ? <Calendar {...common} />
        : page === 'Reports' ? <Reports data={data} />
        : <Settings {...common} />}
    </main>
    {toast && <div className={'toast ' + toast.kind} role="status">{toast.msg}</div>}
  </div>;
}
