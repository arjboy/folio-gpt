'use client';
import { useEffect, useState } from 'react';
import { Printer, Search, X } from 'lucide-react';
import { Data, Order, OrderItem, daysAgo, istDate, istTime, logActivity, money } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { Card, Common, Empty } from './ui';
import { printBill } from './Orders';

const typeLabel: Record<string, string> = { dine_in: 'Dine-in', takeaway: 'Takeaway', delivery: 'Delivery', parcel: 'Parcel' };

export default function History({ data, notify, refresh }: { data: Data } & Common) {
  const [range, setRange] = useState(0);
  const [status, setStatus] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const from = daysAgo(range);
  const list = data.orders.filter(o => istDate(new Date(o.created_at)) >= from && (status === 'all' || o.status === status)
    && (!q || (o.order_number + ' ' + (o.customer_name || '')).toLowerCase().includes(q.toLowerCase())));
  const live = open ? data.orders.find(o => o.id === open.id) || open : null;

  useEffect(() => {
    setReason('');
    if (!open) return setItems([]);
    supabase().from('order_items').select('*').eq('order_id', open.id).then(({ data: r }) => setItems((r || []).map((i: any) => ({ ...i, unit_price: Number(i.unit_price), line_total: Number(i.line_total) }))));
  }, [open?.id]);

  async function update(patch: Record<string, any>, ok: string, action: string) {
    if (!live || busy) return;
    setBusy(true);
    const { error } = await supabase().from('orders').update(patch).eq('id', live.id);
    setBusy(false);
    if (error) return notify(error.message, 'err');
    logActivity(action, 'order', live.id, patch);
    notify(ok); await refresh();
  }
  const cancel = () => reason.trim().length < 3 ? notify('Give a short cancellation reason', 'err')
    : confirm(`Cancel bill #${live!.order_number}? This removes it from sales.`) && update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancellation_reason: reason.trim() }, 'Order cancelled', 'order_cancelled');

  return <div className="pos">
    <Card title="Order history" sub={`${list.length} bills · ${money(list.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0))}`}>
      <div className="toolbar"><div className="search"><Search size={15} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search bill # or customer…" /></div></div>
      <div className="seg">{[[0, 'Today'], [1, '2 days'], [6, '7 days'], [29, '30 days']].map(([n, l]) => <button key={n} className={range === n ? 'on' : ''} onClick={() => setRange(n as number)}>{l}</button>)}</div>
      <div className="seg">{[['all', 'All'], ['completed', 'Completed'], ['pending', 'Pending / credit'], ['cancelled', 'Cancelled']].map(([v, l]) => <button key={v} className={status === v ? 'on' : ''} onClick={() => setStatus(v)}>{l}</button>)}</div>
      {!list.length && <Empty text="No bills match these filters." />}
      <div className="table">{list.map(o => <div className={'tr hist' + (live?.id === o.id ? ' active' : '')} key={o.id} onClick={() => setOpen(o)}>
        <span>#{o.order_number}</span><span>{istTime(o.created_at)}</span><span>{typeLabel[o.order_type] || o.order_type}</span><span style={{ textTransform: 'capitalize' }}>{o.payment_method}</span><span>{money(o.total)}</span>
        <span className={o.status === 'completed' ? 'ok' : o.status === 'cancelled' ? 'bad' : 'warn'} style={{ textTransform: 'capitalize' }}>{o.status}</span></div>)}</div>
    </Card>
    <div className="bill">
      {!live ? <Empty text="Select a bill to view, reprint, settle or cancel it." /> : <>
        <div className="billHead"><div><h2>Bill #{live.order_number}</h2><small>{new Date(live.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</small></div><button className="iconBtn" aria-label="Close" onClick={() => setOpen(null)}><X size={14} /></button></div>
        <p className="none">{typeLabel[live.order_type]} · {live.payment_method}{live.customer_name ? ' · ' + live.customer_name : ''}</p>
        {items.map((i, k) => <div className="line" style={{ gridTemplateColumns: '1fr auto' }} key={k}><span><b>{i.dish_name}</b><small>{i.quantity} × {money(i.unit_price)}</small></span><strong>{money(i.line_total)}</strong></div>)}
        <div className="billFoot">
          <div className="row"><span>Subtotal</span><b>{money(live.subtotal)}</b></div>
          {live.discount > 0 && <div className="row"><span>Discount</span><b>−{money(live.discount)}</b></div>}
          {live.tax > 0 && <div className="row"><span>Tax</span><b>{money(live.tax)}</b></div>}
          <div className="total"><span>Total</span><b>{money(live.total)}</b></div>
          {live.status === 'cancelled' && <p className="errtxt">Cancelled: {live.cancellation_reason}</p>}
          {live.status === 'pending' && <div className="payments" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 6 }}>{[['cash', 'Paid cash'], ['upi', 'Paid UPI'], ['card', 'Paid card']].map(([m, l]) => <button key={m} disabled={busy} onClick={() => update({ status: 'completed', payment_method: m }, 'Credit settled', 'credit_settled')}>{l}</button>)}</div>}
          <button className="ghost" style={{ marginTop: 0 }} onClick={() => printBill(live, items, data.settings)}><Printer size={13} /> Reprint bill</button>
          {live.status !== 'cancelled' && <><input className="mini" style={{ marginTop: 10 }} placeholder="Cancellation reason" value={reason} onChange={e => setReason(e.target.value)} /><button className="ghost dangerBtn" disabled={busy} onClick={cancel}>Cancel this bill</button></>}
        </div></>}
    </div>
  </div>;
}
