"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type CurrencyCode = "INR" | "USD" | "GBP" | "AED";

export interface SareeDetail {
  id: string;
  name: string;
  title: string;
  category: string;
  atelier: string;
  stockNote: string;
  description: string;
  priceInr: number;
  image: string;
  loomHours: number;
  zariType: string;
  silkType: string;
  badge1: string;
  badge2: string;
  craftLineage: string;
  certification: string;
}

interface RoyalContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (inr: number) => { primary: string; secondary: string };
  wishlistCount: number;
  toggleWishlist: (id: string, name?: string) => void;
  isWishlisted: (id: string) => boolean;
  cartCount: number;
  addToBag: (saree: { id: string; name: string; priceInr: number }) => void;
  consultationOpen: boolean;
  openConsultation: (preferredWeave?: string) => void;
  closeConsultation: () => void;
  consultationWeave: string;
  provenanceSaree: SareeDetail | null;
  openProvenance: (saree: SareeDetail) => void;
  closeProvenance: () => void;
  labSampleOpen: boolean;
  openLabSample: () => void;
  closeLabSample: () => void;
  toastMessage: string | null;
}

const RoyalContext = createContext<RoyalContextType | null>(null);

const RATES: Record<CurrencyCode, { rate: number; symbol: string; suffix?: string; prefix?: string }> = {
  INR: { rate: 1, symbol: "₹", prefix: "₹" },
  USD: { rate: 0.012, symbol: "$", prefix: "$" },
  GBP: { rate: 0.0095, symbol: "£", prefix: "£" },
  AED: { rate: 0.044, symbol: "AED", suffix: " د.إ" },
};

export function RoyalProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>("INR");
  const [wishlist, setWishlist] = useState<string[]>(["mayura-kadwa", "agnihotra-crimson", "chandramukhi-tissue"]);
  const [cartCount, setCartCount] = useState<number>(1);
  const [consultationOpen, setConsultationOpen] = useState(false);
  const [consultationWeave, setConsultationWeave] = useState("Bridal Korvai Kanjivaram");
  const [provenanceSaree, setProvenanceSaree] = useState<SareeDetail | null>(null);
  const [labSampleOpen, setLabSampleOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  const toggleWishlist = (id: string, name?: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(id);
      if (exists) {
        showToast(`Removed ${name || "saree"} from royal wishlist`);
        return prev.filter((item) => item !== id);
      } else {
        showToast(`Added ${name || "saree"} to your imperial wishlist`);
        return [...prev, id];
      }
    });
  };

  const isWishlisted = (id: string) => wishlist.includes(id);

  const addToBag = (saree: { id: string; name: string; priceInr: number }) => {
    setCartCount((c) => c + 1);
    showToast(`Acquired: "${saree.name}" placed in royal trousseau bag`);
  };

  const openConsultation = (preferredWeave?: string) => {
    if (preferredWeave) setConsultationWeave(preferredWeave);
    setConsultationOpen(true);
  };

  const closeConsultation = () => setConsultationOpen(false);

  const openProvenance = (saree: SareeDetail) => {
    setProvenanceSaree(saree);
  };

  const closeProvenance = () => setProvenanceSaree(null);

  const openLabSample = () => setLabSampleOpen(true);
  const closeLabSample = () => setLabSampleOpen(false);

  const formatPrice = (inr: number) => {
    const inrStr = `₹${inr.toLocaleString("en-IN")}`;
    const usd = Math.round(inr * 0.012);
    const usdStr = `($${usd.toLocaleString("en-US")} USD)`;

    if (currency === "INR") {
      return { primary: inrStr, secondary: usdStr };
    }
    const cfg = RATES[currency];
    const converted = Math.round(inr * cfg.rate);
    const formatted = cfg.prefix
      ? `${cfg.prefix}${converted.toLocaleString("en-US")}`
      : `${converted.toLocaleString("en-US")}${cfg.suffix ?? ""}`;
    return { primary: formatted, secondary: `(${inrStr})` };
  };

  return (
    <RoyalContext.Provider
      value={{
        currency,
        setCurrency,
        formatPrice,
        wishlistCount: wishlist.length,
        toggleWishlist,
        isWishlisted,
        cartCount,
        addToBag,
        consultationOpen,
        openConsultation,
        closeConsultation,
        consultationWeave,
        provenanceSaree,
        openProvenance,
        closeProvenance,
        labSampleOpen,
        openLabSample,
        closeLabSample,
        toastMessage,
      }}
    >
      {children}
      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-primary text-on-primary px-5 py-3.5 shadow-2xl border border-secondary-fixed-dim/40 animate-fade-in font-label-md text-label-md tracking-wider">
          <span className="w-2 h-2 rotate-45 bg-secondary-fixed inline-block"></span>
          <span>{toastMessage}</span>
        </div>
      ) : null}
    </RoyalContext.Provider>
  );
}

export function useRoyal() {
  const context = useContext(RoyalContext);
  if (!context) {
    throw new Error("useRoyal must be used within a RoyalProvider");
  }
  return context;
}
