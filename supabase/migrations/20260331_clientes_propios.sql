-- ==============================================================================
-- Migración: Registro manual de clientes "Propios" por Asesores
-- Permite un tercer tipo de origen y habilita la inserción autenticada.
-- ==============================================================================

-- 1. Actualizar el CHECK CONSTRAINT de origen
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_origen_check;

ALTER TABLE public.clients ADD CONSTRAINT clients_origen_check
  CHECK (origen IN ('asignado', 'landing_propia', 'propio'));

-- 2. Nueva política RLS para permitir a los asesores insertar
-- Solo pueden insertarse a sí mismos como asesor y el origen debe ser "propio"
DROP POLICY IF EXISTS "clients_asesor_insert_propio" ON public.clients;
CREATE POLICY "clients_asesor_insert_propio"
ON public.clients FOR INSERT
WITH CHECK (
    origen = 'propio' 
    AND asesor_id = auth.uid()
);
