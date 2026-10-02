import type { ReactNode } from "react";
import Link from "next/link";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-wine-900/10 bg-ivory-50">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="font-serif text-xl tracking-wide text-wine-900"
          >
            Sri Vartali
          </Link>
          <nav aria-label="Main" className="text-sm text-wine-900/70">
            {/* Storefront navigation lands in Phase 4 (spec §7) */}
            <span className="hidden sm:inline">Sarees · Dresses · Kurtis — coming soon</span>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="border-t border-wine-900/10 bg-ivory-50 py-8 text-center text-xs tracking-wide text-wine-900/60">
        © {new Date().getFullYear()} Sri Vartali Sarees
      </footer>
    </>
  );
}
