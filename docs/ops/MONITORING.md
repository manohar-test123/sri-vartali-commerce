# Monitoring — what exists, what needs the owner (Phase 11)

## Already in place (no accounts needed)

- **`GET /api/health`** — liveness + config probe
  (`{ status, configured: { supabase }, time }`). Not authenticated, safe
  to poll from any uptime service.
- **CI** — the `Typecheck · Lint · Build` job gates every PR; a red main
  is visible in the Actions tab.
- **`Backup DB schema` workflow** — its failure (or silence past a week)
  means the backup posture broke; check the Actions tab after Mondays.
- **WhatsApp send/logging** — every outbound attempt lands in
  `whatsapp_messages` with status; failures are visible in
  `/client` dashboards once volume exists (spec §43).

## Owner setup steps (free tiers, ~5 minutes each)

### 1. Uptime monitor (UptimeRobot or Better Stack free)

1. Go to <https://uptimerobot.com> (or betterstack.com) → sign up free.
2. Add a monitor → type **HTTP(s)** → URL
   `https://sri-vartali-commerce.vercel.app/api/health`
   → interval **30 min** (10 min on Better Stack free) → create.
3. Optional second monitor on `https://sri-vartali-commerce.vercel.app/`
   (catches render failures the JSON probe won't).
4. Set the alert email/phone — that inbox is the "site is down" channel.

### 2. Vercel Web Analytics (traffic, free on Hobby)

1. <https://vercel.com/> → project **sri-vartali-commerce** → **Analytics**
   tab → **Enable** (free tier is enough; no cookie banner needed — it is
   privacy-friendly, no personal data).
2. Nothing else to do — page views start recording on the next deploy.

### 3. Weekly glance (2 minutes)

- Vercel dashboard → **Deployments**: latest main deploy is green.
- GitHub → **Actions**: `Backup DB schema` last ran green within 7 days.
- Supabase dashboard → **Database → Backups**: platform backups listing.

## Not monitored (accepted gaps on Free)

- No error tracking (Sentry etc.) — Vercel's function logs (Dashboard →
  project → Logs) cover runtime errors when investigating manually.
- No alerting on the WhatsApp send path while Meta wiring is deferred.
- Org-level audit log is a paid GitHub feature; per AGENTS.md,
  `AUDITLOG.md` discipline substitutes.
