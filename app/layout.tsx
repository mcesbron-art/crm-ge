import type { Metadata } from "next";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { BatProvider } from "@/lib/bat-context";
import { OpportunitiesProvider } from "@/lib/opportunities-context";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif-display",
});

export const metadata: Metadata = {
  title: "CRM Production — Groupe Écho",
  description: "Pilotage production, rentabilité et facturation Groupe Écho",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${dmSans.variable} ${dmSerifDisplay.variable} font-sans antialiased`}
      >
        <BatProvider>
          <OpportunitiesProvider>{children}</OpportunitiesProvider>
        </BatProvider>
      </body>
    </html>
  );
}
