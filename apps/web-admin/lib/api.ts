/**
 * Khung gọi API backend dùng chung (theo Technical Spec mục 1.2).
 *
 * Web quản trị dùng cùng API backend với mobile app, chỉ khác phạm vi
 * quyền (quản trị dòng họ / quản trị hệ thống) — quyền được thực thi
 * tại backend, giao diện chỉ phản ánh.
 *
 * Token: access token 15 phút + refresh token xoay vòng (giống app
 * mobile). Gặp 401 thì tự refresh một lần rồi thử lại request gốc.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const ACCESS_KEY = "hnt_access_token";
const REFRESH_KEY = "hnt_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function saveTokens(access: string, refresh?: string): void {
  window.localStorage.setItem(ACCESS_KEY, access);
  if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccess(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = window.localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: { accessToken?: string; refreshToken?: string };
    };
    const access = body?.data?.accessToken;
    if (!access) return null;
    saveTokens(access, body.data?.refreshToken);
    return access;
  } catch {
    return null;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  retried = false,
): Promise<T> {
  const token = getAccessToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401 && !retried && !path.startsWith("/auth/refresh")) {
    const next = await refreshAccess();
    if (next) return api<T>(path, init, true);
    clearTokens();
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body || res.statusText}`);
  }

  return (await res.json()) as T;
}

export const get = <T>(path: string): Promise<T> => api<T>(path);

export const post = <T>(path: string, body: unknown): Promise<T> =>
  api<T>(path, { method: "POST", body: JSON.stringify(body) });

export const put = <T>(path: string, body: unknown): Promise<T> =>
  api<T>(path, { method: "PUT", body: JSON.stringify(body) });

export const del = <T>(path: string): Promise<T> =>
  api<T>(path, { method: "DELETE" });
