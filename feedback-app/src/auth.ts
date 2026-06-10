import type { DB } from "./db.ts";
import { now, randomId, randomToken, sha256 } from "./util.ts";

export const ATTENDEE_COOKIE = "qa_submitter_key";
export const AUTH_COOKIE = "qa_auth";
const GLOBAL_ADMIN_TTL = 10 * 60 * 60; // ~10 hours
const ROOM_ADMIN_TTL = 24 * 60 * 60; // ~24 hours

export function adminKey(): string | null {
  if (process.env.ADMIN_KEY) return process.env.ADMIN_KEY;
  if (process.env.NODE_ENV === "production") return null;
  return "devdays-dev-key"; // development fallback only
}

export function publicBaseUrl(req?: Request): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  if (req) {
    const u = new URL(req.url);
    return `${u.protocol}//${u.host}`;
  }
  return `http://localhost:${process.env.PORT ?? 8000}`;
}

function secureFlag(): string {
  return publicBaseUrl().startsWith("https") ? "; Secure" : "";
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.get("cookie") ?? "";
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Attendee identity

export function getSubmitterKey(req: Request): { key: string; setCookie: string | null } {
  const cookies = parseCookies(req);
  const existing = cookies[ATTENDEE_COOKIE];
  if (existing && /^[A-Za-z0-9_-]{16,80}$/.test(existing)) {
    return { key: existing, setCookie: null };
  }
  const key = randomToken("att", 16).replace("att_", "att");
  const setCookie = `${ATTENDEE_COOKIE}=${key}; Path=/; Max-Age=31536000; SameSite=Lax${secureFlag()}`;
  return { key, setCookie };
}

// ---------------------------------------------------------------------------
// Auth sessions

export interface AuthInfo {
  id: string;
  scope: "global_admin" | "room_admin";
  session_id: string | null;
}

export function createAuthSession(
  db: DB,
  scope: "global_admin" | "room_admin",
  sessionId: string | null,
): { token: string; setCookie: string } {
  const token = randomToken("auth", 24);
  const ttl = scope === "global_admin" ? GLOBAL_ADMIN_TTL : ROOM_ADMIN_TTL;
  const ts = now();
  db.run(
    "INSERT INTO auth_sessions (id, token_hash, scope, session_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    [randomId("as", 8), sha256(token), scope, sessionId, ts, ts + ttl],
  );
  const setCookie = `${AUTH_COOKIE}=${token}; Path=/; Max-Age=${ttl}; HttpOnly; SameSite=Lax${secureFlag()}`;
  return { token, setCookie };
}

export function authFromRequest(db: DB, req: Request): AuthInfo | null {
  const token = parseCookies(req)[AUTH_COOKIE];
  if (!token) return null;
  const row = db
    .query<
      { id: string; scope: string; session_id: string | null; expires_at: number; revoked_at: number | null },
      [string]
    >("SELECT id, scope, session_id, expires_at, revoked_at FROM auth_sessions WHERE token_hash = ?")
    .get(sha256(token));
  if (!row) return null;
  if (row.revoked_at != null || row.expires_at < now()) return null;
  if (row.scope !== "global_admin" && row.scope !== "room_admin") return null;
  return { id: row.id, scope: row.scope, session_id: row.session_id };
}

export function canManageRoom(auth: AuthInfo | null, roomId: string): boolean {
  if (!auth) return false;
  if (auth.scope === "global_admin") return true;
  return auth.scope === "room_admin" && auth.session_id === roomId;
}

export function revokeAuth(db: DB, req: Request): string {
  const token = parseCookies(req)[AUTH_COOKIE];
  if (token) {
    db.run("UPDATE auth_sessions SET revoked_at = ? WHERE token_hash = ?", [now(), sha256(token)]);
  }
  return `${AUTH_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag()}`;
}

// ---------------------------------------------------------------------------
// CSRF: admin-changing POSTs must be same-origin

export function sameOrigin(req: Request): boolean {
  const host = req.headers.get("host");
  if (!host) return false;
  const source = req.headers.get("origin") ?? req.headers.get("referer");
  if (!source) return false;
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Room capabilities

export function createRoomCapability(db: DB, sessionId: string): { token: string; claimUrl: string } {
  // Regenerating revokes existing active capabilities for the room.
  db.run("UPDATE room_capabilities SET active = 0, revoked_at = ? WHERE session_id = ? AND active = 1", [
    now(),
    sessionId,
  ]);
  const token = randomToken("roomcap", 18);
  db.run(
    "INSERT INTO room_capabilities (id, session_id, token_hash, active, created_at) VALUES (?, ?, ?, 1, ?)",
    [randomId("cap", 8), sessionId, sha256(token), now()],
  );
  return { token, claimUrl: `/r/claim/${token}` };
}

export function revokeRoomCapabilities(db: DB, sessionId: string): number {
  const res = db.run(
    "UPDATE room_capabilities SET active = 0, revoked_at = ? WHERE session_id = ? AND active = 1",
    [now(), sessionId],
  );
  return res.changes;
}

export function claimCapability(db: DB, token: string): { sessionId: string } | { error: string } {
  if (!/^roomcap_[a-f0-9]{24,}$/.test(token)) return { error: "invalid-token-format" };
  const row = db
    .query<
      { id: string; session_id: string; active: number; revoked_at: number | null; expires_at: number | null },
      [string]
    >("SELECT id, session_id, active, revoked_at, expires_at FROM room_capabilities WHERE token_hash = ?")
    .get(sha256(token));
  if (!row) return { error: "unknown-capability" };
  if (!row.active || row.revoked_at != null) return { error: "revoked-capability" };
  if (row.expires_at != null && row.expires_at < now()) return { error: "expired-capability" };
  const ts = now();
  db.run(
    "UPDATE room_capabilities SET claimed_at = COALESCE(claimed_at, ?), last_used_at = ? WHERE id = ?",
    [ts, ts, row.id],
  );
  return { sessionId: row.session_id };
}
