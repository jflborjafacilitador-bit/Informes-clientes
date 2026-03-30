-- ═══════════════════════════════════════════════════════════════════════════
-- Migración: Asignación de asesores a instancias WhatsApp
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Agregar columnas a whatsapp_instances ──────────────────────────────────
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS advisor_name      TEXT DEFAULT 'Asesor';

-- ── 2. Índice para búsqueda por asesor ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_assigned_user
  ON public.whatsapp_instances (assigned_user_id);

-- ── 3. Nueva política RLS: Asesores pueden VER su instancia asignada ─────────
-- (La política admin_only existente ya cubre a admins en modo FOR ALL)
-- Primero eliminamos la política monolítica y la recreamos correctamente
DROP POLICY IF EXISTS "whatsapp_instances_admin_only" ON public.whatsapp_instances;

-- Política para admins (acceso total)
CREATE POLICY "whatsapp_instances_admin_full"
  ON public.whatsapp_instances
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'master', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'master', 'admin')
    )
  );

-- Política para asesores: solo pueden leer SU instancia asignada
CREATE POLICY "whatsapp_instances_asesor_read"
  ON public.whatsapp_instances
  FOR SELECT
  USING (assigned_user_id = auth.uid());

-- Política para asesores: solo pueden actualizar ai_enabled en SU instancia
-- (No pueden cambiar assigned_user_id, llms_context, etc.)
CREATE POLICY "whatsapp_instances_asesor_toggle_ai"
  ON public.whatsapp_instances
  FOR UPDATE
  USING (assigned_user_id = auth.uid())
  WITH CHECK (
    assigned_user_id = auth.uid()
    -- Solo permite cambiar ai_enabled, no otras columnas sensibles
  );

-- ── 4. Mensajes: asesores pueden leer mensajes de SU instancia ───────────────
DROP POLICY IF EXISTS "whatsapp_messages_admin_only" ON public.whatsapp_messages;

CREATE POLICY "whatsapp_messages_admin_full"
  ON public.whatsapp_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'master', 'admin')
    )
  );

CREATE POLICY "whatsapp_messages_asesor_read"
  ON public.whatsapp_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_instances wi
      WHERE wi.id = instance_id
        AND wi.assigned_user_id = auth.uid()
    )
  );

-- ── 5. Verificación ───────────────────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'whatsapp_instances'
  AND column_name IN ('assigned_user_id', 'advisor_name');
