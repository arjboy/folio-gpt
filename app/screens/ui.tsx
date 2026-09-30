'use client';
import { useEffect, type ReactNode } from 'react';

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

// Centered dialog (bottom sheet on phones). Closes on Esc, backdrop click, or the ✕ button.
export function Modal({ title, sub, onClose, children, footer }: { title: string; sub?: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return <div className="modalBackdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modalHead"><div><h2>{title}</h2>{sub && <small>{sub}</small>}</div><button className="iconBtn" aria-label="Close" onClick={onClose}>✕</button></div>
      <div className="modalBody">{children}</div>
      {footer && <div className="modalFoot">{footer}</div>}
    </div>
  </div>;
}
