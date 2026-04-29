-- ==============================================================================
-- RPC: get_asesor_cartera
-- Devuelve cuántos clientes tiene actualmente asignados cada asesor,
-- basándose en el evento de assignment_change más reciente por cliente.
-- SECURITY DEFINER → corre como owner, bypasea RLS, puede leer profiles.
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_asesor_cartera()
RETURNS TABLE(asesor_key text, total_clients bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest_assignment AS (
    -- Para cada cliente, el assignment_change más reciente
    SELECT DISTINCT ON (client_id)
      client_id,
      new_value
    FROM audit_log
    WHERE event_type = 'assignment_change'
      AND new_value IS NOT NULL
      AND new_value <> ''
      AND lower(new_value) NOT IN ('sin asignar', 'pendiente', 'descartado', 'no asignado')
    ORDER BY client_id, created_at DESC
  ),
  resolved AS (
    -- Resolver: si new_value es UUID → JOIN a profiles; si es email → split; si es nombre → directo
    SELECT
      la.client_id,
      CASE
        WHEN la.new_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN split_part(p.email, '@', 1)
        WHEN la.new_value LIKE '%@%'
          THEN split_part(la.new_value, '@', 1)
        ELSE la.new_value
      END AS asesor_key
    FROM latest_assignment la
    LEFT JOIN profiles p ON p.id::text = la.new_value
  )
  SELECT asesor_key, COUNT(DISTINCT client_id) AS total_clients
  FROM resolved
  WHERE asesor_key IS NOT NULL AND asesor_key <> ''
  GROUP BY asesor_key
  ORDER BY total_clients DESC;
$$;

-- ==============================================================================
-- RPC: get_asesor_clients
-- Devuelve la lista de clientes actualmente en cartera de un asesor específico.
-- Columnas reales de client_overrides: client_id, status, assigned_to, assigned_email
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_asesor_clients(p_asesor_key text)
RETURNS TABLE(
  client_id   text,
  client_name text,
  assigned_at text,
  status      text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest_assignment AS (
    SELECT DISTINCT ON (client_id)
      client_id,
      client_name,
      new_value,
      created_at
    FROM audit_log
    WHERE event_type = 'assignment_change'
      AND new_value IS NOT NULL
      AND new_value <> ''
      AND lower(new_value) NOT IN ('sin asignar', 'pendiente', 'descartado', 'no asignado')
    ORDER BY client_id, created_at DESC
  ),
  resolved AS (
    SELECT
      la.client_id,
      la.client_name,
      la.created_at,
      CASE
        WHEN la.new_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN split_part(p.email, '@', 1)
        WHEN la.new_value LIKE '%@%'
          THEN split_part(la.new_value, '@', 1)
        ELSE la.new_value
      END AS asesor_key
    FROM latest_assignment la
    LEFT JOIN profiles p ON p.id::text = la.new_value
  )
  SELECT
    r.client_id,
    r.client_name,
    to_char(r.created_at AT TIME ZONE 'America/Mexico_City', 'DD/MM/YYYY') AS assigned_at,
    co.status
  FROM resolved r
  LEFT JOIN client_overrides co ON co.client_id = r.client_id
  WHERE r.asesor_key = p_asesor_key
  ORDER BY r.created_at DESC;
$$;

-- Permisos: solo usuarios autenticados pueden llamar estas funciones
GRANT EXECUTE ON FUNCTION get_asesor_cartera() TO authenticated;
GRANT EXECUTE ON FUNCTION get_asesor_clients(text) TO authenticated;
