-- ============================================================
-- RLS: Bloquear escritura para rol 'readonly'
-- Aplica como segunda capa de seguridad (además del frontend)
-- ============================================================

-- Helper: obtener el role del usuario actual desde profiles
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── client_overrides ─────────────────────────────────────────
-- Readonly no puede insertar/actualizar/eliminar overrides
CREATE POLICY "readonly_no_insert_overrides"
  ON public.client_overrides FOR INSERT
  USING (auth.user_role() <> 'readonly');

CREATE POLICY "readonly_no_update_overrides"
  ON public.client_overrides FOR UPDATE
  USING (auth.user_role() <> 'readonly');

CREATE POLICY "readonly_no_delete_overrides"
  ON public.client_overrides FOR DELETE
  USING (auth.user_role() <> 'readonly');

-- ── clients ──────────────────────────────────────────────────
CREATE POLICY "readonly_no_insert_clients"
  ON public.clients FOR INSERT
  USING (auth.user_role() <> 'readonly');

CREATE POLICY "readonly_no_update_clients"
  ON public.clients FOR UPDATE
  USING (auth.user_role() <> 'readonly');

CREATE POLICY "readonly_no_delete_clients"
  ON public.clients FOR DELETE
  USING (auth.user_role() <> 'readonly');

-- ── eventos_calendario ───────────────────────────────────────
CREATE POLICY "readonly_no_insert_eventos"
  ON public.eventos_calendario FOR INSERT
  USING (auth.user_role() <> 'readonly');

CREATE POLICY "readonly_no_update_eventos"
  ON public.eventos_calendario FOR UPDATE
  USING (auth.user_role() <> 'readonly');

CREATE POLICY "readonly_no_delete_eventos"
  ON public.eventos_calendario FOR DELETE
  USING (auth.user_role() <> 'readonly');

-- ── catering_items ───────────────────────────────────────────
CREATE POLICY "readonly_no_update_catering"
  ON public.catering_items FOR UPDATE
  USING (auth.user_role() <> 'readonly');

CREATE POLICY "readonly_no_insert_catering"
  ON public.catering_items FOR INSERT
  USING (auth.user_role() <> 'readonly');

CREATE POLICY "readonly_no_delete_catering"
  ON public.catering_items FOR DELETE
  USING (auth.user_role() <> 'readonly');

-- ── inventario_estatus ───────────────────────────────────────
CREATE POLICY "readonly_no_upsert_inventario"
  ON public.inventario_estatus FOR INSERT
  USING (auth.user_role() <> 'readonly');

CREATE POLICY "readonly_no_update_inventario"
  ON public.inventario_estatus FOR UPDATE
  USING (auth.user_role() <> 'readonly');
