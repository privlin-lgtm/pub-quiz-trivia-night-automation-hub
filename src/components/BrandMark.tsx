/**
 * BrandMark — "The Coaster": chalkboard beer mat with a gold-chalk question
 * mark in Fraunces italic (the same italic as `Automation` in the wordmark).
 *
 * Scales off font-size only, so it works anywhere: <BrandMark className="text-[22px]" />
 * Tokens used: --stage (#2c3a33), --gold (#e2aa3e). No new colors.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex flex-none items-center justify-center rounded-full bg-stage ${className}`}
      style={{ width: "1em", height: "1em" }}
    >
      {/* Gold hairline only above ~28px — it turns to mud at favicon sizes. */}
      <span
        className="absolute inset-0 hidden rounded-full border-gold/45 sm:block"
        style={{ borderWidth: "0.035em" }}
      />
      <span
        className="relative font-serif font-semibold italic leading-none text-gold"
        style={{ fontSize: "0.78em" }}
      >
        ?
      </span>
    </span>
  );
}
