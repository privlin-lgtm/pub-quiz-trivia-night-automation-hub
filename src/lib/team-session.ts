const STORAGE_KEY = "quiz-hub:team";

export type StoredTeam = {
  code: string;
  token: string;
  teamId: string;
  teamName: string;
};

export function readStoredTeam(): StoredTeam | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredTeam;
    if (!parsed.code || !parsed.token || !parsed.teamName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredTeam(team: StoredTeam) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
}

export function clearStoredTeam() {
  window.localStorage.removeItem(STORAGE_KEY);
}
