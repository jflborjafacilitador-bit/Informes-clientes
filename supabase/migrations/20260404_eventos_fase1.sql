-- Mejoras Fase 1: Calendario de Citas
-- Añade campos de cliente, asesor, ubicación, estado y timestamp de actualización

ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS cliente_nombre  TEXT,
  ADD COLUMN IF NOT EXISTS cliente_tel     TEXT,
  ADD COLUMN IF NOT EXISTS ubicacion       TEXT,
  ADD COLUMN IF NOT EXISTS estado          TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'confirmada', 'realizada', 'cancelada')),
  ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ DEFAULT now();

-- Índice para filtrar por estado rápidamente
CREATE INDEX IF NOT EXISTS idx_eventos_estado ON eventos(estado);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha_estado ON eventos(fecha, estado);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_eventos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_eventos_updated_at ON eventos;
CREATE TRIGGER trg_eventos_updated_at
  BEFORE UPDATE ON eventos
  FOR EACH ROW EXECUTE FUNCTION set_eventos_updated_at();

-- Comentarios de columnas
COMMENT ON COLUMN eventos.cliente_nombre IS 'Nombre del prospecto o cliente de la cita';
COMMENT ON COLUMN eventos.cliente_tel    IS 'Teléfono del prospecto para recordatorio WhatsApp';
COMMENT ON COLUMN eventos.ubicacion      IS 'Lugar de la cita (ej: Sala de ventas, Manzana 3)';
COMMENT ON COLUMN eventos.estado         IS 'Estado: pendiente | confirmada | realizada | cancelada';
