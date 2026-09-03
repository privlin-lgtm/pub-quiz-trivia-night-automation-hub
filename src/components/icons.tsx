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
