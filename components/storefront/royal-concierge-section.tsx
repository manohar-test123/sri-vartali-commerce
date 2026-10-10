"use client";

import { useState } from "react";
import { useRoyal } from "./royal-context";
import {
  IconDiamond,
  IconVideo,
  IconPalette,
  IconUsers,
  IconBoxArchive,
  IconWhatsApp,
} from "./royal-icons";

export function RoyalConciergeSection() {
  const { openConsultation } = useRoyal();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    date: "",
    salon: "Virtual High-Definition Video Call",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="w-full py-space-2xl bg-primary text-on-primary relative overflow-hidden" id="bespoke-atelier">
      {/* Fine Gilded Ambient Backdrop Graphics */}
      <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-secondary-fixed/5 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-primary-container blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-gutter-mobile lg:px-gutter-desktop relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-center">
          {/* Left: VIP Concierge Narrative */}
          <div className="lg:col-span-7 space-y-space-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-lowest/10 backdrop-blur-sm border border-secondary-fixed-dim/30">
              <IconDiamond className="w-2.5 h-2.5 text-secondary-fixed" />
              <span className="font-label-caps text-label-caps text-secondary-fixed uppercase tracking-[0.2em] font-semibold">
                Bespoke Bridal Atelier
              </span>
            </div>

            <h2 className="font-headline-lg text-headline-lg text-surface-container-lowest font-medium tracking-tight">
              A Royal Bridal Experience Crafted Solely for You
            </h2>

            <p className="font-body-md text-body-md text-primary-fixed leading-relaxed font-light">
              Plan your wedding ensemble with our senior couturiers. Whether you envision a rare vermilion dye referenced from family archives or bespoke wedding initials hand-interlocked into the golden pallu, our private concierge attends to every bespoke desire.
            </p>

            {/* 4 Concierge Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md pt-2">
              <div className="flex items-start gap-3">
                <IconVideo className="w-6 h-6 text-secondary-fixed shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-label-md text-label-md text-surface font-semibold">
                    1-on-1 Loom Live Stream
                  </h3>
                  <p className="font-body-sm text-body-sm text-primary-fixed/80 mt-0.5">
                    Witness your saree being woven in real time from Kanchipuram pit looms.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <IconPalette className="w-6 h-6 text-secondary-fixed shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-label-md text-label-md text-surface font-semibold">
                    Bespoke Blouse Couture
                  </h3>
                  <p className="font-body-sm text-body-sm text-primary-fixed/80 mt-0.5">
                    Hand-embroidered zardozi and aari work tailored exactly to your silhouette.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <IconUsers className="w-6 h-6 text-secondary-fixed shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-label-md text-label-md text-surface font-semibold">
                    Complete Trousseau Suite
                  </h3>
                  <p className="font-body-sm text-body-sm text-primary-fixed/80 mt-0.5">
                    Harmonized styling for mother, sisters, and wedding party drapes.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <IconBoxArchive className="w-6 h-6 text-secondary-fixed shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-label-md text-label-md text-surface font-semibold">
                    Teakwood Keepsake Box
                  </h3>
                  <p className="font-body-sm text-body-sm text-primary-fixed/80 mt-0.5">
                    Delivered in pure brass-latched neem &amp; teak heirloom preservation vault.
                  </p>
                </div>
              </div>
            </div>

            {/* Dual VIP Action Buttons */}
            <div className="pt-space-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <button
                type="button"
                onClick={() => openConsultation()}
                className="px-8 py-4 bg-secondary-fixed text-on-secondary-fixed font-label-caps text-label-caps uppercase tracking-[0.16em] font-bold hover:bg-secondary-fixed-dim transition-colors shadow-lg text-center"
              >
                Schedule Video Walkthrough
              </button>

              <a
                href="https://wa.me/919876543210?text=Namaste%2C%20I%20would%20like%20to%20inquire%20about%20a%20private%20bridal%20trousseau%20consultation%20with%20Sri%20Vartali."
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-4 bg-surface-container-lowest/10 backdrop-blur-md text-surface font-label-caps text-label-caps uppercase tracking-[0.16em] hover:bg-surface-container-lowest hover:text-primary transition-all text-center flex items-center justify-center gap-2 border border-surface-container-lowest/20"
              >
                <IconWhatsApp className="w-[18px] h-[18px] text-secondary-fixed" />
                <span>Chat with Senior Stylist</span>
              </a>
            </div>
          </div>

          {/* Right: Elegant Concierge Interactive Card */}
          <div className="lg:col-span-5 bg-surface text-on-surface p-space-lg lg:p-space-xl shadow-2xl border border-secondary-fixed-dim/30">
            <div className="space-y-space-md">
              <div>
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-[0.2em] font-semibold">
                  Direct Atelier Line
                </span>
                <h3 className="font-headline-sm text-headline-sm text-primary mt-1 font-bold">
                  Book Your Private Appointment
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Reserve a salon viewing at our Banjara Hills, Delhi, or Chennai suites.
                </p>
              </div>

              {submitted ? (
                <div className="p-6 bg-surface-container-low border border-secondary-fixed-dim/40 space-y-3 text-center">
                  <span className="w-3 h-3 rotate-45 bg-secondary inline-block" />
                  <h4 className="font-headline-sm text-primary font-bold">
                    VIP Reservation Confirmed
                  </h4>
                  <p className="font-body-sm text-on-surface-variant">
                    Namaste {formData.name || "Patron"}. A senior trousseau advisor has reserved your slot and will connect via WhatsApp within 2 business hours.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ name: "", phone: "", date: "", salon: "Virtual High-Definition Video Call" });
                    }}
                    className="text-xs uppercase font-label-caps text-primary underline pt-2 inline-block font-semibold"
                  >
                    Book Another Session
                  </button>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold text-[10px]">
                      Patron Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Smt. Radhika Somani"
                      className="w-full bg-surface-container-low px-4 py-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/30"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold text-[10px]">
                        Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 98450 ..."
                        className="w-full bg-surface-container-low px-4 py-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/30"
                      />
                    </div>

                    <div>
                      <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold text-[10px]">
                        Wedding Date
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full bg-surface-container-low px-4 py-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold text-[10px]">
                      Preferred Consultation
                    </label>
                    <select
                      value={formData.salon}
                      onChange={(e) => setFormData({ ...formData, salon: e.target.value })}
                      className="w-full bg-surface-container-low px-4 py-3 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/30 cursor-pointer"
                    >
                      <option>Virtual High-Definition Video Call</option>
                      <option>Banjara Hills Flagship Haveli, Hyderabad</option>
                      <option>The Royal Suite, Mehrauli, New Delhi</option>
                      <option>The Chennai Salon, Nungambakkam</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-[0.16em] hover:bg-primary-container transition-colors font-semibold shadow-md"
                  >
                    Confirm VIP Reservation
                  </button>
                </form>
              )}

              <p className="font-label-sm text-label-sm text-center text-on-surface-variant uppercase tracking-widest text-[10px]">
                Guaranteed Confidentiality • Complimentary Styling
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
