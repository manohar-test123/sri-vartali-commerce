import type { ReactNode } from "react";

import { RoyalProvider } from "@/components/storefront/royal-context";
import { RoyalHeader } from "@/components/storefront/royal-header";
import { RoyalFooter } from "@/components/storefront/royal-footer";
import { RoyalConsultationModal } from "@/components/storefront/royal-consultation-modal";
import { RoyalProvenanceModal } from "@/components/storefront/royal-provenance-modal";
import { RoyalLabSampleModal } from "@/components/storefront/royal-lab-sample-modal";

/**
 * Storefront shell — Royal Handloom Heritage design system.
 * Global header with announcement ribbon, currency selector, search, wishlist & bag counters,
 * weave category navigation rail, royal footer, and global atelier consultation modals.
 */
export default async function StorefrontLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RoyalProvider>
      {/* §49 keyboard navigation: first Tab stop, hidden until focused. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-on-primary"
      >
        Skip to content
      </a>

      <RoyalHeader />

      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>

      <RoyalFooter />

      {/* Interactive Global Modals */}
      <RoyalConsultationModal />
      <RoyalProvenanceModal />
      <RoyalLabSampleModal />
    </RoyalProvider>
  );
}
