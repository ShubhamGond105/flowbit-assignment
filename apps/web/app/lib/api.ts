// apps/web/lib/api.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: any };

export default async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(API_BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    const text = await res.text();
    let payload: any = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!res.ok) return { ok: false, error: payload || { status: res.status, statusText: res.statusText } };
    return { ok: true, data: payload as T };
  } catch (err) {
    return { ok: false, error: err };
  }
}
