import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "K, coach de développement personnel", template: "%s · K" },
  description:
    "Application personnelle de suivi d'habitudes, de journal émotionnel et de feuille de route sur 5 ans.",
  applicationName: "K",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  // Single dark theme (ADR 0013).
  themeColor: "#000000",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Every page renders per request so the CSP nonce can be applied (see src/proxy.ts).
  await connection();
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <a href="#contenu" className="skip-link">
          Aller au contenu
        </a>
        {children}
      </body>
    </html>
  );
}
