export function RoyalEditorialRibbon() {
  return (
    <div className="w-full bg-surface-container-low py-6 px-margin-mobile lg:px-margin-desktop border-y border-outline-variant/20">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div className="flex items-center gap-3">
          <span className="w-8 h-px bg-secondary" />
          <p className="font-label-caps text-label-caps uppercase tracking-[0.2em] text-secondary font-semibold">
            Provenance • Dignity • Timeless Grandeur
          </p>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant italic">
          Every drape holds a lineage woven through 400 hours of singular artisan dedication.
        </p>
        <div className="hidden md:flex items-center gap-2 text-primary">
          <span className="w-2 h-2 rotate-45 bg-primary inline-block" />
          <span className="font-label-caps text-label-caps uppercase tracking-wider text-primary font-semibold">
            Couture Archival Vault
          </span>
        </div>
      </div>
    </div>
  );
}
