'use client';
import { useState } from 'react';
import { Data, istDate, money } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { Card, Common, Empty, Field } from './ui';

const cats = ['Grocery', 'Gas', 'Packaging', 'Rent', 'Utilities', 'Repairs', 'Transport', 'Other'];

export default function Expenses({ data, notify, refresh }: { data: Data } & Common) {
  const [f, setF] = useState({ amount: '', reason: '', category: 'Grocery', person: '', method: 'cash', date: istDate() });
  const month = istDate().slice(0, 7);
  const valid = data.expenses.filter(e => e.status !== 'rejected');
  const monthTotal = valid.filter(e => e.expense_date.startsWith(month)).reduce((s, e) => s + e.amount, 0);
  const todayTotal = valid.filter(e => e.expense_date === istDate()).reduce((s, e) => s + e.amount, 0);

  const add = async () => {
    const a = Number(f.amount);
    if (!(a > 0) || !f.reason.trim()) return notify('Enter amount and reason', 'err');
    const { error } = await supabase().from('expenses').insert({ amount: a, reason: f.reason.trim(), category: f.category, person_name: f.person || null, payment_method: f.method, expense_date: f.date, status: 'spent' });
    if (error) return notify(error.message, 'err');
    notify('Expense recorded'); setF({ ...f, amount: '', reason: '', person: '' }); refresh();
  };
  const remove = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    const { error } = await supabase().from('expenses').delete().eq('id', id);
    error ? notify(error.message, 'err') : (notify('Expense deleted'), refresh());
  };

  return <div className="cols">
    <Card title="Expenses" sub={`Today ${money(todayTotal)} · This month ${money(monthTotal)}`}>
      {!data.expenses.length && <Empty text="No expenses in the last 30 days." />}
      <div className="table">{data.expenses.map(e => <div className="tr exp" key={e.id}><span>{e.expense_date}</span><span>{e.reason}<br /><small style={{ color: '#999' }}>{e.category}{e.person_name ? ' · ' + e.person_name : ''}</small></span><span style={{ textTransform: 'capitalize' }}>{e.payment_method}</span><span>{money(e.amount)}</span><span><button className="pill offp" onClick={() => remove(e.id)}>Delete</button></span></div>)}</div>
    </Card>
    <Card title="Add expense" sub="Record money spent"><div className="form">
      <Field label="Amount (₹)"><input inputMode="decimal" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></Field>
      <Field label="Reason"><input value={f.reason} onChange={e => setF({ ...f, reason: e.target.value })} placeholder="Vegetables from mandi" /></Field>
      <Field label="Category"><select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{cats.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Paid by (optional)"><input value={f.person} onChange={e => setF({ ...f, person: e.target.value })} /></Field>
      <Field label="Payment"><select value={f.method} onChange={e => setF({ ...f, method: e.target.value })}><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option></select></Field>
      <Field label="Date"><input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
      <button className="primary" onClick={add}>Save expense</button></div></Card>
  </div>;
}
