import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: "Sri Vartali Sarees",
    template: "%s · Sri Vartali Sarees",
  },
  description:
    "Premium handpicked sarees and fashion — Sri Vartali Sarees. Timeless weaves for celebration.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
      // Browser extensions (Grammarly, WOT, dark-mode…) inject attributes on
      // <html>/<body> before React hydrates; tolerate them silently. This
      // only silences attribute mismatches on these two elements — never on
      // the app tree itself.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
