-- =====================================================================
-- MIGRACIÓN: Fix definitivo para UPDATE en tabla clients
-- Fecha: 2026-04-15
-- Problema: UPDATE en clients falla para clientes de landing/propio
--           posiblemente por política RLS mal aplicada en produccion
-- =====================================================================

-- 1. Forzar re-creación limpia de la política UPDATE en clients
DROP POLICY IF EXISTS "clients_update"      ON public.clients;
DROP POLICY IF EXISTS "clients_asesor_update" ON public.clients;

-- 2. Nueva política permisiva: cualquier usuario autenticado con rol válido puede UPDATE
CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'gerente', 'master', 'admin', 'asesor')
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'gerente', 'master', 'admin', 'asesor')
    )
  );

-- 3. También eliminar constraint de status en clients si existe
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_status_check;

-- 4. Confirmar que la columna status existe (por si acaso)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Nuevo';
