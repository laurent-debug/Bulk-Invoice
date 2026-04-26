import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/I18nProvider";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bulk Invoice Manager Pro | Automate Your Invoice Renaming",
  description: "Securely upload PDF invoices, extract data automatically with AI, and rename them in bulk. Export smart ZIP folders organized by vendor, category, or month.",
  keywords: ["invoice", "bulk rename", "PDF extraction", "accounting software", "OCR AI", "receipts organizer"],
  openGraph: {
    title: "Bulk Invoice Manager Pro",
    description: "Securely upload PDF invoices, extract data automatically with AI, and rename them in bulk.",
    type: "website",
    locale: "en_US",
    siteName: "Bulk Invoice Manager Pro",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bulk Invoice Manager Pro",
    description: "Automate your invoice renaming with secure, server-side AI.",
  },
};

import { DebugTool } from "@/components/DebugTool";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen`}
      >
        <AuthProvider>
          <I18nProvider>{children}</I18nProvider>
          <DebugTool />
        </AuthProvider>
      </body>
    </html>
  );
}
