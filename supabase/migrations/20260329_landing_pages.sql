-- ==============================================================================
-- Migración: Sistema de Landing Pages de Asesores y CRM Propios/Asignados
-- VERSIÓN IDEMPOTENTE: Se puede ejecutar múltiples veces sin errores
-- Roles correctos: super_admin, gerente (según el sistema real)
-- ==============================================================================

-- ============================================================
-- 1. TABLA user_landing_configs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_landing_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    whatsapp_instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
    n8n_webhook_url TEXT,
    welcome_message TEXT DEFAULT '¡Hola! ☀️ Soy el Asistente Digital de Residencial Los Quetzales. Recibimos tu registro desde mi página. ¿En qué te puedo ayudar hoy?',
    asesor_display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- Restricciones UNIQUE idempotentes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_landing_configs_user_id_key'
  ) THEN
    ALTER TABLE public.user_landing_configs ADD CONSTRAINT user_landing_configs_user_id_key UNIQUE (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_landing_configs_slug_key'
  ) THEN
    ALTER TABLE public.user_landing_configs ADD CONSTRAINT user_landing_configs_slug_key UNIQUE (slug);
  END IF;
END $$;

-- RLS
ALTER TABLE public.user_landing_configs ENABLE ROW LEVEL SECURITY;

-- Lectura pública (para que la landing cargue sin login)
DROP POLICY IF EXISTS "landing_configs_public_read" ON public.user_landing_configs;
CREATE POLICY "landing_configs_public_read"
ON public.user_landing_configs FOR SELECT
USING (true);

-- Admin y Gerente pueden gestionar cualquier config
DROP POLICY IF EXISTS "landing_configs_admin_all" ON public.user_landing_configs;
CREATE POLICY "landing_configs_admin_all"
ON public.user_landing_configs FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'gerente')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'gerente')
    )
);

-- El propio asesor puede leer y editar SU configuración
DROP POLICY IF EXISTS "landing_configs_owner_all" ON public.user_landing_configs;
CREATE POLICY "landing_configs_owner_all"
ON public.user_landing_configs FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.handle_landing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_landing_updated_at ON public.user_landing_configs;
CREATE TRIGGER set_landing_updated_at
  BEFORE UPDATE ON public.user_landing_configs
  FOR EACH ROW EXECUTE FUNCTION public.handle_landing_updated_at();


-- ============================================================
-- 2. TABLA clients: agregar columnas si no existen
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Nuevo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'asignado';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS asesor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS presupuesto TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tipo_financiamiento TEXT;

-- CHECK constraint idempotente
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_origen_check'
  ) THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_origen_check
      CHECK (origen IN ('asignado', 'landing_propia'));
  END IF;
END $$;

-- RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- INSERT anónimo: solo para leads de landing
DROP POLICY IF EXISTS "clients_anon_insert_landing" ON public.clients;
CREATE POLICY "clients_anon_insert_landing"
ON public.clients FOR INSERT
WITH CHECK (origen = 'landing_propia');

-- SELECT: admins y gerentes ven todos
DROP POLICY IF EXISTS "clients_admin_select" ON public.clients;
CREATE POLICY "clients_admin_select"
ON public.clients FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'gerente')
    )
);

-- SELECT: asesor ve sus propios leads
DROP POLICY IF EXISTS "clients_asesor_select" ON public.clients;
CREATE POLICY "clients_asesor_select"
ON public.clients FOR SELECT
USING (asesor_id = auth.uid());

-- UPDATE: asesor puede actualizar sus propios clientes (ej. estado)
DROP POLICY IF EXISTS "clients_asesor_update" ON public.clients;
CREATE POLICY "clients_asesor_update"
ON public.clients FOR UPDATE
USING (asesor_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'gerente')
));


-- ============================================================
-- 3. Realtime para user_landing_configs (idempotente)
-- ============================================================
DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_landing_configs;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
