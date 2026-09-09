import Link from "next/link";

const links = [
  { href: "/create", label: "Create" },
  { href: "/packs", label: "Packs" },
  { href: "/play", label: "Join" },
];

export function SiteHeader() {
  return (
    <header className="border-b-2 border-foreground/90 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2 font-serif text-base font-semibold tracking-tight">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-amber" aria-hidden>
            <path d="M20 4c-4.2 0-9.3 2-12.4 7.2-1.7 2.9-2.5 5.6-3.1 8.3 2.6-.5 5.4-1.3 8.3-3C17.9 13.4 20 8.3 20 4z" />
            <path d="M9 15 4 20" />
          </svg>
          Pub Quiz Hub
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-amber"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
