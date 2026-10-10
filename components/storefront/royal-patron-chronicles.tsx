import {
  IconDiamond,
  IconStar,
  IconVerified,
  IconGavel,
  IconShipping,
  IconHandshake,
} from "./royal-icons";

export function RoyalPatronChronicles() {
  return (
    <section className="w-full py-space-2xl bg-surface">
      <div className="max-w-7xl mx-auto px-gutter-mobile lg:px-gutter-desktop">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-space-xs mb-space-xl">
          <div className="flex items-center justify-center gap-2 text-secondary">
            <IconDiamond className="w-2 h-2 text-secondary" />
            <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] font-semibold">
              Words of Grace
            </span>
            <IconDiamond className="w-2 h-2 text-secondary" />
          </div>

          <h2 className="font-headline-lg text-headline-lg text-primary font-medium tracking-tight">
            The Royal Patron Chronicles
          </h2>

          <p className="font-body-md text-body-md text-on-surface-variant font-light">
            Honoring families who have entrusted Sri Vartali with their most sacred wedding ceremonies across generations.
          </p>
        </div>

        {/* Testimonial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter-desktop">
          {/* Testimonial 1 */}
          <div className="bg-surface-container-lowest p-space-lg flex flex-col justify-between space-y-space-md shadow-sm border border-outline-variant/20">
            <div className="space-y-space-sm">
              <div className="flex items-center gap-1 text-secondary">
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
              </div>

              <p className="font-headline-sm text-headline-sm text-on-surface font-serif italic leading-snug">
                “The Kanjivaram draped like liquid royalty. The pure gold zari held a dignified antique glow without feeling gaudy.”
              </p>

              <p className="font-body-sm text-body-sm text-on-surface-variant">
                We commissioned my wedding drape 4 months prior. Watching the weaver on video interlock the korvai border gave our family chills. It is truly our heirloom for life.
              </p>
            </div>

            <div className="pt-space-sm flex items-center gap-3 border-t border-outline-variant/15">
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold font-serif">
                DS
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface font-semibold">
                  Devika Singhania
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[10px]">
                  Udaipur Palace Wedding
                </p>
              </div>
            </div>
          </div>

          {/* Testimonial 2 */}
          <div className="bg-surface-container-lowest p-space-lg flex flex-col justify-between space-y-space-md shadow-sm border border-outline-variant/20">
            <div className="space-y-space-sm">
              <div className="flex items-center gap-1 text-secondary">
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
              </div>

              <p className="font-headline-sm text-headline-sm text-on-surface font-serif italic leading-snug">
                “The turquoise Banarasi kadwa saree stole the entire reception evening. Unmatched softness and zari weight.”
              </p>

              <p className="font-body-sm text-body-sm text-on-surface-variant">
                The blouse tailoring matched the pallu motifs with pinpoint precision. Sri Vartali&apos;s concierge treated our trousseau with the utmost discretion and grace.
              </p>
            </div>

            <div className="pt-space-sm flex items-center gap-3 border-t border-outline-variant/15">
              <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed font-bold font-serif">
                AV
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface font-semibold">
                  Ananya Varma
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[10px]">
                  Hyderabad Reception
                </p>
              </div>
            </div>
          </div>

          {/* Testimonial 3 */}
          <div className="bg-surface-container-lowest p-space-lg flex flex-col justify-between space-y-space-md shadow-sm border border-outline-variant/20">
            <div className="space-y-space-sm">
              <div className="flex items-center gap-1 text-secondary">
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
                <IconStar className="w-[18px] h-[18px] fill-secondary" />
              </div>

              <p className="font-headline-sm text-headline-sm text-on-surface font-serif italic leading-snug">
                “Their pure tissue zari saree is pure poetry. You immediately feel the touch of authentic gold threads.”
              </p>

              <p className="font-body-sm text-body-sm text-on-surface-variant">
                The presentation box of carved teakwood with camphor sachets arrived in London impeccably insured. Exceptional craftsmanship.
              </p>
            </div>

            <div className="pt-space-sm flex items-center gap-3 border-t border-outline-variant/15">
              <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed font-bold font-serif">
                MR
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface font-semibold">
                  Meera Raghavan
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[10px]">
                  London &amp; Chennai
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Stamp Bar */}
        <div className="mt-space-xl p-space-md bg-surface-container-low flex flex-wrap items-center justify-around gap-6 text-center border border-outline-variant/20">
          <div className="flex items-center gap-2 text-on-surface">
            <IconVerified className="w-[22px] h-[22px] text-secondary" />
            <span className="font-label-caps text-label-caps uppercase tracking-wider font-semibold">
              Silk Mark Organization of India
            </span>
          </div>

          <div className="flex items-center gap-2 text-on-surface">
            <IconGavel className="w-[22px] h-[22px] text-secondary" />
            <span className="font-label-caps text-label-caps uppercase tracking-wider font-semibold">
              Govt. Zari Purity Assayed
            </span>
          </div>

          <div className="flex items-center gap-2 text-on-surface">
            <IconShipping className="w-[22px] h-[22px] text-secondary" />
            <span className="font-label-caps text-label-caps uppercase tracking-wider font-semibold">
              100% Insured Worldwide Transit
            </span>
          </div>

          <div className="flex items-center gap-2 text-on-surface">
            <IconHandshake className="w-[22px] h-[22px] text-secondary" />
            <span className="font-label-caps text-label-caps uppercase tracking-wider font-semibold">
              Ethical Master Artisan Guild
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
