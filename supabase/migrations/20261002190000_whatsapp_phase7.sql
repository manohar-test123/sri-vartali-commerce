-- ============================================================================
-- Sri Vartali — Phase 7: WhatsApp (spec §29-§31, §43-§44, §54 Phase 7)
-- ============================================================================
-- The whatsapp_messages / webhook_events / store_settings tables ship with
-- the init schema (Phase 1); Phase 7 only adds the lookup path the webhook
-- needs: provider status callbacks (sent/delivered/read/failed) resolve the
-- sent row by provider_message_id on every delivery.
-- Idempotent: safe to re-run (and through the GitHub integration on merge).
-- ----------------------------------------------------------------------------

create index if not exists idx_whatsapp_messages_provider_id
  on public.whatsapp_messages (provider_message_id)
  where provider_message_id is not null;
