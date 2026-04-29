-- ==============================================================================
-- Migración: Backfill de discarded_from_asesor para clientes ya descartados
-- Reconstruye quién tenía el cliente buscando el último assignment_change
-- en audit_log anterior al evento de descarte de cada cliente.
-- ==============================================================================

-- ── Actualizar client_overrides descartados sin asesor registrado ──────────────
UPDATE public.client_overrides co
SET discarded_from_asesor = (
    SELECT al.new_value
    FROM   public.audit_log al
    WHERE  al.client_id      = co.client_id
      AND  al.event_type     = 'assignment_change'
      AND  al.new_value NOT IN ('Sin asignar', 'pendiente', 'Descartado', 'descartado', '')
      AND  al.new_value      LIKE '%@%'        -- debe ser un email real
    ORDER  BY al.created_at DESC
    LIMIT  1
)
WHERE co.assigned_email       = 'descartado'
  AND co.discarded_from_asesor IS NULL;

-- ── Verificación (ejecutar para ver cuántos quedaron sin resolver) ─────────────
-- SELECT count(*) FROM public.client_overrides
-- WHERE assigned_email = 'descartado' AND discarded_from_asesor IS NULL;
