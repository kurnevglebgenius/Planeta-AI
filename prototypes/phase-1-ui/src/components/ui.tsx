import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Check, ChevronDown, LoaderCircle, X } from 'lucide-react';

export function Button({ children, variant = 'primary', loading, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean }) {
  return <button className={`button ${variant} ${className}`} disabled={loading || props.disabled} {...props}>{loading && <LoaderCircle size={16} className="spin" />}{children}</button>;
}
export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) { return <button className="icon-button" aria-label={label} title={label} {...props}>{children}</button>; }
export function Status({ children, tone = 'success' }: { children: ReactNode; tone?: 'success' | 'muted' | 'warning' }) { return <span className={`status ${tone}`}><i />{children}</span>; }
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}{error && <em>{error}</em>}</label>; }
export function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) { return <div className="select-wrap"><select value={value} onChange={(e) => onChange(e.target.value)}>{children}</select><ChevronDown size={16} /></div>; }
export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) { return <div className="overlay" role="presentation"><section className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><IconButton label="Закрыть" onClick={onClose}><X size={19}/></IconButton></header>{children}</section></div>; }
export function Toast({ text }: { text: string }) { return <div className="toast"><Check size={17}/>{text}</div>; }
export function Skeleton({ className = '' }: { className?: string }) { return <span className={`skeleton ${className}`} />; }
