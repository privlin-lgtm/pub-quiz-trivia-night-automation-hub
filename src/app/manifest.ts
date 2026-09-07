import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest; Next links it from every page. Colours
// mirror the tokens in globals.css (--background, --stage) — the unit test
// next to this file keeps them in sync. Icons are the "Coaster" brand-mark
// set in public/ (see src/components/BrandMark.tsx); the square 512 is the
// full-bleed variant for maskable, whose safe zone is the central 80%.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pub Quiz Hub",
    short_name: "Quiz Hub",
    description: "AI-generated pub quiz packs, presenter scripts, and a live team portal.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2e7d3",
    theme_color: "#2c3a33",
    icons: [
      { src: "/icon-256.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-square.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
