'use client';
import { useMemo, useState } from 'react';
import { Minus, Plus, Printer, Search, Trash2 } from 'lucide-react';
import { Data, Dish, Order, OrderItem, istDate, logActivity, money } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { Card, Common, Empty, Rows } from './ui';
import History from './History';

const emoji = (cat = '') => ({ momos: '🥟', noodles: '🍜', 'fried rice': '🍚', starters: '🥢', soups: '🍲', rolls: '🥠', beverages: '🥤', combos: '🍱' } as Record<string, string>)[cat.toLowerCase()] || '🍽️';
const types = [['dine_in', 'Dine-in'], ['takeaway', 'Takeaway'], ['delivery', 'Delivery'], ['parcel', 'Parcel']];
const pays = [['cash', 'Cash'], ['upi', 'UPI'], ['card', 'Card'], ['credit', 'Credit']];

export function printBill(o: Order, items: OrderItem[], s: Data['settings']) {
  const w = window.open('', '_blank', 'width=360,height=600');
  if (!w) return;
  const esc = (v: string) => v.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
  w.document.write(`<html><body style="font:12px monospace;width:280px;margin:0 auto"><h3 style="text-align:center;margin:8px 0">${esc(s?.name || 'The Chinese Wala')}</h3>
  <div style="text-align:center">${esc(s?.address || '')} ${esc(s?.phone || '')}</div><hr>
  <div>Bill #${esc(o.order_number)}<br>${new Date(o.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}<br>${esc(o.order_type)} · ${esc(o.payment_method)}</div><hr>
  ${items.map(i => `<div style="display:flex;justify-content:space-between"><span>${esc(i.dish_name)} x${i.quantity}</span><span>${i.line_total}</span></div>`).join('')}<hr>
  <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${o.subtotal}</span></div>
  ${o.discount ? `<div style="display:flex;justify-content:space-between"><span>Discount</span><span>-${o.discount}</span></div>` : ''}
  ${o.tax ? `<div style="display:flex;justify-content:space-between"><span>Tax</span><span>${o.tax}</span></div>` : ''}
  <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px"><span>TOTAL</span><span>₹${o.total}</span></div><hr>
  <div style="text-align:center">${esc(s?.bill_footer || 'Thank you! Visit again.')}</div><script>onload=()=>{print()}</script></body></html>`);
  w.document.close();
}

export function NewOrder({ data, notify, refresh }: { data: Data } & Common) {
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [type, setType] = useState('takeaway');
  const [pay, setPay] = useState('cash');
  const [discount, setDiscount] = useState('');
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<{ o: Order; items: OrderItem[] } | null>(null);

  const catName = (id: string | null) => data.categories.find(c => c.id === id)?.name || 'Other';
  const dishes = data.dishes.filter(d => d.available);
  const filtered = dishes.filter(d => (cat === 'All' || catName(d.category_id) === cat) && d.name.toLowerCase().includes(q.toLowerCase()));
  const lines = useMemo(() => Object.entries(cart).filter(([, n]) => n > 0).map(([id, n]) => ({ dish: data.dishes.find(d => d.id === id)!, n })).filter(l => l.dish), [cart, data.dishes]);
  const subtotal = lines.reduce((s, l) => s + l.dish.price * l.n, 0);
  const disc = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const gst = data.settings?.gst_enabled ? data.settings.gst_percent : 0;
  const tax = Math.round(((subtotal - disc) * gst) / 100 * 100) / 100;
  const total = subtotal - disc + tax;
  const count = lines.reduce((s, l) => s + l.n, 0);
  const add = (id: string, by: number) => setCart(c => ({ ...c, [id]: Math.max(0, (c[id] || 0) + by) }));

  async function checkout() {
    if (!count || busy) return;
    setBusy(true);
    const sb = supabase();
    // Bill number: business date + 4 random digits; the unique constraint guards collisions (retry once).
    const make = () => `${istDate().replace(/-/g, '').slice(2)}-${Math.floor(1000 + Math.random() * 9000)}`;
    let order: Order | null = null, err = '';
    for (let i = 0; i < 3 && !order; i++) {
      const r = await sb.from('orders').insert({ order_number: make(), customer_name: customer.trim() || null, customer_phone: phone.trim() || null, order_type: type, status: pay === 'credit' ? 'pending' : 'completed', payment_method: pay, subtotal, discount: disc, tax, total }).select().single();
      if (r.error) err = r.error.message; else order = r.data as Order;
    }
    if (!order) { setBusy(false); return notify('Could not save order: ' + err, 'err'); }
    const items = lines.map(l => ({ order_id: order!.id, dish_id: l.dish.id, dish_name: l.dish.name, unit_price: l.dish.price, unit_cost: l.dish.cost, quantity: l.n, line_total: l.dish.price * l.n }));
    const ir = await sb.from('order_items').insert(items);
    if (ir.error) { await sb.from('orders').delete().eq('id', order.id); setBusy(false); return notify('Could not save items: ' + ir.error.message, 'err'); }
    logActivity('order_created', 'order', order.id, { total, pay });
    setLast({ o: { ...order, subtotal, discount: disc, tax, total }, items: items as OrderItem[] });
    setCart({}); setDiscount(''); setCustomer(''); setPhone(''); setBusy(false);
    notify(`Order #${order.order_number} saved · ${money(total)}`);
    refresh();
  }

  return <div className="pos">
    <Card title="Quick order" sub="Tap dishes to add them to the bill">
      <div className="search"><Search size={15} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search dishes..." /></div>
      <div className="cats">{['All', ...data.categories.map(c => c.name)].map(c => <button className={cat === c ? 'chosen' : ''} onClick={() => setCat(c)} key={c}>{c}</button>)}</div>
      {!filtered.length && <Empty text="No dishes match. Add or enable dishes in Menu." />}
      <div className="dishes">{filtered.map((d: Dish) => <button className="dish" key={d.id} onClick={() => add(d.id, 1)}>
        {cart[d.id] > 0 && <i className="qty">{cart[d.id]}</i>}<span>{emoji(catName(d.category_id))}</span><b>{d.name}</b><small>{catName(d.category_id)}</small><strong>{money(d.price)}</strong></button>)}</div>
    </Card>
    <div className="bill">
      <div><h2>Current order</h2><small>{count} items</small></div>
      <div className="seg">{types.map(([v, l]) => <button key={v} className={type === v ? 'on' : ''} onClick={() => setType(v)}>{l}</button>)}</div>
      {lines.map(({ dish, n }) => <div className="line" key={dish.id}>
        <span><b>{dish.name}</b><small>{n} × {money(dish.price)}</small></span>
        <span className="stepper"><button aria-label="Less" onClick={() => add(dish.id, -1)}>{n === 1 ? <Trash2 size={12} /> : <Minus size={12} />}</button><button aria-label="More" onClick={() => add(dish.id, 1)}><Plus size={12} /></button><strong>{money(dish.price * n)}</strong></span></div>)}
      <div className="billFoot">
        <input className="mini" placeholder="Customer name (optional)" value={customer} onChange={e => setCustomer(e.target.value)} />
        <input className="mini" inputMode="tel" placeholder={pay === 'credit' || type === 'delivery' ? 'Customer phone (recommended)' : 'Customer phone (optional)'} value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d+ ]/g, ''))} />
        <div className="discountRow"><small>Discount ₹</small><input className="mini" inputMode="numeric" value={discount} onChange={e => setDiscount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" /></div>
        <Rows rows={[['Subtotal', money(subtotal)], ['Discount', '−' + money(disc)], [gst ? `Tax (${gst}%)` : 'Tax', money(tax)]]} />
        <div className="total"><span>Total</span><b>{money(total)}</b></div>
        <div className="payments">{pays.map(([v, l]) => <button key={v} className={pay === v ? 'chosen' : ''} onClick={() => setPay(v)}>{l}</button>)}</div>
        <button className="checkout" disabled={!count || busy} onClick={checkout}>{busy ? 'Saving…' : `Complete order · ${money(total)}`}</button>
        {last && <button className="ghost" onClick={() => printBill(last.o, last.items, data.settings)}><Printer size={13} /> Print last bill #{last.o.order_number}</button>}
      </div>
    </div>
  </div>;
}

export default function Orders(props: { data: Data } & Common) {
  const [tab, setTab] = useState<'new' | 'history'>('new');
  return <>
    <div className="seg" style={{ maxWidth: 320, marginTop: 0 }}>{([['new', 'New order'], ['history', 'History']] as const).map(([v, l]) => <button key={v} className={tab === v ? 'on' : ''} onClick={() => setTab(v)}>{l}</button>)}</div>
    {tab === 'new' ? <NewOrder {...props} /> : <History {...props} />}
  </>;
}
