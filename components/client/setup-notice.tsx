/**
 * Shown by dashboard pages when Supabase env vars are absent (fresh clone).
 * Matches the notice pattern on /client — actionable instead of a crash.
 */
export function SetupNotice({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-serif text-3xl text-wine-900">{title}</h1>
      <p className="mt-3 max-w-lg text-sm leading-6 text-wine-900/70">
        Supabase is not configured. Fill{" "}
        <code className="rounded bg-gold-50 px-1">.env.local</code> from{" "}
        <code className="rounded bg-gold-50 px-1">.env.example</code> and apply{" "}
        <code className="rounded bg-gold-50 px-1">supabase/migrations/20261002150000_init_schema.sql</code>{" "}
        first — the dashboard pages activate automatically once configured.
      </p>
    </div>
  );
}
