import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

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
          <BrandMark className="text-[22px]" />
          Pub Quiz Hub
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
