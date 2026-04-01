-- =====================================================================
-- MIGRACIÓN: Corrección de políticas RLS para clients
-- Fecha: 2026-04-01
-- Problema: 1) rol 'master' no puede SELECT ni INSERT en clients
--           2) INSERT anónimo de landing falla cuando incluye asesor_id
--           3) Botón "Nuevo Contacto" invisible para 'master'
-- =====================================================================

-- 1. Eliminar políticas antiguas que excluyen 'master'
DROP POLICY IF EXISTS "clients_admin_select" ON public.clients;
DROP POLICY IF EXISTS "clients_anon_insert_landing" ON public.clients;
DROP POLICY IF EXISTS "clients_asesor_insert_propio" ON public.clients;

-- 2. SELECT: super_admin, gerente, master y admin pueden ver todos
CREATE POLICY "clients_admin_select" ON public.clients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'gerente', 'master', 'admin')
    )
  );

-- 3. SELECT: asesor solo ve sus propios clientes (asignados o de su landing)
DROP POLICY IF EXISTS "clients_asesor_select" ON public.clients;
CREATE POLICY "clients_asesor_select" ON public.clients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'asesor'
    )
    AND (
      asesor_id = auth.uid()
    )
  );

-- 4. INSERT anónimo para landing page (ahora permite asesor_id NOT NULL)
CREATE POLICY "clients_anon_insert_landing" ON public.clients
  FOR INSERT TO anon
  WITH CHECK (
    origen = 'landing_propia'
  );

-- 5. INSERT autenticado para contactos propios (manual: Nuevo Contacto)
--    Aplica a asesor, master, super_admin, gerente
CREATE POLICY "clients_asesor_insert_propio" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    origen = 'propio'
    AND asesor_id = auth.uid()
  );

-- 6. Asegurar que 'master' también pueda INSERT con origen 'propio'
-- (cubierto por la política anterior ya que es authenticated)

-- 7. UPDATE: autenticados pueden actualizar su propio registro de cliente
DROP POLICY IF EXISTS "clients_update" ON public.clients;
CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'gerente', 'master', 'admin', 'asesor')
    )
  );
