import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

import AppShell from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/toast";
import { BRAND } from "@/lib/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? `https://${BRAND.domain}`),
  title: {
    default: `${BRAND.name} — event staffing for organizers and event workers`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: ["event staffing", "event jobs Nigeria", "hire event staff", "event crew", "shift work"],
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#5b3df5",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#FAFAFC] text-[#0B1020]">
        <ToastProvider>
          <AppShell user={user}>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
