"use client";

import { useRoyal } from "./royal-context";
import {
  IconDiamond,
  IconCalendar,
  IconArrowRight,
  IconVerified,
} from "./royal-icons";

export function RoyalHero() {
  const { openConsultation } = useRoyal();

  return (
    <section className="relative w-full h-[740px] lg:h-[820px] flex items-center bg-surface overflow-hidden">
      {/* Ambient Backdrop Layer with Atmospheric Vignette Scrim */}
      <div className="absolute inset-0 z-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Royal bride adorned in Sri Vartali pure crimson and gold Kanjivaram silk saree inside a majestic sandstone palace"
          className="w-full h-full object-cover object-center filter brightness-95 transform scale-[1.02] transition-transform duration-1000 ease-out"
          src="/images/storefront/hero-bride.jpg"
        />
        {/* Fine Gilded Vignette & Editorial Scrim */}
        <div className="absolute inset-0 bg-gradient-to-r from-on-background/90 via-on-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-on-background/95 via-transparent to-on-background/30" />
      </div>

      {/* Hero Content Overlay */}
      <div className="relative z-10 max-w-7xl mx-auto px-gutter-mobile lg:px-gutter-desktop py-space-2xl w-full">
        <div className="max-w-2xl space-y-space-md text-surface-container-lowest">
          {/* Overhead Imperial Emblem */}
          <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-surface-container-lowest/10 backdrop-blur-md border border-surface-container-lowest/15">
            <IconDiamond className="w-2 h-2 text-secondary-fixed" />
            <span className="font-label-caps text-label-caps tracking-[0.25em] text-secondary-fixed uppercase">
              Imperial Bridal Edit • Autumn 2025
            </span>
          </div>

          {/* Grand Editorial Headline */}
          <h1 className="font-display-hero text-display-hero leading-tight text-surface-container-lowest font-medium tracking-tight">
            The Royal Bridal Symphony — <br />
            <span className="italic font-normal text-secondary-fixed">
              Vow of Pure Gold
            </span>{" "}
            &amp; Crimson
          </h1>

          {/* Poetic Provenance Subtitle */}
          <p className="font-body-lg text-body-lg text-surface-container-low/90 leading-relaxed font-light max-w-xl">
            Authentic pure mulberry silk handwoven on sacred pit looms with certified 24-karat gold tested zari by fourth-generation master karigars of Kanchipuram.
          </p>

          {/* CTA Cluster */}
          <div className="pt-space-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <a
              href="#curated-collection"
              className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-[0.16em] hover:bg-primary-container transition-all duration-300 shadow-xl group border border-secondary-fixed-dim/30"
            >
              <span>Explore Bridal Masterpieces</span>
              <IconArrowRight className="w-[18px] h-[18px] transform group-hover:translate-x-1 transition-transform" />
            </a>

            <button
              type="button"
              onClick={() => openConsultation()}
              className="inline-flex items-center justify-center gap-2.5 px-7 py-4 bg-surface-container-lowest/10 backdrop-blur-md text-surface-container-lowest font-label-caps text-label-caps uppercase tracking-[0.16em] hover:bg-surface-container-lowest hover:text-primary transition-all duration-300 border border-surface-container-lowest/20"
            >
              <IconCalendar className="w-[18px] h-[18px] text-secondary-fixed" />
              <span>Book Private Atelier</span>
            </button>
          </div>

          {/* Trust Hallmark Badges */}
          <div className="pt-space-md flex flex-wrap items-center gap-4 sm:gap-6 text-surface-container-low font-label-sm text-label-sm tracking-widest uppercase">
            <div className="flex items-center gap-2">
              <IconVerified className="text-secondary-fixed w-[18px] h-[18px]" />
              <span>100% Certified Silk Mark</span>
            </div>
            <span className="text-secondary-fixed/50 font-serif hidden sm:inline">•</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rotate-45 bg-secondary-fixed inline-block" />
              <span>Pure Tested Zari (98.6%)</span>
            </div>
            <span className="text-secondary-fixed/50 font-serif hidden sm:inline">•</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rotate-45 bg-secondary-fixed inline-block" />
              <span>Custom Blouse Tailored</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
