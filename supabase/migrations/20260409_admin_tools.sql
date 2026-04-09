-- ============================================================
-- Admin Tools: funciones SECURITY DEFINER para gestión de usuarios
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Función para que el director pueda cambiar el rol de cualquier usuario
--    Bypasea RLS porque usa SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.admin_set_user_role(
  target_user_id uuid,
  new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que quien llama es super_admin
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'super_admin' THEN
    RAISE EXCEPTION 'Solo el Director puede cambiar roles de usuario';
  END IF;

  -- Upsert: si existe el perfil → actualizar; si no existe → crear
  INSERT INTO public.profiles (id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated;

-- 2. Función para ver todos los usuarios de auth.users (solo super_admin)
CREATE OR REPLACE FUNCTION public.get_all_auth_users()
RETURNS TABLE(id uuid, email text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'super_admin' THEN
    RAISE EXCEPTION 'Solo el Director puede ver todos los usuarios';
  END IF;

  RETURN QUERY
    SELECT au.id, au.email::text, au.created_at
    FROM auth.users au
    ORDER BY au.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_auth_users() TO authenticated;

-- 3. Crear perfiles para usuarios huérfanos (en auth.users pero sin fila en profiles)
--    Los crea con rol 'asesor' por defecto
INSERT INTO public.profiles (id, email, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'role', 'asesor')
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
