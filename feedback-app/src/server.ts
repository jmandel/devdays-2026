import indexHtml from "./ui/index.html";
import { createDb } from "./db.ts";
import {
  adminKey,
  authFromRequest,
  canManageRoom,
  claimCapability,
  createAuthSession,
  createRoomCapability,
  getSubmitterKey,
  publicBaseUrl,
  revokeAuth,
  revokeRoomCapabilities,
  sameOrigin,
} from "./auth.ts";
import {
  applyThemeAction,
  ensureSubmission,
  feedbackSummary,
  getSession,
  listActiveSessions,
  publicQaPayload,
  recordFeedback,
  recordInteraction,
  recordVote,
  presenterQaPayload,
} from "./qa.ts";
import { broadcastQa, sseResponse } from "./sse.ts";
import { latestRun, runQaProcessing, scheduleQaProcessing, setBroadcastHook } from "./worker.ts";
import { clampText, csvEscape, now, randomId } from "./util.ts";

const db = createDb();
setBroadcastHook((sessionId) => broadcastQa(db, sessionId));

const PORT = Number(process.env.PORT ?? 8000);
const AI_FILE_CAP = 100_000; // bytes of input/output shown in the audit screen

// ---------------------------------------------------------------------------
// Helpers

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

function notFound(message = "Not found"): Response {
  return json({ error: message }, 404);
}

function withAttendee(req: Request) {
  const { key, setCookie } = getSubmitterKey(req);
  const headers: Record<string, string> = {};
  if (setCookie) headers["Set-Cookie"] = setCookie;
  return { key, headers };
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) return (await req.json()) as Record<string, unknown>;
    if (ct.includes("form")) {
      const form = await req.formData();
      const out: Record<string, unknown> = {};
      form.forEach((v, k) => (out[k] = typeof v === "string" ? v : ""));
      return out;
    }
    const text = await req.text();
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function requireRoomAuth(req: Request, roomId: string): Response | null {
  const auth = authFromRequest(db, req);
  if (!canManageRoom(auth, roomId)) {
    return json({ error: "Operator access required." }, auth ? 403 : 401);
  }
  return null;
}

function requireSameOrigin(req: Request): Response | null {
  if (!sameOrigin(req)) return json({ error: "Cross-origin request rejected." }, 403);
  return null;
}

function sessionUrls(id: string, req?: Request) {
  const base = publicBaseUrl(req);
  return {
    attendee: `${base}/t/${id}`,
    admin: `${base}/admin/talks/${id}`,
    qr: `${base}/admin/talks/${id}/qr`,
  };
}

type Params<T extends string> = Request & { params: Record<T, string> };

/**
 * Serve the React app shell from a route handler. Bun can't return an
 * HTMLBundle from a handler function, so we self-fetch the internal
 * /__shell route (which serves the bundle) and stream that response.
 */
function serveShell(_req: Request): Promise<Response> {
  return fetch(`http://localhost:${PORT}/__shell`);
}

// ---------------------------------------------------------------------------
// Server

const server = Bun.serve({
  port: PORT,
  idleTimeout: 120,
  development: process.env.NODE_ENV !== "production" && { hmr: true },
  routes: {
    // ---- app shell routes ----
    "/": indexHtml,
    "/__shell": indexHtml,
    "/admin": indexHtml,
    "/admin/dashboard": indexHtml,
    "/admin/login-page": indexHtml,
    "/admin/talks/:id": indexHtml,
    "/admin/talks/:id/qr": indexHtml,
    "/admin/talks/:id/ai-run": indexHtml,
    "/t/:id": (req: Params<"id">) => {
      if (!getSession(db, req.params.id)) return new Response("Room not found", { status: 404 });
      return serveShell(req);
    },
    "/s/:id": (req: Params<"id">) =>
      Response.redirect(`/t/${encodeURIComponent(req.params.id)}`, 302),
    // ---- public APIs ----
    "/api/talks": {
      GET: () =>
        json({
          rooms: listActiveSessions(db).map((s) => ({
            id: s.id,
            title: s.title,
            presenter: s.presenter,
            description: s.description,
          })),
        }),
    },

    "/api/talks/:id": {
      GET: (req: Params<"id">) => {
        const session = getSession(db, req.params.id);
        if (!session) return notFound("Talk not found");
        const { headers } = withAttendee(req);
        return json(
          {
            talk: {
              id: session.id,
              title: session.title,
              presenter: session.presenter,
              description: session.description,
              slides_url: session.slides_url,
              qa_state: session.qa_state,
              qa_enabled: !!session.qa_enabled,
              feedback_state: session.feedback_state,
              short_code: session.short_code,
            },
            urls: sessionUrls(session.id, req),
          },
          200,
          headers,
        );
      },
    },

    "/api/talks/:id/interactions": {
      POST: async (req: Params<"id">) => {
        const session = getSession(db, req.params.id);
        if (!session) return notFound("Talk not found");
        const { key, headers } = withAttendee(req);
        const body = await readBody(req);
        const result = recordInteraction(db, session.id, key, body);
        if (!result.ok) return json({ error: result.error }, result.status ?? 400, headers);
        broadcastQa(db, session.id);
        return json({ ok: true }, 202, headers);
      },
    },

    "/api/talks/:id/session-feedback": {
      POST: async (req: Params<"id">) => {
        const session = getSession(db, req.params.id);
        if (!session) return notFound("Talk not found");
        if (session.feedback_state !== "open") {
          return json({ error: "Feedback is closed for this session." }, 403);
        }
        const { key, headers } = withAttendee(req);
        const body = await readBody(req);
        const { feedback_id } = recordFeedback(db, session.id, key, body);
        broadcastQa(db, session.id);
        return json({ ok: true, feedback_id }, 202, headers);
      },
    },

    "/api/sessions/:id/qa/public.json": {
      GET: (req: Params<"id">) => {
        const payload = publicQaPayload(db, req.params.id);
        if (!payload) return notFound("Session not found");
        const { headers } = withAttendee(req);
        return json(payload, 200, headers);
      },
    },

    "/api/sessions/:id/qa/events": {
      GET: (req: Params<"id">) => {
        const session = getSession(db, req.params.id);
        if (!session) return notFound("Session not found");
        const auth = authFromRequest(db, req);
        return sseResponse(db, session.id, canManageRoom(auth, session.id));
      },
    },

    "/api/sessions/:id/qa/questions": {
      POST: async (req: Params<"id">) => {
        const session = getSession(db, req.params.id);
        if (!session) return notFound("Session not found");
        const { key, headers } = withAttendee(req);
        const body = await readBody(req);
        const text = typeof body.question === "string" ? body.question : (body.text as string) ?? "";
        const result = ensureSubmission(db, session, key, text);
        if (!result.ok) return json({ error: result.error }, result.status ?? 400, headers);
        if (!result.duplicate) {
          scheduleQaProcessing(db, session.id);
          broadcastQa(db, session.id);
        }
        return json(
          {
            ok: true,
            duplicate: !!result.duplicate,
            submission: {
              id: result.submission!.id,
              text: result.submission!.raw_text,
              status: result.submission!.status,
            },
          },
          result.duplicate ? 200 : 201,
          headers,
        );
      },
    },

    "/api/sessions/:id/qa/questions/:qid/vote": {
      POST: async (req: Params<"id" | "qid">) => {
        const session = getSession(db, req.params.id);
        if (!session) return notFound("Session not found");
        const { key, headers } = withAttendee(req);
        const body = await readBody(req);
        const value = typeof body.value === "number" ? body.value : Number(body.value ?? 1);
        const result = recordVote(db, session.id, req.params.qid, key, Number.isFinite(value) ? value : 1);
        if (!result.ok) return json({ error: result.error }, result.status ?? 400, headers);
        broadcastQa(db, session.id);
        return json({ ok: true, target_kind: result.target_kind, score: result.score }, 200, headers);
      },
    },

    "/api/sessions/:id/qa/questions/:qid/upvote": {
      POST: (req: Params<"id" | "qid">) => {
        const session = getSession(db, req.params.id);
        if (!session) return notFound("Session not found");
        const { key, headers } = withAttendee(req);
        const result = recordVote(db, session.id, req.params.qid, key, 1);
        if (!result.ok) return json({ error: result.error }, result.status ?? 400, headers);
        broadcastQa(db, session.id);
        return json({ ok: true, target_kind: result.target_kind, score: result.score }, 200, headers);
      },
    },

    // ---- auth ----
    "/admin/login": {
      POST: async (req) => {
        const csrf = requireSameOrigin(req);
        if (csrf) return csrf;
        const body = await readBody(req);
        const key = typeof body.key === "string" ? body.key : "";
        const expected = adminKey();
        if (!expected || key !== expected) {
          return new Response(null, {
            status: 303,
            headers: { Location: "/admin/login-page?error=invalid-key" },
          });
        }
        const { setCookie } = createAuthSession(db, "global_admin", null);
        return new Response(null, {
          status: 303,
          headers: { Location: "/admin/dashboard", "Set-Cookie": setCookie },
        });
      },
    },

    "/logout": {
      POST: (req) => {
        const csrf = requireSameOrigin(req);
        if (csrf) return csrf;
        const clear = revokeAuth(db, req);
        return new Response(null, {
          status: 303,
          headers: { Location: "/admin", "Set-Cookie": clear },
        });
      },
    },

    "/r/claim/:token": {
      GET: (req: Params<"token">) => {
        const result = claimCapability(db, req.params.token);
        if ("error" in result) {
          return new Response(null, {
            status: 303,
            headers: { Location: `/admin/login-page?error=${encodeURIComponent(result.error)}` },
          });
        }
        if (!getSession(db, result.sessionId)) {
          return new Response(null, {
            status: 303,
            headers: { Location: "/admin/login-page?error=room-missing" },
          });
        }
        const { setCookie } = createAuthSession(db, "room_admin", result.sessionId);
        return new Response(null, {
          status: 303,
          headers: { Location: `/admin/talks/${result.sessionId}`, "Set-Cookie": setCookie },
        });
      },
    },

    "/api/admin/me": {
      GET: (req) => {
        const auth = authFromRequest(db, req);
        if (!auth) return json({ authenticated: false });
        return json({ authenticated: true, scope: auth.scope, session_id: auth.session_id });
      },
    },

    // ---- admin session management ----
    "/api/admin/sessions": {
      GET: (req) => {
        const auth = authFromRequest(db, req);
        if (auth?.scope !== "global_admin") return json({ error: "Global admin required." }, auth ? 403 : 401);
        const sessions = db
          .query<
            {
              id: string;
              title: string;
              presenter: string | null;
              description: string | null;
              active: number;
              qa_state: string;
              feedback_count: number;
            },
            []
          >(
            `SELECT s.id, s.title, s.presenter, s.description, s.active, s.qa_state,
              (SELECT COUNT(*) FROM feedback f WHERE f.session_id = s.id) AS feedback_count
             FROM sessions s ORDER BY s.created_at ASC`,
          )
          .all();
        return json({
          sessions,
          totals: {
            talks: sessions.length,
            active_talks: sessions.filter((s) => s.active).length,
            feedback_total: sessions.reduce((acc, s) => acc + s.feedback_count, 0),
          },
        });
      },
      POST: async (req) => {
        const csrf = requireSameOrigin(req);
        if (csrf) return csrf;
        const auth = authFromRequest(db, req);
        if (auth?.scope !== "global_admin") return json({ error: "Global admin required." }, auth ? 403 : 401);
        const body = await readBody(req);
        const title = clampText(body.title, 200);
        if (!title) return json({ error: "Title is required." }, 400);
        const presenter = clampText(body.presenter, 120) || null;
        const description = clampText(body.description, 2000) || null;
        let id = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 24) || randomId("room", 4);
        while (getSession(db, id)) id = `${id.slice(0, 18)}-${randomId("x", 2).slice(2)}`;
        const ts = now();
        db.run(
          `INSERT INTO sessions (id, title, presenter, description, active, qa_state, qa_mode, qa_display_mode, qa_enabled, feedback_state, created_at, updated_at)
           VALUES (?, ?, ?, ?, 1, 'open', 'moderated', 'queue', 1, 'open', ?, ?)`,
          [id, title, presenter, description, ts, ts],
        );
        const cap = createRoomCapability(db, id);
        const urls = sessionUrls(id, req);
        return json(
          {
            ok: true,
            session: { id, title, presenter, description },
            urls,
            operator: {
              claim_url: `${publicBaseUrl(req)}${cap.claimUrl}`,
              message: `You're set up to run Q&A for “${title}”. Open this link on your own device to claim operator access (it works once per regeneration): ${publicBaseUrl(req)}${cap.claimUrl}`,
            },
          },
          201,
        );
      },
    },

    "/api/admin/talks/:id/state": {
      POST: async (req: Params<"id">) => {
        const csrf = requireSameOrigin(req);
        if (csrf) return csrf;
        const denied = requireRoomAuth(req, req.params.id);
        if (denied) return denied;
        const session = getSession(db, req.params.id);
        if (!session) return notFound();
        const body = await readBody(req);
        const state = clampText(body.qa_state, 20);
        if (!["open", "paused", "closed", "disabled", "archived"].includes(state)) {
          return json({ error: "Invalid qa_state." }, 400);
        }
        db.run("UPDATE sessions SET qa_state = ?, updated_at = ? WHERE id = ?", [state, now(), session.id]);
        broadcastQa(db, session.id);
        return json({ ok: true, qa_state: state });
      },
    },

    "/api/admin/talks/:id/qa/run": {
      POST: async (req: Params<"id">) => {
        const csrf = requireSameOrigin(req);
        if (csrf) return csrf;
        const denied = requireRoomAuth(req, req.params.id);
        if (denied) return denied;
        if (!getSession(db, req.params.id)) return notFound();
        const runId = await runQaProcessing(db, req.params.id);
        broadcastQa(db, req.params.id);
        return json({ ok: true, run_id: runId });
      },
    },

    "/api/admin/talks/:id/questions/:qid/actions": {
      POST: async (req: Params<"id" | "qid">) => {
        const csrf = requireSameOrigin(req);
        if (csrf) return csrf;
        const denied = requireRoomAuth(req, req.params.id);
        if (denied) return denied;
        if (!getSession(db, req.params.id)) return notFound();
        const body = await readBody(req);
        const action = clampText(body.action, 20);
        const auth = authFromRequest(db, req)!;
        const result = applyThemeAction(db, req.params.id, req.params.qid, action, auth.scope);
        if (!result.ok) return json({ error: result.error }, result.status ?? 400);
        broadcastQa(db, req.params.id);
        return json({ ok: true, theme: { id: result.theme!.id, status: result.theme!.status } });
      },
    },

    "/api/admin/talks/:id/feedback-summary": {
      GET: (req: Params<"id">) => {
        const denied = requireRoomAuth(req, req.params.id);
        if (denied) return denied;
        if (!getSession(db, req.params.id)) return notFound();
        return json(feedbackSummary(db, req.params.id));
      },
    },

    "/api/admin/talks/:id/presenter.json": {
      GET: (req: Params<"id">) => {
        const denied = requireRoomAuth(req, req.params.id);
        if (denied) return denied;
        const payload = presenterQaPayload(db, req.params.id);
        if (!payload) return notFound();
        return json(payload);
      },
    },

    "/api/admin/talks/:id/ai-run.json": {
      GET: async (req: Params<"id">) => {
        const denied = requireRoomAuth(req, req.params.id);
        if (denied) return denied;
        const session = getSession(db, req.params.id);
        if (!session) return notFound();
        const run = latestRun(db, session.id);
        if (!run) return json({ run: null });
        const readCapped = async (path: string | null) => {
          if (!path) return null;
          try {
            const file = Bun.file(path);
            if (!(await file.exists())) return null;
            const size = file.size;
            const text = await file.text();
            return {
              path,
              size,
              truncated: size > AI_FILE_CAP,
              content: text.slice(0, AI_FILE_CAP),
            };
          } catch {
            return null;
          }
        };
        return json({
          run: {
            id: run.id,
            status: run.status,
            started_at: run.started_at,
            finished_at: run.finished_at,
            summary: run.summary,
            error: run.error,
          },
          input: await readCapped(run.input_path),
          output: await readCapped(run.output_path),
        });
      },
    },

    "/admin/talks/:id/export": {
      GET: (req: Params<"id">) => {
        const denied = requireRoomAuth(req, req.params.id);
        if (denied) return denied;
        const session = getSession(db, req.params.id);
        if (!session) return notFound();
        const rows = db
          .query<
            {
              id: string;
              submitted_at: number;
              rating: number | null;
              sentiment: string | null;
              tags: string | null;
              comment: string | null;
            },
            [string]
          >(
            "SELECT id, submitted_at, rating, sentiment, tags, comment FROM feedback WHERE session_id = ? ORDER BY submitted_at ASC",
          )
          .all(session.id);
        const lines = ["id,submitted_at,rating,sentiment,tags,comment"];
        for (const r of rows) {
          lines.push(
            [
              r.id,
              new Date(r.submitted_at * 1000).toISOString(),
              r.rating,
              r.sentiment,
              r.tags,
              r.comment,
            ]
              .map(csvEscape)
              .join(","),
          );
        }
        return new Response(lines.join("\r\n") + "\r\n", {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="feedback-${session.id}.csv"`,
          },
        });
      },
    },

    "/admin/talks/:id/capability/regenerate": {
      POST: (req: Params<"id">) => {
        const csrf = requireSameOrigin(req);
        if (csrf) return csrf;
        const auth = authFromRequest(db, req);
        if (auth?.scope !== "global_admin") return json({ error: "Global admin required." }, auth ? 403 : 401);
        if (!getSession(db, req.params.id)) return notFound();
        const cap = createRoomCapability(db, req.params.id);
        return json({ ok: true, claim_url: `${publicBaseUrl(req)}${cap.claimUrl}` });
      },
    },

    "/admin/talks/:id/capability/revoke": {
      POST: (req: Params<"id">) => {
        const csrf = requireSameOrigin(req);
        if (csrf) return csrf;
        const auth = authFromRequest(db, req);
        if (auth?.scope !== "global_admin") return json({ error: "Global admin required." }, auth ? 403 : 401);
        if (!getSession(db, req.params.id)) return notFound();
        const revoked = revokeRoomCapabilities(db, req.params.id);
        return json({ ok: true, revoked });
      },
    },
  },

  fetch() {
    return new Response("Not found", { status: 404 });
  },
});

console.log(`DevDays Feedback listening on ${server.url}`);
