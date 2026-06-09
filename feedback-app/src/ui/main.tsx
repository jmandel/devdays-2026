import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { useQaStore, type PublicQuestion, type ThemeQuestion } from "./stores/qaStore";

function sidFromPath() { const parts = location.pathname.split("/").filter(Boolean); const qa = parts.indexOf("qa"); return qa > 0 ? parts[qa - 1] : (parts.at(-1) || ""); }
function fmt(ts?: number) { return ts ? new Date(ts * 1000).toLocaleTimeString() : ""; }
function Status({ value }: { value: string }) { return <span className={`pill ${value}`}>{value}</span>; }


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
  return <main className="shell"><div className="top"><div><div className="brand">DevDays Feedback</div><h1>Admin dashboard</h1></div><form method="POST" action="/logout"><button className="btn">logout</button></form></div>{msg && <div className="notice">{msg}</div>}<section className="grid"><div className="card"><div className="eyebrow">Overview</div><h2>{totals?.sessions ?? 0} talks</h2><p className="muted">{totals?.active ?? 0} active · {totals?.feedback ?? 0} feedback responses</p></div><form className="card" onSubmit={submit}><div className="eyebrow">Create talk</div><h2>New room</h2><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Title" required/><input style={{marginTop:10}} value={presenter} onChange={e=>setPresenter(e.target.value)} placeholder="Presenter"/><textarea style={{marginTop:10}} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description / room context"/><button className="btn primary" style={{marginTop:10,width:"100%"}}>Create</button></form></section><section className="card"><div className="eyebrow">Talks</div><h2>Rooms</h2>{adminSessions?.sessions.length ? adminSessions.sessions.map(s => <div className="q" key={s.id}><div className="spread"><div><strong>{s.title}</strong><p className="muted">{s.presenter} · {s.feedback_count} feedback</p></div><Status value={s.qa_state}/></div><div className="row"><a className="btn primary" href={`/admin/talks/${s.id}`}>control room</a><a className="btn outline" href={`/t/${s.id}`} target="_blank">attendee</a><a className="btn" href={`/admin/talks/${s.id}/qr`}>QR</a></div></div>) : <p className="muted">No talks yet.</p>}</section></main>;
}

function LoginPage() {
  return <main className="shell"><section className="card" style={{maxWidth:520, margin:"64px auto"}}><div className="eyebrow">Admin console locked</div><h1>Enter operator key</h1><form method="POST" action="/admin/login"><input type="password" name="key" autoComplete="current-password" autoFocus required/><button className="btn primary" style={{width:"100%", marginTop:12}}>unlock console</button></form></section></main>;
}

function SlidesPage() {
  const id = sidFromPath();
  const { talk, slidesPayload, connection, loadTalk, loadSlides, connect, disconnect } = useQaStore();
  useEffect(() => { loadTalk(id); loadSlides(id).catch(()=>{}); connect(id); const t = setInterval(()=>loadSlides(id).catch(()=>{}), 10000); return () => { clearInterval(t); disconnect(); }; }, [id]);
  const qs = slidesPayload?.questions || [];
  return <main className="shell" style={{maxWidth:1100}}><div className="top"><div><div className="eyebrow">Projector Q&A</div><h1>{talk?.title || id}</h1></div><Status value={connection}/></div><section className="card"><h2>Audience questions</h2>{qs.length ? qs.slice(0,8).map((q,i)=><div className="q" key={q.id} style={{fontSize:"1.25rem"}}><div className="muted">#{i+1} support={q.support_count}</div><strong>{q.text}</strong></div>) : <p className="muted">No questions yet.</p>}</section></main>;
}

function AttendeePage() {
  const id = sidFromPath();
  const { talk, publicPayload, connection, loadTalk, loadPublic, connect, disconnect, submitQuestion, vote, feedback, pulse, error } = useQaStore();
  const [question, setQuestion] = useState("");
  const [status, setStatus] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState("");
  useEffect(() => { loadTalk(id); loadPublic(id).catch(()=>{}); connect(id); return disconnect; }, [id]);
  const qaOpen = publicPayload?.session.qa_state === "open" || talk?.qa_state === "open";
  const qs = publicPayload?.questions || [];
  const quick = ["following", "confused", "too fast", "great demo", "need example"];
  const fbTags = ["useful", "clear", "too much", "want more demos", "good pace", "more depth"];
  async function onSubmit(e: React.FormEvent) { e.preventDefault(); if (!question.trim()) return; setStatus("submitting…"); try { await submitQuestion(id, question); setQuestion(""); setStatus("queued"); } catch(e) { setStatus((e as Error).message); } }
  async function onFeedback(e: React.FormEvent) { e.preventDefault(); setStatus("sending feedback…"); try { await feedback(id, { rating: rating ? Number(rating) : null, sentiment: null, comment, tags }); setComment(""); setTags([]); setRating(""); setStatus("feedback sent"); } catch(e) { setStatus((e as Error).message); } }
  return <main className="phone">
    <div className="top"><div className="brand">DevDays Feedback</div><Status value={connection}/></div>
    {error && <div className="notice">{error}</div>}
    <section className="card"><div className="eyebrow">Talk</div><h1>{talk?.title || id}</h1>{talk?.presenter && <p className="muted">{talk.presenter}</p>}{talk?.description && <p>{talk.description}</p>}{talk?.slides_url ? <a className="btn primary" href={talk.slides_url} target="_blank">Open slides</a> : <p className="muted">Slides link coming soon.</p>}</section>
    <section className="card"><div className="eyebrow">Pulse check</div><h2>How are you feeling right now?</h2><div className="row">{quick.map(v => <button key={v} className="chip" onClick={() => pulse(id, v).catch(()=>{})}>{v}</button>)}</div></section>
    <section className="card"><div className="spread"><div><div className="eyebrow">Questions</div><h2>Ask a question</h2></div><Status value={qaOpen ? "open" : "closed"}/></div>{qaOpen ? <form onSubmit={onSubmit}><textarea value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1000} placeholder="Ask a concise question for the presenter…"/><button className="btn primary" style={{width:"100%",marginTop:8}}>Submit question</button></form> : <p className="muted">Questions are closed right now.</p>}{status && <p className="muted">{status}</p>}<h3>Questions from the room</h3>{qs.length ? qs.map(q => <PublicQuestionRow key={q.id} q={q} onVote={(v)=>vote(id,q.id,v).catch(e=>setStatus((e as Error).message))}/>) : <p className="muted">No questions yet.</p>}</section>
    <form className="card" onSubmit={onFeedback}><div className="eyebrow">Session feedback</div><h2>Share feedback</h2><label>Overall rating</label><select value={rating} onChange={e=>setRating(e.target.value)}><option value="">No rating</option><option value="5">5 - excellent</option><option value="4">4 - good</option><option value="3">3 - okay</option><option value="2">2 - rough</option><option value="1">1 - poor</option></select><div className="row" style={{marginTop:12}}>{fbTags.map(t=><button type="button" key={t} className={`chip ${tags.includes(t)?"selected":""}`} onClick={()=>setTags(tags.includes(t)?tags.filter(x=>x!==t):[...tags,t])}>{t}</button>)}</div><textarea style={{marginTop:12}} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Optional: what should the presenter know?"/><button className="btn primary" style={{width:"100%",marginTop:8}}>Send feedback</button></form>
  </main>;
}
function PublicQuestionRow({ q, onVote }: { q: PublicQuestion; onVote: (v: 1|-1)=>void }) { return <div className="q"><div className="spread"><strong>{q.text}</strong><Status value={q.answered ? "answered" : q.status}/></div><div className="meta"><span>score={q.support_count}</span><span>{fmt(q.created_at)}</span>{q.theme_id && <span>group={q.theme_id}</span>}{!q.answered && <><button className="btn outline" onClick={()=>onVote(1)}>▲</button><button className="btn outline" onClick={()=>onVote(-1)}>▼</button></>}</div></div>; }

function AdminPage() {
  const id = sidFromPath();
  const { talk, presenterPayload, connection, loadTalk, loadPresenter, connect, disconnect, setQaState, action, runAgent, error } = useQaStore();
  const [msg, setMsg] = useState("");
  useEffect(() => { loadTalk(id); loadPresenter(id).catch(e=>setMsg((e as Error).message)); connect(id); return disconnect; }, [id]);
  const themes = useMemo(() => presenterPayload?.themes || presenterPayload?.questions || [], [presenterPayload]);
  const qaState = presenterPayload?.session.qa_state || talk?.qa_state || "unknown";
  async function call(p: Promise<void>) { try { setMsg("working…"); await p; setMsg("updated"); } catch(e) { setMsg((e as Error).message); } }
  if (msg === "unauthorized" || error === "unauthorized") return <main className="shell"><section className="card"><div className="eyebrow">Room console locked</div><h1>Operator access required</h1><p className="muted">Use the room capability link or unlock the admin console first.</p><a className="btn primary" href="/admin">Open admin login</a></section></main>;
  return <main className="shell"><div className="top"><div><div className="brand">DevDays Control Room</div><h1>{talk?.title || id}</h1><p className="muted">{talk?.presenter}</p></div><Status value={connection}/></div>{error && <div className="notice">{error}</div>}{msg && <div className="notice">{msg}</div>}<section className="card"><div className="spread"><div><div className="eyebrow">Q&A state</div><h2>{qaState}</h2></div><div className="row"><button className="btn success" onClick={()=>call(setQaState(id,"open"))}>accept</button><button className="btn warn" onClick={()=>call(setQaState(id,"paused"))}>pause</button><button className="btn danger" onClick={()=>call(setQaState(id,"closed"))}>close</button><button className="btn outline" onClick={()=>call(runAgent(id))}>run agent</button><a className="btn" href={`/admin/talks/${id}/ai-run`}>AI runs</a><a className="btn" href={`/t/${id}`} target="_blank">attendee</a><a className="btn" href={`/slides/t/${id}/qa`} target="_blank">slides QA</a><a className="btn" href={`/admin/talks/${id}/export`}>export CSV</a></div></div></section><section className="card"><div className="eyebrow">Synthesized themes</div><h2>Presenter queue</h2>{themes.length ? themes.map(q => <ThemeRow key={q.id} q={q} onAction={(a)=>call(action(id,q.id,a))}/>) : <p className="muted">No live themes yet. Submit audience questions or run the agent.</p>}</section></main>;
}
function ThemeRow({ q, onAction }: { q: ThemeQuestion; onAction: (a:string)=>void }) { return <div className="q"><div className="spread"><div><strong>{q.text}</strong><div className="meta"><span>score={q.support_count}</span><span>sources={q.source_count ?? "?"}</span><span>priority={q.priority}</span><span>{fmt(q.created_at)}</span></div></div><Status value={q.status}/></div><div className="row" style={{marginTop:10}}>{q.status !== "pinned" ? <button className="btn outline" onClick={()=>onAction("pin")}>pin</button> : <button className="btn outline" onClick={()=>onAction("unpin")}>unpin</button>}<button className="btn success" onClick={()=>onAction("answer")}>answered</button><button className="btn danger" onClick={()=>onAction("hide")}>hide</button>{["hidden","answered"].includes(q.status) && <button className="btn" onClick={()=>onAction("restore")}>restore</button>}</div></div>; }
function App() { const path = location.pathname; if (path === "/admin/login-page") return <LoginPage/>; if (path === "/admin" || path === "/admin/dashboard") return <AdminDashboard/>; if (path.startsWith("/admin/talks/")) return <AdminPage/>; if (path.startsWith("/slides/t/") || path.startsWith("/slides/s/") || path.startsWith("/embed/t/") || path.startsWith("/embed/s/")) return <SlidesPage/>; if (path.startsWith("/t/")) return <AttendeePage/>; return <main className="shell"><h1>DevDays Feedback</h1><p>Unsupported React route.</p></main>; }

createRoot(document.getElementById("root")!).render(<App />);
