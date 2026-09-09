import Link from "next/link";
import { LiveScoreboardPreview } from "@/components/LiveScoreboardPreview";
import { ArrowRightIcon } from "@/components/icons";
import type { SVGProps } from "react";

function QuillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 4c-4.2 0-9.3 2-12.4 7.2-1.7 2.9-2.5 5.6-3.1 8.3 2.6-.5 5.4-1.3 8.3-3C17.9 13.4 20 8.3 20 4z" />
      <path d="M9 15 4 20" />
    </svg>
  );
}

function OpenBookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 5.5c2.2-.9 4.6-.9 7 0v13c-2.4-.9-4.8-.9-7 0z" />
      <path d="M20 5.5c-2.2-.9-4.6-.9-7 0v13c2.4-.9 4.8-.9 7 0z" />
    </svg>
  );
}

function PhoneLiveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="6.5" y="2.5" width="10" height="19" rx="2.2" />
      <path d="M10.5 18.2h2" />
      <path d="M19 8.5c1 1 1 3.5 0 4.5" />
    </svg>
  );
}

const steps = [
  {
    href: "/create",
    icon: QuillIcon,
    title: "Generate",
    body: "Describe the rounds and topics you want, and let AI build a complete quiz pack.",
    cta: "Open the wizard",
  },
  {
    href: "/packs",
    icon: OpenBookIcon,
    title: "Edit & print",
    body: "Fine-tune rounds and questions, then export presenter scripts and PDF answer sheets.",
    cta: "View packs",
  },
  {
    href: "/play",
    icon: PhoneLiveIcon,
    title: "Run it live",
    body: "On your phone at the venue? Enter the session code the host gives you and start answering.",
    cta: "Join a session",
  },
];

export default function Home() {
  return (
    <>
      {/* The homepage opens on its own dark "stage" — the same surface the
          live host desk and team portal use — with the nav folded into it,
          rather than the paper-toned SiteHeader every other page shares.
          That header is the app's admin chrome; this is the one moment
          meant to feel like the room itself. */}
      <div className="bg-stage text-stage-fg">
        <div className="mx-auto w-full max-w-5xl px-5 pt-7">
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-stage-muted">
              <QuillIcon className="h-4 w-4 shrink-0" />
              Pub Quiz Hub
            </span>
            <nav className="flex items-center gap-6 text-sm font-medium text-stage-muted">
              <Link href="/create" className="transition-colors hover:text-gold">Generate</Link>
              <Link href="/packs" className="transition-colors hover:text-gold">Manage</Link>
              <Link href="/play" className="transition-colors hover:text-gold">Play</Link>
            </nav>
          </div>

          <main className="pt-16 pb-20 sm:pt-20 sm:pb-24">
            <p className="chalk-script inline-block -rotate-2 text-2xl leading-none text-gold">
              Trivia night, wired up
            </p>
            <h1 className="mt-3 max-w-xl font-serif text-5xl font-semibold leading-[1.03] tracking-tight text-balance sm:text-6xl">
              Pub Quiz <em className="font-medium italic text-gold">Automation</em> Hub
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-stage-muted">
              Describe the rounds you want and AI builds the pack. Print the presenter script and
              answer sheets, then run the night live while every team&apos;s phone lights up with
              the question.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/create"
                className="inline-flex h-12 items-center rounded-lg bg-gold px-5 text-sm font-semibold text-stage transition-transform hover:-translate-y-px"
              >
                Generate a quiz pack
              </Link>
              <Link
                href="/play"
                className="group inline-flex h-12 items-center gap-1.5 rounded-lg border border-white/15 px-5 text-sm font-semibold transition-colors hover:border-gold hover:text-gold"
              >
                Join as a team
                <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <LiveScoreboardPreview />
          </main>
        </div>
      </div>

      {/* Handoff seam: the stage fades to the bright prep-desk below it. */}
      <div className="h-8 bg-gradient-to-b from-[var(--stage-deep)] to-background sm:h-10" />

      <div className="bg-background text-foreground">
        <main className="mx-auto w-full max-w-5xl px-5 pb-20 sm:pb-24">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber">The prep desk</p>
          <h2 className="mt-2 max-w-lg font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Three steps <em className="font-medium italic text-amber">before</em> the room fills up
          </h2>

          <div className="mt-11 grid gap-5 sm:grid-cols-3">
            {steps.map((step, i) => (
              <Link
                key={step.href}
                href={step.href}
                className="paper-sheet group relative block rounded-xl border border-line p-6 pt-8 transition-transform hover:-translate-y-1"
              >
                <span className="absolute -top-3 left-6 inline-flex items-center rounded bg-amber px-2 py-1 font-mono text-[0.68rem] font-semibold tracking-wide text-white shadow-sm">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <step.icon className="h-6 w-6 text-amber" />
                <h3 className="mt-4 font-serif text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.body}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-amber">
                  {step.cta}
                  <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
