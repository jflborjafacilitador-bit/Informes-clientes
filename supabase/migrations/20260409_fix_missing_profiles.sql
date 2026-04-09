-- ============================================================
-- Fix: Perfiles faltantes para usuarios creados desde el admin
-- Fecha: 2026-04-09
-- ============================================================

-- 1. Función SECURITY DEFINER para que el cliente pueda leer auth.users
--    (necesario porque auth.users no es accesible para el rol 'authenticated' directamente)
CREATE OR REPLACE FUNCTION public.get_all_auth_users()
RETURNS TABLE(id uuid, email text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, email, created_at
  FROM auth.users
  WHERE deleted_at IS NULL
  ORDER BY created_at DESC;
$$;

-- Permitir que usuarios autenticados llamen a esta función
GRANT EXECUTE ON FUNCTION public.get_all_auth_users() TO authenticated;

-- 2. Insertar perfiles faltantes con rol 'asesor' como default
--    Solo afecta usuarios que tienen cuenta en auth.users pero NO tienen fila en profiles
INSERT INTO public.profiles (id, email, role)
SELECT au.id, au.email, 'asesor'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
  AND au.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;
