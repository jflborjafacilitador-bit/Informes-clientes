-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: Actualizar Función RPC para devolver el contexto de la IA
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_ai_enabled(p_instance_name TEXT)
RETURNS json
SECURITY DEFINER
AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Consultar la tabla para obtener ais_enabled y llms_context
  SELECT ai_enabled, llms_context INTO v_record
  FROM public.whatsapp_instances
  WHERE instance_name = p_instance_name;
  
  -- Si el registro no existe o es NULL, devolvemos false envuelto en json
  RETURN json_build_object(
    'enabled', COALESCE(v_record.ai_enabled, false),
    'context', COALESCE(v_record.llms_context, '')
  );
END;
$$ LANGUAGE plpgsql;

-- Nos aseguramos de dar permisos de ejecución a los roles anónimos y autenticados
GRANT EXECUTE ON FUNCTION public.is_ai_enabled(TEXT) TO anon, authenticated;
