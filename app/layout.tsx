import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BatProvider } from "@/lib/bat-context";
import { OpportunitiesProvider } from "@/lib/opportunities-context";
import { ThemeProvider } from "@/lib/theme-context";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
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
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <BatProvider>
            <OpportunitiesProvider>{children}</OpportunitiesProvider>
          </BatProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
