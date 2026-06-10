import type { ReactNode } from "react";
import type { ConnState, RawQuestion } from "./store.ts";
import { Link } from "./router.tsx";

export function FlameMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path
          d="M16 5c2.4 5-4 7.5-4 12.5a6 6 0 0 0 12 .5C24 13 17.2 10.6 16 5z"
          fill="#FFF4ED"
        />
        <circle cx="16" cy="19.5" r="2.4" fill="#E8431F" />
      </svg>
    </span>
  );
}

export function Brand({ sub = "DevDays 2026" }: { sub?: string }) {
  return (
    <Link to="/" className="brand">
      <FlameMark />
      <span>
        <span className="brand-name">DevDays Feedback</span>
        <span className="brand-sub">{sub}</span>
      </span>
    </Link>
  );
}

export function ConnBadge({ state }: { state: ConnState }) {
  const label =
    state === "live" ? "live" : state === "connecting" ? "connecting" : state === "error" ? "error" : "idle";
  return (
    <span className={`conn ${state}`} role="status">
      <span className="beacon" />
      {label}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="chip">{children}</span>;
}

export function StatusPill({ status }: { status: string }) {
  const cls = status.replace(/\s+/g, "-");
  return <span className={`pill ${cls}`}>{status}</span>;
}

export function SectionLabel({
  children,
  tone = "flame",
}: {
  children: ReactNode;
  tone?: "flame" | "teal" | "amber" | "green";
}) {
  return (
    <p className="section-label">
      <span className={`dot ${tone === "flame" ? "" : tone}`} />
      {children}
    </p>
  );
}

export const PULSE_OPTIONS: { value: string; cls: string }[] = [
  { value: "I’m with you", cls: "with-you" },
  { value: "I’m confused", cls: "confused" },
  { value: "Too fast", cls: "too-fast" },
  { value: "Too slow", cls: "too-slow" },
];

export function PulseMeters({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  const max = Math.max(1, ...PULSE_OPTIONS.map((o) => counts[o.value] ?? 0));
  return (
    <div>
      {PULSE_OPTIONS.map((opt) => {
        const n = counts[opt.value] ?? 0;
        return (
          <div className="meter-row" key={opt.value}>
            <span className="meter-label">{opt.value}</span>
            <span className="meter-track">
              <span
                className={`meter-fill ${opt.cls}`}
                style={{ width: `${(n / max) * 100}%` }}
              />
            </span>
            <span className="meter-count">{n}</span>
          </div>
        );
      })}
      <p className="small muted" style={{ marginTop: 6 }}>
        {total} signal{total === 1 ? "" : "s"} in the last 5 minutes
      </p>
    </div>
  );
}

export function timeAgo(ts: number): string {
  const delta = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (delta < 60) return "just now";
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return `${Math.floor(delta / 86400)}d ago`;
}

export function QuestionRow({
  q,
  onVote,
}: {
  q: RawQuestion;
  onVote?: (id: string, value: number) => void;
}) {
  const votable = onVote && q.status !== "answered";
  return (
    <div className={`q-row ${q.status === "answered" ? "answered" : ""}`}>
      <div className="q-text">
        {q.text}
        <div className="q-meta">
          <StatusPill status={q.status} />
          <time dateTime={new Date(q.created_at * 1000).toISOString()}>{timeAgo(q.created_at)}</time>
          {q.theme_id ? <Chip>Theme/{q.theme_id.replace(/^q_/, "")}</Chip> : null}
        </div>
      </div>
      <div className="vote-box">
        {votable ? (
          <>
            <button className="vote-btn" onClick={() => onVote!(q.id, 1)} aria-label="Vote up">
              +1
            </button>
            <span className="vote-score">{q.score}</span>
            <button className="vote-btn down" onClick={() => onVote!(q.id, -1)} aria-label="Vote down">
              –
            </button>
          </>
        ) : (
          <span className="vote-score">{q.score}</span>
        )}
      </div>
    </div>
  );
}
