-- ==============================================================================
-- Migración: Registro automático de clientes. (Integración N8N -> Supabase)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ==============================================================================

-- 1. Añadimos el origen 'whatsapp_ia' a la tabla de clientes.
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_origen_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_origen_check
  CHECK (origen IN ('asignado', 'landing_propia', 'propio', 'whatsapp_ia'));

-- 2. Función segura que n8n usará para sincronizar clientes.
-- Solo insertará el cliente si no existe previamente el número de teléfono.
CREATE OR REPLACE FUNCTION public.register_client_from_ai(p_phone TEXT, p_name TEXT, p_instance TEXT)
RETURNS json
SECURITY DEFINER
AS $$
DECLARE
  v_asesor_id UUID;
  v_client_id UUID;
BEGIN
  -- Identificamos el Asesor dueño de esa instancia de WhatsApp
  SELECT created_by INTO v_asesor_id
  FROM public.whatsapp_instances
  WHERE instance_name = p_instance;

  -- Comprobamos si el cliente ya está registrado por teléfono
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE phone = p_phone
  LIMIT 1;

  IF v_client_id IS NULL AND v_asesor_id IS NOT NULL THEN
     -- Insertammos el nuevo Lead
     INSERT INTO public.clients (name, phone, status, origen, asesor_id)
     VALUES (COALESCE(p_name, 'Prospecto WhatsApp'), p_phone, 'Nuevo', 'whatsapp_ia', v_asesor_id)
     RETURNING id INTO v_client_id;
     
     RETURN json_build_object('success', true, 'action', 'inserted', 'client_id', v_client_id);
  END IF;

  RETURN json_build_object('success', true, 'action', 'skipped_exists');
END;
$$ LANGUAGE plpgsql;

-- Permisos
GRANT EXECUTE ON FUNCTION public.register_client_from_ai(TEXT, TEXT, TEXT) TO anon, authenticated;
