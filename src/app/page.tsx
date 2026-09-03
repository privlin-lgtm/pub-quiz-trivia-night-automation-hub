import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

const cards = [
  {
    href: "/create",
    title: "Generate a quiz pack",
    body: "Describe the rounds and topics you want, and let AI build a complete quiz pack.",
    cta: "Open the wizard",
  },
  {
    href: "/packs",
    title: "Manage your packs",
    body: "Edit rounds and questions, then export presenter scripts and PDF sheets.",
    cta: "View packs",
  },
  {
    href: "/play",
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
              className="paper-sheet block rounded-xl border border-line p-5 transition-transform hover:-translate-y-0.5"
            >
              <h2 className="font-serif text-lg font-semibold">{card.title}</h2>
              <p className="mt-2 text-sm text-muted">{card.body}</p>
              <span className="mt-5 inline-block text-sm font-semibold text-amber">{card.cta} →</span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
