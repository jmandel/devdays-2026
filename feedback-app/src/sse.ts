import type { DB } from "./db.ts";
import {
  publicQaPayload,
  presenterQaPayload,
  feedbackSummary,
} from "./qa.ts";

interface SseClient {
  sessionId: string;
  presenter: boolean;
  controller: ReadableStreamDefaultController<Uint8Array>;
  keepalive: ReturnType<typeof setInterval> | null;
}

const encoder = new TextEncoder();
const clients = new Map<string, Set<SseClient>>();

function frame(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function payloadFor(db: DB, sessionId: string, presenter: boolean) {
  const data: Record<string, unknown> = {
    public: publicQaPayload(db, sessionId),
    ts: Date.now(),
  };
  if (presenter) {
    data.presenter = presenterQaPayload(db, sessionId);
    data.feedback = feedbackSummary(db, sessionId);
  }
  return data;
}

function safeSend(client: SseClient, bytes: Uint8Array) {
  try {
    client.controller.enqueue(bytes);
  } catch {
    removeClient(client);
  }
}

function removeClient(client: SseClient) {
  if (client.keepalive) clearInterval(client.keepalive);
  client.keepalive = null;
  clients.get(client.sessionId)?.delete(client);
}

/** Create an SSE response streaming live qa frames for one session. */
export function sseResponse(db: DB, sessionId: string, presenter: boolean): Response {
  let client: SseClient;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      client = { sessionId, presenter, controller, keepalive: null };
      let set = clients.get(sessionId);
      if (!set) clients.set(sessionId, (set = new Set()));
      set.add(client);
      safeSend(client, frame("qa", payloadFor(db, sessionId, presenter)));
      client.keepalive = setInterval(() => {
        safeSend(client, encoder.encode(`: keepalive ${Date.now()}\n\n`));
      }, 25_000);
    },
    cancel() {
      removeClient(client);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/** Broadcast fresh payloads to every client watching a session. */
export function broadcastQa(db: DB, sessionId: string) {
  const set = clients.get(sessionId);
  if (!set || set.size === 0) return;
  let publicFrame: Uint8Array | null = null;
  let presenterFrame: Uint8Array | null = null;
  for (const client of [...set]) {
    if (client.presenter) {
      presenterFrame ??= frame("qa", payloadFor(db, sessionId, true));
      safeSend(client, presenterFrame);
    } else {
      publicFrame ??= frame("qa", payloadFor(db, sessionId, false));
      safeSend(client, publicFrame);
    }
  }
}
