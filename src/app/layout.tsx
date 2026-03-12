import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bulk Invoice Manager — Renommez vos factures en masse",
  description: "Uploadez vos factures PDF, extrayez les données automatiquement, renommez-les selon votre format et exportez en ZIP ou Google Drive.",
  keywords: ["factures", "PDF", "renommage", "comptabilité", "OCR", "bulk rename"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-gray-950 text-white min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
