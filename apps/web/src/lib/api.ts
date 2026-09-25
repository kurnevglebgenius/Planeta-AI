import { getAuthClient } from "./supabase";

export type Role = "OWNER" | "SELLER" | "PRODUCTION";
export type Me = {
  id: string;
  display_name: string;
  roles: Role[];
  salon_ids: string[];
  workshop_ids: string[];
  owner_mfa_verified: boolean;
};
export type Employee = {
  id: string;
  display_name: string;
  is_active: boolean;
  locale: string;
  roles: Role[];
  salon_ids: string[];
  workshop_ids: string[];
};
export type Location = { id: string; code: string; name: string; is_active: boolean };
export type Locations = { salons: Location[]; workshops: Location[] };
export type AccessInput = { display_name: string; roles: Role[]; salon_ids: string[]; workshop_ids: string[] };
type ApiErrorResponse = { error: { code: string; message: string } };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function errorMessage(status: number, code: string | undefined): string {
  if (status === 401) return "Сеанс завершён. Войдите снова.";
  if (status === 403) return "Недостаточно прав или требуется подтверждение MFA.";
  if (status === 409 && code === "last_owner_guard") return "Нельзя отключить или лишить роли последнего активного OWNER.";
  if (status === 409) return "Изменение отклонено: проверьте роль и назначения сотрудника.";
  if (status === 404) return "Запись больше недоступна. Обновите список.";
  if (status === 422) return "Проверьте заполненные поля и назначения.";
  return "Не удалось выполнить действие. Попробуйте ещё раз.";
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const origin = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!origin) throw new ApiError(0, "Адрес API не настроен.");
  const { data, error } = await getAuthClient().auth.getSession();
  if (error || !data.session) throw new ApiError(401, "Сеанс завершён. Войдите снова.");
  let response: Response;
  try {
    response = await fetch(`${origin.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${data.session.access_token}`, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "Нет связи с API. Проверьте подключение и повторите попытку.");
  }
  if (!response.ok) {
    let code: string | undefined;
    try { code = (await response.json() as ApiErrorResponse).error?.code; } catch { /* Empty error response. */ }
    throw new ApiError(response.status, errorMessage(response.status, code));
  }
  return response.status === 204 ? undefined as T : await response.json() as T;
}

export const workforceApi = {
  me: () => apiRequest<Me>("/v1/me"),
  activate: () => apiRequest<void>("/v1/bootstrap/activate", { method: "POST" }),
  locations: () => apiRequest<Locations>("/v1/locations"),
  employees: () => apiRequest<Employee[]>("/v1/employees"),
  invite: (input: AccessInput & { email: string }) => apiRequest<{ id: string }>("/v1/employees", { method: "POST", body: JSON.stringify(input) }),
  access: (id: string, input: AccessInput) => apiRequest<void>(`/v1/employees/${encodeURIComponent(id)}/access`, { method: "PUT", body: JSON.stringify(input) }),
  status: (id: string, is_active: boolean) => apiRequest<void>(`/v1/employees/${encodeURIComponent(id)}/status`, { method: "PUT", body: JSON.stringify({ is_active }) }),
};
