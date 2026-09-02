"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Pack, Question } from "@/lib/api-types";

type Draft = Pick<Question, "text" | "answer" | "points">;

export function PackEditor({ pack }: { pack: Pack }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      pack.rounds.flatMap((round) =>
        round.questions.map((q) => [q.id, { text: q.text, answer: q.answer, points: q.points }])
      )
    )
  );
  const [saved, setSaved] = useState<Record<string, Draft>>(() => ({ ...drafts }));
  const [status, setStatus] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questionCount = useMemo(
    () => pack.rounds.reduce((sum, round) => sum + round.questions.length, 0),
    [pack.rounds]
  );

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    setStatus((current) => ({ ...current, [id]: "idle" }));
  }

  async function saveQuestion(id: string) {
    const draft = drafts[id];
    const previous = saved[id];
    if (!draft || !previous) return;
    if (draft.text === previous.text && draft.answer === previous.answer && draft.points === previous.points) {
      return;
    }
    if (!draft.text.trim() || !draft.answer.trim()) {
      setStatus((current) => ({ ...current, [id]: "error" }));
      return;
    }

    setStatus((current) => ({ ...current, [id]: "saving" }));
    const res = await fetch(`/api/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      setStatus((current) => ({ ...current, [id]: "error" }));
      return;
    }
    setSaved((current) => ({ ...current, [id]: draft }));
    setStatus((current) => ({ ...current, [id]: "saved" }));
  }

  async function startSession() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start session");
      router.push(`/host/${data.session.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start session");
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            <Link href="/packs" className="hover:text-foreground">
              Packs
            </Link>
            <span className="px-2">/</span>
            Editor
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{pack.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {pack.rounds.length} rounds · {questionCount} questions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/packs/${pack.id}/print`}
            className="inline-flex h-11 items-center rounded-xl border border-line bg-white px-4 text-sm font-semibold"
          >
            Print preview
          </Link>
          <button
            type="button"
            onClick={startSession}
            disabled={starting}
            className="inline-flex h-11 items-center rounded-xl bg-amber px-4 text-sm font-semibold text-white hover:bg-amber-hover disabled:opacity-50"
          >
            {starting ? "Starting…" : "Start live session"}
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      <div className="mt-8 space-y-8">
        {pack.rounds.map((round) => (
          <section key={round.id} className="paper-sheet rounded-xl border border-line p-5 sm:p-6">
            <div className="border-b border-line pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber">
                Round {round.index + 1}
              </p>
              <h2 className="mt-1 text-xl font-semibold">{round.title}</h2>
              <p className="text-sm text-muted">{round.category}</p>
            </div>

            <ul className="mt-5 space-y-6">
              {round.questions.map((question) => {
                const draft = drafts[question.id];
                const saveState = status[question.id] ?? "idle";
                return (
                  <li key={question.id} className="grid gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">Q{question.index + 1}</span>
                      <span className="text-xs text-muted">
                        {saveState === "saving"
                          ? "Saving…"
                          : saveState === "saved"
                            ? "Saved"
                            : saveState === "error"
                              ? "Couldn’t save"
                              : "Edits save on blur"}
                      </span>
                    </div>
                    <label className="block">
                      <span className="sr-only">Question text</span>
                      <textarea
                        value={draft.text}
                        onChange={(e) => updateDraft(question.id, { text: e.target.value })}
                        onBlur={() => saveQuestion(question.id)}
                        rows={2}
                        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base outline-none focus:ring-2 focus:ring-amber"
                      />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                          Answer
                        </span>
                        <input
                          value={draft.answer}
                          onChange={(e) => updateDraft(question.id, { answer: e.target.value })}
                          onBlur={() => saveQuestion(question.id)}
                          className="h-11 w-full rounded-lg border border-line bg-white px-3 text-base outline-none focus:ring-2 focus:ring-amber"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                          Points
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={draft.points}
                          onChange={(e) =>
                            updateDraft(question.id, { points: Number(e.target.value) || 1 })
                          }
                          onBlur={() => saveQuestion(question.id)}
                          className="h-11 w-full rounded-lg border border-line bg-white px-3 text-base outline-none focus:ring-2 focus:ring-amber"
                        />
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
