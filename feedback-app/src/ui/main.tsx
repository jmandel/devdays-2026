import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { useQaStore, type PublicQuestion, type ThemeQuestion } from "./stores/qaStore";

function sidFromPath() { const parts = location.pathname.split("/").filter(Boolean); const qa = parts.indexOf("qa"); return qa > 0 ? parts[qa - 1] : (parts.at(-1) || ""); }
function adminTalkIdFromPath() { const parts = location.pathname.split("/").filter(Boolean); const i = parts.indexOf("talks"); return i >= 0 ? (parts[i + 1] || "") : sidFromPath(); }
function fmt(ts?: number) { return ts ? new Date(ts * 1000).toLocaleTimeString() : ""; }
function Status({ value }: { value: string }) {
  const isLive = value === "live";
  return <span className={`pill ${value}${isLive ? " live-signal" : ""}`}><span>{value}</span></span>;
}


type Room = { id: string; title: string; presenter: string; description: string };

function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/talks").then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))).then(data => setRooms(data.rooms || [])).catch(e => setError((e as Error).message)); }, []);
  return <main className="shell"><section className="card public-rooms"><div className="eyebrow">DevDays Feedback</div><h1>Choose a room</h1><p className="muted">Open the public page for slides, live Q&A, and private feedback.</p>{error && <div className="notice">{error}</div>}{rooms.length ? rooms.map(room => <div className="q room-card" key={room.id}><div className="room-card-main"><strong className="room-card-title">{room.title}</strong>{room.presenter && <p className="muted">{room.presenter}</p>}{room.description && <p className="muted">{room.description}</p>}<p className="muted">Room: <code>{room.id}</code></p></div><div className="room-card-action"><a className="btn primary" href={`/t/${room.id}`}>Open room</a></div></div>) : <p className="muted empty-state">No public rooms are open right now.</p>}<div className="mt-24"><a className="btn quiet" href="/admin">Operator login</a></div></section></main>;
}

function AiRunPage() {
  const id = adminTalkIdFromPath();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`/api/admin/talks/${id}/ai-run.json`, { headers: { Accept: "application/json" } }).then(async r => { const d = await r.json().catch(()=>({})); if (!r.ok) throw new Error(d.message || d.error || `HTTP ${r.status}`); return d; }).then(setData).catch(e => setError((e as Error).message)); }, [id]);
  return <main className="shell ai-log"><section className="card"><div className="eyebrow">AI run audit</div><h1>{data?.talk?.title || id}</h1>{error && <div className="notice">{error}</div>}{!error && !data && <p className="muted">Loading…</p>}{data && !data.run && <p className="muted empty-state">No AI/Codex runs have been recorded for this talk yet.</p>}{data?.run && <><p className="muted">Latest recorded question-processing run.</p><div className="meta"><span>run={data.run.id}</span><span>status={data.run.status}</span><span>started={new Date(data.run.started_at * 1000).toLocaleString()}</span>{data.run.finished_at && <span>finished={new Date(data.run.finished_at * 1000).toLocaleString()}</span>}</div>{data.run.summary && <p><strong>Summary:</strong> {data.run.summary}</p>}{data.run.error && <p className="notice"><strong>Error:</strong> {data.run.error}</p>}</>}<a className="btn outline" href={`/admin/talks/${id}`}>Back to control room</a></section>{data?.run && <><section className="card"><h2>Raw input</h2><p className="muted">{data.input?.label}</p>{data.input?.content ? <pre>{data.input.content}</pre> : <p className="muted">No raw input content available.</p>}</section><section className="card"><h2>{data.output?.content ? "Raw Codex output" : "Codex output"}</h2><p className="muted">{data.output?.label}</p>{data.output?.content ? <pre>{data.output.content}</pre> : <p className="muted">No Codex output was written for this run. The app used fallback processing instead.</p>}</section></>}</main>;
}


function AdminDashboard() {
  const { adminSessions, loadAdminSessions, createSession } = useQaStore();
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState("");
  const [presenter, setPresenter] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => { loadAdminSessions().catch(e => setMsg((e as Error).message)); }, []);
  if (msg === "unauthorized") return <main className="shell"><section className="card"><div className="eyebrow">Admin locked</div><h1>Operator key required</h1><p className="muted">Unlock the admin console to manage talks.</p><a className="btn primary" href="/admin/login-page">Open login</a></section></main>;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try { const id = await createSession({ title, presenter, description }); location.href = `/admin/talks/${id}`; }
    catch (e) { setMsg((e as Error).message); }
  }
  const totals = adminSessions?.totals;
  return <main className="shell"><div className="top"><div><div className="brand">DevDays Feedback</div><h1>Admin dashboard</h1></div><form method="POST" action="/logout"><button className="btn">logout</button></form></div>{msg && <div className="notice">{msg}</div>}<section className="grid"><div className="card"><div className="eyebrow">Overview</div><h2>{totals?.sessions ?? 0} talks</h2><p className="muted">{totals?.active ?? 0} active · {totals?.feedback ?? 0} feedback responses</p></div><form className="card" onSubmit={submit}><div className="eyebrow">Create talk</div><h2>New room</h2><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" required/><input style={{marginTop:10}} value={presenter} onChange={e=>setPresenter(e.target.value)} placeholder="Presenter"/><textarea style={{marginTop:10}} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description / room context"/><button className="btn primary" style={{marginTop:10,width:"100%"}}>Create</button></form></section><section className="card"><div className="eyebrow">Talks</div><h2>Rooms</h2>{adminSessions?.sessions.length ? adminSessions.sessions.map(s => <div className="q" key={s.id}><div className="spread"><div><strong>{s.title}</strong><p className="muted">{s.presenter} · {s.feedback_count} feedback</p></div><Status value={s.qa_state}/></div><div className="row"><a className="btn primary" href={`/admin/talks/${s.id}`}>control room</a><a className="btn outline" href={`/t/${s.id}`} target="_blank" rel="noopener">attendee</a><a className="btn" href={`/admin/talks/${s.id}/qr`}>QR</a></div></div>) : <p className="muted">No talks yet.</p>}</section></main>;
}

function LoginPage() {
  return <main className="shell"><section className="card" style={{maxWidth:520, margin:"64px auto"}}><div className="eyebrow">Admin console locked</div><h1>Enter operator key</h1><form method="POST" action="/admin/login"><input type="password" name="key" autoComplete="current-password" autoFocus required/><button className="btn primary" style={{width:"100%", marginTop:12}}>unlock console</button></form></section></main>;
}

function SlidesPage() {
  const id = sidFromPath();
  const { talk, slidesPayload, publicPayload, feedbackSummary, connection, loadTalk, loadSlides, loadPublic, loadFeedbackSummary, connect, disconnect } = useQaStore();
  const [mode, setMode] = useState<"themes" | "raw">("themes");
  useEffect(() => { loadTalk(id); loadSlides(id).catch(()=>{}); loadPublic(id).catch(()=>{}); loadFeedbackSummary(id).catch(()=>{}); connect(id); const t = setInterval(()=>{ loadSlides(id).catch(()=>{}); loadPublic(id).catch(()=>{}); loadFeedbackSummary(id).catch(()=>{}); }, 30000); return () => { clearInterval(t); disconnect(); }; }, [id]);
  const themes = slidesPayload?.questions || [];
  const raw = publicPayload?.questions || [];
  const pulseOptions = ["I’m with you", "I’m confused", "Too fast", "Too slow"];
  const pulseTotal = feedbackSummary?.pulse.total ?? 0;
  return <main className="shell projector live-room display-room" style={{maxWidth:1200}}><div className="top display-hero"><div><div className="eyebrow">Live room view</div><h1>{talk?.title || id}</h1></div><Status value={connection}/></div>
    <section className="card pulse-compact signal-card display-panel room-signal-panel"><div className="spread room-pulse-head"><div><h2>Room pulse</h2><p className="muted">How this is landing right now · last 5 minutes</p></div><strong className="pulse-total">{pulseTotal} pulse{pulseTotal === 1 ? "" : "s"}</strong></div><div className="pulse-row">{pulseOptions.map(option => { const count = feedbackSummary?.pulse.counts[option] ?? 0; const pct = pulseTotal ? Math.round((count / pulseTotal) * 100) : 0; return <div className="pulse-chip" key={option}><span>{option}</span><strong>{count}</strong><div className="mini-bar"><span style={{width:`${pct}%`}} /></div></div>; })}</div></section>
    <section className="card display-panel themes-panel"><div className="spread"><div><h2>{mode === "themes" ? "Top audience themes" : "Raw audience questions"}</h2><p className="muted">{mode === "themes" ? "Presenter-ready themes synthesized from live audience questions." : "Unedited public question stream."}</p></div><div className="segmented" role="group" aria-label="Live view mode"><button type="button" aria-pressed={mode === "themes"} onClick={()=>setMode("themes")}>Themes</button><button type="button" aria-pressed={mode === "raw"} onClick={()=>setMode("raw")}>Raw questions</button></div></div>{mode === "themes" ? <div className="theme-grid projector-themes">{themes.length ? themes.slice(0,5).map((q,i)=><div className="theme-card" key={q.id}><div className="muted">Theme {i+1} · {q.source_count ?? 1} source{(q.source_count ?? 1) === 1 ? "" : "s"} · score {q.support_count}</div><strong>{q.text}</strong></div>) : <p className="muted empty-state projector-empty">No themes yet — questions will appear here as the room submits them.</p>}</div> : <div>{raw.length ? raw.slice(0,8).map((q,i)=><div className="q secondary" key={q.id}><div className="muted">#{i+1} · {q.status} · score {q.support_count}</div><strong>{q.text}</strong></div>) : <p className="muted empty-state projector-empty">No raw questions yet.</p>}</div>}</section></main>;
}

function RoomQrPage() {
  const id = adminTalkIdFromPath();
  const { talk, loadTalk, error } = useQaStore();
  const [copied, setCopied] = useState(false);
  useEffect(() => { loadTalk(id); }, [id]);
  const attendeeUrl = new URL(`/t/${id}`, location.origin).href;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=760x760&margin=18&data=${encodeURIComponent(attendeeUrl)}`;
  async function copy() {
    await navigator.clipboard?.writeText(attendeeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }
  return <main className="shell qr-page">
    <section className="card qr-card signal-card">
      <div className="qr-title"><div className="eyebrow">Scan for public Q&A + feedback</div><h1>{talk?.title || id}</h1>{talk?.presenter && <p className="muted">{talk.presenter}</p>}</div>
      {error && <div className="notice">{error}</div>}
      <div className="qr-frame"><img src={qrUrl} alt={`QR code for ${attendeeUrl}`} /></div>
      <p className="qr-url">{attendeeUrl}</p>
      <div className="row qr-actions"><a className="btn outline" href={`/t/${id}`} target="_blank" rel="noopener">Open public page</a><button className="btn" type="button" onClick={copy}>{copied ? "Copied" : "Copy link"}</button><a className="btn quiet" href={`/admin/talks/${id}`}>Back to control room</a></div>
    </section>
  </main>;
}

function AttendeePage() {
  const id = sidFromPath();
  const { talk, publicPayload, connection, loadTalk, loadPublic, connect, disconnect, submitQuestion, vote, feedback, pulse, error } = useQaStore();
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState("");
  const [pulseStatus, setPulseStatus] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState("");
  useEffect(() => { loadTalk(id); loadPublic(id).catch(()=>{}); connect(id); return disconnect; }, [id]);
  const qaOpen = publicPayload?.session.qa_state === "open" || talk?.qa_state === "open";
  const qs = publicPayload?.questions || [];
  const speakerName = talk?.presenter?.trim() || "the speaker";
  const pulses = ["I’m with you", "I’m confused", "Too fast", "Too slow"];
  const ratingOptions = [[1,"Not useful"],[2,"Slightly useful"],[3,"Moderately useful"],[4,"Very useful"],[5,"Extremely useful"]] as const;
  const selectedRating = ratingOptions.find(([value]) => String(value) === rating);
  async function sendPulse(value: string) { setPulseStatus("sending…"); try { await pulse(id, value); setPulseStatus(`sent: ${value}`); } catch(e) { setPulseStatus((e as Error).message); } }
  async function onSubmit(e: React.FormEvent) { e.preventDefault(); if (!question.trim()) return; setStatus("submitting…"); try { await submitQuestion(id, question); setQuestion(""); setStatus("queued"); } catch(e) { setStatus((e as Error).message); } }
  async function onFeedback(e: React.FormEvent) { e.preventDefault(); setStatus("sending feedback…"); try { await feedback(id, { rating: rating ? Number(rating) : null, comment, tags: [] }); setComment(""); setRating(""); setStatus("feedback sent"); } catch(e) { setStatus((e as Error).message); } }
  return <main className="phone">
    <div className="top"><div className="brand">DevDays Feedback</div><Status value={connection}/></div>
    {error && <div className="notice">{error}</div>}
    <section className="card"><div className="eyebrow">Talk</div><h1>{talk?.title || id}</h1>{talk?.presenter && <p className="muted">{talk.presenter}</p>}{talk?.description && <p>{talk.description}</p>}{talk?.slides_url ? <a className="btn outline" href={talk.slides_url} target="_blank" rel="noopener">Open slides</a> : <p className="muted">Slides link coming soon.</p>}</section>
    <section className="card pulse-card signal-card" aria-labelledby="pulse-heading"><div className="eyebrow">Live pulse check</div><h2 id="pulse-heading">How is this landing right now?</h2><p className="muted">Tap any time. No text required.</p><div className="choice-grid">{pulses.map(v => <button type="button" key={v} className="chip tap" onClick={() => sendPulse(v)}>{v}</button>)}</div>{pulseStatus && <p className="muted" role="status">{pulseStatus}</p>}</section>
    <section className="card"><div className="spread"><div><div className="eyebrow">Public Q&A</div><h2>Ask a public question</h2></div><Status value={qaOpen ? "open" : "closed"}/></div>{qaOpen ? <form onSubmit={onSubmit}><label htmlFor="questionText">Your question for {speakerName}</label><textarea id="questionText" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1000} placeholder="Ask a concise question for the presenter…"/><button className="btn primary" style={{width:"100%",marginTop:8}}>Submit question</button></form> : <p className="muted">Questions are closed right now.</p>}{status && <p className="muted" role="status">{status}</p>}<h3>Questions from the room</h3>{qs.length ? qs.map(q => <PublicQuestionRow key={q.id} q={q} onVote={(v)=>vote(id,q.id,v).catch(e=>setStatus((e as Error).message))}/>) : <p className="muted">No questions yet.</p>}</section>
    <form className="card" onSubmit={onFeedback} aria-labelledby="feedback-heading"><div className="eyebrow">Private feedback to presenter</div><h2 id="feedback-heading">Private feedback to {speakerName}</h2><p className="muted">Private to the presenter/organizer, separate from Public Q&A.</p><fieldset><legend>How useful was this session for you?</legend><div className="rating-scale">{ratingOptions.map(([value,label])=><label key={value} className={`rating-option ${rating===String(value)?"selected":""}`}><input type="radio" name="rating" value={value} aria-label={`${value} · ${label}`} checked={rating===String(value)} onChange={e=>setRating(e.target.value)}/><span>{value}</span><small>{label}</small></label>)}</div>{selectedRating && <p className="muted rating-help" role="status">Selected: {selectedRating[1]}</p>}</fieldset><label htmlFor="feedbackComment">What is one thing {speakerName} should keep, change, or clarify?</label><textarea id="feedbackComment" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Optional"/><button className="btn primary" style={{width:"100%",marginTop:8}}>Send feedback</button></form>
  </main>;
}
function PublicQuestionRow({ q, onVote }: { q: PublicQuestion; onVote: (v: 1|-1)=>void }) { return <div className="q"><div className="spread"><strong>{q.text}</strong><Status value={q.answered ? "answered" : q.status}/></div><div className="meta"><span>score={q.support_count}</span><span>{fmt(q.created_at)}</span>{q.theme_id && <span>group={q.theme_id}</span>}{!q.answered && <><button className="btn outline" onClick={()=>onVote(1)}>▲</button><button className="btn outline" onClick={()=>onVote(-1)}>▼</button></>}</div></div>; }

function AdminPage() {
  const id = sidFromPath();
  const { talk, presenterPayload, publicPayload, feedbackSummary, connection, loadTalk, loadPresenter, loadPublic, loadFeedbackSummary, connect, disconnect, action, error } = useQaStore();
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState<"themes" | "raw">("themes");
  useEffect(() => {
    loadTalk(id);
    loadPresenter(id).catch(e=>setMsg((e as Error).message));
    loadPublic(id).catch(()=>{});
    loadFeedbackSummary(id).catch(()=>{});
    connect(id);
    const t = setInterval(()=>{ loadPresenter(id).catch(()=>{}); loadPublic(id).catch(()=>{}); loadFeedbackSummary(id).catch(()=>{}); }, 30000);
    return () => { clearInterval(t); disconnect(); };
  }, [id]);
  const themes = useMemo(() => presenterPayload?.themes || presenterPayload?.questions || [], [presenterPayload]);
  const raw = publicPayload?.questions || [];
  const pulseOptions = ["I’m with you", "I’m confused", "Too fast", "Too slow"];
  const pulseTotal = feedbackSummary?.pulse.total ?? 0;
  const ratingLabels: Record<string, string> = { "1": "Not useful", "2": "Slightly useful", "3": "Moderately useful", "4": "Very useful", "5": "Extremely useful" };
  async function call(p: Promise<void>) { try { setMsg("working…"); await p; await loadFeedbackSummary(id).catch(()=>{}); setMsg("updated"); } catch(e) { setMsg((e as Error).message); } }
  if (msg === "unauthorized" || error === "unauthorized") return <main className="shell"><section className="card"><div className="eyebrow">Room console locked</div><h1>Operator access required</h1><p className="muted">Use the room capability link or unlock the admin console first.</p><a className="btn primary" href="/admin">Open admin login</a></section></main>;
  return <main className="shell projector live-room display-room control-room" style={{maxWidth:1200}}>
    <div className="top display-hero control-hero"><div><div className="brand">DevDays Control Room</div><h1>{talk?.title || id}</h1>{talk?.presenter && <p className="muted">{talk.presenter}</p>}</div></div>
    {error && <div className="notice">{error}</div>}{msg && <div className="notice">{msg}</div>}
    <section className="card ops-card"><div className="spread admin-action-panel"><div><div className="eyebrow">Live room view</div><h2>Audience signal and Q&A</h2><p className="muted">Safe for a shared screen: pulse and audience themes stay visible; private feedback is collapsed below.</p></div><div className="admin-primary-action"><a className="btn primary" href={`/admin/talks/${id}/qr`}>Show big QR code</a><details className="utility-menu"><summary>More options</summary><div className="admin-utilities" aria-label="Control room utilities"><a href={`/t/${id}`} target="_blank" rel="noopener">Open public page</a><a href={`/admin/talks/${id}/ai-run`}>AI processing log</a><a href={`/admin/talks/${id}/export`}>Export CSV</a></div></details></div></div></section>
    <section className="card pulse-compact signal-card display-panel room-signal-panel"><div className="spread room-pulse-head"><div><h2>Room pulse</h2><p className="muted">How this is landing right now · last 5 minutes</p></div><strong className="pulse-total">{pulseTotal} pulse{pulseTotal === 1 ? "" : "s"}</strong></div><div className="pulse-row">{pulseOptions.map(option => { const count = feedbackSummary?.pulse.counts[option] ?? 0; const pct = pulseTotal ? Math.round((count / pulseTotal) * 100) : 0; return <div className="pulse-chip" key={option}><span>{option}</span><strong>{count}</strong><div className="mini-bar"><span style={{width:`${pct}%`}} /></div></div>; })}</div></section>
    <section className="card display-panel themes-panel"><div className="spread"><div><h2>{mode === "themes" ? "Top audience themes" : "Raw audience questions"}</h2><p className="muted">{mode === "themes" ? "Presenter-ready themes synthesized from live audience questions." : "Unedited public question stream."}</p></div><div className="segmented" role="group" aria-label="Live view mode"><button type="button" aria-pressed={mode === "themes"} onClick={()=>setMode("themes")}>Themes</button><button type="button" aria-pressed={mode === "raw"} onClick={()=>setMode("raw")}>Raw questions</button></div></div>{mode === "themes" ? <div className="theme-grid projector-themes">{themes.length ? themes.slice(0,5).map((q,i)=><div className="theme-card" key={q.id}><div className="muted">Theme {i+1} · {q.source_count ?? 1} source{(q.source_count ?? 1) === 1 ? "" : "s"} · score {q.support_count}</div><strong>{q.text}</strong><div className="row theme-actions">{q.status !== "pinned" ? <button className="btn outline" onClick={()=>call(action(id,q.id,"pin"))}>pin</button> : <button className="btn outline" onClick={()=>call(action(id,q.id,"unpin"))}>unpin</button>}<button className="btn success" onClick={()=>call(action(id,q.id,"answer"))}>answered</button><button className="btn danger" onClick={()=>call(action(id,q.id,"hide"))}>hide</button></div></div>) : <div className="empty-state raw-preview"><p>No presenter-ready themes yet{raw.length ? ` — ${raw.length} raw submission${raw.length === 1 ? "" : "s"} waiting for a clearer theme.` : " — questions will appear here as the room submits them."}</p>{raw.length > 0 && <div className="raw-preview-list">{raw.slice(0,4).map((q,i)=><div className="raw-preview-item" key={q.id}><span>#{i+1} · {q.status}</span><strong>{q.text}</strong></div>)}</div>}</div>}</div> : <div>{raw.length ? raw.slice(0,8).map((q,i)=><div className="q secondary" key={q.id}><div className="muted">#{i+1} · {q.status} · score {q.support_count}</div><strong>{q.text}</strong></div>) : <p className="muted empty-state projector-empty">No raw questions yet.</p>}</div>}</section>
    <details className="card private-feedback-details"><summary><span className="private-summary-title"><span className="eyebrow">Private</span><strong>Feedback map</strong></span><span className="muted private-summary-note">Expand only when not sharing the screen</span></summary><div className="private-feedback-body"><h2>Live pulse and session feedback</h2><p className="muted">Private to the presenter/organizer.</p><h3>Session usefulness</h3>{feedbackSummary ? <div>{["5","4","3","2","1"].map(value => { const count = feedbackSummary.session_feedback.rating_distribution[value] ?? 0; const max = Math.max(1, ...Object.values(feedbackSummary.session_feedback.rating_distribution)); return <div className="metric-row" key={value}><strong>{value} · {ratingLabels[value]}</strong><div className="bar" aria-label={`${ratingLabels[value]}: ${count}`}><span style={{width:`${Math.round((count / max) * 100)}%`}} /></div><span>{count}</span></div>; })}</div> : null}<h3>Comments</h3>{feedbackSummary?.session_feedback.comments.length ? feedbackSummary.session_feedback.comments.map(c => <div className="q" key={c.id}><div className="meta"><span>{fmt(c.submitted_at)}</span>{c.rating && <span>{c.rating}/5</span>}{c.tags.map(t => <span className="chip" key={t}>{t}</span>)}</div>{c.comment && <p>{c.comment}</p>}</div>) : <p className="muted empty-state">No session feedback comments yet.</p>}</div></details>
  </main>;
}
function ThemeRow({ q, onAction }: { q: ThemeQuestion; onAction: (a:string)=>void }) { return <div className="q"><div className="spread"><div><strong>{q.text}</strong><div className="meta"><span>score {q.support_count}</span><span>{q.source_count ?? "?"} source{(q.source_count ?? 0) === 1 ? "" : "s"}</span><span>priority={q.priority}</span><span>{fmt(q.created_at)}</span></div></div><Status value={q.status}/></div><div className="row" style={{marginTop:10}}>{q.status !== "pinned" ? <button className="btn outline" onClick={()=>onAction("pin")}>pin</button> : <button className="btn outline" onClick={()=>onAction("unpin")}>unpin</button>}<button className="btn success" onClick={()=>onAction("answer")}>answered</button><button className="btn danger" onClick={()=>onAction("hide")}>hide</button>{["hidden","answered"].includes(q.status) && <button className="btn" onClick={()=>onAction("restore")}>restore</button>}</div></div>; }
function App() { const path = location.pathname; if (path === "/") return <RoomsPage/>; if (path === "/admin/login-page") return <LoginPage/>; if (path === "/admin" || path === "/admin/dashboard") return <AdminDashboard/>; if (/^\/admin\/talks\/[^/]+\/qr$/.test(path)) return <RoomQrPage/>; if (/^\/admin\/talks\/[^/]+\/ai-run$/.test(path)) return <AiRunPage/>; if (path.startsWith("/admin/talks/")) return <AdminPage/>; if (path.startsWith("/slides/t/") || path.startsWith("/slides/s/") || path.startsWith("/embed/t/") || path.startsWith("/embed/s/")) return <SlidesPage/>; if (path.startsWith("/t/")) return <AttendeePage/>; return <main className="shell"><h1>DevDays Feedback</h1><p>Unsupported React route.</p></main>; }

createRoot(document.getElementById("root")!).render(<App />);
