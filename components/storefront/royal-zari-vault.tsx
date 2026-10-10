"use client";

import { useRoyal } from "./royal-context";
import {
  IconDiamond,
  IconAward,
  IconVerified,
} from "./royal-icons";

export function RoyalZariVault() {
  const { openLabSample } = useRoyal();

  return (
    <section className="w-full py-space-2xl bg-surface-container-low text-on-surface" id="zari-vault">
      <div className="max-w-7xl mx-auto px-gutter-mobile lg:px-gutter-desktop">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-center">
          {/* Left: Brand Story & Artisan Heritage */}
          <div className="lg:col-span-6 space-y-space-md">
            <div className="flex items-center gap-2 text-secondary">
              <IconDiamond className="w-2 h-2 text-secondary" />
              <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] font-semibold">
                Sanctuary of Ancient Looms
              </span>
            </div>

            <h2 className="font-headline-lg text-headline-lg text-primary font-medium tracking-tight">
              Preserving 300-Year Manuscripts of Sacred Weave
            </h2>

            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              In our master ateliers across the sacred river bends of Kanchipuram and Varanasi, the craft remains unaltered by modernity. We work strictly with fourth-generation weaving lineages, resurrecting motifs from royal Tanjore murals and Mughal court folios: the celestial <strong className="text-on-surface font-semibold">Gandaberunda</strong> two-headed eagle, the sacred <strong className="text-on-surface font-semibold">Annapakshi</strong> bird, and sacred temple Gopurams.
            </p>

            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Every sari is woven at a deliberate pace of barely 2 to 3 inches per day. Each millimeter of genuine metallic thread is spun by hand, creating an heirloom that doesn’t fray with time, but gains the dignified patina of ancient gold.
            </p>

            {/* Grand Metrics Bento */}
            <div className="grid grid-cols-3 gap-4 pt-space-sm bg-surface-container p-space-md rounded-none shadow-sm border border-outline-variant/20">
              <div className="space-y-1">
                <span className="font-headline-md text-headline-md text-primary font-bold">
                  350+
                </span>
                <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant text-[10px]">
                  Master Artisans
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-headline-md text-headline-md text-secondary font-bold">
                  7 Decades
                </span>
                <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant text-[10px]">
                  Lineage Craft
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-headline-md text-headline-md text-tertiary font-bold">
                  18
                </span>
                <p className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface-variant text-[10px]">
                  Global Salons
                </p>
              </div>
            </div>
          </div>

          {/* Right: Interactive 'The Zari Purity Vault' */}
          <div className="lg:col-span-6 bg-surface-container-lowest p-space-lg lg:p-space-xl shadow-md border border-outline-variant/30">
            <div className="space-y-space-md">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <IconAward className="w-6 h-6 text-secondary" />
                  <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                    The Zari Purity Vault
                  </h3>
                </div>
                <span className="px-2.5 py-1 bg-secondary-fixed text-on-secondary-fixed font-label-caps text-label-caps uppercase tracking-widest font-bold text-[10px]">
                  Lab Tested
                </span>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                Unlike commercial sarees crafted with plastic polyester lurex, Sri Vartali implements stringent purity standards authenticated by physical metallurgical certificates.
              </p>

              {/* 3 Zari Tiers Accordion Cards */}
              <div className="space-y-3 pt-2">
                {/* Grade 1 */}
                <div className="p-4 bg-surface-container-low transition-colors duration-200 border-l-2 border-secondary">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-secondary inline-block" />
                      <h4 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-bold text-[11px]">
                        Grade I: 24K Gold Electroplated Pure Silver
                      </h4>
                    </div>
                    <span className="font-label-sm text-label-sm text-secondary font-semibold shrink-0">
                      98.6% Precious Core
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Pure silver thread wrapped around pure mulberry silk core, followed by hot-bath 24 karat gold electroplating. Carries government Hallmarked bullion certification.
                  </p>
                </div>

                {/* Grade 2 */}
                <div className="p-4 bg-surface-container-low transition-colors duration-200 border-l-2 border-primary">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-primary inline-block" />
                      <h4 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-bold text-[11px]">
                        Grade II: Tested Heritage Muga Zari
                      </h4>
                    </div>
                    <span className="font-label-sm text-label-sm text-primary font-semibold shrink-0">
                      57% Pure Silver
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Certified silver alloy treated with herbal botanical extracts to produce an antique warm hue that never tarnishes or turns copper-black.
                  </p>
                </div>

                {/* Grade 3 */}
                <div className="p-4 bg-surface-container-low transition-colors duration-200 border-l-2 border-tertiary">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 bg-tertiary inline-block" />
                      <h4 className="font-label-caps text-label-caps uppercase tracking-wider text-on-surface font-bold text-[11px]">
                        Grade III: Antique Matte Patina Finish
                      </h4>
                    </div>
                    <span className="font-label-sm text-label-sm text-tertiary font-semibold shrink-0">
                      Subtle Royal Luster
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Low-sheen brushed finish intended for daytime court ceremonies, crafted with hand-twisted metallic filaments for soft tactile drape.
                  </p>
                </div>
              </div>

              {/* Download / View Certificate CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5">
                  <IconVerified className="w-4 h-4 text-tertiary" />
                  Includes QR code lab spectrometer card
                </span>
                <button
                  type="button"
                  onClick={openLabSample}
                  className="font-label-caps text-label-caps uppercase tracking-wider text-primary hover:underline font-bold"
                >
                  View Lab Sample →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
