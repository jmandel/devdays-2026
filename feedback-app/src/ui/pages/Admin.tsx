import { useEffect, useState } from "react";
import { useApp } from "../store.ts";
import { Brand, SectionLabel, StatusPill } from "../components.tsx";
import { Link, navigate } from "../router.tsx";
import { postJSON } from "../api.ts";

export function LoginPage() {
  const error = new URLSearchParams(window.location.search).get("error");
  return (
    <div className="shell">
      <header className="topbar">
        <Brand sub="Operators" />
      </header>
      <section className="card hero fade-in" style={{ maxWidth: 460, margin: "40px auto" }}>
        <SectionLabel>Operator key required</SectionLabel>
        <h1>Operator login</h1>
        <p className="small muted">
          Enter the organizer key, or open the capability link you were sent for your room.
        </p>
        {error ? (
          <p className="form-status err">
            {error === "invalid-key"
              ? "That key didn’t match. Try again."
              : `Access problem: ${error.replace(/-/g, " ")}.`}
          </p>
        ) : null}
        <form method="post" action="/admin/login" style={{ marginTop: 14 }}>
          <label className="field-label" htmlFor="key">
            Admin key
          </label>
          <input id="key" name="key" type="password" autoComplete="current-password" required />
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" type="submit">
              Unlock dashboard
            </button>
            <Link to="/" className="btn quiet">
              Back to rooms
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}

function CreateRoomForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [presenter, setPresenter] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [operatorLink, setOperatorLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await postJSON("/api/admin/sessions", { title, presenter, description });
      setOperatorLink(res.operator?.claim_url ?? null);
      setStatus(`Room ${res.session.id} created.`);
      onCreated(res.session.id);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to create room.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card fade-in d2">
      <SectionLabel tone="teal">Create a room</SectionLabel>
      <h2>New talk room</h2>
      <div style={{ marginTop: 10 }}>
        <label className="field-label">Title (required)</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </div>
      <div style={{ marginTop: 10 }}>
        <label className="field-label">Presenter</label>
        <input type="text" value={presenter} onChange={(e) => setPresenter(e.target.value)} maxLength={120} />
      </div>
      <div style={{ marginTop: 10 }}>
        <label className="field-label">Description / date &amp; time</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn primary" onClick={submit} disabled={busy || title.trim().length === 0}>
          Create room
        </button>
      </div>
      {status ? <p className="form-status">{status}</p> : null}
      {operatorLink ? (
        <p className="small" style={{ marginTop: 8 }}>
          Presenter capability link (share privately): <code style={{ overflowWrap: "anywhere" }}>{operatorLink}</code>
        </p>
      ) : null}
    </section>
  );
}

export function DashboardPage() {
  const adminData = useApp((s) => s.adminData);
  const loadAdminSessions = useApp((s) => s.loadAdminSessions);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    loadAdminSessions().catch(() => setDenied(true));
  }, [loadAdminSessions]);

  if (denied) return <LoginPage />;

  const totals = adminData?.totals;

  return (
    <div className="shell wide">
      <header className="topbar">
        <Brand sub="Organizer dashboard" />
        <form method="post" action="/logout">
          <button className="btn quiet small" type="submit">
            Log out
          </button>
        </form>
      </header>

      <section className="card hero fade-in">
        <SectionLabel>Overview</SectionLabel>
        <div className="stat-row">
          <div className="stat">
            <div className="stat-num">{totals?.talks ?? "–"}</div>
            <div className="stat-label">Talks</div>
          </div>
          <div className="stat">
            <div className="stat-num">{totals?.active_talks ?? "–"}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat">
            <div className="stat-num">{totals?.feedback_total ?? "–"}</div>
            <div className="stat-label">Feedback responses</div>
          </div>
        </div>
      </section>

      <CreateRoomForm onCreated={(id) => navigate(`/admin/talks/${id}`)} />

      <section className="card fade-in d3">
        <SectionLabel tone="amber">Rooms</SectionLabel>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Presenter</th>
                <th>Q&amp;A</th>
                <th>Feedback</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(adminData?.sessions ?? []).map((s: any) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.title}</strong>
                    <br />
                    <span className="room-id">{s.id}</span>
                  </td>
                  <td>{s.presenter ?? "—"}</td>
                  <td>
                    <StatusPill status={s.qa_state === "open" ? "open" : "closed"} />
                  </td>
                  <td>{s.feedback_count}</td>
                  <td>
                    <div className="row">
                      <Link className="btn small" to={`/admin/talks/${s.id}`}>
                        Control room
                      </Link>
                      <Link className="btn small quiet" to={`/t/${s.id}`}>
                        Attendee page
                      </Link>
                      <Link className="btn small quiet" to={`/admin/talks/${s.id}/qr`}>
                        QR
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function AdminGate() {
  const me = useApp((s) => s.me);
  const loadMe = useApp((s) => s.loadMe);

  useEffect(() => {
    loadMe().catch(() => {});
  }, [loadMe]);

  if (me === null) {
    return (
      <div className="shell">
        <div className="empty" style={{ marginTop: 60 }}>
          Checking access…
        </div>
      </div>
    );
  }
  if (me.authenticated && me.scope === "global_admin") return <DashboardPage />;
  if (me.authenticated && me.scope === "room_admin" && me.session_id) {
    navigate(`/admin/talks/${me.session_id}`);
    return null;
  }
  return <LoginPage />;
}
