export default function HomePage() {
  return (
    <div className="flex flex-1">
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gold-600">
          Launching soon
        </p>
        <h1 className="max-w-2xl font-serif text-4xl leading-tight text-wine-900 sm:text-5xl">
          Timeless weaves, crafted for celebration
        </h1>
        <p className="max-w-xl text-base leading-7 text-wine-900/70">
          Sri Vartali Sarees — a premium storefront for handpicked sarees and,
          soon, dresses, kurtis, lehengas and more.
        </p>
        <p className="rounded-full border border-gold-300 bg-ivory-50 px-4 py-1.5 text-xs tracking-wide text-wine-900/60">
          The storefront opens with Phase 4 — the foundation is being laid now.
        </p>
      </section>
    </div>
  );
}
