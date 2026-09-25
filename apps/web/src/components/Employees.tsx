"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { workforceApi, type AccessInput, type Employee, type Locations, type Role } from "../lib/api";
import { Badge, Button, Dialog, EmptyState, Icon } from "./ui";

type FormState = AccessInput & { email: string };
const emptyForm: FormState = { email: "", display_name: "", roles: ["SELLER"], salon_ids: [], workshop_ids: [] };

function roleText(roles: Role[]) { return roles.join(" + "); }
function errorText(error: unknown) { return error instanceof Error ? error.message : "Не удалось выполнить действие."; }

function EmployeeForm({ person, locations, onClose, onSaved, onAccessError }: {
  person: Employee | null;
  locations: Locations;
  onClose: () => void;
  onSaved: (message: string) => void;
  onAccessError: (error: unknown) => void;
}) {
  const [form, setForm] = useState<FormState>(person ? { email: "", display_name: person.display_name, roles: person.roles, salon_ids: person.salon_ids, workshop_ids: person.workshop_ids } : emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const role = form.roles.includes("PRODUCTION") ? "PRODUCTION" : form.roles.includes("SELLER") ? (form.roles.includes("OWNER") ? "OWNER_SELLER" : "SELLER") : "OWNER";
  const isSeller = form.roles.includes("SELLER");
  const isProduction = form.roles.includes("PRODUCTION");

  function setRole(value: string) {
    const roles: Role[] = value === "OWNER_SELLER" ? ["OWNER", "SELLER"] : [value as Role];
    setForm((current) => ({ ...current, roles, salon_ids: roles.includes("SELLER") ? current.salon_ids : [], workshop_ids: roles.includes("PRODUCTION") ? current.workshop_ids : [] }));
  }
  function toggleLocation(field: "salon_ids" | "workshop_ids", id: string) {
    setForm((current) => ({ ...current, [field]: current[field].includes(id) ? current[field].filter((value) => value !== id) : [...current[field], id] }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (isSeller && !form.salon_ids.length) { setError("Назначьте хотя бы один салон."); return; }
    if (isProduction && !form.workshop_ids.length) { setError("Назначьте цех."); return; }
    setBusy(true);
    try {
      const input: AccessInput = { display_name: form.display_name.trim(), roles: form.roles, salon_ids: form.salon_ids, workshop_ids: form.workshop_ids };
      if (person) await workforceApi.access(person.id, input);
      else await workforceApi.invite({ ...input, email: form.email.trim() });
      onSaved(person ? "Доступ сотрудника обновлён." : "Приглашение отправлено на рабочую почту.");
    } catch (cause) { setError(errorText(cause)); onAccessError(cause); }
    finally { setBusy(false); }
  }

  return <Dialog title={person ? "Изменить доступ" : "Пригласить сотрудника"} onClose={onClose}>
    <form onSubmit={(event) => void submit(event)} className="dialog__body">
      <p className="dialog__intro">{person ? "Роль и рабочие места определяют доступ к данным. Изменения вступят в силу после сохранения." : "Сотрудник получит письмо со ссылкой для настройки входа."}</p>
      {!person && <label className="field"><span>Рабочая почта</span><input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@company.com" required /></label>}
      <label className="field"><span>Имя сотрудника</span><input value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} maxLength={120} required autoFocus={!!person}/></label>
      <label className="field"><span>Роль</span><select value={role} onChange={(event) => setRole(event.target.value)}><option value="SELLER">SELLER</option><option value="PRODUCTION">PRODUCTION</option><option value="OWNER">OWNER</option><option value="OWNER_SELLER">OWNER + SELLER</option></select></label>
      {isSeller && <fieldset className="choice-group"><legend>Салоны</legend><p>Можно выбрать несколько салонов.</p>{locations.salons.filter((item) => item.is_active || form.salon_ids.includes(item.id)).map((salon) => <label key={salon.id}><input type="checkbox" checked={form.salon_ids.includes(salon.id)} onChange={() => toggleLocation("salon_ids", salon.id)}/><span><b>{salon.name}</b><small>{salon.code}</small></span></label>)}</fieldset>}
      {isProduction && <fieldset className="choice-group"><legend>Цех</legend>{locations.workshops.filter((item) => item.is_active || form.workshop_ids.includes(item.id)).map((workshop) => <label key={workshop.id}><input type="checkbox" checked={form.workshop_ids.includes(workshop.id)} onChange={() => toggleLocation("workshop_ids", workshop.id)}/><span><b>{workshop.name}</b><small>{workshop.code}</small></span></label>)}</fieldset>}
      {error && <p className="inline-error" role="alert">{error}</p>}
      <footer className="dialog__actions"><Button type="button" tone="ghost" onClick={onClose}>Отмена</Button><Button type="submit" busy={busy}>{person ? "Сохранить" : "Отправить приглашение"}</Button></footer>
    </form>
  </Dialog>;
}

export function Employees({ onAccessError, notify }: { onAccessError: (error: unknown) => void; notify: (message: string) => void }) {
  const [people, setPeople] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Locations>({ salons: [], workshops: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<Employee | null>(null);
  const [busy, setBusy] = useState(false);
  const accessErrorRef = useRef(onAccessError);
  useEffect(() => { accessErrorRef.current = onAccessError; }, [onAccessError]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [employees, places] = await Promise.all([workforceApi.employees(), workforceApi.locations()]);
      setPeople(employees); setLocations(places);
    } catch (cause) { setPeople([]); setError(errorText(cause)); accessErrorRef.current(cause); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  const shown = useMemo(() => people.filter((person) => {
    const matches = person.display_name.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru"));
    return matches && (filter === "all" || (filter === "inactive" ? !person.is_active : person.roles.includes(filter as Role)));
  }), [people, query, filter]);
  const placeName = (person: Employee) => {
    const salonNames = person.salon_ids.map((id) => locations.salons.find((location) => location.id === id)?.name ?? "Салон недоступен");
    const workshopNames = person.workshop_ids.map((id) => locations.workshops.find((location) => location.id === id)?.name ?? "Цех недоступен");
    return [...salonNames, ...workshopNames].join(", ") || (person.roles.includes("OWNER") ? "Вся компания" : "Не назначено");
  };

  async function setStatus() {
    if (!confirm) return;
    setBusy(true); setError("");
    try {
      await workforceApi.status(confirm.id, !confirm.is_active);
      notify(confirm.is_active ? "Доступ сотрудника отключён." : "Доступ сотрудника восстановлен.");
      setConfirm(null);
      await load();
    } catch (cause) { setError(errorText(cause)); onAccessError(cause); }
    finally { setBusy(false); }
  }

  return <>
    <div className="page-heading"><div><span className="eyebrow">Команда / Доступ</span><h1>Сотрудники</h1><p>Учётные записи, роли и рабочие места вашей команды.</p></div><Button onClick={() => setCreating(true)}><Icon name="plus" size={17}/>Пригласить сотрудника</Button></div>
    <section className="surface employee-surface">
      <div className="table-toolbar"><div className="search-field"><Icon name="search" size={17}/><input aria-label="Поиск сотрудника" placeholder="Поиск по имени" value={query} onChange={(event) => setQuery(event.target.value)}/></div><select aria-label="Фильтр по роли" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Все сотрудники</option><option value="OWNER">OWNER</option><option value="SELLER">SELLER</option><option value="PRODUCTION">PRODUCTION</option><option value="inactive">Отключённые</option></select><button className="icon-button" aria-label="Обновить список" onClick={() => void load()}><Icon name="refresh" size={17}/></button></div>
      {loading ? <div className="table-loading"><span className="skeleton"/><span className="skeleton"/><span className="skeleton"/></div> : error && !confirm ? <div className="error-state"><p>{error}</p><Button tone="secondary" onClick={() => void load()}>Повторить</Button></div> : shown.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Сотрудник</th><th>Роль</th><th>Салон / цех</th><th>Статус</th><th aria-label="Действия"/></tr></thead><tbody>{shown.map((person) => <tr key={person.id}><td><div className="person-cell"><span className="avatar">{person.display_name.slice(0, 1).toUpperCase()}</span><strong>{person.display_name}</strong></div></td><td><Badge>{roleText(person.roles)}</Badge></td><td className="location-cell">{placeName(person)}</td><td><Badge tone={person.is_active ? "positive" : "muted"}>{person.is_active ? "Активен" : "Отключён"}</Badge></td><td className="row-actions"><button onClick={() => setEditing(person)}>Изменить</button><button onClick={() => { setError(""); setConfirm(person); }}>{person.is_active ? "Отключить" : "Восстановить"}</button></td></tr>)}</tbody></table></div> : <EmptyState icon="users" title="Сотрудники не найдены" description={people.length ? "Попробуйте изменить поиск или фильтр." : "Пригласите первого сотрудника, чтобы назначить ему доступ."}/>}
      {!loading && !error && shown.length > 0 && <div className="employee-cards">{shown.map((person) => <article className="employee-card" key={person.id}><div className="person-cell"><span className="avatar">{person.display_name.slice(0, 1).toUpperCase()}</span><strong>{person.display_name}</strong></div><div className="employee-card__meta"><Badge>{roleText(person.roles)}</Badge><Badge tone={person.is_active ? "positive" : "muted"}>{person.is_active ? "Активен" : "Отключён"}</Badge></div><p>{placeName(person)}</p><div className="employee-card__actions"><button onClick={() => setEditing(person)}>Изменить</button><button onClick={() => { setError(""); setConfirm(person); }}>{person.is_active ? "Отключить" : "Восстановить"}</button></div></article>)}</div>}
      {!loading && !error && <div className="table-footer">Показано {shown.length} из {people.length}</div>}
    </section>
    {(editing || creating) && <EmployeeForm person={editing} locations={locations} onClose={() => { setEditing(null); setCreating(false); }} onSaved={(message) => { setEditing(null); setCreating(false); notify(message); void load(); }} onAccessError={onAccessError}/>}
    {confirm && <Dialog title={confirm.is_active ? "Отключить доступ?" : "Восстановить доступ?"} onClose={() => setConfirm(null)}><div className="dialog__body"><p className="dialog__intro"><strong>{confirm.display_name}</strong>{confirm.is_active ? " сразу потеряет доступ к новым защищённым действиям. Текущий сеанс перестанет проходить проверку API." : " снова сможет войти с ранее назначенной ролью и рабочими местами."}</p>{error && <p className="inline-error" role="alert">{error}</p>}<footer className="dialog__actions"><Button tone="ghost" onClick={() => setConfirm(null)}>Отмена</Button><Button tone={confirm.is_active ? "danger" : "primary"} busy={busy} onClick={() => void setStatus()}>{confirm.is_active ? "Отключить" : "Восстановить"}</Button></footer></div></Dialog>}
  </>;
}
