"use client";

import Link from "next/link";
import { useRoyal, type CurrencyCode } from "./royal-context";
import {
  IconSearch,
  IconConcierge,
  IconHeart,
  IconBag,
} from "./royal-icons";

export function RoyalHeader() {
  const {
    currency,
    setCurrency,
    wishlistCount,
    cartCount,
    openConsultation,
  } = useRoyal();

  return (
    <header className="sticky top-0 z-40 w-full bg-surface/95 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      {/* Royal Announcement Ribbon */}
      <div className="bg-primary text-on-primary py-2 px-margin-mobile lg:px-margin-desktop text-center border-b border-secondary-fixed-dim/30">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
          <span className="w-1.5 h-1.5 rotate-45 bg-secondary-fixed-dim inline-block" />
          <p className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-secondary-fixed text-[10px] sm:text-[11px]">
            Complimentary Worldwide Insured Delivery on Royal Orders &nbsp;|&nbsp; Silk Mark Certified Pure Handlooms &nbsp;|&nbsp; Book a Private Bridal Consultation
          </p>
          <span className="w-1.5 h-1.5 rotate-45 bg-secondary-fixed-dim inline-block" />
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="h-20 max-w-7xl mx-auto px-gutter-mobile lg:px-gutter-desktop flex items-center justify-between gap-4">
        {/* Curate Search & Currency Selector */}
        <div className="flex items-center gap-space-md">
          <Link
            href="/search"
            aria-label="Curate Archive"
            className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors group"
          >
            <IconSearch className="w-5 h-5 text-on-surface-variant group-hover:text-primary transition-colors" />
            <span className="hidden sm:inline font-label-caps text-label-caps uppercase tracking-wider">
              Curate
            </span>
          </Link>

          <div className="h-4 w-px bg-outline-variant/40 hidden sm:block" />

          <div className="relative flex items-center">
            <label className="sr-only" htmlFor="currency-select">
              Currency
            </label>
            <select
              id="currency-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="bg-transparent font-label-caps text-label-caps uppercase tracking-widest text-on-surface cursor-pointer focus:outline-none pr-4 appearance-none hover:text-primary transition-colors"
            >
              <option value="INR">INR ₹</option>
              <option value="USD">USD $</option>
              <option value="GBP">GBP £</option>
              <option value="AED">AED د.إ</option>
            </select>
            <span className="pointer-events-none -ml-3 text-[10px] text-secondary">
              ▼
            </span>
          </div>
        </div>

        {/* Center Imperial Crest & Brand Title */}
        <div className="flex items-center justify-center">
          <Link href="/" className="flex items-center gap-3 group text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Sri Vartali Sarees Royal Seal"
              className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
              src="/images/storefront/logo.png"
            />
            <div className="flex flex-col items-center">
              <span className="font-headline-sm text-headline-sm tracking-widest text-primary uppercase font-bold text-lg sm:text-[22px]">
                Sri Vartali
              </span>
              <span className="font-label-sm text-label-sm uppercase tracking-[0.3em] text-secondary text-[9px] sm:text-[10px]">
                Royal Handlooms
              </span>
            </div>
          </Link>
        </div>

        {/* Right Actions: Concierge, Wishlist, Bag, Patron */}
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
          <button
            type="button"
            onClick={() => openConsultation()}
            className="hidden md:flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors"
          >
            <IconConcierge className="w-5 h-5 text-tertiary" />
            <span className="font-label-caps text-label-caps uppercase tracking-wider">
              Concierge
            </span>
          </button>

          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="relative text-on-surface-variant hover:text-primary transition-colors flex items-center p-1"
          >
            <IconHeart className="w-[22px] h-[22px]" />
            <span className="absolute -top-1 -right-1 bg-primary text-on-primary font-label-sm text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {wishlistCount}
            </span>
          </Link>

          <Link
            href="/cart"
            aria-label="Royal Bag"
            className="relative text-on-surface-variant hover:text-primary transition-colors flex items-center p-1"
          >
            <IconBag className="w-[22px] h-[22px]" />
            <span className="absolute -top-1 -right-1 bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {cartCount}
            </span>
          </Link>

          <div className="h-4 w-px bg-outline-variant/40" />

          <Link
            href="/account"
            className="flex items-center gap-2.5 group"
            title="Patron Profile"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Patron"
              className="w-8 h-8 rounded-full object-cover ring-1 ring-secondary-fixed-dim/40 group-hover:ring-primary transition-all"
              src="/images/storefront/patron.png"
            />
            <span className="hidden xl:inline font-label-caps text-label-caps uppercase text-on-surface tracking-wider group-hover:text-primary transition-colors">
              Patron
            </span>
          </Link>
        </div>
      </div>

      {/* Royal Weave Categories Navigation Rail */}
      <div className="bg-surface-container-low/70 border-t border-b border-outline-variant/20 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-gutter-mobile lg:px-gutter-desktop">
          <nav
            aria-label="Royal Weaves Navigation"
            className="flex items-center justify-start lg:justify-center gap-6 lg:gap-10 overflow-x-auto whitespace-nowrap py-3 scrollbar-none"
          >
            <a
              href="#curated-collection"
              className="text-primary font-bold border-b-2 border-primary pb-0.5 font-label-caps text-label-caps uppercase tracking-[0.14em] transition-colors"
            >
              Bridal Kanjivaram
            </a>
            <a
              href="#curated-collection"
              className="text-on-surface-variant hover:text-primary font-label-caps text-label-caps uppercase tracking-[0.14em] transition-colors py-1"
            >
              Banarasi Brocades
            </a>
            <Link
              href="/shop?fabric=chanderi"
              className="text-on-surface-variant hover:text-primary font-label-caps text-label-caps uppercase tracking-[0.14em] transition-colors py-1"
            >
              Chanderi &amp; Organza
            </Link>
            <Link
              href="/shop"
              className="text-on-surface-variant hover:text-primary font-label-caps text-label-caps uppercase tracking-[0.14em] transition-colors py-1"
            >
              Trousseau Edit
            </Link>
            <a
              href="#zari-vault"
              className="text-on-surface-variant hover:text-primary font-label-caps text-label-caps uppercase tracking-[0.14em] transition-colors py-1"
            >
              Heritage Zari Vault
            </a>
            <a
              href="#bespoke-atelier"
              className="text-on-surface-variant hover:text-primary font-label-caps text-label-caps uppercase tracking-[0.14em] transition-colors py-1"
            >
              The Royal Atelier
            </a>
            <button
              type="button"
              onClick={() => openConsultation("Bespoke Weaving")}
              className="text-on-surface-variant hover:text-primary font-label-caps text-label-caps uppercase tracking-[0.14em] transition-colors py-1"
            >
              Bespoke Weaving
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
