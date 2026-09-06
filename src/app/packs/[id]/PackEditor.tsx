"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Pack, Question, QuestionType } from "@/lib/api-types";
import { writeHostToken } from "@/lib/host-session";

type Draft = Pick<Question, "text" | "answer" | "points" | "type" | "options"> & {
  // Kept as the raw comma-separated text the host is typing, not a parsed
  // string[] — splitting on every keystroke would fight the host's typing
  // (e.g. trailing ", " while starting the next entry). Only split/cleaned
  // right before it goes into the PATCH request body, in saveQuestion.
  acceptableAnswersText: string;
};

function draftsEqual(a: Draft, b: Draft): boolean {
  return (
    a.text === b.text &&
    a.answer === b.answer &&
    a.points === b.points &&
    a.type === b.type &&
    a.acceptableAnswersText === b.acceptableAnswersText &&
    a.options.length === b.options.length &&
    a.options.every((o, i) => o === b.options[i])
  );
}

/** Same rule the PATCH route enforces server-side — checked here too so we
 * only attempt an immediate save (add/remove/mark-correct option) once the
 * draft is actually valid, instead of firing a network call that's certain
 * to 400 while the host is still mid-edit (e.g. a freshly added blank row). */
function isDraftSaveable(draft: Draft): boolean {
  if (!draft.text.trim() || !draft.answer.trim()) return false;
  if (draft.type === "MULTIPLE_CHOICE") {
    const cleaned = Array.from(new Set(draft.options.map((o) => o.trim()).filter(Boolean)));
    return cleaned.length >= 2 && cleaned.includes(draft.answer);
  }
  return true;
}

export function PackEditor({ pack }: { pack: Pack }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      pack.rounds.flatMap((round) =>
        round.questions.map((q) => [
          q.id,
          {
            text: q.text,
            answer: q.answer,
            points: q.points,
            type: q.type,
            options: q.options,
            acceptableAnswersText: q.acceptableAnswers.join(", "),
          },
        ])
      )
    )
  );
  const [saved, setSaved] = useState<Record<string, Draft>>(() => ({ ...drafts }));
  const [status, setStatus] = useState<Record<string, "idle" | "saving" | "saved" | "error">>({});
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "" means no timer (manual reveal) — kept as the default so a host who
  // never touches this still gets the exact behavior the app shipped with
  // before per-question timers existed.
  const [duration, setDuration] = useState("");

  const questionCount = useMemo(
    () => pack.rounds.reduce((sum, round) => sum + round.questions.length, 0),
    [pack.rounds]
  );

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
    setStatus((current) => ({ ...current, [id]: "idle" }));
  }

  /** For interactions that should save immediately (toggling type, adding /
   * removing / marking an option) rather than waiting for a blur — but only
   * once the resulting draft is actually valid, so mid-edit states never
   * flash an error. Takes the next draft explicitly rather than reading
   * `drafts[id]` back after a `setDrafts` call, since that state update
   * hasn't flushed yet when this runs. */
  function commit(id: string, patch: Partial<Draft>) {
    const next: Draft = { ...drafts[id], ...patch };
    setDrafts((current) => ({ ...current, [id]: next }));
    setStatus((current) => ({ ...current, [id]: "idle" }));
    if (isDraftSaveable(next)) void saveQuestion(id, next);
  }

  async function saveQuestion(id: string, override?: Draft) {
    const draft = override ?? drafts[id];
    const previous = saved[id];
    if (!draft || !previous) return;
    if (draftsEqual(draft, previous)) return;
    if (!isDraftSaveable(draft)) {
      setStatus((current) => ({ ...current, [id]: "error" }));
      return;
    }

    setStatus((current) => ({ ...current, [id]: "saving" }));
    const res = await fetch(`/api/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: draft.text,
        answer: draft.answer,
        points: draft.points,
        type: draft.type,
        options: draft.type === "MULTIPLE_CHOICE" ? draft.options.map((o) => o.trim()).filter(Boolean) : undefined,
        acceptableAnswers: draft.acceptableAnswersText
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
      }),
    });
    if (!res.ok) {
      setStatus((current) => ({ ...current, [id]: "error" }));
      return;
    }
    setSaved((current) => ({ ...current, [id]: draft }));
    setStatus((current) => ({ ...current, [id]: "saved" }));
  }

  function setQuestionType(id: string, type: QuestionType) {
    const draft = drafts[id];
    if (type === draft.type) return;
    if (type === "MULTIPLE_CHOICE") {
      // Seed with the current answer as the first (correct) option, plus one
      // blank slot to fill in — left as a local, unsaved edit until the host
      // fills that second option in (see isDraftSaveable). Alternate answers
      // don't apply once correctness is defined by an explicit option list
      // (the PATCH route clears them server-side too), so drop them here so
      // the UI doesn't show a stale value it's about to hide anyway.
      updateDraft(id, {
        type,
        options: draft.options.length >= 2 ? draft.options : [draft.answer, ""],
        acceptableAnswersText: "",
      });
    } else {
      // TEXT is always immediately valid (text/answer/points are unchanged),
      // so this one saves right away, clearing the now-irrelevant options.
      commit(id, { type, options: [] });
    }
  }

  function updateOption(id: string, optionIndex: number, text: string) {
    const draft = drafts[id];
    const wasCorrect = draft.options[optionIndex] === draft.answer;
    const nextOptions = draft.options.map((o, i) => (i === optionIndex ? text : o));
    updateDraft(id, { options: nextOptions, answer: wasCorrect ? text : draft.answer });
  }

  function markOptionCorrect(id: string, optionIndex: number) {
    const draft = drafts[id];
    commit(id, { answer: draft.options[optionIndex] });
  }

  function addOption(id: string) {
    const draft = drafts[id];
    if (draft.options.length >= 6) return;
    updateDraft(id, { options: [...draft.options, ""] });
  }

  function removeOption(id: string, optionIndex: number) {
    const draft = drafts[id];
    if (draft.options.length <= 2) return;
    const removedText = draft.options[optionIndex];
    const nextOptions = draft.options.filter((_, i) => i !== optionIndex);
    commit(id, { options: nextOptions, answer: removedText === draft.answer ? nextOptions[0] : draft.answer });
  }

  async function startSession() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: pack.id,
          questionDurationSeconds: duration ? Number(duration) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start session");
      writeHostToken(data.session.code, data.hostToken);
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
          <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight">{pack.title}</h1>
          <p className="mt-2 text-sm text-muted">
            {pack.rounds.length} rounds · {questionCount} questions
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/packs/${pack.id}/print`}
            className="inline-flex h-11 items-center rounded-xl border border-line bg-white px-4 text-sm font-semibold"
          >
            Print preview
          </Link>
          <label className="flex items-center gap-2 text-sm text-muted">
            <span className="sr-only">Per-question timer</span>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="h-11 rounded-xl border border-line bg-white px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-amber"
            >
              <option value="">No timer (manual reveal)</option>
              <option value="20">20s per question</option>
              <option value="30">30s per question</option>
              <option value="45">45s per question</option>
              <option value="60">60s per question</option>
            </select>
          </label>
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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold">Q{question.index + 1}</span>
                        <div className="flex rounded-lg border border-line bg-white p-0.5 text-xs font-medium">
                          <button
                            type="button"
                            onClick={() => setQuestionType(question.id, "TEXT")}
                            className={`rounded-md px-2.5 py-1 ${
                              draft.type === "TEXT" ? "bg-foreground text-background" : "text-muted"
                            }`}
                          >
                            Free text
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuestionType(question.id, "MULTIPLE_CHOICE")}
                            className={`rounded-md px-2.5 py-1 ${
                              draft.type === "MULTIPLE_CHOICE" ? "bg-foreground text-background" : "text-muted"
                            }`}
                          >
                            Multiple choice
                          </button>
                        </div>
                      </div>
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

                    {draft.type === "MULTIPLE_CHOICE" ? (
                      <div className="grid gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted">
                          Options — mark the correct one
                        </span>
                        {draft.options.map((option, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${question.id}`}
                              checked={option === draft.answer && option.trim().length > 0}
                              onChange={() => markOptionCorrect(question.id, i)}
                              disabled={!option.trim()}
                              className="h-4 w-4 accent-amber"
                              aria-label={`Option ${i + 1} is correct`}
                            />
                            <input
                              value={option}
                              onChange={(e) => updateOption(question.id, i, e.target.value)}
                              onBlur={() => saveQuestion(question.id)}
                              placeholder={`Option ${i + 1}`}
                              className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-amber"
                            />
                            <button
                              type="button"
                              onClick={() => removeOption(question.id, i)}
                              disabled={draft.options.length <= 2}
                              className="h-10 w-10 shrink-0 rounded-lg border border-line text-muted disabled:opacity-30"
                              aria-label={`Remove option ${i + 1}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addOption(question.id)}
                          disabled={draft.options.length >= 6}
                          className="mt-1 h-9 w-fit rounded-lg border border-dashed border-line px-3 text-xs font-semibold text-muted disabled:opacity-40"
                        >
                          + Add option
                        </button>
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                      {draft.type === "TEXT" ? (
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
                      ) : (
                        <div />
                      )}
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

                    {draft.type === "TEXT" ? (
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted">
                          Alternate answers (comma-separated)
                        </span>
                        <input
                          value={draft.acceptableAnswersText}
                          onChange={(e) => updateDraft(question.id, { acceptableAnswersText: e.target.value })}
                          onBlur={() => saveQuestion(question.id)}
                          placeholder="e.g. Leo, Leonardo"
                          className="h-11 w-full rounded-lg border border-line bg-white px-3 text-base outline-none focus:ring-2 focus:ring-amber"
                        />
                        <span className="mt-1 block text-xs text-muted">
                          Also scored correct alongside the answer above — nicknames, alternate spellings, etc.
                        </span>
                      </label>
                    ) : null}
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
