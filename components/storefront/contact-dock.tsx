/**
 * Persistent supplier contact dock (WhatsApp + phone) — present on every
 * storefront page. Mobile gets a fixed two-button bottom bar (thumb zone,
 * safe-area aware); desktop gets compact floating buttons in the bottom
 * right. Plain <a> links, so it works without JavaScript.
 *
 * Rendered by the storefront layout only when a supplier number is
 * configured; the layout adds a matching mobile spacer so the bar never
 * covers footer content.
 */

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

export function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 1.955l-1.293.97c-.138.102-.234.263-.234.43 0 .159.065.31.171.42a13.13 13.13 0 0 0 6.72 3.782c.19.048.393-.017.521-.179l.947-1.164a1.875 1.875 0 0 1 1.995-.443l4.207 1.402c.79.264 1.32 1.008 1.32 1.837v1.372a3 3 0 0 1-3 3c-9.442 0-17.09-7.648-17.09-17.09Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function ContactDock({
  whatsappUrl,
  phoneUrl,
}: {
  whatsappUrl: string;
  phoneUrl: string;
}) {
  return (
    <>
      {/* Mobile: fixed two-button bottom bar (thumb reach). */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-wine-900/15 bg-ivory-50/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 bg-[#25D366] py-3 text-sm font-semibold text-white transition active:brightness-95"
        >
          <WhatsAppIcon className="h-5 w-5" />
          WhatsApp
        </a>
        <a
          href={phoneUrl}
          className="flex items-center justify-center gap-2 bg-wine-900 py-3 text-sm font-semibold text-ivory-50 transition active:bg-wine-800"
        >
          <PhoneIcon className="h-5 w-5" />
          Call us
        </a>
      </div>

      {/* Desktop: floating round buttons, bottom right. */}
      <div className="fixed bottom-6 right-6 z-40 hidden flex-col items-end gap-3 sm:flex">
        <a
          href={phoneUrl}
          aria-label="Call the store"
          title="Call the store"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-wine-900/15 bg-ivory-50 text-wine-900 shadow-lg shadow-wine-900/15 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
        >
          <PhoneIcon className="h-5 w-5" />
        </a>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          title="Chat on WhatsApp"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40 transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
        >
          <WhatsAppIcon className="h-7 w-7" />
        </a>
      </div>
    </>
  );
}
