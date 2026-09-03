"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { ArrowRightIcon } from "@/components/icons";

const EXAMPLE =
  "A Friday-night pub quiz: four rounds covering 90s music, UK geography, movie quotes, and a picture-round-style general knowledge closer. Keep answers short and pub-friendly.";

export default function CreatePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState(EXAMPLE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotConfigured(false);
    try {
      const res = await fetch("/api/packs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotConfigured(res.status === 503);
        throw new Error(data.error ?? "Generation failed");
      }
      router.push(`/packs/${data.pack.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setBusy(false);
    }
  }

  async function useDemoPack() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/packs/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the demo pack");
      router.push(`/packs/${data.pack.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the demo pack");
      setBusy(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">Generate a quiz pack</h1>
        <p className="mt-2 text-muted">
          Tell the wizard what kind of night you are running. It will draft rounds, questions,
          answers, and points you can edit next.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-medium">Brief</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={8}
              maxLength={2000}
              className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-base leading-relaxed outline-none focus:ring-2 focus:ring-amber"
              required
            />
          </label>

          {error ? (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              <p>{error}</p>
              {notConfigured ? (
                <button
                  type="button"
                  onClick={useDemoPack}
                  disabled={busy}
                  className="group mt-2 inline-flex items-center gap-1.5 font-semibold underline underline-offset-2 disabled:opacity-50"
                >
                  Use the demo pack instead
                  <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              ) : null}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy || prompt.trim().length === 0}
            className="h-12 w-full rounded-xl bg-amber text-base font-semibold text-white hover:bg-amber-hover disabled:opacity-50 sm:w-auto sm:px-6"
          >
            {busy ? "Generating…" : "Generate pack"}
          </button>
        </form>
      </main>
    </>
  );
}
