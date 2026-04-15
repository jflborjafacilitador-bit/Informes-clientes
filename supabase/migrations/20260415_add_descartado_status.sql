-- ==============================================================================
-- Migración: Agregar 'Descartado' al CHECK CONSTRAINT de client_overrides.status
-- El constraint "client_overrides_status_check" bloquea valores no listados.
-- ==============================================================================

-- Eliminar el constraint anterior
ALTER TABLE public.client_overrides
  DROP CONSTRAINT IF EXISTS client_overrides_status_check;

-- Recrear con 'Descartado' incluido
ALTER TABLE public.client_overrides
  ADD CONSTRAINT client_overrides_status_check
  CHECK (status IN (
    'Nuevo',
    'No responde',
    'Numero sin Whatsapp',
    'Reprogramo',
    'Citado',
    'En seguimiento',
    'No esta interesado',
    'Repetido',
    'Presupuesto insuficiente',
    'Activo',
    'En espera',
    'Descartado'
  ));
