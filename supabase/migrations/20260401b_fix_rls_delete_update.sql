-- =====================================================================
-- MIGRACIÓN: Completar políticas RLS en clients
-- Fecha: 2026-04-01 (parche 2)
-- Problema: Faltaba política DELETE; INSERT de master bloqueado por asesor_id check
-- =====================================================================

-- 1. DELETE: super_admin y master pueden eliminar cualquier registro
DROP POLICY IF EXISTS "clients_admin_delete" ON public.clients;
CREATE POLICY "clients_admin_delete" ON public.clients
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'master')
    )
  );

-- 2. INSERT: ampliar para que master/super_admin/gerente puedan insertar
--    con origen 'propio' sin estar restringidos al asesor_id = auth.uid()
DROP POLICY IF EXISTS "clients_asesor_insert_propio" ON public.clients;

-- Para asesores normales: su propio asesor_id
CREATE POLICY "clients_asesor_insert_propio" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    origen = 'propio'
    AND (
      -- Asesores solo pueden insertar sus propios clientes
      (
        EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'asesor')
        AND asesor_id = auth.uid()
      )
      OR
      -- Admins y masters pueden insertar para cualquier asesor
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role IN ('super_admin', 'gerente', 'master', 'admin')
      )
    )
  );

-- 3. UPDATE: asegurar que también puedan actualizar registros de otros
DROP POLICY IF EXISTS "clients_update" ON public.clients;
CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'gerente', 'master', 'admin', 'asesor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'gerente', 'master', 'admin', 'asesor')
    )
  );
