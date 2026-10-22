/**
 * Khung gọi API backend dùng chung (theo Technical Spec mục 1.2).
 *
 * Web quản trị dùng cùng API backend với mobile app, chỉ khác phạm vi
 * quyền (quản trị dòng họ / quản trị hệ thống) — quyền được thực thi
 * tại backend, giao diện chỉ phản ánh.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function getToken(): string | null {
  // TODO: nối auth thật.
  // Không đọc token trực tiếp từ localStorage trong production:
  // dùng Server Action / Route Handler đọc cookie httpOnly rồi forward
  // Authorization header từ phía server.
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("hnt_access_token");
}

export async function api<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

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

// Ví dụ dùng trong Server Component (sau khi nối auth thật):
//   import { get } from "@/lib/api";
//   const deXuat = await get<DeXuat[]>("/admin/de-xuat-xac-minh?trang_thai=cho-duyet");
