import { useEffect, useState } from "react";
import { useApp, type Theme } from "../store.ts";
import { Brand, Chip, ConnBadge, PulseMeters, SectionLabel, StatusPill } from "../components.tsx";
import { Link } from "../router.tsx";

function ThemeCard({
  theme,
  onAction,
}: {
  theme: Theme;
  onAction: (id: string, action: string) => void;
}) {
  const cls =
    theme.status === "answered" ? "answered" : theme.status === "hidden" ? "hidden-theme" : theme.pinned ? "pinned" : "";
  return (
    <div className={`theme-card ${cls}`}>
      <p className="theme-text">{theme.text}</p>
      {theme.summary ? <p className="small muted" style={{ marginTop: 4 }}>{theme.summary}</p> : null}
      <div className="theme-meta">
        <Chip>
          {theme.source_count} source{theme.source_count === 1 ? "" : "s"}
        </Chip>
        <Chip>score {theme.score}</Chip>
        {theme.pinned ? <span className="pill flame">pinned</span> : null}
        {theme.status === "answered" ? <span className="pill answered">answered</span> : null}
        {theme.status === "hidden" ? <span className="pill queued">hidden</span> : null}
      </div>
      <div className="theme-actions">
        {theme.status === "answered" || theme.status === "hidden" ? (
          <button className="btn small" onClick={() => onAction(theme.id, "restore")}>
            Restore
          </button>
        ) : (
          <>
            <button className="btn small" onClick={() => onAction(theme.id, theme.pinned ? "unpin" : "pin")}>
              {theme.pinned ? "Unpin" : "Pin"}
            </button>
            <button className="btn small" onClick={() => onAction(theme.id, "answer")}>
              Answered
            </button>
            <button className="btn small quiet" onClick={() => onAction(theme.id, "hide")}>
              Hide
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function ControlRoomPage({ id }: { id: string }) {
  const me = useApp((s) => s.me);
  const talk = useApp((s) => s.talk);
  const conn = useApp((s) => s.conn);
  const presenterQa = useApp((s) => s.presenterQa);
  const publicQa = useApp((s) => s.publicQa);
  const feedback = useApp((s) => s.feedback);
  const loadMe = useApp((s) => s.loadMe);
  const loadTalk = useApp((s) => s.loadTalk);
  const loadPresenterQa = useApp((s) => s.loadPresenterQa);
  const loadPublicQa = useApp((s) => s.loadPublicQa);
  const loadFeedbackSummary = useApp((s) => s.loadFeedbackSummary);
  const connect = useApp((s) => s.connect);
  const themeAction = useApp((s) => s.themeAction);
  const [mode, setMode] = useState<"themes" | "raw">("themes");
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    loadMe().catch(() => {});
    loadTalk(id).catch(() => {});
    loadPublicQa(id).catch(() => {});
    loadPresenterQa(id).catch(() => setDenied(true));
    loadFeedbackSummary(id).catch(() => {});
    return connect(id);
  }, [id, loadMe, loadTalk, loadPublicQa, loadPresenterQa, loadFeedbackSummary, connect]);

  const authorized = me?.authenticated && (me.scope === "global_admin" || me.session_id === id);

  if (denied || (me !== null && !authorized)) {
    return (
      <div className="shell">
        <header className="topbar">
          <Brand sub="Control room" />
        </header>
        <section className="card hero" style={{ maxWidth: 480, margin: "40px auto" }}>
          <SectionLabel>Operator access required</SectionLabel>
          <h1>This room is locked</h1>
          <p className="small muted">
            Open the capability link you were sent for this room, or log in with the organizer key.
          </p>
          <div className="row" style={{ marginTop: 12 }}>
            <Link className="btn primary" to="/admin/login-page">
              Operator login
            </Link>
            <Link className="btn quiet" to="/">
              Back to rooms
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const act = (themeId: string, action: string) => {
    themeAction(id, themeId, action)
      .then(() => loadPresenterQa(id))
      .catch(() => {});
  };

  const pulse = feedback?.pulse;
  const themes = presenterQa?.themes ?? [];
  const rawPreview = (publicQa?.questions ?? []).slice(0, 8);

  return (
    <div className="shell wide">
      <header className="topbar">
        <Brand sub="Control room" />
        <ConnBadge state={conn} />
      </header>

      <section className="card hero fade-in">
        <div className="row" style={{ marginBottom: 6 }}>
          <StatusPill status={talk?.qa_state === "open" ? "open" : "closed"} />
        </div>
        <h1>{talk?.title ?? "…"}</h1>
        {talk?.presenter ? <p style={{ fontWeight: 600 }}>{talk.presenter}</p> : null}
      </section>

      <section className="card fade-in d1">
        <SectionLabel>Live room operations</SectionLabel>
        <p className="small muted" style={{ marginBottom: 12 }}>
          Questions are accepted automatically. Themes update on their own as attendees ask and
          vote — nothing to babysit.
        </p>
        <div className="row">
          <Link className="btn primary" to={`/admin/talks/${id}/qr`}>
            Show QR &amp; join link
          </Link>
          <span className="spacer" />
          <a className="btn quiet small" href={`/t/${id}`} target="_blank" rel="noreferrer">
            Public page ↗
          </a>
          <Link className="btn quiet small" to={`/admin/talks/${id}/ai-run`}>
            AI processing log
          </Link>
          <a className="btn quiet small" href={`/admin/talks/${id}/export`}>
            Export CSV
          </a>
        </div>
      </section>

      <div className="proj-grid" style={{ display: "grid", gridTemplateColumns: "minmax(280px, 2fr) 3fr", gap: 18, alignItems: "start" }}>
        <section className="card fade-in d2" style={{ marginBottom: 0 }}>
          <SectionLabel tone="teal">Room pulse · last 5 min</SectionLabel>
          {pulse ? (
            <PulseMeters counts={pulse.counts} total={pulse.total} />
          ) : (
            <div className="empty">Pulse signals will appear here.</div>
          )}
        </section>

        <section className="card fade-in d3" style={{ marginBottom: 0 }}>
          <div className="row between" style={{ marginBottom: 10 }}>
            <SectionLabel>Audience themes</SectionLabel>
            <div className="seg">
              <button className={mode === "themes" ? "on" : ""} onClick={() => setMode("themes")}>
                Themes
              </button>
              <button className={mode === "raw" ? "on" : ""} onClick={() => setMode("raw")}>
                Raw questions
              </button>
            </div>
          </div>

          {mode === "themes" ? (
            <>
              {themes.length > 0 ? (
                themes.map((t) => <ThemeCard key={t.id} theme={t} onAction={act} />)
              ) : (
                <div className="empty">
                  No answerable themes yet.
                  {rawPreview.length > 0 ? (
                    <>
                      {" "}
                      {rawPreview.length} raw submission{rawPreview.length === 1 ? "" : "s"} waiting
                      for synthesis — flip to “Raw questions” to peek.
                    </>
                  ) : (
                    <> Themes appear as attendees ask questions.</>
                  )}
                </div>
              )}
              {(presenterQa?.answered ?? []).length > 0 ? (
                <details style={{ marginTop: 12 }}>
                  <summary className="small muted" style={{ cursor: "pointer" }}>
                    Answered ({presenterQa!.answered_count})
                  </summary>
                  <div style={{ marginTop: 8 }}>
                    {presenterQa!.answered.map((t) => (
                      <ThemeCard key={t.id} theme={t} onAction={act} />
                    ))}
                  </div>
                </details>
              ) : null}
              {(presenterQa?.hidden ?? []).length > 0 ? (
                <details style={{ marginTop: 8 }}>
                  <summary className="small muted" style={{ cursor: "pointer" }}>
                    Hidden ({presenterQa!.hidden.length})
                  </summary>
                  <div style={{ marginTop: 8 }}>
                    {presenterQa!.hidden.map((t) => (
                      <ThemeCard key={t.id} theme={t} onAction={act} />
                    ))}
                  </div>
                </details>
              ) : null}
            </>
          ) : rawPreview.length > 0 ? (
            rawPreview.map((q) => (
              <div className="q-row" key={q.id} style={{ marginBottom: 8 }}>
                <div className="q-text">
                  {q.text}
                  <div className="q-meta">
                    <StatusPill status={q.status} />
                    <span className="vote-score">score {q.score}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">No raw questions yet.</div>
          )}
        </section>
      </div>

      <details className="private-feedback fade-in d4" style={{ marginTop: 18 }}>
        <summary>
          <span className="pill needs-detail">private</span>
          Session feedback — visible only to presenter &amp; organizers
        </summary>
        <div className="pf-body">
          {feedback ? (
            <>
              <div className="stat-row" style={{ marginBottom: 14 }}>
                <div className="stat">
                  <div className="stat-num">{feedback.total}</div>
                  <div className="stat-label">Responses</div>
                </div>
                <div className="stat">
                  <div className="stat-num">{feedback.average ?? "–"}</div>
                  <div className="stat-label">Avg rating</div>
                </div>
              </div>
              <div style={{ maxWidth: 420 }}>
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = feedback.distribution?.[String(n)] ?? 0;
                  const max = Math.max(1, ...Object.values(feedback.distribution ?? {}).map(Number));
                  return (
                    <div className="meter-row" key={n}>
                      <span className="meter-label">{n} ★</span>
                      <span className="meter-track">
                        <span className="meter-fill" style={{ width: `${(count / max) * 100}%` }} />
                      </span>
                      <span className="meter-count">{count}</span>
                    </div>
                  );
                })}
              </div>
              <h3 style={{ marginTop: 16 }}>Recent comments</h3>
              {(feedback.recent_comments ?? []).length > 0 ? (
                (feedback.recent_comments as any[]).map((c, i) => (
                  <div className="q-row" key={i} style={{ marginBottom: 8 }}>
                    <div className="q-text">
                      {c.comment}
                      {c.rating != null && (
                        <div className="q-meta">
                          <span style={{ color: "var(--ink-muted)", fontSize: 13 }}>
                            {"★".repeat(c.rating)}{"☆".repeat(5 - c.rating)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="small muted">No comments yet.</p>
              )}
            </>
          ) : (
            <p className="small muted">Loading feedback…</p>
          )}
        </div>
      </details>
    </div>
  );
}
