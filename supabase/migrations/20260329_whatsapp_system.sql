-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: Sistema WhatsApp AI Agent — Los Quetzales
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Tabla principal de instancias de WhatsApp ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name        TEXT UNIQUE NOT NULL,
  phone_label          TEXT NOT NULL,
  phone_number         TEXT,
  status               TEXT NOT NULL DEFAULT 'disconnected'
                         CHECK (status IN ('disconnected','qr_ready','connected','error')),
  qr_code              TEXT,
  evolution_instance_id TEXT,
  n8n_workflow_id      TEXT,
  webhook_url          TEXT,
  llms_context         TEXT DEFAULT '',
  ai_enabled           BOOLEAN NOT NULL DEFAULT false,
  ai_model             TEXT NOT NULL DEFAULT 'deepseek-chat',
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Tabla de log de mensajes ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id   UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  phone_from    TEXT NOT NULL,
  phone_name    TEXT,
  message_in    TEXT NOT NULL,
  message_out   TEXT,
  responded_by  TEXT NOT NULL DEFAULT 'ai'
                  CHECK (responded_by IN ('ai','manual','none')),
  tokens_used   INTEGER,
  latency_ms    INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. Índices de rendimiento ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_instance_id
  ON public.whatsapp_messages (instance_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at
  ON public.whatsapp_messages (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_from
  ON public.whatsapp_messages (phone_from);

-- ── 4. Función de trigger para updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 5. Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages  ENABLE ROW LEVEL SECURITY;

-- Solo super_admin, master y admin tienen acceso
CREATE POLICY "whatsapp_instances_admin_only"
  ON public.whatsapp_instances
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'master', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'master', 'admin')
    )
  );

CREATE POLICY "whatsapp_messages_admin_only"
  ON public.whatsapp_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'master', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'master', 'admin')
    )
  );

-- ── 6. Realtime: habilitar para ambas tablas ──────────────────────────────────
-- (Ejecutar en: Supabase Dashboard → Database → Replication → Tables)
-- O manualmente con:
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;

-- ── 7. Verificación ───────────────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('whatsapp_instances', 'whatsapp_messages');
