"use client";

import { useState } from "react";
import { useRoyal } from "./royal-context";
import { IconClose, IconDiamond } from "./royal-icons";

export function RoyalConsultationModal() {
  const { consultationOpen, closeConsultation, consultationWeave } = useRoyal();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [weave, setWeave] = useState(consultationWeave);
  const [submitted, setSubmitted] = useState(false);

  if (!consultationOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setName("");
      setPhone("");
      closeConsultation();
    }, 2800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/70 backdrop-blur-sm animate-fade-in"
      onClick={closeConsultation}
    >
      <div
        className="relative w-full max-w-lg bg-surface p-space-lg lg:p-space-xl text-on-surface shadow-2xl border border-secondary-fixed-dim/40 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeConsultation}
          className="absolute top-4 right-4 p-2 text-on-surface hover:text-primary transition-colors"
          aria-label="Close consultation modal"
        >
          <IconClose className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <span className="w-3 h-3 rotate-45 bg-secondary inline-block" />
            <h3 className="font-headline-sm text-primary font-bold">
              Royal Consultation Requested
            </h3>
            <p className="font-body-sm text-on-surface-variant max-w-sm mx-auto">
              Thank you, {name || "Patron"}. A royal bridal coordinator will reach out via WhatsApp at {phone} within 2 business hours.
            </p>
          </div>
        ) : (
          <div className="space-y-space-md">
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2 text-secondary">
                <IconDiamond className="w-2 h-2 text-secondary" />
                <span className="font-label-caps text-label-caps text-secondary uppercase tracking-[0.2em] font-semibold">
                  Sri Vartali Atelier
                </span>
                <IconDiamond className="w-2 h-2 text-secondary" />
              </div>

              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                Private Bridal Consultation
              </h3>

              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Connect with a senior draper for customized color selection and loom slots.
              </p>
            </div>

            <form className="space-y-3.5" onSubmit={handleSubmit}>
              <div>
                <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold text-[10px]">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Smt. Radhika Somani"
                  className="w-full bg-surface-container-low px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:bg-surface-container border border-outline-variant/30"
                />
              </div>

              <div>
                <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold text-[10px]">
                  WhatsApp Contact
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98450 ..."
                  className="w-full bg-surface-container-low px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:bg-surface-container border border-outline-variant/30"
                />
              </div>

              <div>
                <label className="block font-label-caps text-label-caps uppercase text-on-surface-variant mb-1 font-semibold text-[10px]">
                  Select Weave of Interest
                </label>
                <select
                  value={weave}
                  onChange={(e) => setWeave(e.target.value)}
                  className="w-full bg-surface-container-low px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:bg-surface-container border border-outline-variant/30 cursor-pointer"
                >
                  <option>Bridal Korvai Kanjivaram</option>
                  <option>Varanasi Kadwa &amp; Jangla</option>
                  <option>Pure 24k Gold Tissue</option>
                  <option>Full Trousseau Curation</option>
                  <option>Bespoke Weaving</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-primary text-on-primary font-label-caps text-label-caps uppercase tracking-wider font-semibold hover:bg-primary-container transition-colors mt-2 shadow-md"
              >
                Request Private Appointment
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
