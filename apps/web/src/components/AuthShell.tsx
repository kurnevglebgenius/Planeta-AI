"use client";

import type { Session } from "@supabase/supabase-js";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AppShell } from "./AppShell";
import { Brand } from "./Brand";
import { ApiError, workforceApi, type Me } from "../lib/api";
import { getAuthClient } from "../lib/supabase";
import { Button, Icon } from "./ui";

type ProfileState = "loading" | "ready" | "pending" | "denied" | "error";
type TotpSetup = { id: string; qr: string; secret: string };

export function AuthShell() {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [profileState, setProfileState] = useState<ProfileState>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordSetup, setPasswordSetup] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [setup, setSetup] = useState<TotpSetup | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const requestId = useRef(0);
  const hadProfile = useRef(false);

  async function refreshProfile(): Promise<boolean> {
    const id = ++requestId.current;
    try {
      const profile = await workforceApi.me();
      if (id !== requestId.current) return false;
      setMe(profile); setProfileState("ready");
      hadProfile.current = true;
      if (profile.owner_mfa_verified) setShowMfa(false);
      return true;
    } catch (cause) {
      if (id !== requestId.current) return false;
      setMe(null);
      if (cause instanceof ApiError && cause.status === 401) {
        await getAuthClient().auth.signOut();
        setProfileState("denied");
      } else if (cause instanceof ApiError && cause.status === 403) {
        setProfileState(hadProfile.current ? "denied" : "pending");
      } else { setProfileState("error"); setMessage(cause instanceof Error ? cause.message : "API недоступен."); }
      return false;
    }
  }

  useEffect(() => {
    let mounted = true;
    const auth = getAuthClient();
    if (/type=(invite|recovery)/.test(window.location.hash + window.location.search)) setTimeout(() => { if (mounted) setPasswordSetup(true); }, 0);
    void auth.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) void refreshProfile(); else setProfileState("ready");
    });
    const { data } = auth.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY") setPasswordSetup(true);
      setSession(next);
      if (!next) { requestId.current++; hadProfile.current = false; setMe(null); setProfileState("ready"); setShowMfa(false); return; }
      setTimeout(() => { if (mounted) void refreshProfile(); }, 0);
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setBusy(true);
    try {
      const { error } = await getAuthClient().auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMessage("Не удалось войти. Проверьте почту и пароль.");
    } catch { setMessage("Не удалось связаться с сервисом входа."); }
    finally { setPassword(""); setBusy(false); }
  }

  async function startMfa() {
    setMessage(""); setBusy(true); setShowMfa(true);
    try {
      const auth = getAuthClient();
      const factors = await auth.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      const verified = factors.data.totp.find((factor) => factor.status === "verified");
      if (verified) { setFactorId(verified.id); setSetup(null); return; }
      const result = await auth.auth.mfa.enroll({ factorType: "totp", friendlyName: "Planeta AI" });
      if (result.error || !result.data.totp) throw result.error ?? new Error("MFA unavailable");
      setSetup({ id: result.data.id, qr: result.data.totp.qr_code, secret: result.data.totp.secret });
      setFactorId(result.data.id);
    } catch { setMessage("Не удалось начать проверку MFA. Попробуйте ещё раз."); }
    finally { setBusy(false); }
  }

  async function verifyMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!factorId) return;
    setMessage(""); setBusy(true);
    try {
      const auth = getAuthClient();
      const challenge = await auth.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      const result = await auth.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: code.replace(/\s/g, "") });
      if (result.error) throw result.error;
      setCode(""); setSetup(null);
      if (profileState === "pending") await workforceApi.activate();
      const profileReady = await refreshProfile();
      if (!profileReady) return;
      setShowMfa(false);
      setNotice("MFA подтверждена. Доступ OWNER открыт.");
    } catch (cause) {
      setCode("");
      setMessage(cause instanceof ApiError ? "Активация OWNER недоступна. Проверьте состояние учётной записи." : "Код не подошёл или истёк. Введите новый код.");
      if (cause instanceof ApiError) setProfileState("denied");
    } finally { setBusy(false); }
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const { error } = await getAuthClient().auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword(""); setPasswordSetup(false); setNotice("Пароль установлен.");
    } catch { setMessage("Не удалось установить пароль. Попробуйте ещё раз."); }
    finally { setBusy(false); }
  }

  async function logout() { await getAuthClient().auth.signOut(); setNotice(""); setMessage(""); }
  function handleAccessError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) { void logout(); setMessage("Сеанс завершён. Войдите снова."); }
    else if (error instanceof ApiError && error.status === 403) void refreshProfile().then(() => setNotice("Доступ изменился. Проверьте свои права."));
  }

  if (profileState === "loading") return <main className="auth-screen"><div className="auth-card auth-card--loading"><span className="spinner"/>Проверяем сеанс…</div></main>;

  if (!session) return <main className="auth-screen"><section className="auth-card"><div className="auth-brand"><Brand/></div><div className="auth-intro"><span className="eyebrow">Внутренняя система</span><h1>Добро пожаловать</h1><p>Войдите с рабочей почтой, чтобы продолжить.</p></div><form onSubmit={(event) => void signIn(event)}><label className="field"><span>Рабочая почта</span><input type="email" autoComplete="username" placeholder="name@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus/></label><label className="field"><span>Пароль</span><span className="password-wrap"><input type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Введите пароль" value={password} onChange={(event) => setPassword(event.target.value)} required/><button type="button" aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"} onClick={() => setShowPassword(!showPassword)}><Icon name={showPassword ? "eyeOff" : "eye"} size={18}/></button></span></label>{message && <p className="inline-error" role="alert">{message}</p>}<Button className="button--full" type="submit" busy={busy}>Войти <Icon name="arrow" size={17}/></Button></form><p className="auth-footnote">Доступ только для сотрудников «Планеты штор»</p></section><span className="auth-caption">Planeta AI · защищённое рабочее пространство</span></main>;

  if (passwordSetup) return <main className="auth-screen"><section className="auth-card"><div className="auth-brand"><Brand/></div><div className="auth-intro"><span className="eyebrow">Безопасность аккаунта</span><h1>Установите пароль</h1><p>Выберите новый пароль для входа в рабочее пространство.</p></div><form onSubmit={(event) => void updatePassword(event)}><label className="field"><span>Новый пароль</span><input type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required/></label>{message && <p className="inline-error" role="alert">{message}</p>}<Button className="button--full" type="submit" busy={busy}>Сохранить пароль</Button></form></section></main>;

  if (profileState === "error") return <main className="auth-screen"><section className="auth-card"><div className="auth-intro"><h1>Сервис временно недоступен</h1><p>{message}</p></div><Button onClick={() => void refreshProfile()}>Повторить</Button><Button tone="ghost" onClick={() => void logout()}>Выйти</Button></section></main>;
  if (profileState === "denied") return <main className="auth-screen"><section className="auth-card"><div className="auth-intro"><h1>Доступ закрыт</h1><p>Для этой учётной записи нет активного рабочего профиля. Обратитесь к владельцу системы.</p></div><Button tone="secondary" onClick={() => void logout()}>Выйти</Button></section></main>;

  if (showMfa || profileState === "pending" || (me?.roles.includes("OWNER") && !me.roles.includes("SELLER") && !me.owner_mfa_verified)) return <main className="auth-screen"><section className="auth-card"><div className="auth-brand"><Brand/></div><div className="auth-intro"><span className="eyebrow">Дополнительная защита</span><h1>Подтвердите вход</h1><p>Введите код из приложения аутентификации, чтобы открыть действия OWNER.</p></div>{!factorId ? <Button className="button--full" busy={busy} onClick={() => void startMfa()}>Продолжить с MFA</Button> : <form onSubmit={(event) => void verifyMfa(event)}>{setup && <div className="mfa-setup"><p>Отсканируйте код приложением аутентификации или введите ключ вручную.</p><Image unoptimized width={150} height={150} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(setup.qr)}`} alt="QR-код для настройки MFA"/><code>{setup.secret}</code></div>}<label className="field"><span>Код подтверждения</span><input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,8}" maxLength={8} placeholder="000 000" value={code} onChange={(event) => setCode(event.target.value.replace(/[^0-9 ]/g, ""))} required/></label>{message && <p className="inline-error" role="alert">{message}</p>}<Button type="submit" className="button--full" busy={busy}>Подтвердить код</Button></form>}{me?.roles.includes("SELLER") && <Button tone="ghost" className="button--full" onClick={() => setShowMfa(false)}>Продолжить как продавец</Button>}<Button tone="ghost" className="button--full" onClick={() => void logout()}>Выйти</Button></section></main>;

  if (!me) return <main className="auth-screen"><section className="auth-card"><div className="auth-intro"><h1>Проверяем доступ</h1><p>Если это первый вход OWNER, подтвердите MFA.</p></div><Button onClick={() => void startMfa()}>Подтвердить MFA</Button><Button tone="ghost" onClick={() => void logout()}>Выйти</Button></section></main>;

  return <><AppShell me={me} onMfa={() => void startMfa()} onLogout={() => void logout()} onAccessError={handleAccessError} notify={setNotice}/>{notice && <div className="toast" role="status"><Icon name="check" size={17}/>{notice}<button aria-label="Закрыть уведомление" onClick={() => setNotice("")}><Icon name="close" size={15}/></button></div>}</>;
}
