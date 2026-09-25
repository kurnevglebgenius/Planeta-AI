"use client";

import { useState } from "react";
import type { Me } from "../lib/api";
import { Brand } from "./Brand";
import { Employees } from "./Employees";
import { Badge, Button, EmptyState, Icon, type IconName } from "./ui";

type Page = "home" | "new-order" | "orders" | "customers" | "forms" | "messages" | "sales" | "employees" | "payroll" | "production" | "analytics" | "ai" | "settings";
type NavItem = { id: Page; label: string; icon: IconName; owner?: boolean; seller?: boolean; production?: boolean };
const nav: NavItem[] = [
  { id: "home", label: "Главная", icon: "home" },
  { id: "new-order", label: "Новый заказ", icon: "plus", seller: true },
  { id: "orders", label: "Заказы", icon: "orders", seller: true, production: true },
  { id: "customers", label: "Клиенты", icon: "users", seller: true },
  { id: "forms", label: "Бланки", icon: "file", seller: true },
  { id: "messages", label: "Сообщения", icon: "message", seller: true, production: true },
  { id: "sales", label: "Продажи", icon: "sales", owner: true },
  { id: "employees", label: "Сотрудники", icon: "users", owner: true },
  { id: "payroll", label: "Зарплаты", icon: "payroll", owner: true },
  { id: "production", label: "Производство", icon: "factory", owner: true, production: true },
  { id: "analytics", label: "Аналитика", icon: "chart", owner: true },
  { id: "ai", label: "AI", icon: "spark", owner: true },
  { id: "settings", label: "Настройки", icon: "settings", owner: true },
];

export function AppShell({ me, onMfa, onLogout, onAccessError, notify }: {
  me: Me;
  onMfa: () => void;
  onLogout: () => void;
  onAccessError: (error: unknown) => void;
  notify: (message: string) => void;
}) {
  const [page, setPage] = useState<Page>("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const owner = me.roles.includes("OWNER");
  const seller = me.roles.includes("SELLER");
  const production = me.roles.includes("PRODUCTION");
  const visible = nav.filter((item) => item.id === "home" || (item.owner && owner) || (item.seller && seller) || (item.production && production));
  const workItems = visible.filter((item) => item.id === "home" || (item.seller && seller) || (item.production && production && !owner));
  const managementItems = owner ? visible.filter((item) => item.owner) : [];
  const selected = visible.find((item) => item.id === page) ?? visible[0];
  const needsMfa = owner && !me.owner_mfa_verified;
  const roleLabel = me.roles.join(" + ");

  function navigate(id: Page) { setPage(id); setMobileOpen(false); }

  return <div className="app-layout">
    <aside className={`sidebar ${mobileOpen ? "sidebar--open" : ""}`} aria-label="Основная навигация">
      <div className="sidebar__brand"><Brand/><button className="icon-button sidebar__close" aria-label="Закрыть меню" onClick={() => setMobileOpen(false)}><Icon name="close"/></button></div>
      <nav className="sidebar__nav" aria-label="Разделы приложения"><div className="nav-label">Рабочее пространство</div>{workItems.map((item) => <button key={item.id} className={`nav-item ${selected.id === item.id ? "nav-item--active" : ""}`} aria-current={selected.id === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} size={18}/><span>{item.label}</span></button>)}{managementItems.length > 0 && <><div className="nav-label">Управление компанией</div>{managementItems.map((item) => <button key={item.id} className={`nav-item ${selected.id === item.id ? "nav-item--active" : ""}`} aria-current={selected.id === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} size={18}/><span>{item.label}</span>{needsMfa && <span className="nav-lock" aria-label="Требуется MFA">·</span>}</button>)}</>}</nav>
      <div className="sidebar__footer"><div className="profile-block"><span className="profile-avatar">{me.display_name.slice(0, 1).toUpperCase()}</span><span className="profile-block__text"><strong>{me.display_name}</strong><small>{roleLabel}</small></span></div><button className="signout-button" onClick={onLogout}><Icon name="logout" size={17}/>Выйти</button></div>
    </aside>
    {mobileOpen && <button className="mobile-scrim" aria-label="Закрыть меню" onClick={() => setMobileOpen(false)}/>}
    <div className="workspace"><header className="topbar"><button className="icon-button menu-button" aria-label="Открыть меню" onClick={() => setMobileOpen(true)}><Icon name="menu"/></button><span>{owner && selected.owner ? "Управление компанией" : "Рабочее пространство"} <span className="breadcrumb-divider">/</span> <strong>{selected.label}</strong></span><span className="topbar__status"><span className="status-dot"/>Защищённый доступ</span></header>
      <main className="content">
        {needsMfa && <div className="mfa-banner"><Icon name="shield" size={20}/><div><strong>Подтвердите вход для действий OWNER</strong><p>{seller ? "Работа продавца доступна. Администрирование откроется после MFA." : "Для работы с правами владельца требуется код из приложения."}</p></div><Button tone="secondary" onClick={onMfa}>Подтвердить MFA</Button></div>}
        {selected.id === "home" ? <><div className="page-heading"><div><span className="eyebrow">Рабочее пространство</span><h1>Здравствуйте, {me.display_name.split(" ")[0]}</h1><p>Ваш доступ и рабочие разделы Planeta AI.</p></div></div><div className="home-grid"><section className="surface home-primary"><span className="section-label">Ваш профиль</span><h2>{me.display_name}</h2><p>Активная учётная запись сотрудника</p><div className="home-meta"><span>Роли</span><div>{me.roles.map((role) => <Badge key={role}>{role}</Badge>)}</div></div><div className="home-meta"><span>Рабочие места</span><strong>{me.salon_ids.length} салонов · {me.workshop_ids.length} цехов</strong></div></section><section className="surface home-secondary"><span className="section-label">Быстрый переход</span><h2>{owner && me.owner_mfa_verified ? "Управление командой" : production ? "Производство" : "Заказы"}</h2><p>{owner && me.owner_mfa_verified ? "Роли, назначения и доступ сотрудников." : "Рабочий раздел появится на следующем этапе."}</p><Button tone="secondary" onClick={() => navigate(owner && me.owner_mfa_verified ? "employees" : production ? "production" : "orders")}>Открыть раздел <Icon name="arrow" size={16}/></Button></section></div></> : selected.id === "employees" ? needsMfa ? <EmptyState icon="shield" title="Требуется подтверждение MFA" description="Подтвердите вход, чтобы открыть управление сотрудниками."/> : <Employees onAccessError={onAccessError} notify={notify}/> : selected.owner && needsMfa ? <EmptyState icon="shield" title="Требуется подтверждение MFA" description="Действия владельца доступны после проверки кода из приложения."/> : <><div className="page-heading"><div><span className="eyebrow">{owner && selected.owner ? "Управление компанией" : "Рабочее пространство"}</span><h1>{selected.label}</h1><p>Раздел предусмотрен структурой приложения.</p></div></div><section className="surface placeholder"><EmptyState icon={selected.icon} title="Раздел готовится" description="Функции этого раздела появятся на соответствующем этапе Planeta AI."/><Button tone="secondary" onClick={() => navigate("home")}>Вернуться на главную</Button></section></>}
      </main></div>
  </div>;
}
