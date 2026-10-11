import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = { title: "Talk to Repo", description: "Kod tabanınla konuş: harita, analiz, alıntılı cevaplar." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body className={`${inter.variable} ${mono.variable} antialiased`}>{children}</body>
    </html>
  );
}
