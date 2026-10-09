"use client";

/**
 * §48 bottom-sheet filters: on mobile the sidebar panel becomes a sheet —
 * a "Filters" trigger opens a dialog-style sheet from the bottom of the
 * viewport with the same GET form inside (no-JS users keep the always-on
 * sidebar via the <noscript> fallback in CatalogView). Desktop (lg+) never
 * sees this component's trigger at all.
 */

import { useEffect, useRef, useState } from "react";

export function FiltersSheet({
  children,
  activeCount = 0,
}: {
  children: React.ReactNode;
  /** Badge count of active filters, if the caller computed it. */
  activeCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    sheetRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Return focus to the trigger on close (§49 dialog etiquette).
  useEffect(() => {
    if (!open) triggerRef.current?.focus();
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-wine-900/25 bg-white px-5 py-2.5 text-sm font-medium text-wine-900 transition-colors hover:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
      >
        Filters
        {activeCount > 0 ? (
          <span className="rounded-full bg-wine-900 px-2 py-0.5 text-[11px] font-semibold text-ivory-50">
            {activeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-wine-900/40"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filter products"
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl bg-ivory-50 p-4 shadow-xl focus:outline-none"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg text-wine-900">Filters</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-wine-900/25 px-4 py-1.5 text-sm text-wine-900 transition-colors hover:border-gold-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
              >
                Close
              </button>
            </div>
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
