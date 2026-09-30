'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Data, Dish, MONEY_MSG, logActivity, money, okMoney } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { Card, Common, Empty, Field, Modal } from './ui';

type Form = { id: string | null; name: string; category: string; price: string; cost: string; description: string; available: boolean };
const blank: Form = { id: null, name: '', category: '', price: '', cost: '', description: '', available: true };
const pct = (price: number, cost: number) => (price > 0 ? Math.round(((price - cost) / price) * 100) : 0);

export default function Menu({ data, notify, refresh }: { data: Data } & Common) {
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState('');

  const set = (patch: Partial<Form>) => setForm(f => (f ? { ...f, ...patch } : f));
  const edit = (d: Dish) => setForm({ id: d.id, name: d.name, category: d.category_id || '', price: String(d.price), cost: d.cost == null ? '' : String(d.cost), description: d.description || '', available: d.available });

  async function run(p: PromiseLike<{ error: { message: string } | null }>, ok: string) {
    const { error } = await p;
    if (error) { notify(error.message, 'err'); return false; }
    notify(ok); refresh(); return true;
  }

  async function save() {
    if (!form || saving) return;
    const price = Number(form.price), cost = form.cost.trim() === '' ? null : Number(form.cost);
    if (!form.name.trim()) return notify('Enter a dish name', 'err');
    if (form.price.trim() === '' || !okMoney(price)) return notify(MONEY_MSG, 'err');
    if (cost !== null && !okMoney(cost)) return notify(MONEY_MSG, 'err');
    const row = { name: form.name.trim(), category_id: form.category || null, price, cost, description: form.description.trim() || null, available: form.available, updated_at: new Date().toISOString() };
    setSaving(true);
    const ok = form.id
      ? await run(supabase().from('dishes').update(row).eq('id', form.id), 'Dish updated')
      : await run(supabase().from('dishes').insert(row), 'Dish added');
    setSaving(false);
    if (ok) { logActivity(form.id ? 'dish_updated' : 'dish_added', 'dish', form.id ?? undefined, { name: row.name, price, cost }); setForm(null); }
  }

  async function remove() {
    if (!form?.id || !confirm(`Remove ${form.name} from the menu?`)) return;
    if (await run(supabase().from('dishes').update({ archived: true }).eq('id', form.id), 'Dish removed')) setForm(null);
  }

  const addCat = async () => {
    if (!newCat.trim()) return;
    if (await run(supabase().from('menu_categories').insert({ name: newCat.trim(), sort_order: data.categories.length + 1 }), 'Category added')) setNewCat('');
  };

  const price = Number(form?.price), cost = Number(form?.cost);
  const hasMargin = !!form && form.price.trim() !== '' && form.cost.trim() !== '' && price > 0 && Number.isFinite(cost);

  return <div className="cols">
    <Card title="Dishes" sub={`${data.dishes.length} dishes · tap a dish to edit`} action={<button className="primary" onClick={() => setForm(blank)}><Plus size={14} /> Add dish</button>}>
      {!data.dishes.length && <Empty text="No dishes yet. Tap “Add dish” to create one." />}
      {data.dishes.map(d => <div className={'dishRow' + (d.available ? '' : ' off')} key={d.id} onClick={() => edit(d)}>
        <div className="info"><b>{d.name}</b><small>{data.categories.find(c => c.id === d.category_id)?.name || 'Uncategorised'}{!d.available && ' · Sold out'}</small></div>
        <div className="price">{money(d.price)}<small>{d.cost != null ? `cost ${money(d.cost)} · ${pct(d.price, d.cost)}% margin` : 'no cost set'}</small></div>
      </div>)}
    </Card>
    <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <Card title="Categories" sub="Rename or hide">
        {data.categories.map(c => <div className="chef" key={c.id}><div style={{ flex: 1 }}><b>{c.name}</b><small>{data.dishes.filter(d => d.category_id === c.id).length} dishes</small></div>
          <button className="pill" onClick={() => { const n = prompt('Rename category', c.name); if (n?.trim() && n.trim() !== c.name) run(supabase().from('menu_categories').update({ name: n.trim() }).eq('id', c.id), 'Category renamed'); }}>Rename</button>
          <button className="pill offp" onClick={() => confirm(`Hide category ${c.name}? Its dishes stay but are grouped as Other.`) && run(supabase().from('menu_categories').update({ archived: true }).eq('id', c.id), 'Category hidden')}>Hide</button></div>)}
        <div className="inline" style={{ marginTop: 10 }}><input className="mini" style={{ flex: 1, margin: 0 }} placeholder="New category name" value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCat()} /><button className="primary" onClick={addCat}>Add</button></div>
      </Card>
    </div>

    {form && <Modal title={form.id ? 'Edit dish' : 'Add dish'} sub={form.id ? 'Changes apply to POS immediately' : 'It will appear in POS right away'} onClose={() => setForm(null)}
      footer={<>
        {form.id && <button className="pill offp left" onClick={remove}>Remove dish</button>}
        <button className="secondary" onClick={() => setForm(null)}>Cancel</button>
        <button className="primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : form.id ? 'Save changes' : 'Add dish'}</button>
      </>}>
      <Field label="Dish name"><input autoFocus value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Chilli Garlic Noodles" onKeyDown={e => e.key === 'Enter' && save()} /></Field>
      <Field label="Category"><select value={form.category} onChange={e => set({ category: e.target.value })}><option value="">None</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <div className="row2">
        <Field label="Selling price (₹)"><input inputMode="decimal" value={form.price} onChange={e => set({ price: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0" /></Field>
        <Field label="Making cost (₹, optional)"><input inputMode="decimal" value={form.cost} onChange={e => set({ cost: e.target.value.replace(/[^\d.]/g, '') })} placeholder="Ingredients, gas, packing" /></Field>
      </div>
      <div className={'margin ' + (!hasMargin ? 'idle' : price - cost < 0 ? 'neg' : '')}>
        {hasMargin ? `Profit per plate: ${money(price - cost)} (${pct(price, cost)}% margin)` : 'Add a making cost to see your profit per plate'}
      </div>
      <Field label="Description (optional)"><textarea rows={2} value={form.description} onChange={e => set({ description: e.target.value })} placeholder="Shown to staff, e.g. spice level or portion size" /></Field>
      <label className="check"><input type="checkbox" checked={form.available} onChange={e => set({ available: e.target.checked })} />Available for ordering (untick when sold out)</label>
    </Modal>}
  </div>;
}
