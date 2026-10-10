"use client";

import { useState } from "react";
import Link from "next/link";
import { useRoyal } from "./royal-context";
import {
  IconVerified,
  IconLock,
  IconPlane,
  IconArrowRight,
} from "./royal-icons";

export function RoyalFooter() {
  const { openConsultation } = useRoyal();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail("");
      setSubscribed(false);
    }, 3500);
  };

  return (
    <footer className="w-full bg-primary text-on-primary pt-space-2xl pb-margin border-t-2 border-secondary-fixed">
      <div className="max-w-7xl mx-auto px-margin-mobile lg:px-margin-desktop">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-gutter-desktop pb-space-xl border-b border-outline/30">
          {/* Brand Manifesto */}
          <div className="lg:col-span-4 space-y-space-md">
            <div className="flex items-center gap-3">
              <span className="font-headline-md text-headline-md text-secondary-fixed tracking-wide font-bold">
                Sri Vartali Sarees
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-primary-fixed leading-relaxed">
              Guardians of India&apos;s royal loom lineage. For four decades, our master weavers across the sacred corridors of Kanchipuram and the ghats of Varanasi weave pure mulberry silks enriched with certified 98.6% pure gold and silver zari. Each drape is a wearable heirloom, consecrated to timeless bridal grandeur.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="px-2.5 py-1 rounded bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase tracking-wider font-semibold ring-1 ring-secondary-fixed-dim/40">
                Silk Mark Certified
              </span>
              <span className="px-2.5 py-1 rounded bg-tertiary-container text-on-tertiary-container font-label-sm text-label-sm uppercase tracking-wider font-semibold ring-1 ring-tertiary-fixed-dim/30">
                Pure Zari Vault
              </span>
            </div>
          </div>

          {/* Client Care */}
          <div className="lg:col-span-2 space-y-space-sm">
            <h3 className="font-title-lg text-title-lg text-secondary-fixed font-headline-sm uppercase tracking-wider mb-space-md font-bold">
              Client Care
            </h3>
            <ul className="space-y-3 font-body-sm text-body-sm text-surface-container-low">
              <li className="hover:text-secondary-fixed transition-colors">
                <a href="#zari-vault">Silk Mark Guarantee</a>
              </li>
              <li className="hover:text-secondary-fixed transition-colors">
                <Link href="/shop">Care &amp; Preservation</Link>
              </li>
              <li className="hover:text-secondary-fixed transition-colors">
                <Link href="/track-order">Global Insured Shipping</Link>
              </li>
              <li className="hover:text-secondary-fixed transition-colors">
                <a href="#bespoke-atelier">Bespoke Blouse Tailoring</a>
              </li>
              <li className="hover:text-secondary-fixed transition-colors">
                <button
                  type="button"
                  onClick={() => openConsultation()}
                  className="text-left hover:text-secondary-fixed transition-colors cursor-pointer"
                >
                  Private Styling Appointments
                </button>
              </li>
            </ul>
          </div>

          {/* Heritage Boutiques */}
          <div className="lg:col-span-3 space-y-space-sm">
            <h3 className="font-title-lg text-title-lg text-secondary-fixed font-headline-sm uppercase tracking-wider mb-space-md font-bold">
              Heritage Boutiques
            </h3>
            <ul className="space-y-4 font-body-sm text-body-sm text-surface-container-low">
              <li>
                <p className="font-label-caps text-label-caps text-secondary-fixed uppercase tracking-wider font-semibold">
                  Flagship Haveli
                </p>
                <p className="text-primary-fixed">Banjara Hills, Hyderabad, Telangana</p>
              </li>
              <li>
                <p className="font-label-caps text-label-caps text-secondary-fixed uppercase tracking-wider font-semibold">
                  The Royal Suite
                </p>
                <p className="text-primary-fixed">One Style Mile, Mehrauli, New Delhi</p>
              </li>
              <li>
                <p className="font-label-caps text-label-caps text-secondary-fixed uppercase tracking-wider font-semibold">
                  The Chennai Salon
                </p>
                <p className="text-primary-fixed">Khadar Nawaz Khan Rd, Nungambakkam</p>
              </li>
            </ul>
          </div>

          {/* VIP Gazette */}
          <div className="lg:col-span-3 space-y-space-md">
            <h3 className="font-title-lg text-title-lg text-secondary-fixed font-headline-sm uppercase tracking-wider font-bold">
              VIP Atelier Gazette
            </h3>
            <p className="font-body-sm text-body-sm text-primary-fixed">
              Receive private preview privileges to ceremonial weaves, antique zari releases, and trousseau debuts.
            </p>

            {subscribed ? (
              <p className="font-label-caps text-label-caps text-secondary-fixed uppercase tracking-wider">
                Invitation dispatched to your salon correspondence.
              </p>
            ) : (
              <form className="space-y-3" onSubmit={handleSubscribe}>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your royal residence email"
                    className="w-full bg-transparent border-b border-secondary-fixed/50 py-2.5 text-surface font-body-sm text-body-sm placeholder:text-outline-variant focus:outline-none focus:border-secondary-fixed transition-colors pr-8"
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe"
                    className="absolute right-0 top-2 text-secondary-fixed hover:text-on-primary transition-colors p-1"
                  >
                    <IconArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </form>
            )}

            <p className="font-label-sm text-label-sm text-outline-variant uppercase tracking-widest text-[10px]">
              By invitation &amp; discretion only.
            </p>
          </div>
        </div>

        {/* Subfooter */}
        <div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="font-label-caps text-label-caps text-primary-fixed uppercase tracking-widest text-xs">
              © 2025 Sri Vartali Sarees Private Limited. All Royal Rights Reserved.
            </p>
            <p className="font-body-sm text-[12px] text-outline-variant mt-1">
              Handcrafted in India by Master Guild Weavers.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-secondary-fixed font-label-caps text-label-caps tracking-widest uppercase text-xs">
            <span className="flex items-center gap-1.5">
              <IconVerified className="w-4 h-4 text-secondary-fixed" />
              Silk Mark Authenticated
            </span>
            <span className="flex items-center gap-1.5">
              <IconLock className="w-4 h-4 text-secondary-fixed" />
              Concierge Encrypted
            </span>
            <span className="flex items-center gap-1.5">
              <IconPlane className="w-4 h-4 text-secondary-fixed" />
              Global Insured
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
