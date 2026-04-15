-- ==============================================================================
-- Migración: Tabla audit_log para historial de cambios de leads
-- Registra: cambios de estado, asignaciones y descartados
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    text        NOT NULL,   -- 'status_change' | 'assignment_change' | 'discarded'
  client_id     text        NOT NULL,
  client_name   text,
  asesor_id     uuid,                   -- UUID del usuario que hizo el cambio
  asesor_email  text,
  field_changed text,                   -- 'status' | 'assigned_to'
  old_value     text,
  new_value     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Índices de rendimiento ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_asesor_id   ON public.audit_log (asesor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type  ON public.audit_log (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_client_id   ON public.audit_log (client_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Lectura: admins/gerentes ven todo; asesores solo ven sus propias acciones
DROP POLICY IF EXISTS "audit_log_select" ON public.audit_log;
CREATE POLICY "audit_log_select" ON public.audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'master', 'gerente')
    )
    OR asesor_id = auth.uid()
  );

-- Inserción: cualquier usuario autenticado puede registrar eventos
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;
CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
