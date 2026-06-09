export async function apiJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  const res = await fetch(url, { ...init, headers, credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data && (data.message || data.error)) || `HTTP ${res.status}`) as Error & { status?: number; data?: unknown };
    err.status = res.status; err.data = data;
    throw err;
  }
  return data as T;
}

export function postJson<T>(url: string, body: unknown): Promise<T> {
  return apiJson<T>(url, { method: "POST", body: JSON.stringify(body) });
}
