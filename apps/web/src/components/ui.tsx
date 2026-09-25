import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconName = "home" | "plus" | "orders" | "users" | "file" | "message" | "sales" | "payroll" | "factory" | "chart" | "spark" | "settings" | "menu" | "close" | "logout" | "search" | "chevron" | "check" | "shield" | "eye" | "eyeOff" | "arrow" | "refresh";

const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  orders: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 5"/></>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h4M9 12h6M9 16h6"/></>,
  message: <path d="M4 5h16v12H9l-5 4z"/>,
  sales: <><circle cx="12" cy="12" r="9"/><path d="M15 8h-4a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4H9M12 6v2M12 16v2"/></>,
  payroll: <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/></>,
  factory: <><path d="M3 21V10l6 4v-4l6 4V5h6v16z"/><path d="M7 18h1M12 18h1M17 18h1"/></>,
  chart: <><path d="M4 20V4M4 20h16M8 16l4-5 3 2 5-7"/></>,
  spark: <><path d="m12 2 2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  close: <path d="M5 5l14 14M19 5 5 19"/>,
  logout: <><path d="M10 4H4v16h6M15 7l5 5-5 5M20 12H9"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
  chevron: <path d="m6 9 6 6 6-6"/>,
  check: <path d="m4 12 5 5L20 6"/>,
  shield: <><path d="m12 2 8 3v6c0 5-3 8-8 11-5-3-8-6-8-11V5z"/><path d="m9 12 2 2 4-4"/></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
  eyeOff: <><path d="M3 3 21 21M10 5.2A11 11 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.5M6 6.4C3.5 8.4 2 12 2 12s4 7 10 7a10 10 0 0 0 4-.8"/></>,
  arrow: <path d="M4 12h16m-7-7 7 7-7 7"/>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 10a8 8 0 0 1 14-3l1 5M4 12l1 5a8 8 0 0 0 14-3"/></>,
};

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function Button({ children, tone = "primary", busy = false, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" | "ghost" | "danger"; busy?: boolean }) {
  return <button className={`button button--${tone} ${className}`} {...props} disabled={busy || props.disabled}>{busy && <span className="spinner" aria-hidden="true"/>}{children}</button>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "positive" | "muted" | "warning" }) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="dialog" role="dialog" aria-modal="true" aria-label={title}><header className="dialog__head"><h2>{title}</h2><button className="icon-button" aria-label="Закрыть" onClick={onClose}><Icon name="close"/></button></header>{children}</section></div>;
}

export function EmptyState({ icon, title, description }: { icon: IconName; title: string; description: string }) {
  return <div className="empty-state"><span className="empty-state__icon"><Icon name={icon} size={23}/></span><h2>{title}</h2><p>{description}</p></div>;
}
