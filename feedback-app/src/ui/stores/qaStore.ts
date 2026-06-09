import { create } from "zustand";
import { apiJson, postJson } from "../api/client";

export type SessionPacket = { session_id: string; attendee_url: string; admin_url: string; overlay_url: string; qa_state: string; qa_mode: string; qa_display_mode: string };
export type Talk = { id: string; title: string; presenter: string; description: string; slides_url: string; active: boolean; feedback_state: string; qa_state: string };
export type PublicQuestion = { id: string; text: string; status: string; support_count: number; created_at: number; theme_id?: string | null; answered?: boolean; hidden?: boolean };
export type ThemeQuestion = { id: string; text: string; status: string; support_count: number; source_count?: number; priority: number; pinned: boolean; created_at: number; answered_at?: number | null };
export type PublicQaPayload = { view: "public"; generated_at: number; session: SessionPacket; questions: PublicQuestion[] };
export type PresenterQaPayload = { view: "presenter"; generated_at: number; session: SessionPacket; themes?: ThemeQuestion[]; questions?: ThemeQuestion[]; answered_count?: number };
export type TalkResponse = { talk: Talk; urls: SessionPacket };
export type AdminSession = { id: string; title: string; presenter: string; created_at: number; active: boolean; qa_state: string; feedback_count: number };
export type AdminSessionsResponse = { sessions: AdminSession[]; totals: { sessions: number; active: number; feedback: number } };
export type SlidesQaPayload = { view: "slides"; generated_at: number; session: SessionPacket; questions: ThemeQuestion[] };
export type FeedbackSummary = {
  pulse: { window_seconds: number; counts: Record<string, number>; total: number };
  session_feedback: { total: number; rating_distribution: Record<string, number>; comments: { id: string; rating: number | null; comment: string | null; tags: string[]; submitted_at: number }[] };
};
export type SsePayload = { public?: PublicQaPayload | null; presenter?: PresenterQaPayload | null };

type QaState = {
  talk?: Talk;
  urls?: SessionPacket;
  publicPayload?: PublicQaPayload;
  presenterPayload?: PresenterQaPayload;
  slidesPayload?: SlidesQaPayload;
  adminSessions?: AdminSessionsResponse;
  feedbackSummary?: FeedbackSummary;
  loading: boolean;
  connection: "idle" | "connecting" | "live" | "error";
  error?: string;
  eventSource?: EventSource;
  loadTalk: (id: string) => Promise<void>;
  loadPublic: (id: string) => Promise<void>;
  loadPresenter: (id: string) => Promise<void>;
  loadSlides: (id: string) => Promise<void>;
  loadAdminSessions: () => Promise<void>;
  createSession: (payload: { title: string; presenter?: string; description?: string }) => Promise<string>;
  loadFeedbackSummary: (id: string) => Promise<void>;
  connect: (id: string) => void;
  disconnect: () => void;
  submitQuestion: (id: string, question: string) => Promise<void>;
  vote: (id: string, questionId: string, value: 1 | -1) => Promise<void>;
  feedback: (id: string, payload: unknown) => Promise<void>;
  pulse: (id: string, value: string) => Promise<void>;
  setQaState: (id: string, state: "open" | "paused" | "closed") => Promise<void>;
  action: (id: string, questionId: string, action: string) => Promise<void>;
  runAgent: (id: string) => Promise<void>;
};

export const useQaStore = create<QaState>((set, get) => ({
  loading: false,
  connection: "idle",
  async loadTalk(id) {
    set({ loading: true, error: undefined });
    try { const data = await apiJson<TalkResponse>(`/api/talks/${id}`); set({ talk: data.talk, urls: data.urls, loading: false }); }
    catch (e) { set({ error: String((e as Error).message || e), loading: false }); }
  },
  async loadPublic(id) {
    const data = await apiJson<PublicQaPayload>(`/api/sessions/${id}/qa/public.json`); set({ publicPayload: data });
  },
  async loadPresenter(id) {
    const data = await apiJson<PresenterQaPayload>(`/api/sessions/${id}/qa/presenter.json`); set({ presenterPayload: data });
  },
  async loadSlides(id) {
    const data = await apiJson<SlidesQaPayload>(`/api/sessions/${id}/qa/slides.json`); set({ slidesPayload: data });
  },
  async loadAdminSessions() {
    const data = await apiJson<AdminSessionsResponse>(`/api/admin/sessions`); set({ adminSessions: data });
  },
  async createSession(payload) {
    const data = await postJson<SessionPacket & { operator_link?: string }>(`/api/admin/sessions`, payload);
    await get().loadAdminSessions().catch(() => {});
    return data.session_id;
  },
  async loadFeedbackSummary(id) {
    const data = await apiJson<FeedbackSummary>(`/api/admin/talks/${id}/feedback-summary`); set({ feedbackSummary: data });
  },
  connect(id) {
    get().disconnect();
    if (!("EventSource" in window)) return;
    set({ connection: "connecting" });
    const es = new EventSource(`/api/sessions/${id}/qa/events`);
    es.addEventListener("open", () => set({ connection: "live" }));
    es.addEventListener("error", () => set({ connection: "error" }));
    es.addEventListener("qa", (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data) as SsePayload;
        set({ publicPayload: data.public || undefined, presenterPayload: data.presenter || undefined, connection: "live" });
      } catch {}
    });
    set({ eventSource: es });
  },
  disconnect() { get().eventSource?.close(); set({ eventSource: undefined, connection: "idle" }); },
  async submitQuestion(id, question) {
    await postJson(`/api/sessions/${id}/qa/questions`, { question });
    await get().loadPublic(id).catch(() => {});
  },
  async vote(id, questionId, value) {
    await postJson(`/api/sessions/${id}/qa/questions/${questionId}/vote`, { value });
    await get().loadPublic(id).catch(() => {});
  },
  async feedback(id, payload) { await postJson(`/api/talks/${id}/session-feedback`, payload); },
  async pulse(id, value) { await postJson(`/api/talks/${id}/interactions`, { kind: "pulse", value }); },
  async setQaState(id, state) { await postJson(`/api/admin/talks/${id}/state`, { state }); await get().loadPresenter(id); },
  async action(id, questionId, action) { await postJson(`/api/admin/talks/${id}/questions/${questionId}/actions`, { action }); await get().loadPresenter(id); },
  async runAgent(id) { await postJson(`/api/admin/talks/${id}/qa/run`, {}); await get().loadPresenter(id); },
}));
