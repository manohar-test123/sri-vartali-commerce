import Link from "next/link";

/**
 * Shared §9 admin shell: same wine/gold/ivory language as /client, with the
 * area's sub-navigation. proxy.ts gates /admin/* to SUPER_ADMIN (and RLS
 * gates every query beneath); the shell itself stays presentational.
 */

const SECTIONS: Array<{ href: string; label: string }> = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/client", label: "Client account" },
  { href: "/admin/integrations/whatsapp", label: "WhatsApp" },
  { href: "/admin/integrations/cloudinary", label: "Cloudinary" },
  { href: "/admin/logs", label: "Message log" },
  { href: "/admin/webhooks", label: "Webhooks" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/system", label: "System" },
];

export function AdminShell({
  area,
  title,
  intro,
  children,
}: {
  area: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-ivory-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-xs uppercase tracking-[0.2em] text-gold-600">{area}</p>
        <h1 className="mt-2 font-serif text-3xl text-wine-900">{title}</h1>
        {intro ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-wine-900/70">{intro}</p>
        ) : null}

        <nav
          aria-label="Admin sections"
          className="mt-6 flex flex-wrap gap-2 text-sm"
        >
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-full border border-wine-900/20 bg-white px-4 py-1.5 text-wine-900/70 transition-colors hover:border-gold-400 hover:text-wine-900"
            >
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
