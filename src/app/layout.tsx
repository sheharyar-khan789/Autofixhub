import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getSettingsOrNull } from "@/lib/data";
import { siteUrl } from "@/lib/env";

const inter = localFont({
  src: "../fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});
const chivo = localFont({
  src: "../fonts/chivo-latin-wght-normal.woff2",
  variable: "--font-chivo",
  weight: "100 900",
  display: "swap",
});
const spaceGrotesk = localFont({
  src: "../fonts/space-grotesk-latin-wght-normal.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "swap",
});

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettingsOrNull();
  const name = settings.tradingName ?? "AutoFixHub";
  const title = `${name} | Automotive repair knowledge, diagnostics & video guides`;
  const description =
    "Repair guides, fault codes and YouTube videos on Volkswagen Group diesel and Toyota hybrid problems: DPF, turbo, injectors, gearbox, clutch, timing belts, oil leaks and wiring faults.";
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: title, template: `%s | ${name}` },
    description,
    openGraph: { type: "website", locale: "en_GB", siteName: name, title, description },
    twitter: { card: "summary", title, description },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = { themeColor: "#111315", width: "device-width", initialScale: 1 };

/** Document shell only. Public chrome lives in (site)/layout.tsx, the admin shell in admin/layout.tsx. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${chivo.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
