import type { SVGProps } from "react";

// Small shared line-art marks in the same weight/style as the home page's
// icon set, so a "next" or "back" affordance never falls back to a plain
// arrow glyph.

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 8h11M9.5 4 13 8l-3.5 4" />
    </svg>
  );
}

export function ArrowLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 8H3M6.5 4 3 8l3.5 4" />
    </svg>
  );
}

export function TrophyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 5H5a3 3 0 0 0 3 4.5" />
      <path d="M16 5h3a3 3 0 0 1-3 4.5" />
      <path d="M12 13v3" />
      <path d="M9 19.5h6" />
      <path d="M10 16.5h4l.5 2.3a.9.9 0 0 1-.9 1.2h-3.2a.9.9 0 0 1-.9-1.2z" />
    </svg>
  );
}
