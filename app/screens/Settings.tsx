'use client';
import { useEffect, useState } from 'react';
import { Data, istDate } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { Card, Common, Field } from './ui';

export default function Settings({ data, notify, refresh }: { data: Data } & Common) {
  const [s, setS] = useState(data.settings);
  useEffect(() => setS(data.settings), [data.settings]);
  if (!s) return <Card title="Business settings" sub="">No settings row found in the database.</Card>;
  const set = (k: string, v: any) => setS({ ...s, [k]: v } as any);
  const save = async () => {
    const g = Number(s.gst_percent) || 0;
    if (s.gst_enabled && !(g >= 0 && g <= 100)) return notify('GST must be between 0 and 100', 'err');
    const { error } = await supabase().from('business_settings').update({ name: s.name, address: s.address, phone: s.phone, gst_enabled: s.gst_enabled, gst_percent: g, bill_footer: s.bill_footer, opening_time: s.opening_time || null, closing_time: s.closing_time || null, updated_at: new Date().toISOString() }).eq('id', s.id);
    error ? notify(error.message, 'err') : (notify('Settings saved'), refresh());
  };
  return <div className="cols">
    <Card title="Business settings" sub="Used on bills and the dashboard"><div className="form">
      <Field label="Restaurant name"><input value={s.name} onChange={e => set('name', e.target.value)} /></Field>
      <Field label="Address"><input value={s.address || ''} onChange={e => set('address', e.target.value)} /></Field>
      <Field label="Phone"><input value={s.phone || ''} onChange={e => set('phone', e.target.value)} /></Field>
      <Field label="Bill footer"><input value={s.bill_footer || ''} onChange={e => set('bill_footer', e.target.value)} /></Field>
      <Field label="Opens"><input type="time" value={(s.opening_time || '').slice(0, 5)} onChange={e => set('opening_time', e.target.value)} /></Field>
      <Field label="Closes"><input type="time" value={(s.closing_time || '').slice(0, 5)} onChange={e => set('closing_time', e.target.value)} /></Field>
      <label className="check"><input type="checkbox" checked={s.gst_enabled} onChange={e => set('gst_enabled', e.target.checked)} />Charge GST on bills</label>
      {s.gst_enabled && <Field label="GST %"><input inputMode="decimal" value={s.gst_percent} onChange={e => set('gst_percent', e.target.value)} /></Field>}
      <button className="primary" onClick={save}>Save settings</button></div></Card>
    <Card title="Backup" sub="Download everything loaded (last 30 days of orders and expenses)"><button className="primary" onClick={() => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `chinese-wala-backup-${istDate()}.json`; a.click(); URL.revokeObjectURL(a.href);
    }}>Download backup (JSON)</button></Card>
  </div>;
}