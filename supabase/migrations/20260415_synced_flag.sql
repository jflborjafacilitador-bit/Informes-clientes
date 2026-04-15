-- Agrega columna synced a client_overrides para marcado manual por asesores
ALTER TABLE client_overrides ADD COLUMN IF NOT EXISTS synced boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN client_overrides.synced IS 'Marcado manual por el asesor para indicar que el lead está sincronizado con bases externas';
