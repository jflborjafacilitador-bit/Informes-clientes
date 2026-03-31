-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: Función RPC para revisar estado de IA desde N8N de forma segura
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Esta función permite a N8N consultar el valor de "ai_enabled" usando la 
-- llave anon/publica, saltándose el RLS de la tabla (SECURITY DEFINER)
-- solo de solo lectura para esta pregunta específica, lo cual previene brechas de seguridad.

CREATE OR REPLACE FUNCTION public.is_ai_enabled(p_instance_name TEXT)
RETURNS json
SECURITY DEFINER
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  -- Consultar la tabla
  SELECT ai_enabled INTO v_enabled
  FROM public.whatsapp_instances
  WHERE instance_name = p_instance_name;
  
  -- Si el registro no existe o es NULL, devolvemos false envuelto en json
  RETURN json_build_object('enabled', COALESCE(v_enabled, false));
END;
$$ LANGUAGE plpgsql;

-- Nos aseguramos de dar permisos de ejecución a los roles anónimos y autenticados
GRANT EXECUTE ON FUNCTION public.is_ai_enabled(TEXT) TO anon, authenticated;
