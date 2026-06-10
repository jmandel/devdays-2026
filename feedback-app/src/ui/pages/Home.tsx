import { useEffect } from "react";
import { useApp } from "../store.ts";
import { Brand, SectionLabel } from "../components.tsx";
import { Link } from "../router.tsx";

export function HomePage() {
  const rooms = useApp((s) => s.rooms);
  const loadRooms = useApp((s) => s.loadRooms);

  useEffect(() => {
    loadRooms().catch(() => {});
  }, [loadRooms]);

  return (
    <div className="shell">
      <header className="topbar">
        <Brand />
        <Link to="/admin" className="btn quiet small">
          Operator login
        </Link>
      </header>

      <section className="card hero fade-in">
        <SectionLabel>Choose a room</SectionLabel>
        <h1>Choose a room</h1>
        <p className="muted">
          Each room's public page includes slides, live Q&amp;A, and private feedback for the
          presenter.
        </p>
      </section>

      {rooms === null ? (
        <div className="empty fade-in d1">Loading rooms…</div>
      ) : rooms.length === 0 ? (
        <div className="empty fade-in d1">
          No rooms are open right now. Check back when the next session starts.
        </div>
      ) : (
        rooms.map((room, i) => (
          <section className={`card fade-in d${Math.min(i + 1, 4)}`} key={room.id}>
            <div className="room-card">
              <div className="room-info">
                <h2>{room.title}</h2>
                {room.presenter ? <p className="small" style={{ margin: "2px 0" }}>{room.presenter}</p> : null}
                {room.description ? <p className="small muted" style={{ margin: "2px 0 8px" }}>{room.description}</p> : null}
              </div>
              <Link to={`/t/${room.id}`} className="btn primary">
                Open room
              </Link>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
