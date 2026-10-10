"use client";

import { useRoyal } from "./royal-context";
import {
  IconClose,
  IconVerified,
  IconDiamond,
  IconAward,
} from "./royal-icons";

export function RoyalProvenanceModal() {
  const { provenanceSaree, closeProvenance, addToBag, openConsultation } = useRoyal();

  if (!provenanceSaree) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/70 backdrop-blur-sm animate-fade-in"
      onClick={closeProvenance}
    >
      <div
        className="relative w-full max-w-2xl bg-surface border border-secondary-fixed-dim/40 shadow-2xl p-6 sm:p-8 text-on-surface max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeProvenance}
          className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-primary transition-colors"
          aria-label="Close provenance modal"
        >
          <IconClose className="w-5 h-5" />
        </button>

        {/* Header Ribbon */}
        <div className="flex items-center gap-2 text-secondary mb-2">
          <IconDiamond className="w-2 h-2 text-secondary" />
          <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] font-semibold">
            Certificate of Imperial Provenance
          </span>
        </div>

        <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
          {provenanceSaree.name}
        </h3>
        <p className="font-label-sm text-label-sm text-secondary uppercase tracking-[0.16em] mt-1">
          {provenanceSaree.atelier} • {provenanceSaree.stockNote}
        </p>

        {/* Saree Visual & Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-6 items-center bg-surface-container-low p-4">
          <div className="aspect-[3/4] relative overflow-hidden bg-surface-container">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={provenanceSaree.image}
              alt={provenanceSaree.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="sm:col-span-2 space-y-3 font-body-sm text-body-sm text-on-surface-variant">
            <p className="leading-relaxed">{provenanceSaree.description}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="px-2.5 py-1 bg-surface text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold ring-1 ring-primary/20">
                {provenanceSaree.badge1}
              </span>
              <span className="px-2.5 py-1 bg-tertiary text-on-tertiary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                {provenanceSaree.badge2}
              </span>
            </div>
          </div>
        </div>

        {/* Metallurgical & Loom Specifications Table */}
        <div className="space-y-3 border-t border-b border-outline-variant/30 py-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-surface-container-lowest">
              <p className="font-label-caps text-label-caps uppercase text-on-surface-variant text-[10px]">
                Artisan Dedication
              </p>
              <p className="font-headline-sm text-primary font-bold mt-1">
                {provenanceSaree.loomHours} Loom Hours
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Handcrafted at ~2.5 inches per calendar day
              </p>
            </div>
            <div className="p-3 bg-surface-container-lowest">
              <p className="font-label-caps text-label-caps uppercase text-on-surface-variant text-[10px]">
                Zari Assay Standard
              </p>
              <p className="font-title-lg text-secondary font-bold mt-1">
                {provenanceSaree.zariType}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 text-xs">
            <div className="flex items-start gap-2">
              <IconVerified className="w-4 h-4 text-tertiary mt-0.5 shrink-0" />
              <div>
                <strong className="text-on-surface">Silk Lineage: </strong>
                <span className="text-on-surface-variant">{provenanceSaree.silkType}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <IconAward className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
              <div>
                <strong className="text-on-surface">Artisan Guild: </strong>
                <span className="text-on-surface-variant">{provenanceSaree.craftLineage}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <IconVerified className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <strong className="text-on-surface">Assay Hallmark: </strong>
                <span className="text-on-surface-variant">{provenanceSaree.certification}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              closeProvenance();
              openConsultation(provenanceSaree.name);
            }}
            className="w-full sm:w-auto px-6 py-3 border border-primary text-primary font-label-caps text-label-caps uppercase tracking-wider hover:bg-primary hover:text-on-primary transition-colors text-center"
          >
            Inquire via Atelier Concierge
          </button>
          <button
            type="button"
            onClick={() => {
              addToBag({
                id: provenanceSaree.id,
                name: provenanceSaree.name,
                priceInr: provenanceSaree.priceInr,
              });
              closeProvenance();
            }}
            className="w-full sm:w-auto px-8 py-3 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-wider hover:bg-primary-container transition-colors shadow-md text-center"
          >
            Acquire Masterpiece
          </button>
        </div>
      </div>
    </div>
  );
}
