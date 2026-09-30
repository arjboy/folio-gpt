'use client';
import { useState } from 'react';
import { Data, MONEY_MSG, logActivity, money, okMoney } from '@/lib/data';
import { supabase } from '@/lib/supabase';
import { Card, Common, Empty, Field } from './ui';

export default function Menu({ data, notify, refresh }: { data: Data } & Common) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cat, setCat] = useState('');
  const [newCat, setNewCat] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  async function run(p: PromiseLike<{ error: { message: string } | null }>, ok: string) {
    const { error } = await p;
    if (error) return notify(error.message, 'err');
    notify(ok); refresh();
  }
  const addDish = async () => {
    const pr = Number(price);
    if (!name.trim() || price === '') return notify('Enter a dish name and price', 'err');
    if (!okMoney(pr)) return notify(MONEY_MSG, 'err');
    await run(supabase().from('dishes').insert({ name: name.trim(), price: pr, category_id: cat || null }), 'Dish added');
    logActivity('dish_added', 'dish', undefined, { name, price: pr });
    setName(''); setPrice('');
  };
  const addCat = async () => {
    if (!newCat.trim()) return;
    await run(supabase().from('menu_categories').insert({ name: newCat.trim(), sort_order: data.categories.length + 1 }), 'Category added');
    setNewCat('');
  };
  const savePrice = async (id: string) => {
    const pr = Number(editPrice);
    if (editPrice === '' || !okMoney(pr)) return notify(MONEY_MSG, 'err');
    await run(supabase().from('dishes').update({ price: pr, updated_at: new Date().toISOString() }).eq('id', id), 'Price updated');
    setEditing(null);
  };

  return <div className="cols">
    <Card title="Dishes" sub={`${data.dishes.length} dishes · tap availability to hide from POS`}>
      {!data.dishes.length && <Empty text="No dishes yet." />}
      {data.dishes.map(d => <div className="chef" key={d.id}>
        <div style={{ flex: 1 }}><b>{d.name}</b><small>{data.categories.find(c => c.id === d.category_id)?.name || 'Uncategorised'}</small></div>
        {editing === d.id
          ? <span className="inline"><input className="mini" inputMode="decimal" value={editPrice} onChange={e => setEditPrice(e.target.value)} /><button className="pill" onClick={() => savePrice(d.id)}>Save</button></span>
          : <button className="pill" onClick={() => { setEditing(d.id); setEditPrice(String(d.price)); }}>{money(d.price)} ✎</button>}
        <button className={'pill ' + (d.available ? 'okp' : 'offp')} onClick={() => run(supabase().from('dishes').update({ available: !d.available }).eq('id', d.id), d.available ? 'Marked unavailable' : 'Marked available')}>{d.available ? 'Available' : 'Sold out'}</button>
        <button className="pill offp" onClick={() => confirm(`Remove ${d.name} from the menu?`) && run(supabase().from('dishes').update({ archived: true }).eq('id', d.id), 'Dish removed')}>Remove</button>
      </div>)}
    </Card>
    <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
      <Card title="Add dish" sub="Appears in POS instantly"><div className="form">
        <Field label="Name"><input value={name} onChange={e => setName(e.target.value)} placeholder="Chilli Garlic Noodles" /></Field>
        <Field label="Price (₹)"><input inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} /></Field>
        <Field label="Category"><select value={cat} onChange={e => setCat(e.target.value)}><option value="">None</option>{data.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <button className="primary" onClick={addDish}>Add dish</button></div></Card>
      <Card title="Categories" sub="Rename or hide">
        {data.categories.map(c => <div className="chef" key={c.id}><div style={{ flex: 1 }}><b>{c.name}</b><small>{data.dishes.filter(d => d.category_id === c.id).length} dishes</small></div>
          <button className="pill" onClick={() => { const n = prompt('Rename category', c.name); if (n?.trim() && n.trim() !== c.name) run(supabase().from('menu_categories').update({ name: n.trim() }).eq('id', c.id), 'Category renamed'); }}>Rename</button>
          <button className="pill offp" onClick={() => confirm(`Hide category ${c.name}? Its dishes stay but are grouped as Other.`) && run(supabase().from('menu_categories').update({ archived: true }).eq('id', c.id), 'Category hidden')}>Hide</button></div>)}
      </Card>
      <Card title="Add category" sub="Group dishes in POS"><div className="form">
        <Field label="Category name"><input value={newCat} onChange={e => setNewCat(e.target.value)} /></Field>
        <button className="primary" onClick={addCat}>Add category</button></div></Card>
    </div>
  </div>;
}
