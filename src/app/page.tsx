import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
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

const cards = [
  {
    href: "/create",
    icon: QuillIcon,
    title: "Generate a quiz pack",
    body: "Describe the rounds and topics you want, and let AI build a complete quiz pack.",
    cta: "Open the wizard",
  },
  {
    href: "/packs",
    icon: OpenBookIcon,
    title: "Manage your packs",
    body: "Edit rounds and questions, then export presenter scripts and PDF sheets.",
    cta: "View packs",
  },
  {
    href: "/play",
    icon: PhoneLiveIcon,
    title: "Join as a team",
    body: "On your phone at the venue? Enter the session code the host gives you.",
    cta: "Join a session",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-16 sm:py-24">
        <p className="rule-brass text-sm font-semibold uppercase tracking-[0.2em] text-amber">
          Trivia night, wired up
        </p>
        <h1 className="mt-7 max-w-2xl font-serif text-5xl font-semibold tracking-tight sm:text-6xl">
          Pub Quiz <em className="text-amber font-medium italic">Automation</em> Hub
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">
          Generate a complete pub quiz pack with AI, print presenter scripts and answer sheets,
          and run the night live with teams answering from their phones.
        </p>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="paper-sheet group block rounded-xl border border-line p-6 transition-colors hover:border-amber/50"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber/35 text-amber transition-colors group-hover:border-amber group-hover:bg-amber/8">
                <card.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-serif text-lg font-semibold">{card.title}</h2>
              <p className="mt-2 text-sm text-muted">{card.body}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-amber">
                {card.cta}
                <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
