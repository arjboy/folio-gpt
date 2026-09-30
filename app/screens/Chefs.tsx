'use client';
import { useState } from 'react';
import { Data, Chef, istDate, istTime, logActivity, money } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { Card, Common, Empty, Field, Rows } from './ui';

// Salary due for the current month from attendance, minus approved unpaid advances.
export function payable(c: Chef, data: Data, month: string) {
  const days = new Set(data.attendance.filter(a => a.chef_id === c.id && a.work_date.startsWith(month) && a.punch_in).map(a => a.work_date)).size;
  const gross = c.salary_type === 'monthly' ? c.monthly_salary || 0 : days * (c.daily_salary || 0);
  const advances = data.advances.filter(a => a.chef_id === c.id && a.approval_status === 'approved' && !a.paid).reduce((s, a) => s + a.amount, 0);
  return { days, gross, advances, net: Math.max(0, gross - advances) };
}

export default function Chefs({ data, notify, refresh }: { data: Data } & Common) {
  const today = istDate(), month = today.slice(0, 7);
  const [f, setF] = useState({ name: '', role: '', phone: '', type: 'daily', salary: '' });
  const [adv, setAdv] = useState({ chef: '', amount: '', reason: '' });

  const check = async (p: PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    const { error } = await p;
    if (error) { notify(error.message, 'err'); return false; }
    notify(ok); refresh(); return true;
  };
  const punch = async (c: Chef) => {
    const a = data.attendance.find(x => x.chef_id === c.id && x.work_date === today);
    const sb = supabase();
    if (!a) return check(sb.from('attendance').insert({ chef_id: c.id, work_date: today, punch_in: new Date().toISOString() }), `${c.name} punched in`);
    if (!a.punch_out) return check(sb.from('attendance').update({ punch_out: new Date().toISOString() }).eq('id', a.id), `${c.name} punched out`);
    return notify(`${c.name} already completed today`, 'err');
  };
  const addChef = async () => {
    const s = Number(f.salary);
    if (!f.name.trim() || !(s > 0)) return notify('Enter name and salary', 'err');
    const ok = await check(supabase().from('chefs').insert({ name: f.name.trim(), role: f.role || null, phone: f.phone || null, salary_type: f.type, daily_salary: f.type === 'daily' ? s : null, monthly_salary: f.type === 'monthly' ? s : null, joining_date: today }), 'Chef added');
    if (ok) setF({ name: '', role: '', phone: '', type: 'daily', salary: '' });
  };
  const addAdvance = async () => {
    const a = Number(adv.amount);
    if (!adv.chef || !(a > 0)) return notify('Pick a chef and amount', 'err');
    const ok = await check(supabase().from('chef_advances').insert({ chef_id: adv.chef, amount: a, reason: adv.reason || null, approval_status: 'approved', paid: false }), 'Advance recorded');
    if (ok) { logActivity('advance_given', 'chef', adv.chef, { amount: a }); setAdv({ chef: '', amount: '', reason: '' }); }
  };
  const paySalary = async (c: Chef) => {
    const p = payable(c, data, month);
    if (!p.net && !p.advances) return notify('Nothing to pay this month', 'err');
    if (!confirm(`Pay ${c.name} ${money(p.net)}? (Salary ${money(p.gross)} − advances ${money(p.advances)})`)) return;
    const sb = supabase();
    const ok = await check(sb.from('salary_payouts').insert({ chef_id: c.id, salary_amount: p.gross, advance_deduction: p.advances, payable_amount: p.net, paid_amount: p.net, status: 'paid', payment_method: 'cash' }), 'Salary paid');
    if (ok) {
      // Only mark advances settled once the payout row exists, so nothing is lost on failure.
      await sb.from('chef_advances').update({ paid: true }).eq('chef_id', c.id).eq('approval_status', 'approved').eq('paid', false);
      logActivity('salary_paid', 'chef', c.id, { net: p.net }); refresh();
    }
  };
  const toggle = (c: Chef) => check(supabase().from('chefs').update({ active: !c.active }).eq('id', c.id), c.active ? 'Chef deactivated' : 'Chef activated');

  return <div className="cols">
    <Card title="Team" sub={`Attendance for ${today} · payable for ${month}`}>
      {!data.chefs.length && <Empty text="No chefs yet. Add one on the right." />}
      {data.chefs.map(c => {
        const a = data.attendance.find(x => x.chef_id === c.id && x.work_date === today); const p = payable(c, data, month);
        return <div className="chefBlock" key={c.id}>
          <div className="chef"><span>{c.name[0]}</span><div><b>{c.name}{!c.active && ' (inactive)'}</b><small>{c.role || 'Staff'} · {c.salary_type === 'monthly' ? money(c.monthly_salary || 0) + '/month' : money(c.daily_salary || 0) + '/day'}</small></div>
            <em className={a?.punch_in && !a.punch_out ? '' : 'muted'}>{a?.punch_in ? (a.punch_out ? `${istTime(a.punch_in)} – ${istTime(a.punch_out)}` : `● In since ${istTime(a.punch_in)}`) : '● Absent'}</em></div>
          <Rows rows={[['Days worked', String(p.days)], ['Gross', money(p.gross)], ['Open advances', '−' + money(p.advances)], ['Payable now', money(p.net)]]} />
          <div className="inline"><button className="pill" disabled={!c.active || Boolean(a?.punch_out)} onClick={() => punch(c)}>{!a ? 'Punch in' : !a.punch_out ? 'Punch out' : 'Done today'}</button><button className="pill okp" onClick={() => paySalary(c)}>Pay salary</button><button className="pill offp" onClick={() => toggle(c)}>{c.active ? 'Deactivate' : 'Activate'}</button></div>
        </div>;
      })}
    </Card>
    <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <Card title="Add chef" sub="New team member"><div className="form">
        <Field label="Name"><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Role"><input value={f.role} onChange={e => setF({ ...f, role: e.target.value })} placeholder="Head Chef" /></Field>
        <Field label="Phone"><input inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Salary type"><select value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="daily">Daily</option><option value="monthly">Monthly</option></select></Field>
        <Field label="Salary (₹)"><input inputMode="decimal" value={f.salary} onChange={e => setF({ ...f, salary: e.target.value })} /></Field>
        <button className="primary" onClick={addChef}>Add chef</button></div></Card>
      <Card title="Give advance" sub="Deducted at next salary payout"><div className="form">
        <Field label="Chef"><select value={adv.chef} onChange={e => setAdv({ ...adv, chef: e.target.value })}><option value="">Select…</option>{data.chefs.filter(c => c.active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Amount (₹)"><input inputMode="decimal" value={adv.amount} onChange={e => setAdv({ ...adv, amount: e.target.value })} /></Field>
        <Field label="Reason"><input value={adv.reason} onChange={e => setAdv({ ...adv, reason: e.target.value })} /></Field>
        <button className="primary" onClick={addAdvance}>Record advance</button></div></Card>
    </div>
  </div>;
}
