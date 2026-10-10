import type { Metadata } from "next";
import { Inter, Playfair_Display, Plus_Jakarta_Sans, Montserrat } from "next/font/google";
import "./globals.css";

import { env } from "@/lib/env";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: "Sri Vartali Sarees",
    template: "%s · Sri Vartali Sarees",
  },
  description:
    "Royal Couture Handlooms — Sri Vartali Sarees. Authentic pure mulberry silk handwoven with certified 24-karat gold tested zari.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${jakarta.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-surface text-on-surface">{children}</body>
    </html>
  );
}
