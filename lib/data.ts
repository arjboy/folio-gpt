'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type Category = { id: string; name: string; sort_order: number; archived: boolean };
export type Dish = { id: string; category_id: string | null; name: string; price: number; available: boolean; archived: boolean; description: string | null };
export type Chef = { id: string; name: string; phone: string | null; role: string | null; daily_salary: number | null; monthly_salary: number | null; salary_type: 'daily' | 'monthly'; active: boolean };
export type Attendance = { id: string; chef_id: string; work_date: string; punch_in: string | null; punch_out: string | null };
export type Order = { id: string; order_number: string; customer_name: string | null; order_type: string; status: string; payment_method: string; subtotal: number; discount: number; tax: number; total: number; created_at: string; cancellation_reason: string | null };
export type OrderItem = { order_id: string; dish_name: string; unit_price: number; quantity: number; line_total: number };
export type Expense = { id: string; expense_date: string; person_name: string | null; amount: number; reason: string; category: string; payment_method: string; status: string };
export type Advance = { id: string; chef_id: string; advance_date: string; amount: number; reason: string | null; approval_status: string; paid: boolean };
export type Payout = { id: string; chef_id: string; payout_date: string; salary_amount: number; advance_deduction: number; payable_amount: number; paid_amount: number; status: string };
export type Settings = { id: string; name: string; address: string | null; phone: string | null; gst_enabled: boolean; gst_percent: number; bill_footer: string | null; opening_time: string | null; closing_time: string | null };

// Largest amount the app accepts in one field (the database column allows far more, but bigger is always a typo).
export const MAX_MONEY = 1000000;
export const okMoney = (n: number, allowZero = true) => Number.isFinite(n) && n <= MAX_MONEY && (allowZero ? n >= 0 : n > 0);
export const MONEY_MSG = 'Enter a valid amount (up to ₹10,00,000)';
export const money = (n: number) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
// Business days follow India time regardless of where the browser is.
export const istDate = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const istTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
export const dayStart = (date: string) => `${date}T00:00:00+05:30`;
export const daysAgo = (n: number) => istDate(new Date(Date.now() - n * 864e5));

export type Data = {
  categories: Category[]; dishes: Dish[]; chefs: Chef[]; attendance: Attendance[];
  orders: Order[]; items: OrderItem[]; expenses: Expense[]; advances: Advance[]; payouts: Payout[]; settings: Settings | null;
};
const empty: Data = { categories: [], dishes: [], chefs: [], attendance: [], orders: [], items: [], expenses: [], advances: [], payouts: [], settings: null };
const num = <T extends Record<string, any>>(rows: T[] | null, keys: string[]) =>
  (rows || []).map(r => { const o: any = { ...r }; keys.forEach(k => { if (o[k] != null) o[k] = Number(o[k]); }); return o as T; });

export function useData(enabled: boolean) {
  const [data, setData] = useState<Data>(empty);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const sb = supabase();
    const since30 = dayStart(daysAgo(30));
    const [cat, dis, chf, att, ord, exp, adv, pay, set] = await Promise.all([
      sb.from('menu_categories').select('*').eq('archived', false).order('sort_order'),
      sb.from('dishes').select('*').eq('archived', false).order('name'),
      sb.from('chefs').select('*').order('name'),
      sb.from('attendance').select('*').gte('work_date', daysAgo(31)),
      sb.from('orders').select('*').gte('created_at', since30).order('created_at', { ascending: false }).limit(1000),
      sb.from('expenses').select('*').gte('expense_date', daysAgo(30)).order('created_at', { ascending: false }),
      sb.from('chef_advances').select('*').order('created_at', { ascending: false }).limit(200),
      sb.from('salary_payouts').select('*').order('created_at', { ascending: false }).limit(100),
      sb.from('business_settings').select('*').limit(1),
    ]);
    const failed = [cat, dis, chf, att, ord, exp, adv, pay, set].find(r => r.error);
    if (failed?.error) { setError(failed.error.message); setLoading(false); return; }
    const orders = num(ord.data as Order[], ['subtotal', 'discount', 'tax', 'total']);
    const ids = orders.slice(0, 300).map(o => o.id);
    const it = ids.length ? await sb.from('order_items').select('*').in('order_id', ids) : { data: [] as any[] };
    setData({
      categories: cat.data as Category[],
      dishes: num(dis.data as Dish[], ['price']),
      chefs: num(chf.data as Chef[], ['daily_salary', 'monthly_salary']),
      attendance: att.data as Attendance[],
      orders,
      items: num(it.data as OrderItem[], ['unit_price', 'quantity', 'line_total']),
      expenses: num(exp.data as Expense[], ['amount']),
      advances: num(adv.data as Advance[], ['amount']),
      payouts: num(pay.data as Payout[], ['salary_amount', 'advance_deduction', 'payable_amount', 'paid_amount']),
      settings: set.data?.[0] ? { ...(set.data[0] as Settings), gst_percent: Number(set.data[0].gst_percent) } : null,
    });
    setError(''); setLoading(false);
  }, [enabled]);

  useEffect(() => { if (enabled) setLoading(true); refresh(); }, [enabled, refresh]);
  // Keep screens fresh across devices: refetch every 45s while the tab is visible.
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, 45000);
    return () => clearInterval(t);
  }, [enabled, refresh]);
  return { data, loading, error, refresh };
}

export async function logActivity(action: string, entity_type: string, entity_id?: string, details?: object) {
  // Audit trail is best-effort; it must never block the real action.
  await supabase().from('activity_log').insert({ action, entity_type, entity_id: entity_id ?? null, details: details ?? null });
}

export function downloadCsv(name: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const blob = new Blob(['﻿' + rows.map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
