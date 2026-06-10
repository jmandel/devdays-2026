import { useEffect, useState } from "react";
import { useApp } from "../store.ts";
import { Brand, SectionLabel } from "../components.tsx";
import { Link } from "../router.tsx";

export function QrPage({ id }: { id: string }) {
  const talk = useApp((s) => s.talk);
  const loadTalk = useApp((s) => s.loadTalk);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadTalk(id).catch(() => {});
  }, [id, loadTalk]);

  // Encodes ONLY the public attendee URL — never operator tokens.
  const attendeeUrl = `${window.location.origin}/t/${id}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=2&color=21303a&data=${encodeURIComponent(attendeeUrl)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(attendeeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="shell">
      <header className="topbar">
        <Brand sub="Join this room" />
      </header>

      <section className="card hero fade-in" style={{ textAlign: "center" }}>
        <SectionLabel>Scan to join</SectionLabel>
        <h1>{talk?.title ?? "…"}</h1>
        {talk?.presenter ? <p style={{ fontWeight: 600 }}>{talk.presenter}</p> : null}

        <div className="qr-frame">
          <img src={qrSrc} alt={`QR code linking to ${attendeeUrl}`} width={340} height={340} style={{ display: "block", maxWidth: "76vw", height: "auto" }} />
        </div>

        <p className="qr-url">{attendeeUrl}</p>

        <div className="row" style={{ justifyContent: "center", marginTop: 16 }}>
          <a className="btn" href={attendeeUrl} target="_blank" rel="noreferrer">
            Open public page ↗
          </a>
          <button className="btn" onClick={copy}>
            {copied ? "Copied ✓" : "Copy link"}
          </button>
          <Link className="btn quiet" to={`/admin/talks/${id}`}>
            Back to control room
          </Link>
        </div>
      </section>
    </div>
  );
}
