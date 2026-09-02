const STORAGE_KEY = "quiz-hub:host-tokens";

// Keyed by session code so a browser that has hosted more than one session
// tonight (or reloads mid-quiz) still has the right key for each.
type HostTokens = Record<string, string>;

function readAll(): HostTokens {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as HostTokens) : {};
  } catch {
    return {};
  }
}

export function readHostToken(code: string): string | null {
  return readAll()[code.toUpperCase()] ?? null;
}

export function writeHostToken(code: string, hostToken: string) {
  const all = readAll();
  all[code.toUpperCase()] = hostToken;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}
