'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, ShoppingBag, UtensilsCrossed, Users, WalletCards,
  CalendarDays, BarChart3, Settings, Plus, Search, ChevronRight,
  IndianRupee, Receipt, ArrowLeft, Minus, Trash2, CheckCircle2,
  Pencil, Power, Clock3, Download, X, Save, UserPlus, FileText,
  ChevronLeft, ChevronDown, RotateCcw
} from 'lucide-react';

const CATS = ['All','Momos','Noodles','Fried Rice','Starters','Soups','Rolls','Beverages','Combos'];
const DEFAULT_DISHES = [
  ['Veg Steam Momos','Momos',120,'🥟'],['Paneer Momos','Momos',150,'🥟'],['Hakka Noodles','Noodles',140,'🍜'],
  ['Schezwan Fried Rice','Fried Rice',160,'🍚'],['Chilli Paneer','Starters',190,'🥢'],['Manchow Soup','Soups',110,'🍲'],
  ['Paneer Spring Roll','Rolls',130,'🥠'],['Cold Drink','Beverages',60,'🥤']
] as const;
const NAV = [['Dashboard',LayoutDashboard],['Orders',ShoppingBag],['Menu',UtensilsCrossed],['Chefs',Users],['Expenses',WalletCards],['Calendar',CalendarDays],['Reports',BarChart3],['Settings',Settings]] as const;
const money = (n:number) => '₹' + Number(n || 0).toLocaleString('en-IN');
const today = () => new Date().toISOString().slice(0,10);
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

type Dish = {id:string; name:string; category:string; price:number; emoji:string; available:boolean};
type Cart = Record<string,number>;
type Order = {id:string; orderNumber:string; total:number; subtotal:number; discount:number; tax:number; count:number; payment:string; status:string; createdAt:string; items:{name:string;price:number;qty:number}[]};
type Chef = {id:string; name:string; role:string; dailySalary:number; phone:string; active:boolean; present:boolean};
type Expense = {id:string; date:string; reason:string; category:string; amount:number; payment:string; person:string; status:string};

type Store = {dishes:Dish[]; orders:Order[]; chefs:Chef[]; expenses:Expense[]; settings:{name:string;phone:string;address:string;gst:boolean;gstPercent:number;opening:string;closing:string;footer:string}};

const seedStore:Store = {
  dishes: DEFAULT_DISHES.map((d,i)=>({id:`dish-${i+1}`,name:d[0],category:d[1],price:d[2],emoji:d[3],available:true})),
  orders: [],
  chefs: [
    {id:'chef-1',name:'Ravi Kumar',role:'Head Chef',dailySalary:850,phone:'',active:true,present:true},
    {id:'chef-2',name:'Amit Singh',role:'Kitchen Helper',dailySalary:650,phone:'',active:true,present:false}
  ],
  expenses: [],
  settings:{name:'The Chinese Wala',phone:'',address:'',gst:false,gstPercent:5,opening:'10:30',closing:'23:00',footer:'Thank you for visiting The Chinese Wala!'}
};

function loadStore():Store {
  try {
    const raw = localStorage.getItem('cw-store-v2');
    if (!raw) return seedStore;
    const parsed = JSON.parse(raw) as Store;
    return {...seedStore,...parsed,dishes:parsed.dishes || seedStore.dishes,orders:parsed.orders || [],chefs:parsed.chefs || seedStore.chefs,expenses:parsed.expenses || []};
  } catch { return seedStore; }
}

export default function Home(){
  const [page,setPage] = useState('Dashboard');
  const [store,setStore] = useState<Store>(seedStore);
  const [ready,setReady] = useState(false);
  const [notice,setNotice] = useState('');
  const [cat,setCat] = useState('All');
  const [q,setQ] = useState('');
  const [cart,setCart] = useState<Cart>({});
  const [payment,setPayment] = useState('Cash');
  const [modal,setModal] = useState<'dish'|'chef'|'expense'|'settings'|null>(null);
  const [editing,setEditing] = useState<any>(null);

  useEffect(()=>{ setStore(loadStore()); setReady(true); },[]);
  useEffect(()=>{ if(ready) localStorage.setItem('cw-store-v2',JSON.stringify(store)); },[store,ready]);

  const flash = (text:string) => { setNotice(text); window.setTimeout(()=>setNotice(''),2600); };
  const go = (p:string) => { setPage(p); setCat('All'); setQ(''); };
  const resetDemo = () => { if(confirm('Reset this browser back to the original demo data?')) { localStorage.removeItem('cw-store-v2'); setStore(seedStore); setCart({}); flash('Demo data reset'); } };

  const addDish = (dish:Dish) => setCart(x=>({...x,[dish.id]:(x[dish.id]||0)+1}));
  const removeDish = (id:string) => setCart(x=>{const n={...x}; const v=(n[id]||0)-1; if(v<=0) delete n[id]; else n[id]=v; return n});
  const clearCart = () => setCart({});
  const cartLines = Object.entries(cart).map(([id,qty])=>({dish:store.dishes.find(d=>d.id===id)!,qty})).filter(x=>x.dish);
  const subtotal = cartLines.reduce((s,x)=>s+x.dish.price*x.qty,0);
  const gst = store.settings.gst ? Math.round(subtotal*store.settings.gstPercent/100) : 0;
  const total = subtotal+gst;
  const count = cartLines.reduce((s,x)=>s+x.qty,0);

  const completeOrder = () => {
    if(!count) return;
    const orderNo = `CW-${String(store.orders.length+1).padStart(4,'0')}`;
    const order:Order={id:uid(),orderNumber:orderNo,total,subtotal,discount:0,tax:gst,count,payment,status:'Completed',createdAt:new Date().toISOString(),items:cartLines.map(x=>({name:x.dish.name,price:x.dish.price,qty:x.qty}))};
    setStore(s=>({...s,orders:[order,...s.orders]})); clearCart(); flash(`${orderNo} saved successfully`); setPage('Orders');
  };

  if(!ready) return <div className="loading">Loading Restaurant OS…</div>;

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><b>🍜 The Chinese Wala</b><small>Restaurant OS</small></div>
      <nav>{NAV.map(([n,I])=><button className={page===n?'sel':''} onClick={()=>go(n)} key={n}><I size={17}/><span>{n}</span></button>)}</nav>
      <div className="open">● Restaurant open<br/><b>{store.settings.opening} — {store.settings.closing}</b></div>
      <div className="user"><span>A</span><div><b>Owner Admin</b><small>Full access</small></div></div>
    </aside>

    <main>
      <header>
        <div><small>Restaurant management / {page}</small><h1>{page==='Dashboard'?'Good evening, Owner 👋':page}</h1><p>Simple, fast operations for {store.settings.name}.</p></div>
        <div className="headerActions">
          {page!=='Dashboard' && <button className="secondary" onClick={()=>go('Dashboard')}><ArrowLeft size={15}/> Dashboard</button>}
          <button className="primary" onClick={()=>go('Orders')}><Plus size={16}/> New Order</button>
        </div>
      </header>
      {notice && <div className="toast"><CheckCircle2 size={17}/>{notice}</div>}

      {page==='Dashboard' && <Dashboard store={store} go={go}/>} 
      {page==='Orders' && <Orders store={store} cat={cat} setCat={setCat} q={q} setQ={setQ} cart={cart} add={addDish} remove={removeDish} total={total} subtotal={subtotal} gst={gst} count={count} payment={payment} setPayment={setPayment} complete={completeOrder} clear={clearCart} />}
      {page==='Menu' && <MenuPage store={store} setStore={setStore} openModal={(x:any,e:any=null)=>{setEditing(e);setModal(x)}} />}
      {page==='Chefs' && <ChefsPage store={store} setStore={setStore} openModal={(x:any,e:any=null)=>{setEditing(e);setModal(x)}} flash={flash}/>} 
      {page==='Expenses' && <ExpensesPage store={store} setStore={setStore} openModal={(x:any,e:any=null)=>{setEditing(e);setModal(x)}}/>}
      {page==='Calendar' && <CalendarPage store={store}/>} 
      {page==='Reports' && <ReportsPage store={store}/>} 
      {page==='Settings' && <SettingsPage store={store} setStore={setStore} openModal={()=>{setEditing(store.settings);setModal('settings')}} reset={resetDemo}/>} 

      {modal==='dish' && <DishModal item={editing} onClose={()=>setModal(null)} onSave={(d:Dish)=>{setStore(s=>({...s,dishes:editing?s.dishes.map(x=>x.id===d.id?d:x):[...s.dishes,d]}));setModal(null);flash(editing?'Dish updated':'Dish added')}}/>}
      {modal==='chef' && <ChefModal item={editing} onClose={()=>setModal(null)} onSave={(c:Chef)=>{setStore(s=>({...s,chefs:editing?s.chefs.map(x=>x.id===c.id?c:x):[...s.chefs,c]}));setModal(null);flash(editing?'Chef updated':'Chef added')}}/>}
      {modal==='expense' && <ExpenseModal item={editing} onClose={()=>setModal(null)} onSave={(e:Expense)=>{setStore(s=>({...s,expenses:editing?s.expenses.map(x=>x.id===e.id?e:x):[e,...s.expenses]}));setModal(null);flash(editing?'Expense updated':'Expense added')}}/>}
      {modal==='settings' && <SettingsModal item={editing} onClose={()=>setModal(null)} onSave={(v:any)=>{setStore(s=>({...s,settings:v}));setModal(null);flash('Settings saved')}}/>}
    </main>
  </div>;
}

function Dashboard({store,go}:{store:Store;go:(p:string)=>void}){
  const sales=store.orders.filter(o=>o.status==='Completed').reduce((s,o)=>s+o.total,0);
  const expense=store.expenses.reduce((s,e)=>s+e.amount,0);
  const items=store.orders.reduce((s,o)=>s+o.count,0);
  return <>
    <section className="stats">
      <Stat icon={<IndianRupee/>} label="Total sales" value={money(sales)} note={`${store.orders.length} saved orders`}/>
      <Stat icon={<Receipt/>} label="Orders" value={String(store.orders.length)} note="Completed bills"/>
      <Stat icon={<UtensilsCrossed/>} label="Items sold" value={String(items)} note="Across all orders"/>
      <Stat icon={<WalletCards/>} label="Net collection" value={money(sales-expense)} note={`${money(expense)} expenses`}/>
    </section>
    <div className="cols"><Card title="Sales overview" sub="Recent order totals"><SalesBars orders={store.orders}/></Card><Card title="Today at a glance" sub={today()}><Rows rows={[["Sales",money(sales)],["Expenses",money(expense)],["Orders",String(store.orders.length)],["Menu items",String(store.dishes.length)],["Active chefs",String(store.chefs.filter(c=>c.active).length)]]}/><div className="net"><span>Estimated net</span><b>{money(sales-expense)}</b></div></Card></div>
    <div className="cols"><Card title="Quick actions" sub="Common restaurant tasks"><div className="quick">{[['New order','Create a POS bill','Orders'],['Manage menu','Add or edit dishes','Menu'],['Chef attendance','Punch in / out','Chefs'],['Add expense','Record grocery spend','Expenses']].map(x=><button key={x[0]} onClick={()=>go(x[2])}><b>{x[0]}</b><small>{x[1]}</small><ChevronRight size={15}/></button>)}</div></Card><Card title="Chef attendance" sub={`${store.chefs.filter(c=>c.present).length} present today`}><div>{store.chefs.filter(c=>c.active).slice(0,5).map(c=><div className="chef" key={c.id}><span>{c.name[0]}</span><div><b>{c.name}</b><small>{c.role} · {money(c.dailySalary)}/day</small></div><em className={c.present?'':'muted'}>● {c.present?'Present':'Absent'}</em></div>)}</div></Card></div>
    <Card title="Recent orders" sub="Latest bills"><OrderTable orders={store.orders.slice(0,6)}/></Card>
  </>;
}

function Orders({store,cat,setCat,q,setQ,cart,add,remove,total,subtotal,gst,count,payment,setPayment,complete,clear}:any){
  const cats=['All',...Array.from(new Set(store.dishes.map((d:Dish)=>d.category)))];
  const filtered=store.dishes.filter((d:Dish)=>d.available&&!d.name.toLowerCase().includes(q.toLowerCase())?false:(cat==='All'||d.category===cat)&&d.name.toLowerCase().includes(q.toLowerCase()));
  return <div className="pos"><section className="card orderPanel"><div className="cardHead"><div><h2>Quick order</h2><small>Tap dishes to add them to the bill</small></div></div><div className="search"><Search size={15}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search dishes..."/></div><div className="cats">{cats.map(c=><button className={cat===c?'chosen':''} onClick={()=>setCat(c)} key={c}>{c}</button>)}</div><div className="dishes">{filtered.length?filtered.map((d:Dish)=><button className="dish" key={d.id} onClick={()=>add(d)}><span>{d.emoji}</span><b>{d.name}</b><small>{d.category}</small><strong>{money(d.price)}</strong>{cart[d.id]&&<em>{cart[d.id]}</em>}</button>):<div className="emptyMini">No available dishes match this search.</div>}</div></section><section className="bill"><div className="billHead"><div><h2>Current order</h2><small>{count} items</small></div>{count>0&&<button className="clearBtn" onClick={clear}><Trash2 size={13}/> Clear</button>}</div>{Object.entries(cart).map(([id,n]:any)=>{const dish=store.dishes.find((d:Dish)=>d.id===id);if(!dish)return null;return <div className="line" key={id}><span><b>{dish.name}</b><small>{money(dish.price)} each</small></span><div className="qty"><button onClick={()=>remove(id)}><Minus size={12}/></button><b>{n}</b><button onClick={()=>add(dish)}><Plus size={12}/></button></div><strong>{money(n*dish.price)}</strong></div>})}<div className="billFoot"><Rows rows={[["Subtotal",money(subtotal)],["Discount","₹0"],["Tax",money(gst)]]}/><div className="total"><span>Total</span><b>{money(total)}</b></div><div className="payments">{['Cash','UPI','Card','Credit'].map(p=><button className={payment===p?'payChosen':''} onClick={()=>setPayment(p)} key={p}>{p}</button>)}</div><button className="checkout" disabled={!count} onClick={complete}>Complete order · {money(total)}</button></div></section></div>;
}

function MenuPage({store,setStore,openModal}:{store:Store;setStore:React.Dispatch<React.SetStateAction<Store>>;openModal:(x:any,e?:any)=>void}){
 const [search,setSearch]=useState('');
 const [category,setCategory]=useState('All');
 const categories=['All',...Array.from(new Set(store.dishes.map(d=>d.category)))];
 const list=store.dishes.filter(d=>(category==='All'||d.category===category)&&d.name.toLowerCase().includes(search.toLowerCase()));
 const remove=(id:string)=>{if(confirm('Delete this dish?'))setStore(s=>({...s,dishes:s.dishes.filter(d=>d.id!==id)}))};
 return <Card title="Menu management" sub={`${store.dishes.length} dishes`}><div className="toolbar"><div className="search"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search menu..."/></div><button className="primary" onClick={()=>openModal('dish')}><Plus size={15}/> Add dish</button></div><div className="cats">{categories.map(c=><button className={category===c?'chosen':''} onClick={()=>setCategory(c)} key={c}>{c}</button>)}</div><div className="menuGrid">{list.map(d=><div className="menuItem" key={d.id}><span>{d.emoji}</span><div><b>{d.name}</b><small>{d.category} · {money(d.price)}</small><em className={d.available?'available':'unavailable'}>{d.available?'Available':'Unavailable'}</em></div><div className="itemActions"><button onClick={()=>openModal('dish',d)} title="Edit"><Pencil size={14}/></button><button onClick={()=>setStore(s=>({...s,dishes:s.dishes.map(x=>x.id===d.id?{...x,available:!x.available}:x)}))} title="Availability"><Power size={14}/></button><button onClick={()=>remove(d.id)} title="Delete"><Trash2 size={14}/></button></div></div>)}</div></Card>;
}

function ChefsPage({store,setStore,openModal,flash}:{store:Store;setStore:React.Dispatch<React.SetStateAction<Store>>;openModal:(x:any,e?:any)=>void;flash:(s:string)=>void}){
 const toggle=(id:string)=>{setStore(s=>({...s,chefs:s.chefs.map(c=>c.id===id?{...c,present:!c.present}:c)}));flash('Attendance updated')};
 return <><div className="pageToolbar"><div><h2>Chefs & attendance</h2><small>Manage staff, daily attendance and wages.</small></div><button className="primary" onClick={()=>openModal('chef')}><UserPlus size={15}/> Add chef</button></div><div className="chefGrid">{store.chefs.map(c=><section className="card chefCard" key={c.id}><div className="chefTop"><span>{c.name[0]}</span><div><h3>{c.name}</h3><small>{c.role}</small></div><button className={c.present?'statusOn':'statusOff'} onClick={()=>toggle(c.id)}>{c.present?'Present':'Absent'}</button></div><Rows rows={[["Daily salary",money(c.dailySalary)],["Phone",c.phone||'Not set'],["Status",c.active?'Active':'Inactive']]}/><div className="cardActions"><button className="secondary" onClick={()=>openModal('chef',c)}><Pencil size={13}/> Edit</button><button className="secondary" onClick={()=>setStore(s=>({...s,chefs:s.chefs.map(x=>x.id===c.id?{...x,active:!x.active}:x)}))}><Power size={13}/> {c.active?'Deactivate':'Activate'}</button></div></section>)}</div></>;
}

function ExpensesPage({store,setStore,openModal}:{store:Store;setStore:React.Dispatch<React.SetStateAction<Store>>;openModal:(x:any,e?:any)=>void}){
 const total=store.expenses.reduce((s,e)=>s+e.amount,0);
 const del=(id:string)=>{if(confirm('Delete this expense?'))setStore(s=>({...s,expenses:s.expenses.filter(e=>e.id!==id)}))};
 return <><div className="pageToolbar"><div><h2>Expenses</h2><small>Track groceries, utilities, repairs and other spending.</small></div><button className="primary" onClick={()=>openModal('expense')}><Plus size={15}/> Add expense</button></div><div className="stats"><Stat icon={<IndianRupee/>} label="Total expenses" value={money(total)} note="All recorded expenses"/><Stat icon={<Receipt/>} label="Entries" value={String(store.expenses.length)} note="Recorded expenses"/><Stat icon={<WalletCards/>} label="Average" value={money(store.expenses.length?total/store.expenses.length:0)} note="Per entry"/><Stat icon={<Clock3/>} label="Today" value={money(store.expenses.filter(e=>e.date===today()).reduce((s,e)=>s+e.amount,0))} note="Today's spend"/></div><Card title="Expense ledger" sub="Newest first"><div className="table"><div className="tr headRow"><span>Date</span><span>Reason</span><span>Category</span><span>Payment</span><span>Amount</span><span></span></div>{store.expenses.length?store.expenses.map(e=><div className="tr" key={e.id}><span>{e.date}</span><span>{e.reason}{e.person&&<small className="blockMuted"> · {e.person}</small>}</span><span>{e.category}</span><span>{e.payment}</span><span>{money(e.amount)}</span><span className="rowButtons"><button onClick={()=>openModal('expense',e)}><Pencil size={13}/></button><button onClick={()=>del(e.id)}><Trash2 size={13}/></button></span></div>):<div className="emptyMini">No expenses recorded yet.</div>}</div></Card></>;
}

function CalendarPage({store}:{store:Store}){
 const [cursor,setCursor]=useState(new Date());
 const year=cursor.getFullYear(), month=cursor.getMonth();
 const first=new Date(year,month,1).getDay(); const days=new Date(year,month+1,0).getDate();
 const cells=Array.from({length:first+days},(_,i)=>i<first?null:i-first+1);
 return <Card title="Operations calendar" sub="Orders, expenses and staff activity by date"><div className="calendarHead"><button className="secondary" onClick={()=>setCursor(new Date())}>Today</button><div><button className="iconBtn" onClick={()=>setCursor(new Date(year,month-1,1))}><ChevronLeft size={16}/></button><b>{cursor.toLocaleString('en-US',{month:'long',year:'numeric'})}</b><button className="iconBtn" onClick={()=>setCursor(new Date(year,month+1,1))}><ChevronRight size={16}/></button></div></div><div className="weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=><b key={x}>{x}</b>)}</div><div className="calendar">{cells.map((d,i)=>{if(!d)return <div className="day blank" key={i}/>;const date=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;const orders=store.orders.filter(o=>o.createdAt.slice(0,10)===date);const exp=store.expenses.filter(e=>e.date===date);return <div className={`day ${date===today()?'today':''}`} key={i}><b>{d}</b>{orders.length>0&&<small>{orders.length} order{orders.length>1?'s':''}</small>}{exp.length>0&&<small>{exp.length} expense{exp.length>1?'s':''}</small>}</div>})}</div></Card>;
}

function ReportsPage({store}:{store:Store}){
 const [range,setRange]=useState(30);
 const since=Date.now()-range*86400000;
 const orders=store.orders.filter(o=>new Date(o.createdAt).getTime()>=since);
 const sales=orders.reduce((s,o)=>s+o.total,0); const expenses=store.expenses.filter(e=>new Date(e.date).getTime()>=since).reduce((s,e)=>s+e.amount,0);
 const top=new Map<string,number>(); orders.forEach(o=>o.items.forEach(i=>top.set(i.name,(top.get(i.name)||0)+i.qty)));
 const topItems=[...top.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
 const exportCsv=()=>{const rows=[['Order','Date','Payment','Items','Total'],...orders.map(o=>[o.orderNumber,o.createdAt.slice(0,10),o.payment,String(o.count),String(o.total)])];const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`chinese-wala-orders-${today()}.csv`;a.click();URL.revokeObjectURL(a.href)};
 return <><div className="pageToolbar"><div><h2>Reports</h2><small>Sales, expenses and product performance.</small></div><div className="headerActions"><select className="select" value={range} onChange={e=>setRange(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option}</select><button className="primary" onClick={exportCsv}><Download size={15}/> Export CSV</button></div></div><section className="stats"><Stat icon={<IndianRupee/>} label="Sales" value={money(sales)} note={`${orders.length} orders`}/><Stat icon={<WalletCards/>} label="Expenses" value={money(expenses)} note="Recorded spend"/><Stat icon={<Receipt/>} label="Net" value={money(sales-expenses)} note="Sales minus expenses"/><Stat icon={<ShoppingBag/>} label="Avg order" value={money(orders.length?sales/orders.length:0)} note="Average bill value"/></section><div className="cols"><Card title="Top dishes" sub="Units sold"><div className="rankList">{topItems.length?topItems.map(([name,n],i)=><div className="rank" key={name}><span>{i+1}</span><b>{name}</b><strong>{n}</strong></div>):<div className="emptyMini">No sales in this period.</div>}</div></Card><Card title="Payment mix" sub="Completed orders"><Rows rows={['Cash','UPI','Card','Credit'].map(p=>[p,`${orders.filter(o=>o.payment===p).length} orders`])}/></Card></div><Card title="Order report" sub="Filtered period"><OrderTable orders={orders}/></Card></>;
}

function SettingsPage({store,openModal,reset}:{store:Store;setStore:React.Dispatch<React.SetStateAction<Store>>;openModal:()=>void;reset:()=>void}){return <><div className="pageToolbar"><div><h2>Settings</h2><small>Restaurant profile and billing defaults.</small></div><button className="primary" onClick={openModal}><Settings size={15}/> Edit settings</button></div><div className="settingsGrid"><Card title="Business profile" sub="Shown throughout the app"><Rows rows={[["Restaurant",store.settings.name],["Phone",store.settings.phone||'Not set'],["Address",store.settings.address||'Not set'],["Hours",`${store.settings.opening} — ${store.settings.closing}`]]}/></Card><Card title="Billing" sub="POS calculation settings"><Rows rows={[["GST",store.settings.gst?'Enabled':'Disabled'],["GST rate",store.settings.gst?`${store.settings.gstPercent}%`:'—'],["Currency",'INR (₹)'],["Receipt footer",store.settings.footer]]}/></Card></div><Card title="Data" sub="Browser-local demo storage"><p className="settingsNote">Orders, menu, chefs and expenses are currently stored in this browser so the POS remains usable without an authentication session.</p><button className="secondary" onClick={reset}><RotateCcw size={14}/> Reset demo data</button></Card></>}

function SalesBars({orders}:{orders:Order[]}){const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));return d});const vals=days.map(d=>orders.filter(o=>o.createdAt.slice(0,10)===d.toISOString().slice(0,10)).reduce((s,o)=>s+o.total,0));const max=Math.max(...vals,1);return <div className="chart">{vals.map((v,i)=><div className="bar" style={{height:Math.max(8,v/max*100)+'%'}} key={i}><i></i><small>{days[i].toLocaleDateString('en-IN',{weekday:'short'}).slice(0,1)}</small></div>)}</div>}
function OrderTable({orders}:{orders:Order[]}){return <div className="table">{orders.length?<>{orders.map(o=><div className="tr" key={o.id}><span>{o.orderNumber}</span><span>{o.createdAt.slice(0,10)}</span><span>{o.count} items</span><span>{o.payment}</span><span>{money(o.total)}</span><span className={o.status==='Completed'?'ok':'warn'}>{o.status}</span></div>)}</>:<div className="emptyMini">No orders yet. Open New Order to create the first bill.</div>}</div>}
function Stat({icon,label,value,note}:{icon:any;label:string;value:string;note:string}){return <div className="stat"><div className="ico">{icon}</div><small>{label}</small><strong>{value}</strong><em>{note}</em></div>}
function Card({title,sub,children}:{title:string;sub?:string;children:React.ReactNode}){return <section className="card"><div className="cardHead"><div><h2>{title}</h2>{sub&&<small>{sub}</small>}</div></div>{children}</section>}
function Rows({rows}:{rows:(string|number)[][]}){return <div>{rows.map((r,i)=><div className="row" key={String(r[0])+i}><span>{r[0]}</span><b>{r[1]}</b></div>)}</div>}

function Modal({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}){return <div className="modalBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="modal"><div className="modalHead"><h2>{title}</h2><button onClick={onClose}><X size={17}/></button></div>{children}</div></div>}
function Field({label,value,onChange,type='text',placeholder='' }:{label:string;value:any;onChange:(v:string)=>void;type?:string;placeholder?:string}){return <label className="field"><span>{label}</span><input type={type} value={value??''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}

function DishModal({item,onClose,onSave}:{item:Dish|null;onClose:()=>void;onSave:(d:Dish)=>void}){const [v,setV]=useState<Dish>(item||{id:uid(),name:'',category:'Momos',price:0,emoji:'🍜',available:true});return <Modal title={item?'Edit dish':'Add dish'} onClose={onClose}><div className="formGrid"><Field label="Dish name" value={v.name} onChange={x=>setV({...v,name:x})}/><Field label="Price" value={v.price} onChange={x=>setV({...v,price:Number(x)||0})} type="number"/><Field label="Category" value={v.category} onChange={x=>setV({...v,category:x})}/><Field label="Emoji" value={v.emoji} onChange={x=>setV({...v,emoji:x})}/></div><label className="check"><input type="checkbox" checked={v.available} onChange={e=>setV({...v,available:e.target.checked})}/> Available for ordering</label><div className="modalActions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={()=>v.name.trim()&&onSave(v)}><Save size={14}/> Save dish</button></div></Modal>}
function ChefModal({item,onClose,onSave}:{item:Chef|null;onClose:()=>void;onSave:(c:Chef)=>void}){const [v,setV]=useState<Chef>(item||{id:uid(),name:'',role:'Kitchen Staff',dailySalary:0,phone:'',active:true,present:false});return <Modal title={item?'Edit chef':'Add chef'} onClose={onClose}><div className="formGrid"><Field label="Name" value={v.name} onChange={x=>setV({...v,name:x})}/><Field label="Role" value={v.role} onChange={x=>setV({...v,role:x})}/><Field label="Daily salary" value={v.dailySalary} onChange={x=>setV({...v,dailySalary:Number(x)||0})} type="number"/><Field label="Phone" value={v.phone} onChange={x=>setV({...v,phone:x})}/></div><div className="modalActions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={()=>v.name.trim()&&onSave(v)}><Save size={14}/> Save chef</button></div></Modal>}
function ExpenseModal({item,onClose,onSave}:{item:Expense|null;onClose:()=>void;onSave:(e:Expense)=>void}){const [v,setV]=useState<Expense>(item||{id:uid(),date:today(),reason:'',category:'Groceries',amount:0,payment:'Cash',person:'',status:'Paid'});return <Modal title={item?'Edit expense':'Add expense'} onClose={onClose}><div className="formGrid"><Field label="Date" value={v.date} onChange={x=>setV({...v,date:x})} type="date"/><Field label="Amount" value={v.amount} onChange={x=>setV({...v,amount:Number(x)||0})} type="number"/><Field label="Reason" value={v.reason} onChange={x=>setV({...v,reason:x})}/><Field label="Category" value={v.category} onChange={x=>setV({...v,category:x})}/><Field label="Payment" value={v.payment} onChange={x=>setV({...v,payment:x})}/><Field label="Person / vendor" value={v.person} onChange={x=>setV({...v,person:x})}/></div><div className="modalActions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={()=>v.reason.trim()&&onSave(v)}><Save size={14}/> Save expense</button></div></Modal>}
function SettingsModal({item,onClose,onSave}:{item:any;onClose:()=>void;onSave:(v:any)=>void}){const [v,setV]=useState(item);return <Modal title="Restaurant settings" onClose={onClose}><div className="formGrid"><Field label="Restaurant name" value={v.name} onChange={x=>setV({...v,name:x})}/><Field label="Phone" value={v.phone} onChange={x=>setV({...v,phone:x})}/><Field label="Opening time" value={v.opening} onChange={x=>setV({...v,opening:x})} type="time"/><Field label="Closing time" value={v.closing} onChange={x=>setV({...v,closing:x})} type="time"/><Field label="GST %" value={v.gstPercent} onChange={x=>setV({...v,gstPercent:Number(x)||0})} type="number"/><Field label="Receipt footer" value={v.footer} onChange={x=>setV({...v,footer:x})}/></div><label className="field"><span>Address</span><textarea value={v.address||''} onChange={e=>setV({...v,address:e.target.value})}/></label><label className="check"><input type="checkbox" checked={v.gst} onChange={e=>setV({...v,gst:e.target.checked})}/> Apply GST to new orders</label><div className="modalActions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={()=>onSave(v)}><Save size={14}/> Save settings</button></div></Modal>}
