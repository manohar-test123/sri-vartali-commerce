import type { Metadata } from "next";

import { AdminShell } from "@/components/admin/admin-shell";
import { SetupNotice } from "@/components/client/setup-notice";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Media & image uploads · Super admin" };

/**
 * §9 media integration status (Phase 33 rework) — Cloudinary was replaced
 * by Supabase Storage in Phase 30. This page now shows the actual upload
 * pipeline; the old Cloudinary env vars are listed as optional (they
 * enable CDN transforms on top of Supabase Storage, not the upload itself).
 */
export default async function AdminCloudinaryPage() {
  const session = await getSession();
  if (session.status === "unconfigured") {
    return <SetupNotice title="Media & image uploads" />;
  }
  const role = session.status === "authenticated" ? session.user.role : null;
  if (role !== "SUPER_ADMIN") {
    return (
      <AdminShell area="Integrations" title="Media & image uploads">
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
          SUPER_ADMIN only (§9).
        </p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      area="Integrations"
      title="Media & image uploads"
      intro="Product images upload to Supabase Storage (Phase 30) — Cloudinary was replaced. Uploads work out of the box through the same Supabase project that powers the database."
    >
      {/* Active upload pipeline */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Active · Supabase Storage
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <code className="font-mono text-xs text-wine-900/80">product-media bucket</code>
            <span className="ml-auto text-xs text-emerald-700">active — uploads work from the Client Dashboard</span>
          </li>
        </ul>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-wine-900/70">
          <li>
            The dashboard POSTs to{" "}
            <code className="rounded bg-gold-50 px-1">/api/client/media/upload</code>{" "}
            (client-role gated) → stored at{" "}
            <code className="rounded bg-gold-50 px-1">&lt;productCode&gt;/&lt;timestamp&gt;-&lt;file&gt;</code>{" "}
            with immutable cache headers.
          </li>
          <li>Max 5 MB, images only (JPEG / PNG / WebP / GIF) — enforced at both the API and the bucket.</li>
          <li>Images are publicly served from the Supabase CDN (same origin, no extra service).</li>
        </ul>
      </section>

      {/* Optional Cloudinary for delivery transforms */}
      <section className="mt-6 rounded-2xl border border-wine-900/15 bg-white p-5">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-wine-900/50">
          Optional · Cloudinary delivery transforms
        </h2>
        <p className="mt-3 text-sm leading-6 text-wine-900/70">
          Cloudinary is no longer needed for uploads. If you later want its
          image-optimisation CDN (AVIF/WebP auto-negotiation, width-aware
          derivatives) on top of Supabase Storage, set:
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {[
            "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
            "CLOUDINARY_API_KEY",
            "CLOUDINARY_API_SECRET",
          ].map((label) => (
            <li key={label} className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-2 w-2 shrink-0 rounded-full bg-wine-900/20" />
              <code className="font-mono text-xs text-wine-900/80">{label}</code>
              <span className="ml-auto text-xs text-wine-900/40">optional</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-5 text-wine-900/50">
          These are Vercel project settings (owner action); obtain from{" "}
          <a
            href="https://cloudinary.com/console"
            className="underline decoration-gold-400 underline-offset-2"
            rel="noopener noreferrer"
            target="_blank"
          >
            Cloudinary Console
          </a>
          . Without them, images serve at full uploaded resolution from Supabase.
        </p>
      </section>
    </AdminShell>
  );
}
