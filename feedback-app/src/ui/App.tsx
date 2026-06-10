import { matchRoute, usePath, Link } from "./router.tsx";
import { Brand } from "./components.tsx";
import { HomePage } from "./pages/Home.tsx";
import { TalkPage } from "./pages/Talk.tsx";
import { AdminGate, LoginPage } from "./pages/Admin.tsx";
import { ControlRoomPage } from "./pages/ControlRoom.tsx";
import { QrPage } from "./pages/QrPage.tsx";
import { AiRunPage } from "./pages/AiRun.tsx";

function NotFound() {
  return (
    <div className="shell">
      <header className="topbar">
        <Brand />
      </header>
      <div className="empty" style={{ marginTop: 60 }}>
        That page doesn’t exist.{" "}
        <Link to="/" style={{ color: "var(--flame-deep)" }}>
          Back to rooms
        </Link>
      </div>
    </div>
  );
}

export function App() {
  const path = usePath();
  const route = matchRoute(path);

  let page;
  switch (route.name) {
    case "home":
      page = <HomePage />;
      break;
    case "talk":
      page = <TalkPage id={route.params.id!} key={route.params.id} />;
      break;
    case "admin":
      page = <AdminGate />;
      break;
    case "login":
      page = <LoginPage />;
      break;
    case "control":
      page = <ControlRoomPage id={route.params.id!} key={route.params.id} />;
      break;
    case "qr":
      page = <QrPage id={route.params.id!} key={route.params.id} />;
      break;
    case "airun":
      page = <AiRunPage id={route.params.id!} key={route.params.id} />;
      break;
    default:
      page = <NotFound />;
  }

  return (
    <>
      <div className="accent-rail" />
      {page}
    </>
  );
}
