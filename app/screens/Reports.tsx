'use client';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { Data, daysAgo, downloadCsv, istDate, itemsProfit, money } from '@/lib/data';
import { Card, Empty, Rows } from './ui';
import { summarize } from './Dashboard';

export default function Reports({ data }: { data: Data }) {
  const [range, setRange] = useState(7);
  const dates = Array.from({ length: range }, (_, i) => daysAgo(i));
  const days = dates.map(d => ({ d, ...summarize(data, d) }));
  const sum = (k: 'sales' | 'expenses' | 'advances') => days.reduce((s, x) => s + x[k], 0);
  const ids = new Set(days.flatMap(x => x.day.map(o => o.id)));
  const tally: Record<string, { q: number; rev: number }> = {};
  data.items.filter(i => ids.has(i.order_id)).forEach(i => { const t = tally[i.dish_name] ||= { q: 0, rev: 0 }; t.q += i.quantity; t.rev += i.line_total; });
  const top = Object.entries(tally).sort((a, b) => b[1].q - a[1].q).slice(0, 8);
  const soldItems = data.items.filter(i => ids.has(i.order_id));
  const gp = itemsProfit(soldItems, data.dishes);
  const orders = days.reduce((s, x) => s + x.day.length, 0);

  const exportOrders = () => downloadCsv(`orders-${istDate()}.csv`, [['Bill', 'Date', 'Type', 'Payment', 'Status', 'Subtotal', 'Discount', 'Tax', 'Total'], ...data.orders.filter(o => dates.includes(istDate(new Date(o.created_at)))).map(o => [o.order_number, istDate(new Date(o.created_at)), o.order_type, o.payment_method, o.status, o.subtotal, o.discount, o.tax, o.total])]);
  const exportExpenses = () => downloadCsv(`expenses-${istDate()}.csv`, [['Date', 'Reason', 'Category', 'Payment', 'Amount'], ...data.expenses.filter(e => dates.includes(e.expense_date)).map(e => [e.expense_date, e.reason, e.category, e.payment_method, e.amount])]);

  return <>
    <div className="seg" style={{ maxWidth: 360, marginBottom: 14 }}>{[[7, '7 days'], [14, '14 days'], [30, '30 days']].map(([n, l]) => <button key={n} className={range === n ? 'on' : ''} onClick={() => setRange(n as number)}>{l}</button>)}</div>
    <div className="cols">
      <Card title="Summary" sub={`Last ${range} days`} action={<span className="inline"><button className="pill" onClick={exportOrders}><Download size={11} /> Orders CSV</button><button className="pill" onClick={exportExpenses}><Download size={11} /> Expenses CSV</button></span>}>
        <Rows rows={[['Orders', String(orders)], ['Sales', money(sum('sales'))], ['Average bill', money(orders ? sum('sales') / orders : 0)], ['Expenses', '−' + money(sum('expenses'))], ['Advances', '−' + money(sum('advances'))]]} />
        <Rows rows={[['Making cost of sold items', '−' + money(gp.cost)], ['Gross profit (sales − making cost)', money(gp.profit)]]} />
        {gp.unknown > 0 && <p className="none">₹{Math.round(gp.unknown).toLocaleString('en-IN')} of sales has no making cost set, so it is left out of gross profit. Add costs in Menu.</p>}
        <div className="net"><span>Profit estimate</span><b>{money(sum('sales') - sum('expenses') - sum('advances'))}</b></div>
      </Card>
      <Card title="Best sellers" sub="By quantity">
        {!top.length && <Empty text="No sales in this period." />}
        {top.map(([n, t]) => { const p = itemsProfit(soldItems.filter(i => i.dish_name === n), data.dishes); return <div className="row" key={n}><span>{n} × {t.q}{p.cost > 0 && <small style={{ color: '#3f8a4d' }}> · profit {money(p.profit)}</small>}</span><b>{money(t.rev)}</b></div>; })}
      </Card>
    </div>
    <Card title="Daily breakdown" sub="Newest first"><div className="table">{days.map(x => <div className="tr exp6" key={x.d}><span>{x.d}</span><span>{x.day.length} orders</span><span>{money(x.sales)}</span><span>Cash {money(x.cash)}</span><span>Digital {money(x.digital)}</span><span>Exp −{money(x.expenses)}</span></div>)}</div></Card>
  </>;
}
