import { createHash, randomBytes } from "node:crypto";

export const now = (): number => Math.floor(Date.now() / 1000);

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function randomId(prefix: string, bytes = 6): string {
  return `${prefix}_${randomBytes(bytes).toString("hex")}`;
}

export function randomToken(prefix: string, bytes = 18): string {
  return `${prefix}_${randomBytes(bytes).toString("hex")}`;
}

export function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function normalizedHash(s: string): string {
  return sha256(normalizeWhitespace(s).toLowerCase());
}

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "do", "does", "did", "can",
  "could", "will", "would", "should", "of", "to", "in", "on", "for", "and",
  "or", "with", "about", "what", "when", "how", "why", "who", "you", "your",
  "this", "that", "it", "be", "we", "i",
]);

export function tokenSet(s: string): Set<string> {
  const tokens = normalizeWhitespace(s)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  return new Set(tokens);
}

/** Jaccard similarity over content tokens; 0..1. */
export function similarity(a: string, b: string): number {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (sa.size === 0 || sb.size === 0) {
    return normalizeWhitespace(a).toLowerCase() === normalizeWhitespace(b).toLowerCase() ? 1 : 0;
  }
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return inter / (sa.size + sb.size - inter);
}

export function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function clampText(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  const t = normalizeWhitespace(s);
  return t.length > max ? t.slice(0, max) : t;
}
