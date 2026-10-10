"use client";

import { useState } from "react";
import Link from "next/link";
import { useRoyal, type SareeDetail } from "./royal-context";
import {
  IconAward,
  IconHeart,
  IconArrowRight,
} from "./royal-icons";

export const ROYAL_SAREES: SareeDetail[] = [
  {
    id: "mayura-kadwa",
    name: "Mayura Kadwa Neela Banarasi Saree",
    title: "Mayura Kadwa Neela Banarasi Saree",
    category: "Varanasi Rangkat",
    atelier: "Varanasi Atelier",
    stockNote: "In Stock • 1 Piece",
    description:
      "Pure silver and gold electroplated zari woven on mulberry katan silk with intricate floral vine jangla and regal peacocks.",
    priceInr: 145000,
    image: "/images/storefront/banarasi.jpg",
    loomHours: 180,
    zariType: "Grade I: 24K Gold Electroplated Pure Silver (98.6%)",
    silkType: "100% Pure Mulberry Katan Silk (20/22 Denier Warp & Weft)",
    badge1: "Kadwa Weave",
    badge2: "Silk Mark Certified",
    craftLineage: "Fourth-generation master karigars of Madanpura, Varanasi",
    certification: "Silk Mark Organization of India Certificate #SM-9021-VNS",
  },
  {
    id: "agnihotra-crimson",
    name: "Agnihotra Crimson Temple Kanjivaram",
    title: "Agnihotra Crimson Temple Kanjivaram",
    category: "Bridal Kanjivaram",
    atelier: "Kanchipuram Loom",
    stockNote: "Bridal Heirloom",
    description:
      "Heavyweight triple warp pure mulberry silk draped with ceremonial rudraksha and gopuram temple borders in pure tested gold zari.",
    priceInr: 210000,
    image: "/images/storefront/kanjivaram.jpg",
    loomHours: 240,
    zariType: "Grade I: 24K Gold Electroplated Pure Silver (98.6%)",
    silkType: "Heavyweight Triple Warp Mulberry Silk with Korvai Interlocked Petni Borders",
    badge1: "Korvai Interlock",
    badge2: "24k Tested Zari",
    craftLineage: "Sengunthar master weaving clan of Pillaiyarpalayam, Kanchipuram",
    certification: "Government Laboratory Zari Spectrometer Assayed #ZAR-TN-4402",
  },
  {
    id: "chandramukhi-tissue",
    name: "Chandramukhi Champagne Gold Tissue",
    title: "Chandramukhi Champagne Gold Tissue",
    category: "Pure Tissue Zari",
    atelier: "Maheshwar Royal",
    stockNote: "Reception Luxe",
    description:
      "Metallic spun pure gold zari warp and silk weft featuring hand-scalloped zardozi borders studded with seed pearls.",
    priceInr: 185000,
    image: "/images/storefront/tissue-gold.jpg",
    loomHours: 160,
    zariType: "Grade II: Tested Heritage Muga Zari (57% Pure Silver)",
    silkType: "Gossamer Tissue Silk with hand-scalloped zardozi seed pearl embellishments",
    badge1: "Pure Tissue Warp",
    badge2: "Hand Zardozi",
    craftLineage: "Royal Court Atelier weavers revived from Holkar archive folios",
    certification: "Silk Mark Assayed & Bullion Purity Lab Certificate #MP-8831",
  },
  {
    id: "shyamal-emerald",
    name: "Shyamal Emerald Jangla Silk Saree",
    title: "Shyamal Emerald Jangla Silk Saree",
    category: "Varanasi Rangkat",
    atelier: "Varanasi Guild",
    stockNote: "Mehendi & Sangeet",
    description:
      "Deep jewel emerald silk enriched with three-color silk minakari motifs set inside an opulent golden floral jaal network.",
    priceInr: 125000,
    image: "/images/storefront/emerald-jangla.jpg",
    loomHours: 150,
    zariType: "Grade III: Antique Matte Patina Finish",
    silkType: "Jewel emerald mulberry silk with resham silk three-color meenakari motifs",
    badge1: "Minakari Jangla",
    badge2: "Certified Pure",
    craftLineage: "Ansari Master Guild weavers, Alaipura weaving sector, Varanasi",
    certification: "Central Silk Board Mark #CSB-2025-IND",
  },
];

const TABS = [
  "All Weaves",
  "Bridal Kanjivaram",
  "Varanasi Rangkat",
  "Pure Tissue Zari",
];

export function RoyalCuratedShowcase() {
  const [activeTab, setActiveTab] = useState("All Weaves");
  const {
    formatPrice,
    toggleWishlist,
    isWishlisted,
    addToBag,
    openProvenance,
    openConsultation,
  } = useRoyal();

  const filteredSarees =
    activeTab === "All Weaves"
      ? ROYAL_SAREES
      : ROYAL_SAREES.filter((s) => s.category === activeTab);

  return (
    <section className="w-full py-space-2xl bg-surface" id="curated-collection">
      <div className="max-w-7xl mx-auto px-gutter-mobile lg:px-gutter-desktop">
        {/* Section Header with Typography Flourish */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl gap-6">
          <div className="space-y-space-xs max-w-xl">
            <div className="flex items-center gap-2 text-secondary">
              <IconAward className="w-[18px] h-[18px] text-secondary" />
              <span className="font-label-caps text-label-caps uppercase tracking-[0.2em] font-semibold">
                Curated Royal Weaves
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-primary font-medium tracking-tight">
              The Imperial Trousseau Anthology
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant font-light">
              Museum-calibre handlooms curated across sacred weaving sanctuaries of Varanasi, Kanchipuram, and Paithan.
            </p>
          </div>

          {/* Filter Tab Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none" id="filter-tabs">
            {TABS.map((tab) => {
              const active = tab === activeTab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 font-label-caps text-label-caps uppercase tracking-wider transition-all whitespace-nowrap ${
                    active
                      ? "bg-primary text-on-primary shadow-sm font-bold"
                      : "bg-surface-container-high text-on-surface-variant hover:text-primary"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Luxury Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter-desktop">
          {filteredSarees.map((saree) => {
            const price = formatPrice(saree.priceInr);
            const wishlisted = isWishlisted(saree.id);

            return (
              <div
                key={saree.id}
                className="group flex flex-col bg-surface-container-low transition-all duration-300 hover:shadow-xl relative border border-outline-variant/15"
              >
                {/* Image Box */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-container">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={saree.name}
                    src={saree.image}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                  />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10">
                    <span className="px-2.5 py-1 bg-surface/90 backdrop-blur-md text-primary font-label-sm text-label-sm uppercase tracking-widest font-semibold shadow-sm">
                      {saree.badge1}
                    </span>
                    <span className="px-2 py-0.5 bg-tertiary text-on-tertiary font-label-sm text-[9px] uppercase tracking-wider">
                      {saree.badge2}
                    </span>
                  </div>

                  {/* Wishlist Heart Button */}
                  <button
                    type="button"
                    aria-label={`Add ${saree.name} to wishlist`}
                    onClick={() => toggleWishlist(saree.id, saree.name)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface/80 backdrop-blur-md text-on-surface hover:text-primary flex items-center justify-center transition-colors z-10"
                  >
                    <IconHeart
                      className={`w-[18px] h-[18px] ${
                        wishlisted ? "text-primary fill-primary" : "text-on-surface"
                      }`}
                      filled={wishlisted}
                    />
                  </button>

                  {/* Overlay Quick Concierge Strip on Hover */}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-primary/95 via-primary/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between text-on-primary z-10">
                    <span className="font-label-caps text-label-caps uppercase tracking-wider text-secondary-fixed">
                      {saree.loomHours} Loom Hours
                    </span>
                    <button
                      type="button"
                      onClick={() => openConsultation(saree.name)}
                      className="font-label-caps text-label-caps uppercase tracking-widest text-surface underline hover:text-secondary-fixed transition-colors"
                    >
                      Quick Inquiry
                    </button>
                  </div>
                </div>

                {/* Description Meta */}
                <div className="p-space-md flex flex-col flex-1 justify-between space-y-space-sm bg-surface-container-lowest">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-label-sm text-label-sm text-secondary uppercase tracking-[0.16em]">
                        {saree.atelier}
                      </span>
                      <span className="font-label-sm text-label-sm text-tertiary uppercase tracking-wider">
                        {saree.stockNote}
                      </span>
                    </div>

                    <h3 className="font-title-lg text-title-lg text-on-surface font-headline-sm group-hover:text-primary transition-colors line-clamp-1 font-semibold">
                      {saree.name}
                    </h3>

                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2">
                      {saree.description}
                    </p>
                  </div>

                  <div className="pt-space-xs space-y-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="font-headline-sm text-headline-sm text-primary font-serif font-semibold">
                          {price.primary}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant ml-1.5 uppercase font-medium">
                          {price.secondary}
                        </span>
                      </div>
                      <span className="font-label-sm text-[10px] text-outline uppercase tracking-wider">
                        Incl. Blouse
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => openProvenance(saree)}
                        className="w-full py-2.5 bg-surface-container text-on-surface font-label-caps text-label-caps uppercase tracking-wider hover:bg-surface-variant transition-colors text-center font-medium"
                      >
                        Provenance
                      </button>
                      <button
                        type="button"
                        onClick={() => addToBag({ id: saree.id, name: saree.name, priceInr: saree.priceInr })}
                        className="w-full py-2.5 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-wider hover:bg-primary-container transition-colors text-center shadow-sm font-semibold"
                      >
                        Acquire
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View Complete Archive Link */}
        <div className="mt-space-xl text-center">
          <Link
            href="/shop"
            className="inline-flex items-center gap-3 font-label-caps text-label-caps uppercase tracking-[0.2em] text-primary hover:text-primary-container transition-colors group"
          >
            <span className="w-8 h-px bg-secondary" />
            <span>Access The Complete 2025 Royal Archive (84 Handloom Masterpieces)</span>
            <IconArrowRight className="w-[18px] h-[18px] transform group-hover:translate-x-1.5 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
