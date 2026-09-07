import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Work_Sans } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
});

const body = Work_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-plex",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Pub Quiz Automation Hub",
  description: "AI-generated pub quiz packs, presenter scripts, and a live team portal.",
  applicationName: "Pub Quiz Hub",
  // Installable from the browser menu (Chromium, iOS 16.4+). No service
  // worker on purpose: the live session is polling, so an "offline" shell
  // would only look alive while being dead. manifest.ts carries the rest.
  appleWebApp: { capable: true, title: "Quiz Hub", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  // Stage green (--stage in globals.css): colours the browser chrome on
  // phones to match the team portal and host desk.
  themeColor: "#2c3a33",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
