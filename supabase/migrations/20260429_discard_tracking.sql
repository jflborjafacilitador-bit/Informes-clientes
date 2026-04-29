-- ==============================================================================
-- Migración: Trazabilidad de descartados por asesor
-- Agrega columnas para saber de qué asesor era el cliente cuando fue descartado
-- ==============================================================================

-- ── 1. client_overrides: guardar asesor anterior al descartar ──────────────────
ALTER TABLE public.client_overrides
  ADD COLUMN IF NOT EXISTS discarded_from_asesor text DEFAULT NULL;

COMMENT ON COLUMN public.client_overrides.discarded_from_asesor IS
  'Email del asesor que tenía asignado el cliente justo antes de ser descartado. Se preserva incluso tras reactivar.';

CREATE INDEX IF NOT EXISTS idx_overrides_discarded_asesor
  ON public.client_overrides (discarded_from_asesor)
  WHERE discarded_from_asesor IS NOT NULL;

-- ── 2. audit_log: columna extra_context para contexto enriquecido ──────────────
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS extra_context jsonb DEFAULT NULL;

COMMENT ON COLUMN public.audit_log.extra_context IS
  'Contexto adicional. Para discarded: { "from_asesor": "email", "from_status": "estado" }';

CREATE INDEX IF NOT EXISTS idx_audit_log_extra_context
  ON public.audit_log USING gin (extra_context)
  WHERE extra_context IS NOT NULL;
