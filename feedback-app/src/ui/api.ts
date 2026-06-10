export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function handle(res: Response) {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body && typeof body.error === "string") message = body.error;
    } catch {}
    throw new ApiError(message, res.status);
  }
  return res.json();
}

export function getJSON(url: string): Promise<any> {
  return fetch(url, { credentials: "same-origin" }).then(handle);
}

export function postJSON(url: string, body: unknown = {}): Promise<any> {
  return fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handle);
}
