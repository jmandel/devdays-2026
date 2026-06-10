import { useEffect, useState } from "react";
import { useApp } from "../store.ts";
import {
  Brand,
  ConnBadge,
  PULSE_OPTIONS,
  QuestionRow,
  SectionLabel,
  StatusPill,
} from "../components.tsx";

function PulseCheck({ talkId }: { talkId: string }) {
  const sendPulse = useApp((s) => s.sendPulse);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const tap = async (value: string) => {
    try {
      await sendPulse(talkId, value);
      setStatus({ ok: true, msg: `Sent — “${value}”` });
    } catch {
      setStatus({ ok: false, msg: "Couldn’t send that. Try again?" });
    }
  };

  return (
    <section className="card fade-in d1">
      <SectionLabel tone="teal">Live pulse check</SectionLabel>
      <h2>How is this landing right now?</h2>
      <p className="small muted">One tap, no typing. Send again any time it changes.</p>
      <div className="pulse-grid" style={{ marginTop: 12 }}>
        {PULSE_OPTIONS.map((opt) => (
          <button key={opt.value} className="pulse-btn" onClick={() => tap(opt.value)}>
            <span className={`pulse-glyph ${opt.cls}`} />
            {opt.value}
          </button>
        ))}
      </div>
      {status ? <p className={`form-status ${status.ok ? "" : "err"}`}>{status.msg}</p> : null}
    </section>
  );
}

function PublicQa({ talkId }: { talkId: string }) {
  const talk = useApp((s) => s.talk);
  const publicQa = useApp((s) => s.publicQa);
  const submitQuestion = useApp((s) => s.submitQuestion);
  const vote = useApp((s) => s.vote);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});

  const open = !!talk?.qa_enabled && talk?.qa_state === "open";
  const speaker = talk?.presenter || "the speaker";

  const handleVote = async (qid: string, value: number) => {
    try {
      const res = await vote(talkId, qid, value);
      setMyVotes((prev) => ({ ...prev, [qid]: res.my_vote }));
    } catch {}
  };

  const submit = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const { duplicate } = await submitQuestion(talkId, text);
      setText("");
      setStatus({
        ok: true,
        msg: duplicate
          ? "You already asked that one — it’s in the queue."
          : "Queued. It will appear in the room stream shortly.",
      });
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : "Submission failed." });
    } finally {
      setBusy(false);
    }
  };

  const activeQs = (publicQa?.questions ?? []).filter((q) => q.status !== "answered");
  const answeredQs = (publicQa?.questions ?? []).filter((q) => q.status === "answered");

  return (
    <section className="card fade-in d2">
      <div className="row between">
        <SectionLabel>Public Q&amp;A</SectionLabel>
        <StatusPill status={open ? "open" : "closed"} />
      </div>
      <h2>Ask the room</h2>
      <p className="small muted">
        Questions are public to everyone in the room. Tap 👍 to show support.
      </p>
      {open ? (
        <div style={{ marginTop: 12 }}>
          <label className="field-label" htmlFor="question">
            Your question for {speaker}
          </label>
          <textarea
            id="question"
            maxLength={1000}
            value={text}
            placeholder="What would you like to ask?"
            onChange={(e) => setText(e.target.value)}
          />
          <div className="char-hint">{text.length}/1000</div>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn primary" disabled={busy || text.trim().length === 0} onClick={submit}>
              Submit question
            </button>
          </div>
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 12 }}>
          Questions are closed right now.
        </div>
      )}
      {status ? <p className={`form-status ${status.ok ? "" : "err"}`}>{status.msg}</p> : null}

      <h3 style={{ marginTop: 22 }}>Questions from the room</h3>
      {activeQs.length > 0 ? (
        <div className="q-list">
          {activeQs.map((q) => (
            <QuestionRow key={q.id} q={q} myVote={myVotes[q.id]} onVote={handleVote} />
          ))}
        </div>
      ) : (
        <div className="empty" style={{ marginTop: 10 }}>
          No questions yet — be the first to ask.
        </div>
      )}
      {answeredQs.length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary className="small muted" style={{ cursor: "pointer" }}>
            ✅ {answeredQs.length} answered question{answeredQs.length !== 1 ? "s" : ""}
          </summary>
          <div className="q-list" style={{ marginTop: 8, opacity: 0.7 }}>
            {answeredQs.map((q) => (
              <QuestionRow key={q.id} q={q} myVote={myVotes[q.id]} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function PrivateFeedback({ talkId }: { talkId: string }) {
  const talk = useApp((s) => s.talk);
  const submitFeedback = useApp((s) => s.submitFeedback);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const speaker = talk?.presenter || "the speaker";

  const submit = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await submitFeedback(talkId, { rating, comment });
      setRating(null);
      setComment("");
      setStatus({ ok: true, msg: "Thank you — feedback sent." });
    } catch (e) {
      setStatus({ ok: false, msg: e instanceof Error ? e.message : "Couldn’t send feedback." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card fade-in d3">
      <SectionLabel tone="amber">Private feedback</SectionLabel>
      <h2>Feedback for {speaker}</h2>
      <p className="small muted">
        Private to the presenter and organizers — it never appears in the room.
      </p>
      <div style={{ marginTop: 14 }}>
        <label className="field-label">How useful was this session? (1–5)</label>
        <div className="rating-scale" role="radiogroup" aria-label="Usefulness rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={rating === n}
              className={`rating-dot ${rating === n ? "on" : ""}`}
              onClick={() => setRating(rating === n ? null : n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <label className="field-label" htmlFor="fb-comment">
          What is one thing {speaker} should keep, change, or clarify?
        </label>
        <textarea
          id="fb-comment"
          maxLength={2000}
          value={comment}
          placeholder="Optional, but very welcome"
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button
          className="btn primary"
          disabled={busy || (rating === null && comment.trim().length === 0)}
          onClick={submit}
        >
          Send feedback
        </button>
      </div>
      {status ? <p className={`form-status ${status.ok ? "" : "err"}`}>{status.msg}</p> : null}
    </section>
  );
}

export function TalkPage({ id }: { id: string }) {
  const talk = useApp((s) => s.talk);
  const conn = useApp((s) => s.conn);
  const loadTalk = useApp((s) => s.loadTalk);
  const loadPublicQa = useApp((s) => s.loadPublicQa);
  const connect = useApp((s) => s.connect);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    loadTalk(id).catch(() => setMissing(true));
    loadPublicQa(id).catch(() => {});
    const cleanup = connect(id);
    return cleanup;
  }, [id, loadTalk, loadPublicQa, connect]);

  if (missing) {
    return (
      <div className="shell">
        <header className="topbar">
          <Brand />
        </header>
        <div className="empty">This room doesn’t exist. Check the link or QR code.</div>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="topbar">
        <Brand />
        <ConnBadge state={conn} />
      </header>

      <section className="card hero fade-in">
        <h1>{talk?.title ?? "…"}</h1>
        {talk?.presenter ? <p style={{ fontWeight: 600, margin: "4px 0" }}>{talk.presenter}</p> : null}
        {talk?.description ? <p className="small muted">{talk.description}</p> : null}
        {talk?.slides_url ? (
          <a className="btn" style={{ marginTop: 8 }} href={talk.slides_url} target="_blank" rel="noreferrer">
            Open slides ↗
          </a>
        ) : null}
      </section>

      <PulseCheck talkId={id} />
      <PublicQa talkId={id} />
      <PrivateFeedback talkId={id} />
    </div>
  );
}
