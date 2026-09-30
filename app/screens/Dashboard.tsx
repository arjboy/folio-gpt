'use client';
import { ChevronRight, IndianRupee, Receipt, UtensilsCrossed, WalletCards } from 'lucide-react';
import { Data, daysAgo, istDate, istTime, money } from '@/lib/data';
import { Card, Empty, Rows, Stat } from './ui';

const typeLabel: Record<string, string> = { dine_in: 'Dine-in', takeaway: 'Takeaway', delivery: 'Delivery', parcel: 'Parcel' };

export function summarize(data: Data, date: string) {
  const day = data.orders.filter(o => istDate(new Date(o.created_at)) === date && o.status !== 'cancelled');
  const by = (m: string[]) => day.filter(o => m.includes(o.payment_method)).reduce((s, o) => s + o.total, 0);
  const sales = day.reduce((s, o) => s + o.total, 0);
  const expenses = data.expenses.filter(e => e.expense_date === date && e.status !== 'rejected' && e.status !== 'requested').reduce((s, e) => s + e.amount, 0);
  const advances = data.advances.filter(a => a.advance_date === date && a.approval_status === 'approved').reduce((s, a) => s + a.amount, 0);
  const ids = new Set(day.map(o => o.id));
  const sold = data.items.filter(i => ids.has(i.order_id));
  const qty = sold.reduce((s, i) => s + i.quantity, 0);
  const tally: Record<string, number> = {};
  sold.forEach(i => { tally[i.dish_name] = (tally[i.dish_name] || 0) + i.quantity; });
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
  return { day, sales, cash: by(['cash']), digital: by(['upi', 'card', 'online']), credit: by(['credit']), expenses, advances, qty, top, net: sales - by(['credit']) - expenses - advances };
}

export default function Dashboard({ data, setPage }: { data: Data; setPage: (p: string) => void }) {
  const today = istDate(), yesterday = daysAgo(1);
  const t = summarize(data, today), y = summarize(data, yesterday);
  const pending = data.orders.filter(o => o.status === 'pending' && istDate(new Date(o.created_at)) === today).length;
  const delta = y.sales ? ((t.sales - y.sales) / y.sales) * 100 : null;
  const week = Array.from({ length: 7 }, (_, i) => { const d = daysAgo(6 - i); return { d, v: summarize(data, d).sales }; });
  const max = Math.max(1, ...week.map(w => w.v));
  const present = data.attendance.filter(a => a.work_date === today && a.punch_in && !a.punch_out);
  const chefs = data.chefs.filter(c => c.active);
  return <>
    <section className="stats">
      <Stat icon={<IndianRupee />} label="Today's sales" value={money(t.sales)} note={delta === null ? 'No sales yesterday' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs yesterday`} />
      <Stat icon={<Receipt />} label="Orders" value={String(t.day.length)} note={`${pending} pending`} />
      <Stat icon={<UtensilsCrossed />} label="Items sold" value={String(t.qty)} note={t.top ? `Top dish: ${t.top}` : 'Nothing sold yet'} />
      <Stat icon={<WalletCards />} label="Net collection" value={money(t.net)} note="After credit, expenses & advances" />
    </section>
    <div className="cols">
      <Card title="Sales overview" sub="Last 7 days"><div className="chart">{week.map(w => <div className="bar" title={`${w.d}: ${money(w.v)}`} style={{ height: Math.max(6, (w.v / max) * 100) + '%' }} key={w.d}><i></i><small>{new Date(w.d + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'narrow' })}</small></div>)}</div></Card>
      <Card title="Today at a glance" sub={new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}>
        <Rows rows={[['Cash sales', money(t.cash)], ['UPI / Card / Online', money(t.digital)], ['Pending credit', money(t.credit)], ['Business expenses', '−' + money(t.expenses)], ['Chef advances', '−' + money(t.advances)]]} />
        <div className="net"><span>Estimated net</span><b>{money(t.net)}</b></div>
      </Card>
    </div>
    <div className="cols">
      <Card title="Quick actions" sub="Common restaurant tasks"><div className="quick">{[['New order', 'Create a POS bill', 'Orders'], ['Chef attendance', 'Punch in / out', 'Chefs'], ['Add expense', 'Record grocery spend', 'Expenses'], ['Pay salary', 'Settle chef payout', 'Chefs']].map(x => <button key={x[0]} onClick={() => setPage(x[2])}><div><b>{x[0]}</b><small>{x[1]}</small></div><ChevronRight size={15} /></button>)}</div></Card>
      <Card title="Chef attendance" sub={`${present.length} of ${chefs.length} currently present`}>
        {!chefs.length && <Empty text="No chefs added yet." />}
        {chefs.map(c => { const a = data.attendance.find(x => x.chef_id === c.id && x.work_date === today); const on = a?.punch_in && !a.punch_out;
          return <div className="chef" key={c.id}><span>{c.name[0]}</span><div><b>{c.name}</b><small>{c.role || 'Staff'}</small></div>
            {on ? <em>● Punched in<br /><small>{istTime(a!.punch_in!)}</small></em> : a?.punch_out ? <em className="muted">● Left {istTime(a.punch_out)}</em> : <em className="muted">● Absent</em>}</div>; })}
      </Card>
    </div>
    <Card title="Recent orders" sub="Latest bills"><div className="table">
      {!data.orders.length && <Empty text="No orders yet. Create your first bill from New Order." />}
      {data.orders.slice(0, 8).map(o => { const n = data.items.filter(i => i.order_id === o.id).reduce((s, i) => s + i.quantity, 0);
        return <div className="tr" key={o.id}><span>#{o.order_number}</span><span>{typeLabel[o.order_type] || o.order_type}</span><span>{n} items</span><span style={{ textTransform: 'capitalize' }}>{o.payment_method}</span><span>{money(o.total)}</span><span className={o.status === 'completed' ? 'ok' : 'warn'} style={{ textTransform: 'capitalize' }}>{o.status}</span></div>; })}
    </div></Card>
  </>;
}
