import { useEffect, useState, type ReactNode, type MouseEvent } from "react";

export function usePath(): string {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

export function navigate(to: string) {
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function Link({
  to,
  children,
  className,
  ...rest
}: {
  to: string;
  children: ReactNode;
  className?: string;
  [key: string]: unknown;
}) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} onClick={onClick} className={className} {...rest}>
      {children}
    </a>
  );
}

export interface Route {
  name: string;
  params: Record<string, string>;
}

/** Match the current pathname against the app's route table. */
export function matchRoute(path: string): Route {
  const seg = path.replace(/\/+$/, "").split("/").filter(Boolean);
  const p = (i: number) => decodeURIComponent(seg[i] ?? "");

  if (seg.length === 0) return { name: "home", params: {} };
  if (seg[0] === "t" && seg.length === 2) return { name: "talk", params: { id: p(1) } };
  if (seg[0] === "admin") {
    if (seg.length === 1) return { name: "admin", params: {} };
    if (seg[1] === "dashboard") return { name: "admin", params: {} };
    if (seg[1] === "login-page") return { name: "login", params: {} };
    if (seg[1] === "talks" && seg.length >= 3) {
      const id = p(2);
      if (seg.length === 3) return { name: "control", params: { id } };
      if (seg[3] === "qr") return { name: "qr", params: { id } };
      if (seg[3] === "ai-run") return { name: "airun", params: { id } };
    }
  }
  return { name: "notfound", params: {} };
}
