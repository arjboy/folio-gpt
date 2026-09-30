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
import { Modal } from './screens/ui';
import { MoreHorizontal } from 'lucide-react';

const nav = [['Dashboard', LayoutDashboard], ['Orders', ShoppingBag], ['Menu', UtensilsCrossed], ['Chefs', Users], ['Expenses', WalletCards], ['Calendar', CalendarDays], ['Reports', BarChart3], ['Settings', SettingsIcon]] as const;

// Sign in with Supabase Auth. The username "admin" maps to the owner's email; row-level security
// on the database only allows that account, so this is enforced server-side.
const emailFor = (u: string) => (u.includes('@') ? u : `${u}@thechinesewala.app`).trim().toLowerCase();

function LoginGate() {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase().auth.signInWithPassword({ email: emailFor(u), password: p });
    if (error) setErr('Wrong username or password');
    setBusy(false);
  };
  return <div className="login"><form className="card" onSubmit={go}>
    <h1>🍜 The Chinese Wala</h1><small>Sign in to Restaurant OS</small>
    <div className="form"><label className="field"><small>Username</small><input autoComplete="username" required value={u} onChange={e => setU(e.target.value)} /></label>
      <label className="field"><small>Password</small><input type="password" autoComplete="current-password" required value={p} onChange={e => setP(e.target.value)} /></label>
      {err && <p className="errtxt">{err}</p>}<button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></div>
  </form></div>;
}

export default function Home() {
  const [page, setPage] = useState('Dashboard');
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabaseConfigured);
  useEffect(() => { // direct links such as /orders or /chefs open that screen
    const seg = location.pathname.split('/')[1]?.toLowerCase();
    const hit = nav.find(n => n[0].toLowerCase() === seg);
    if (hit) setPage(hit[0]);
  }, []);
  const [more, setMore] = useState(false);
  const [toast, setToast] = useState<{ msg: string; kind: string } | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const sb = supabase();
    // Leftover anonymous sessions (from the earlier open setup) are not the owner: drop them.
    const accept = (s: Session | null) => { if (s?.user.is_anonymous) { sb.auth.signOut(); return null; } return s; };
    sb.auth.getSession().then(({ data }) => { setSession(accept(data.session)); setReady(true); });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(accept(s)));
    return () => sub.subscription.unsubscribe();
  }, []);

  const authed = Boolean(session);
  const { data, loading, error, refresh } = useData(authed);
  const friendly = (m: string) => /numeric field overflow/i.test(m) ? 'That number is too large. Please check the amounts you entered.'
    : /violates check constraint/i.test(m) ? 'One of the values is not allowed. Please check your entries.'
    : /duplicate key/i.test(m) ? 'That already exists.' : m;
  const notify = (msg: string, kind: 'ok' | 'err' = 'ok') => { setToast({ msg: kind === 'err' ? friendly(msg) : msg, kind }); setTimeout(() => setToast(null), 3500); };
  const common = { data, notify, refresh };

  if (!supabaseConfigured) return <div className="login"><div className="card"><h1>Setup needed</h1><p className="errtxt">NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set on this deployment.</p></div></div>;
  if (!ready) return null;
  if (!authed) return <LoginGate />;

  const hour = Number(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }));
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const s = data.settings;
  const hm = (t: string | null) => t ? new Date('1970-01-01T' + t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';

  return <div className="app">
    <aside><div className="brand"><b>🍜 {s?.name || 'The Chinese Wala'}</b><small>Restaurant OS</small></div>
      <nav>{nav.map(([n, I]) => <button className={page === n ? 'sel' : ''} onClick={() => setPage(n)} key={n}><I size={17} />{n}</button>)}</nav>
      <div className="open">● Restaurant open<br /><b>{s ? `${hm(s.opening_time)} — ${hm(s.closing_time)}` : ''}</b></div>
      <div className="user"><span>A</span><div><b>Admin</b><small>Full access</small></div><button className="ghostbtn" style={{marginLeft:"auto",padding:"5px 7px",fontSize:9}} onClick={() => supabase().auth.signOut()}>Log out</button></div></aside>
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
    <div className="tabbar">
      {nav.slice(0, 4).map(([n, I]) => <button key={n} className={page === n ? 'sel' : ''} onClick={() => setPage(n)}><I size={20} /><span>{n}</span></button>)}
      <button className={nav.slice(4).some(n => n[0] === page) ? 'sel' : ''} onClick={() => setMore(true)}><MoreHorizontal size={20} /><span>{nav.slice(4).find(n => n[0] === page)?.[0] || 'More'}</span></button>
    </div>
    {more && <Modal title="More" onClose={() => setMore(false)}>
      <div className="moreGrid">{nav.slice(4).map(([n, I]) => <button key={n} className={page === n ? 'sel' : ''} onClick={() => { setPage(n); setMore(false); }}><I size={22} />{n}</button>)}</div>
      <button className="secondary" style={{ justifyContent: 'center' }} onClick={() => { setMore(false); supabase().auth.signOut(); }}>Log out</button>
    </Modal>}
    {toast && <div className={'toast ' + toast.kind} role="status">{toast.msg}</div>}
  </div>;
}
