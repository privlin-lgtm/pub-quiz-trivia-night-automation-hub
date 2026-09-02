"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Scoreboard } from "@/components/Scoreboard";
import { StatusBadge } from "@/components/StatusBadge";
import { readHostToken, writeHostToken } from "@/lib/host-session";
import type { HostSessionState, HostTeam } from "@/lib/api-types";

export function HostDashboard({ code }: { code: string }) {
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [pastedToken, setPastedToken] = useState("");
  const [state, setState] = useState<HostSessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // localStorage isn't available during SSR, so the real value can only be
    // read after mount — reading it via a lazy useState initializer instead
    // would make the client's first render diverge from the server-rendered
    // HTML (a hydration mismatch). Deferring to an effect, gated by
    // `hydrated`, keeps the first paint identical on server and client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHostToken(readHostToken(code));
    setHydrated(true);
  }, [code]);

  const refresh = useCallback(async () => {
    if (!hostToken) return;
    try {
      const res = await fetch(`/api/sessions/${code}?as=host&hostToken=${encodeURIComponent(hostToken)}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setError("This browser's host key was rejected for this session.");
          setHostToken(null);
          return;
        }
        setError(data.error ?? "Could not load session");
        return;
      }
      setError(null);
      setState(data);
    } catch {
      setError("Lost connection to the session. Retrying…");
    }
  }, [code, hostToken]);

  useEffect(() => {
    if (!hostToken) return;
    // Standard fetch-on-mount-and-interval polling: refresh() sets state
    // asynchronously after its own await, not synchronously in this body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const id = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(id);
  }, [refresh, hostToken]);

  async function advance(action: "start" | "reveal" | "next") {
    if (!hostToken) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sessions/${code}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, hostToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not advance");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not advance");
    } finally {
      setBusy(false);
    }
  }

  async function overrideAnswer(team: HostTeam, isCorrect: boolean) {
    if (!team.currentAnswer || !state?.question || !hostToken) return;
    await fetch(`/api/sessions/${code}/answers/${team.currentAnswer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCorrect, points: state.question.points, hostToken }),
    });
    await refresh();
  }

  function submitPastedToken(event: React.FormEvent) {
    event.preventDefault();
    const value = pastedToken.trim();
    if (!value) return;
    writeHostToken(code, value);
    setHostToken(value);
    setError(null);
  }

  if (!hydrated) {
    return <div className="min-h-full bg-stage" />;
  }

  if (!hostToken) {
    return (
      <div className="flex min-h-full items-center justify-center bg-stage px-5 text-stage-fg">
        <div className="w-full max-w-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Host desk</p>
          <h1 className="mt-2 text-2xl font-bold">Host key needed</h1>
          <p className="mt-2 text-stage-muted">
            This browser doesn&apos;t have host access for session {code}. If you started this
            session here, try reopening it from the pack editor. Otherwise paste the host key
            you were given when the session was created.
          </p>
          {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          <form onSubmit={submitPastedToken} className="mt-6 flex gap-2">
            <input
              value={pastedToken}
              onChange={(e) => setPastedToken(e.target.value)}
              placeholder="Host key"
              className="h-12 flex-1 rounded-xl border border-white/15 bg-white px-3 text-sm text-stage outline-none focus:ring-2 focus:ring-gold"
            />
            <button
              type="submit"
              className="h-12 rounded-xl bg-gold px-4 text-sm font-semibold text-stage disabled:opacity-40"
              disabled={!pastedToken.trim()}
            >
              Use key
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex min-h-full items-center justify-center bg-stage text-stage-muted">
        {error ?? "Loading host desk…"}
      </div>
    );
  }

  const submitted = state.teams.filter((team) => team.currentAnswer).length;
  const nextLabel =
    state.roundNumber >= state.totalRounds && state.questionNumber >= state.totalQuestionsInRound
      ? "End quiz"
      : "Next question";

  return (
    <div className="min-h-full bg-stage text-stage-fg">
      <header className="border-b border-white/10 px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gold">Host desk</p>
            <h1 className="mt-1 text-xl font-semibold">{state.packTitle}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={state.status} dark />
            <div className="rounded-xl bg-gold px-4 py-2 text-stage">
              <p className="text-[10px] font-semibold uppercase tracking-wider">Team code</p>
              <p className="font-mono text-2xl font-bold tracking-[0.2em]">{state.code}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-6 sm:px-8 lg:grid-cols-[1.4fr_1fr]">
        {error ? <p className="lg:col-span-2 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p> : null}

        <section className="rounded-2xl bg-white/5 p-5 sm:p-6">
          {state.status === "LOBBY" ? (
            <>
              <h2 className="text-2xl font-bold">Waiting for teams</h2>
              <p className="mt-2 text-stage-muted">
                Share the code. Start when everyone is in — late joiners can still arrive during the lobby.
              </p>
              <button
                type="button"
                onClick={() => advance("start")}
                disabled={busy || state.teams.length === 0}
                className="mt-6 h-14 w-full rounded-xl bg-gold text-base font-semibold text-stage disabled:opacity-40"
              >
                {state.teams.length === 0 ? "Waiting for the first team" : "Start quiz"}
              </button>
            </>
          ) : null}

          {state.status === "QUESTION_ACTIVE" || state.status === "REVEAL" ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                Round {state.roundNumber} of {state.totalRounds}
                {state.round ? ` · ${state.round.title}` : ""}
              </p>
              <p className="mt-1 text-sm text-stage-muted">
                Question {state.questionNumber} of {state.totalQuestionsInRound}
                {state.question ? ` · ${state.question.points} pt` : ""}
              </p>
              <h2 className="mt-4 text-2xl font-bold leading-snug sm:text-3xl">
                {state.question?.text ?? "No question loaded"}
              </h2>
              {state.question?.answer ? (
                <p className="mt-4 rounded-xl bg-emerald-500/15 px-4 py-3 font-semibold text-emerald-200">
                  Answer: {state.question.answer}
                </p>
              ) : (
                <p className="mt-4 text-sm text-stage-muted">Answer stays hidden until you reveal.</p>
              )}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {state.status === "QUESTION_ACTIVE" ? (
                  <button
                    type="button"
                    onClick={() => advance("reveal")}
                    disabled={busy}
                    className="h-14 flex-1 rounded-xl bg-gold text-base font-semibold text-stage disabled:opacity-40"
                  >
                    Reveal answer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => advance("next")}
                    disabled={busy}
                    className="h-14 flex-1 rounded-xl bg-gold text-base font-semibold text-stage disabled:opacity-40"
                  >
                    {nextLabel}
                  </button>
                )}
              </div>
            </>
          ) : null}

          {state.status === "ENDED" ? (
            <>
              <h2 className="text-3xl font-bold">That’s the night</h2>
              <p className="mt-2 text-stage-muted">Final scores are on the right. Thanks for hosting.</p>
            </>
          ) : null}
        </section>

        <aside className="space-y-6">
          <section className="rounded-2xl bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">Live submissions</h3>
              <span className="text-sm text-stage-muted">
                {submitted}/{state.teams.length}
              </span>
            </div>
            {state.status === "LOBBY" || state.status === "ENDED" ? (
              <ul className="mt-4 space-y-2">
                {state.teams.length === 0 ? (
                  <li className="text-sm text-stage-muted">No teams yet.</li>
                ) : (
                  state.teams.map((team) => (
                    <li key={team.id} className="rounded-lg bg-white/5 px-3 py-2.5">
                      {team.name}
                    </li>
                  ))
                )}
              </ul>
            ) : (
              <ul className="mt-4 space-y-2">
                {state.teams.map((team) => (
                  <li key={team.id} className="rounded-lg bg-white/5 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">{team.name}</p>
                        <p className="mt-1 truncate text-sm text-stage-muted">
                          {team.currentAnswer?.text ?? "Waiting…"}
                        </p>
                      </div>
                      {team.currentAnswer ? (
                        <span
                          className={`shrink-0 text-xs font-semibold ${
                            team.currentAnswer.isCorrect ? "text-emerald-300" : "text-red-300"
                          }`}
                        >
                          {team.currentAnswer.isCorrect ? `+${team.currentAnswer.pointsAwarded}` : "0"}
                        </span>
                      ) : null}
                    </div>
                    {team.currentAnswer && (state.status === "REVEAL" || state.status === "QUESTION_ACTIVE") ? (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => overrideAnswer(team, true)}
                          className="h-10 rounded-lg bg-emerald-600/80 text-sm font-semibold"
                        >
                          Correct
                        </button>
                        <button
                          type="button"
                          onClick={() => overrideAnswer(team, false)}
                          className="h-10 rounded-lg bg-red-600/70 text-sm font-semibold"
                        >
                          Wrong
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-white/5 p-5">
            <h3 className="mb-3 font-semibold">Scoreboard</h3>
            <Scoreboard rows={state.scoreboard} dark />
          </section>
        </aside>

        <p className="lg:col-span-2 text-center text-sm text-stage-muted">
          Teams join at{" "}
          <Link href="/play" className="text-gold underline-offset-2 hover:underline">
            /play
          </Link>
        </p>
      </main>
    </div>
  );
}
