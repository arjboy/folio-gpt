'use client';
import type { ReactNode } from 'react';

export function Stat({ icon, label, value, note }: { icon: ReactNode; label: string; value: string; note: string }) {
  return <div className="stat"><div className="ico">{icon}</div><small>{label}</small><strong>{value}</strong><em>{note}</em></div>;
}
export function Card({ title, sub, children, action }: { title: string; sub?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="card"><div className="cardHead"><div><h2>{title}</h2><small>{sub}</small></div>{action}</div>{children}</section>;
}
export function Rows({ rows }: { rows: [string, string][] }) {
  return <div>{rows.map(r => <div className="row" key={r[0]}><span>{r[0]}</span><b>{r[1]}</b></div>)}</div>;
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><small>{label}</small>{children}</label>;
}
export function Empty({ text }: { text: string }) {
  return <p className="none">{text}</p>;
}

export type Notify = (msg: string, kind?: 'ok' | 'err') => void;
export type Common = { notify: Notify; refresh: () => Promise<void> };
