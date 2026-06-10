import { create } from "zustand";
import { getJSON, postJSON } from "./api.ts";

export type ConnState = "idle" | "connecting" | "live" | "error";

export interface Talk {
  id: string;
  title: string;
  presenter: string | null;
  description: string | null;
  slides_url: string | null;
  qa_state: string;
  qa_enabled: boolean;
  feedback_state: string;
  short_code: string | null;
}

export interface RawQuestion {
  id: string;
  text: string;
  status: string;
  score: number;
  created_at: number;
  theme_id: string | null;
}

export interface Theme {
  id: string;
  text: string;
  summary: string | null;
  status: string;
  score: number;
  source_count: number;
  pinned: boolean;
  created_at: number;
}

interface AppState {
  conn: ConnState;
  talk: Talk | null;
  urls: Record<string, string> | null;
  rooms: { id: string; title: string; presenter: string | null; description: string | null }[] | null;
  publicQa: { session: any; questions: RawQuestion[] } | null;
  presenterQa: {
    themes: Theme[];
    answered: Theme[];
    hidden: Theme[];
    answered_count: number;
    raw_pending_count: number;
  } | null;
  feedback: any | null;
  me: { authenticated: boolean; scope?: string; session_id?: string | null } | null;
  adminData: { sessions: any[]; totals: any } | null;

  loadRooms: () => Promise<void>;
  loadTalk: (id: string) => Promise<void>;
  loadPublicQa: (id: string) => Promise<void>;
  loadPresenterQa: (id: string) => Promise<void>;
  loadFeedbackSummary: (id: string) => Promise<void>;
  loadMe: () => Promise<void>;
  loadAdminSessions: () => Promise<void>;
  connect: (id: string) => () => void;
  sendPulse: (id: string, value: string) => Promise<void>;
  submitQuestion: (id: string, text: string) => Promise<{ duplicate: boolean }>;
  vote: (id: string, questionId: string, value: number) => Promise<void>;
  submitFeedback: (id: string, input: { rating: number | null; comment: string }) => Promise<void>;
  themeAction: (id: string, themeId: string, action: string) => Promise<void>;
}

export const useApp = create<AppState>((set, get) => ({
  conn: "idle",
  talk: null,
  urls: null,
  rooms: null,
  publicQa: null,
  presenterQa: null,
  feedback: null,
  me: null,
  adminData: null,

  loadRooms: async () => {
    const data = await getJSON("/api/talks");
    set({ rooms: data.rooms });
  },

  loadTalk: async (id) => {
    const data = await getJSON(`/api/talks/${encodeURIComponent(id)}`);
    set({ talk: data.talk, urls: data.urls });
  },

  loadPublicQa: async (id) => {
    set({ publicQa: await getJSON(`/api/sessions/${encodeURIComponent(id)}/qa/public.json`) });
  },

  loadPresenterQa: async (id) => {
    set({ presenterQa: await getJSON(`/api/admin/talks/${encodeURIComponent(id)}/presenter.json`) });
  },

  loadFeedbackSummary: async (id) => {
    set({ feedback: await getJSON(`/api/admin/talks/${encodeURIComponent(id)}/feedback-summary`) });
  },

  loadMe: async () => {
    try {
      set({ me: await getJSON("/api/admin/me") });
    } catch {
      set({ me: { authenticated: false } });
    }
  },

  loadAdminSessions: async () => {
    const data = await getJSON("/api/admin/sessions");
    set({ adminData: data });
  },

  /** Open SSE for a session; returns a cleanup function. */
  connect: (id) => {
    set({ conn: "connecting" });
    const source = new EventSource(`/api/sessions/${encodeURIComponent(id)}/qa/events`);
    source.addEventListener("open", () => set({ conn: "live" }));
    source.addEventListener("error", () => {
      set({ conn: source.readyState === EventSource.CLOSED ? "error" : "connecting" });
    });
    source.addEventListener("qa", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        const patch: Partial<AppState> = { conn: "live" };
        if (data.public) patch.publicQa = data.public;
        if (data.presenter) patch.presenterQa = data.presenter;
        if (data.feedback) patch.feedback = data.feedback;
        set(patch);
      } catch {}
    });
    // Poll as a fallback roughly every 30 seconds in case SSE drops silently.
    const poll = setInterval(() => {
      get().loadPublicQa(id).catch(() => {});
      const me = get().me;
      if (me?.authenticated && (me.scope === "global_admin" || me.session_id === id)) {
        get().loadPresenterQa(id).catch(() => {});
        get().loadFeedbackSummary(id).catch(() => {});
      }
    }, 30_000);
    return () => {
      source.close();
      clearInterval(poll);
      set({ conn: "idle" });
    };
  },

  sendPulse: async (id, value) => {
    await postJSON(`/api/talks/${encodeURIComponent(id)}/interactions`, { kind: "pulse", value });
  },

  submitQuestion: async (id, text) => {
    const res = await postJSON(`/api/sessions/${encodeURIComponent(id)}/qa/questions`, {
      question: text,
    });
    get().loadPublicQa(id).catch(() => {});
    return { duplicate: !!res.duplicate };
  },

  vote: async (id, questionId, value) => {
    await postJSON(
      `/api/sessions/${encodeURIComponent(id)}/qa/questions/${encodeURIComponent(questionId)}/vote`,
      { value },
    );
  },

  submitFeedback: async (id, input) => {
    await postJSON(`/api/talks/${encodeURIComponent(id)}/session-feedback`, input);
  },

  themeAction: async (id, themeId, action) => {
    await postJSON(
      `/api/admin/talks/${encodeURIComponent(id)}/questions/${encodeURIComponent(themeId)}/actions`,
      { action },
    );
  },
}));
