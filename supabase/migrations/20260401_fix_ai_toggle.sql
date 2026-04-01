-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: Fix toggle ai_enabled + activar ventas-digital
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Forzar ai_enabled = true para ventas-digital (fix inmediato)
UPDATE public.whatsapp_instances
SET ai_enabled = true, updated_at = now()
WHERE instance_name = 'ventas-digital';

-- Verificar
SELECT instance_name, ai_enabled FROM public.whatsapp_instances
WHERE instance_name IN ('ventas-digital', 'admin-prueba', 'lborja');

-- 2. Crear RPC set_ai_enabled (SECURITY DEFINER) para que el frontend pueda
--    actualizar sin depender del RLS del usuario actual
CREATE OR REPLACE FUNCTION public.set_ai_enabled(
  p_instance_name TEXT,
  p_enabled       BOOLEAN
)
RETURNS json
SECURITY DEFINER
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  UPDATE public.whatsapp_instances
  SET    ai_enabled  = p_enabled,
         updated_at  = now()
  WHERE  instance_name = p_instance_name;
  
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  
  RETURN json_build_object(
    'success', v_rows > 0,
    'rows_updated', v_rows,
    'instance_name', p_instance_name,
    'ai_enabled', p_enabled
  );
END;
$$ LANGUAGE plpgsql;

-- Permisos para anon y authenticated
GRANT EXECUTE ON FUNCTION public.set_ai_enabled(TEXT, BOOLEAN) TO anon, authenticated;
