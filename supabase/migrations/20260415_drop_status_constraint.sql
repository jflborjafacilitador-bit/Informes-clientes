-- Elimina el check constraint hardcodeado en client_overrides.status
-- Los estados ahora se gestionan dinámicamente en la tabla client_statuses
ALTER TABLE client_overrides DROP CONSTRAINT IF EXISTS client_overrides_status_check;
