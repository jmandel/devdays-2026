import { useEffect, useState } from "react";
import { getJSON } from "../api.ts";
import { useApp } from "../store.ts";
import { Brand, Chip, SectionLabel, StatusPill } from "../components.tsx";
import { Link } from "../router.tsx";

function fmt(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString();
}

export function AiRunPage({ id }: { id: string }) {
  const talk = useApp((s) => s.talk);
  const loadTalk = useApp((s) => s.loadTalk);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTalk(id).catch(() => {});
    let cancelled = false;
    const poll = () =>
      getJSON(`/api/admin/talks/${encodeURIComponent(id)}/ai-run.json`)
        .then((d) => {
          if (!cancelled) setData(d);
        })
        .catch((e) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load run.");
        });
    poll();
    const iv = setInterval(() => {
      if (!cancelled && data?.run?.status === "running") poll();
    }, 3000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [id, loadTalk, data?.run?.status]);

  return (
    <div className="shell wide">
      <header className="topbar">
        <Brand sub="AI run audit" />
        <Link className="btn quiet small" to={`/admin/talks/${id}`}>
          ← Back to control room
        </Link>
      </header>

      <section className="card hero fade-in">
        <SectionLabel tone="teal">Q&amp;A processing</SectionLabel>
        <h1>{talk?.title ?? id}</h1>
        <p className="small muted">
          Latest synthesis run for this room — input, output, and status, for debugging and trust.
        </p>
      </section>

      {error ? (
        <div className="empty">{error}</div>
      ) : data === null ? (
        <div className="empty">Loading run…</div>
      ) : data.run === null ? (
        <div className="empty fade-in d1">
          No processing runs yet. Runs start automatically when attendees submit questions.
        </div>
      ) : (
        <>
          <section className="card fade-in d1">
            <SectionLabel>Run metadata</SectionLabel>
            <div className="row" style={{ marginBottom: 10 }}>
              <Chip>Run/{data.run.id}</Chip>
              <StatusPill
                status={
                  data.run.status === "applied" ? "answered" : data.run.status === "running" ? "queued" : "needs detail"
                }
              />
              <span className="chip">{data.run.status}</span>
            </div>
            <p className="small">
              <strong>Started:</strong> {fmt(data.run.started_at)} · <strong>Finished:</strong>{" "}
              {fmt(data.run.finished_at)}
            </p>
            {data.run.summary ? <p className="small">{data.run.summary}</p> : null}
            {data.run.error ? <p className="form-status err">{data.run.error}</p> : null}
          </section>

          <section className="card fade-in d2">
            <SectionLabel tone="amber">Worker input{data.input?.truncated ? " (truncated)" : ""}</SectionLabel>
            {data.input ? (
              <pre className="code-block">{data.input.content}</pre>
            ) : (
              <p className="small muted">Input file unavailable.</p>
            )}
          </section>

          <section className="card fade-in d3">
            <SectionLabel tone="green">Worker output{data.output?.truncated ? " (truncated)" : ""}</SectionLabel>
            {data.output ? (
              <pre className="code-block">{data.output.content}</pre>
            ) : data.run.status === "running" ? (
              <p className="small muted">⏳ AI worker is still running…</p>
            ) : (
              <p className="small muted">
                No output file — the run likely used deterministic fallback processing.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
