import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { useQaStore, type PublicQuestion, type ThemeQuestion } from "./stores/qaStore";

function sidFromPath() { return location.pathname.split("/").filter(Boolean).at(-1) || ""; }
function fmt(ts?: number) { return ts ? new Date(ts * 1000).toLocaleTimeString() : ""; }
function Status({ value }: { value: string }) { return <span className={`pill ${value}`}>{value}</span>; }

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
function App() { const path = location.pathname; if (path.startsWith("/admin/talks/")) return <AdminPage/>; if (path.startsWith("/t/")) return <AttendeePage/>; return <main className="shell"><h1>DevDays Feedback</h1><p>Unsupported React route.</p></main>; }

createRoot(document.getElementById("root")!).render(<App />);
