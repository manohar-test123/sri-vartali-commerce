"use client";

import { useRoyal } from "./royal-context";
import {
  IconClose,
  IconVerified,
  IconDiamond,
  IconAward,
} from "./royal-icons";

export function RoyalLabSampleModal() {
  const { labSampleOpen, closeLabSample } = useRoyal();

  if (!labSampleOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/70 backdrop-blur-sm animate-fade-in"
      onClick={closeLabSample}
    >
      <div
        className="relative w-full max-w-xl bg-surface border border-secondary-fixed-dim/40 shadow-2xl p-6 sm:p-8 text-on-surface max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeLabSample}
          className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-primary transition-colors"
          aria-label="Close lab sample modal"
        >
          <IconClose className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-secondary mb-2">
          <IconDiamond className="w-2 h-2 text-secondary" />
          <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] font-semibold">
            Government Assayed Metallurgical Spectrometer Test
          </span>
        </div>

        <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
          Physical Laboratory Assay Certificate
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
          Assay Batch #SV-ZARI-2025-0814 • Indian Institute of Handloom Technology
        </p>

        <div className="my-6 p-4 bg-surface-container-low border border-outline-variant/30 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-surface-container-lowest">
              <p className="font-label-caps text-[10px] text-on-surface-variant uppercase">Silver Purity</p>
              <p className="font-headline-sm text-primary font-bold mt-1">98.63%</p>
              <p className="text-[10px] text-tertiary font-semibold">± 0.12% Margin</p>
            </div>
            <div className="p-3 bg-surface-container-lowest">
              <p className="font-label-caps text-[10px] text-on-surface-variant uppercase">Gold Coating</p>
              <p className="font-headline-sm text-secondary font-bold mt-1">24 Karat</p>
              <p className="text-[10px] text-tertiary font-semibold">Hot Electroplated</p>
            </div>
            <div className="p-3 bg-surface-container-lowest col-span-2 sm:col-span-1">
              <p className="font-label-caps text-[10px] text-on-surface-variant uppercase">Plastic / Lurex</p>
              <p className="font-headline-sm text-tertiary font-bold mt-1">0.00%</p>
              <p className="text-[10px] text-tertiary font-semibold">Nil Detected</p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-on-surface-variant border-t border-outline-variant/20 pt-3">
            <div className="flex items-center gap-2">
              <IconVerified className="w-4 h-4 text-tertiary shrink-0" />
              <span>Assayed via X-Ray Fluorescence (XRF) Spectroscopy</span>
            </div>
            <div className="flex items-center gap-2">
              <IconAward className="w-4 h-4 text-secondary shrink-0" />
              <span>Conforms to National Handloom Heritage Bureau Grade I Standard</span>
            </div>
          </div>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
          Sri Vartali delivers a serialized brass-stamped metallurgical card with every Royal Order. You can independently verify purity at any government-recognized testing center nationwide.
        </p>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={closeLabSample}
            className="px-6 py-2.5 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-wider hover:bg-primary-container transition-colors"
          >
            Dismiss Certificate
          </button>
        </div>
      </div>
    </div>
  );
}
