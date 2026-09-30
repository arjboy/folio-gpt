'use client';
import { useEffect, useState } from 'react';
import { Data, istDate, logActivity, money } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { Card, Common } from './ui';
import { summarize } from './Dashboard';

const checks = [['cash_checked', 'Cash counted'], ['online_checked', 'Online payments matched'], ['expenses_verified', 'Expenses verified'], ['salary_settled', 'Salaries / advances settled']] as const;

export default function Calendar({ data, notify }: { data: Data } & Common) {
  const [date, setDate] = useState(istDate());
  const [rec, setRec] = useState<Record<string, any>>({ notes: '', closed: false });
  useEffect(() => {
    supabase().from('daily_notes').select('*').eq('business_date', date).maybeSingle().then(({ data: r }) => setRec(r || { notes: '', closed: false }));
  }, [date]);
  const t = summarize(data, date);

  const save = async (patch: Record<string, any>, msg?: string) => {
    const next = { ...rec, ...patch };
    setRec(next);
    const { error } = await supabase().from('daily_notes').upsert({ business_date: date, notes: next.notes || '', closed: !!next.closed, cash_checked: !!next.cash_checked, online_checked: !!next.online_checked, expenses_verified: !!next.expenses_verified, salary_settled: !!next.salary_settled, updated_at: new Date().toISOString() });
    if (error) return notify(error.message, 'err');
    if (msg) { notify(msg); logActivity(next.closed ? 'day_closed' : 'day_reopened', 'daily_notes', undefined, { date }); }
  };
  const allChecked = checks.every(([k]) => rec[k]);

  return <div className="cols">
    <Card title="Daily closing" sub="Tick off the end-of-day checks">
      <div className="form"><label className="field"><small>Business date</small><input type="date" value={date} max={istDate()} onChange={e => e.target.value && setDate(e.target.value)} /></label></div>
      {checks.map(([k, l]) => <label className="check" key={k}><input type="checkbox" disabled={rec.closed} checked={!!rec[k]} onChange={e => save({ [k]: e.target.checked })} />{l}</label>)}
      <div className="form" style={{ marginTop: 10 }}>
        <label className="field"><small>Notes</small><textarea rows={3} disabled={rec.closed} value={rec.notes || ''} onChange={e => setRec({ ...rec, notes: e.target.value })} onBlur={() => save({})} /></label>
        <button className="primary" disabled={!rec.closed && !allChecked} onClick={() => save({ closed: !rec.closed }, rec.closed ? 'Day reopened' : 'Day closed')}>{rec.closed ? 'Reopen day' : allChecked ? 'Close day' : 'Complete all checks to close'}</button>
      </div>
    </Card>
    <Card title="Day summary" sub={date}>
      <div className="row"><span>Orders</span><b>{t.day.length}</b></div><div className="row"><span>Sales</span><b>{money(t.sales)}</b></div>
      <div className="row"><span>Cash</span><b>{money(t.cash)}</b></div><div className="row"><span>Digital</span><b>{money(t.digital)}</b></div>
      <div className="row"><span>Credit</span><b>{money(t.credit)}</b></div><div className="row"><span>Expenses</span><b>−{money(t.expenses)}</b></div>
      <div className="net"><span>Estimated net</span><b>{money(t.net)}</b></div>
    </Card>
  </div>;
}
