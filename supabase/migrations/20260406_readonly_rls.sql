-- ============================================================
-- RLS: Bloquear escritura para rol 'readonly'
-- Tablas verificadas desde el código fuente:
--   eventos, clients, client_overrides, catering_items, inventario_estatus
-- ============================================================

-- Helper: obtener el role del usuario actual
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── client_overrides ─────────────────────────────────────────
CREATE POLICY "readonly_no_insert_overrides"
  ON public.client_overrides FOR INSERT
  WITH CHECK (public.get_my_role() <> 'readonly');

CREATE POLICY "readonly_no_update_overrides"
  ON public.client_overrides FOR UPDATE
  USING (public.get_my_role() <> 'readonly');

CREATE POLICY "readonly_no_delete_overrides"
  ON public.client_overrides FOR DELETE
  USING (public.get_my_role() <> 'readonly');

-- ── clients ──────────────────────────────────────────────────
CREATE POLICY "readonly_no_insert_clients"
  ON public.clients FOR INSERT
  WITH CHECK (public.get_my_role() <> 'readonly');

CREATE POLICY "readonly_no_update_clients"
  ON public.clients FOR UPDATE
  USING (public.get_my_role() <> 'readonly');

CREATE POLICY "readonly_no_delete_clients"
  ON public.clients FOR DELETE
  USING (public.get_my_role() <> 'readonly');

-- ── eventos (calendario) ─────────────────────────────────────
CREATE POLICY "readonly_no_insert_eventos"
  ON public.eventos FOR INSERT
  WITH CHECK (public.get_my_role() <> 'readonly');

CREATE POLICY "readonly_no_update_eventos"
  ON public.eventos FOR UPDATE
  USING (public.get_my_role() <> 'readonly');

CREATE POLICY "readonly_no_delete_eventos"
  ON public.eventos FOR DELETE
  USING (public.get_my_role() <> 'readonly');

-- ── catering_items ───────────────────────────────────────────
CREATE POLICY "readonly_no_insert_catering"
  ON public.catering_items FOR INSERT
  WITH CHECK (public.get_my_role() <> 'readonly');

CREATE POLICY "readonly_no_update_catering"
  ON public.catering_items FOR UPDATE
  USING (public.get_my_role() <> 'readonly');

CREATE POLICY "readonly_no_delete_catering"
  ON public.catering_items FOR DELETE
  USING (public.get_my_role() <> 'readonly');

-- ── inventario_estatus ───────────────────────────────────────
CREATE POLICY "readonly_no_insert_inventario"
  ON public.inventario_estatus FOR INSERT
  WITH CHECK (public.get_my_role() <> 'readonly');

CREATE POLICY "readonly_no_update_inventario"
  ON public.inventario_estatus FOR UPDATE
  USING (public.get_my_role() <> 'readonly');
