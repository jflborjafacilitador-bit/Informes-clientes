import React, { useState, useEffect, useRef } from 'react';
import {
  FileCheck, Download, Plus, Trash2, Building2,
  Users, RotateCcw, Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { fetchInventario, type InventarioItem } from '../services/inventarioService';

export type ModeloCarta =
  | 'QUETZAL'
  | 'QUETZAL PLUS'
  | 'QUETZAL PLUS F.A.'
  | 'QUETZAL ROOF GARDEN';

export interface EquipamientoItem {
  id: string;
  equipamiento: string;
  detalles: string;
  cantidad: string;
  adicional: string;
  total: string;
}

const MODELOS_DISPONIBLES: ModeloCarta[] = [
  'QUETZAL',
  'QUETZAL PLUS',
  'QUETZAL PLUS F.A.',
  'QUETZAL ROOF GARDEN',
];

const EQUIPAMIENTO_POR_MODELO: Record<ModeloCarta, Omit<EquipamientoItem, 'id'>[]> = {
  'QUETZAL': [
    { equipamiento: 'VENTILADORES', detalles: 'DE TECHO', cantidad: '4 (CUATRO) PB Y N1', adicional: '', total: 'GRATIS' },
    { equipamiento: 'COCINA PLUS', detalles: 'GRANITO', cantidad: 'UNA PIEZA', adicional: 'PARRILLA Y CAMPANA', total: 'GRATIS' },
    { equipamiento: 'PERSIANAS', detalles: 'PORTICO Y RECÁMARAS', cantidad: '3 (TRES) PB Y N1', adicional: '', total: 'GRATIS' },
    { equipamiento: 'CLOSETS', detalles: 'EN RECÁMARAS', cantidad: '2 (DOS)', adicional: 'PUERTA DE ESCALERA Y MUEBLES EN BAÑOS', total: 'GRATIS' },
    { equipamiento: 'CANCEL', detalles: 'EN BAÑO', cantidad: '', adicional: '', total: 'GRATIS' },
  ],
  'QUETZAL PLUS': [
    { equipamiento: 'VENTILADORES', detalles: 'DE TECHO', cantidad: '5 (CINCO) PB, N1 Y N2', adicional: '', total: 'GRATIS' },
    { equipamiento: 'COCINA PLUS', detalles: 'GRANITO', cantidad: 'UNA PIEZA', adicional: 'PARRILLA Y CAMPANA', total: 'GRATIS' },
    { equipamiento: 'PERSIANAS', detalles: 'PORTICO Y RECÁMARAS', cantidad: '3 (TRES) PB Y N1', adicional: '2 (DOS) RECÁMARA N2', total: 'GRATIS' },
    { equipamiento: 'CLOSETS Y MUEBLES', detalles: 'EN RECÁMARAS', cantidad: '3 (TRES)', adicional: 'PUERTA DE ESCALERA Y MUEBLES EN BAÑOS', total: 'GRATIS' },
    { equipamiento: 'CANCEL', detalles: 'EN BAÑO', cantidad: '1 (UNO) N2', adicional: '', total: 'GRATIS' },
  ],
  'QUETZAL PLUS F.A.': [
    { equipamiento: 'VENTILADORES', detalles: 'DE TECHO', cantidad: '5 (CINCO) PB, N1 Y N2', adicional: '', total: 'GRATIS' },
    { equipamiento: 'COCINA PLUS', detalles: 'GRANITO', cantidad: 'UNA PIEZA', adicional: 'PARRILLA Y CAMPANA', total: 'GRATIS' },
    { equipamiento: 'PERSIANAS', detalles: 'PORTICO Y RECÁMARAS', cantidad: '3 (TRES) PB Y N1', adicional: '2 (DOS) RECÁMARA N2', total: 'GRATIS' },
    { equipamiento: 'CLOSETS Y MUEBLES', detalles: 'EN RECÁMARAS', cantidad: '3 (TRES)', adicional: 'PUERTA DE ESCALERA Y MUEBLES EN BAÑOS', total: 'GRATIS' },
    { equipamiento: 'CANCEL', detalles: 'EN BAÑO', cantidad: '1 (UNO) N2', adicional: '', total: 'GRATIS' },
  ],
  'QUETZAL ROOF GARDEN': [
    { equipamiento: 'VENTILADORES', detalles: 'DE TECHO', cantidad: '4 (CUATRO) PB Y N1', adicional: '', total: 'GRATIS' },
    { equipamiento: 'COCINA PLUS', detalles: 'GRANITO', cantidad: 'UNA PIEZA', adicional: 'PARRILLA Y CAMPANA', total: 'GRATIS' },
    { equipamiento: 'PERSIANAS', detalles: 'PORTICO Y RECÁMARAS', cantidad: '3 (TRES) PB Y N1', adicional: '', total: 'GRATIS' },
    { equipamiento: 'CLOSETS', detalles: 'EN RECÁMARAS', cantidad: '2 (DOS)', adicional: 'PUERTA DE ESCALERA Y MUEBLES EN BAÑOS', total: 'GRATIS' },
    { equipamiento: 'CANCEL', detalles: 'EN BAÑO', cantidad: '', adicional: '', total: 'GRATIS' },
  ],
};

function buildPresetItems(modelo: ModeloCarta): EquipamientoItem[] {
  return EQUIPAMIENTO_POR_MODELO[modelo].map((item, idx) => ({
    ...item,
    id: `${modelo}-${idx}-${Date.now()}`,
  }));
}

function formatDateSlash(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default function CartaCompromiso() {
  const [casas, setCasas] = useState<InventarioItem[]>([]);
  const [selectedCasaId, setSelectedCasaId] = useState<string>('');

  // Modelo y equipamiento
  const [modelo, setModelo] = useState<ModeloCarta>('QUETZAL');
  const [equipamiento, setEquipamiento] = useState<EquipamientoItem[]>(() => buildPresetItems('QUETZAL'));

  // Datos del cliente e inmueble (neutrales por defecto)
  const [compradores, setCompradores] = useState<string[]>(['NOMBRE DEL COMPRADOR']);
  const [numeroIne, setNumeroIne] = useState<string>('0000000000000');
  const [ubicacionTexto, setUbicacionTexto] = useState<string>('MZ 3 PRIV. AVE DEL PARAISO');
  const [ubicacionNumero, setUbicacionNumero] = useState<string>('1');
  const [fechaDoc, setFechaDoc] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Textos de mantenimiento y fondo de emergencia
  const [textoMantenimiento, setTextoMantenimiento] = useState<string>('PAGO MANTENIMIENTO MENSUAL $1,200');
  const [textoFondoEmergencia, setTextoFondoEmergencia] = useState<string>('PAGO FONDO EMERGENCIA ANUAL $2,600');

  const [exporting, setExporting] = useState<boolean>(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInventario()
      .then((items) => setCasas(items))
      .catch(() => {});
  }, []);

  const handleSelectModelo = (nuevoModelo: ModeloCarta) => {
    setModelo(nuevoModelo);
    setEquipamiento(buildPresetItems(nuevoModelo));
  };

  const handleSelectCasa = (id: string) => {
    setSelectedCasaId(id);
    if (!id) return;
    const [mzaStr, casaNum] = id.split('::');
    const found = casas.find((c) => String(c.mza) === mzaStr && c.casa === casaNum);
    if (!found) return;

    // Determinar privada según condominio o manzana
    const condUpper = (found.condominio || '').toUpperCase().trim();
    const priv = condUpper.includes('TUC')
      ? 'PRIV. TUCÁN'
      : condUpper.includes('AVE') || condUpper.includes('PARAISO')
        ? 'PRIV. AVE DEL PARAISO'
        : `PRIV. ${condUpper || 'AVE DEL PARAISO'}`;

    setUbicacionTexto(`MZ ${found.mza} ${priv}`);
    setUbicacionNumero(found.casa);

    // Mapear prototipo a uno de los 4 modelos
    const protoUpper = (found.prototipo || '').toUpperCase().trim();
    if (protoUpper.includes('ROOF')) {
      handleSelectModelo('QUETZAL ROOF GARDEN');
    } else if (protoUpper.includes('F.A') || protoUpper.includes('FA')) {
      handleSelectModelo('QUETZAL PLUS F.A.');
    } else if (protoUpper.includes('PLUS')) {
      handleSelectModelo('QUETZAL PLUS');
    } else {
      handleSelectModelo('QUETZAL');
    }
  };

  // Compradores
  const handleAddComprador = () => setCompradores((prev) => [...prev, '']);
  const handleRemoveComprador = (idx: number) => {
    if (compradores.length <= 1) return;
    setCompradores((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleUpdateComprador = (idx: number, val: string) => {
    setCompradores((prev) => prev.map((c, i) => (i === idx ? val.toUpperCase() : c)));
  };

  // Equipamiento
  const handleUpdateItem = (id: string, field: keyof Omit<EquipamientoItem, 'id'>, value: string) => {
    setEquipamiento((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value.toUpperCase() } : item))
    );
  };

  const handleAddItem = () => {
    setEquipamiento((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        equipamiento: 'NUEVO EQUIPAMIENTO',
        detalles: '',
        cantidad: '',
        adicional: '',
        total: 'GRATIS',
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (equipamiento.length <= 1) return;
    setEquipamiento((prev) => prev.filter((item) => item.id !== id));
  };

  const nombresUnidos =
    compradores
      .map((c) => c.trim())
      .filter(Boolean)
      .join(' Y ') || '___________________________';

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const element = previewRef.current;
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight + 2) {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      } else {
        const scaledRatio = pageHeight / imgHeight;
        const finalWidth = imgWidth * scaledRatio;
        const xOffset = (pageWidth - finalWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, 0, finalWidth, pageHeight);
      }

      const cleanClient = (compradores[0] || 'CLIENTE')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 30);
      pdf.save(`CARTA_COMPROMISO_${modelo.replace(/\s+/g, '_')}_CASA_${ubicacionNumero}_${cleanClient}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF de Carta Compromiso:', err);
      alert('Hubo un problema al generar el PDF. Intenta nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.55rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid var(--border-glass)',
    background: 'rgba(15,23,42,0.6)',
    color: 'var(--text-main)',
    fontSize: '0.85rem',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.73rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '0.3rem',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2.5rem' }}>
      {/* Encabezado de página */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        padding: '1.1rem 1.4rem',
        borderRadius: '16px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-glass)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: 'rgba(59,130,246,0.14)',
            border: '1px solid rgba(59,130,246,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#60a5fa',
          }}>
            <FileCheck size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Carta Compromiso de Equipamiento
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Selecciona el modelo (Quetzal, Quetzal Plus, Quetzal Plus F.A. o Quetzal Roof Garden), personaliza los datos y descarga en PDF.
            </p>
          </div>
        </div>

        <button
          onClick={handleDownloadPDF}
          disabled={exporting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: exporting ? 'wait' : 'pointer',
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
          }}
        >
          <Download size={17} />
          {exporting ? 'Generando PDF...' : 'Descargar PDF'}
        </button>
      </div>

      {/* Layout Principal: Controles a la izquierda, Vista Previa a la derecha */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(350px, 470px) 1fr',
        gap: '1.25rem',
        alignItems: 'start',
      }} className="contratos-grid">
        {/* PANEL DE EDICIÓN */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-glass)',
          borderRadius: '16px',
          padding: '1.25rem',
        }}>
          {/* 1. Selector de Modelo y Vivienda */}
          <div style={{
            padding: '0.9rem',
            borderRadius: '12px',
            background: 'rgba(37,99,235,0.07)',
            border: '1px solid rgba(59,130,246,0.22)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.65rem', color: '#60a5fa', fontWeight: 700, fontSize: '0.85rem' }}>
              <Sparkles size={16} />
              <span>1. Selección de Modelo e Inventario</span>
            </div>

            <label style={labelStyle}>Modelo de Vivienda</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginBottom: '0.85rem' }}>
              {MODELOS_DISPONIBLES.map((mod) => {
                const active = modelo === mod;
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => handleSelectModelo(mod)}
                    style={{
                      padding: '0.55rem 0.6rem',
                      borderRadius: '8px',
                      border: active ? '1.5px solid #3b82f6' : '1px solid var(--border-glass)',
                      background: active ? 'rgba(59,130,246,0.22)' : 'rgba(15,23,42,0.5)',
                      color: active ? '#93c5fd' : 'var(--text-muted)',
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.76rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {mod}
                  </button>
                );
              })}
            </div>

            <label style={labelStyle}>Autocompletar desde Inventario (Opcional)</label>
            <select
              value={selectedCasaId}
              onChange={(e) => handleSelectCasa(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Seleccionar vivienda del inventario --</option>
              {casas.map((c) => (
                <option key={`${c.mza}::${c.casa}`} value={`${c.mza}::${c.casa}`}>
                  Mza {c.mza} - Casa {c.casa} ({c.prototipo}) [{c.estatus}]
                </option>
              ))}
            </select>
          </div>

          {/* 2. Datos del Cliente y Ubicación */}
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Users size={16} color="#60a5fa" />
                2. Datos del Cliente y Ubicación
              </span>
              <button
                type="button"
                onClick={handleAddComprador}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(59,130,246,0.4)',
                  background: 'rgba(59,130,246,0.12)',
                  color: '#60a5fa',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={13} /> Agregar persona
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {compradores.map((nombre, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => handleUpdateComprador(idx, e.target.value)}
                    placeholder={`Nombre completo del comprador ${idx + 1}`}
                    style={inputStyle}
                  />
                  {compradores.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveComprador(idx)}
                      title="Quitar comprador"
                      style={{
                        padding: '0.5rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.1)',
                        color: '#f87171',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.65rem' }}>
              <div>
                <label style={labelStyle}>N° de INE</label>
                <input
                  type="text"
                  value={numeroIne}
                  onChange={(e) => setNumeroIne(e.target.value.toUpperCase())}
                  placeholder="Ej. 1666088044621"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Fecha</label>
                <input
                  type="date"
                  value={fechaDoc}
                  onChange={(e) => setFechaDoc(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={labelStyle}>Ubicación (Manzana y Privada)</label>
                <input
                  type="text"
                  value={ubicacionTexto}
                  onChange={(e) => setUbicacionTexto(e.target.value.toUpperCase())}
                  placeholder="MZ 3 PRIV. AVE DEL PARAISO"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>N° Casa / Lote</label>
                <input
                  type="text"
                  value={ubicacionNumero}
                  onChange={(e) => setUbicacionNumero(e.target.value.toUpperCase())}
                  placeholder="17"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* 3. Tabla de Equipamiento Editable */}
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Building2 size={16} color="#60a5fa" />
                3. Equipamiento ({modelo})
              </span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setEquipamiento(buildPresetItems(modelo))}
                  title="Restaurar equipamiento predeterminado del modelo"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-glass)',
                    background: 'rgba(148,163,184,0.1)',
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={12} /> Restaurar
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(34,197,94,0.4)',
                    background: 'rgba(34,197,94,0.12)',
                    color: '#4ade80',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={12} /> Fila
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {equipamiento.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    padding: '0.65rem',
                    borderRadius: '10px',
                    background: 'rgba(15,23,42,0.45)',
                    border: '1px solid var(--border-glass)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#93c5fd' }}>
                      Partida #{idx + 1}
                    </span>
                    {equipamiento.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Eliminar fila"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Equipamiento</label>
                      <input
                        type="text"
                        value={item.equipamiento}
                        onChange={(e) => handleUpdateItem(item.id, 'equipamiento', e.target.value)}
                        style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Detalles</label>
                      <input
                        type="text"
                        value={item.detalles}
                        onChange={(e) => handleUpdateItem(item.id, 'detalles', e.target.value)}
                        style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.4fr 0.8fr', gap: '0.45rem' }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Cantidad</label>
                      <input
                        type="text"
                        value={item.cantidad}
                        onChange={(e) => handleUpdateItem(item.id, 'cantidad', e.target.value)}
                        style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Adicional</label>
                      <input
                        type="text"
                        value={item.adicional}
                        onChange={(e) => handleUpdateItem(item.id, 'adicional', e.target.value)}
                        style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: '0.65rem' }}>Total</label>
                      <input
                        type="text"
                        value={item.total}
                        onChange={(e) => handleUpdateItem(item.id, 'total', e.target.value)}
                        style={{ ...inputStyle, padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Cuotas de Mantenimiento y Fondo */}
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '0.9rem' }}>
            <label style={labelStyle}>4. Leyendas de Mantenimiento y Fondo de Emergencia</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="text"
                value={textoMantenimiento}
                onChange={(e) => setTextoMantenimiento(e.target.value.toUpperCase())}
                style={inputStyle}
              />
              <input
                type="text"
                value={textoFondoEmergencia}
                onChange={(e) => setTextoFondoEmergencia(e.target.value.toUpperCase())}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* VISTA PREVIA DE LA HOJA CARTA COMPROMISO */}
        <div style={{
          overflowX: 'auto',
          display: 'flex',
          justifyContent: 'center',
          padding: '1rem',
          background: 'rgba(2,6,23,0.6)',
          borderRadius: '16px',
          border: '1px solid var(--border-glass)',
        }}>
          <div
            ref={previewRef}
            style={{
              width: '816px',
              minWidth: '816px',
              minHeight: '1056px',
              background: '#ffffff',
              color: '#000000',
              padding: '38px 46px 42px 46px',
              boxSizing: 'border-box',
              fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
              boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* ENCABEZADO CON OLA AZUL Y LOGO */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                marginBottom: '22px',
              }}>
                {/* Banner de ola azul con texto superpuesto */}
                <div style={{
                  position: 'relative',
                  width: '74%',
                  height: '130px',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}>
                  <img
                    src="/carta-compromiso-wave.png?v=2"
                    alt="Header Wave"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'fill',
                      display: 'block',
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '88px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingTop: '4px',
                    paddingLeft: '12px',
                    paddingRight: '12px',
                    textAlign: 'center',
                  }}>
                    <div style={{
                      fontFamily: 'Constantia, Georgia, "Times New Roman", serif',
                      fontSize: '20pt',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      letterSpacing: '0.03em',
                      lineHeight: 1.15,
                      textShadow: '0 1px 3px rgba(0,0,0,0.35)',
                    }}>
                      CARTA COMPROMISO
                    </div>
                    <div style={{
                      fontFamily: 'Constantia, Georgia, "Times New Roman", serif',
                      fontSize: modelo.length > 15 ? '16.5pt' : '19pt',
                      fontWeight: 700,
                      lineHeight: 1.18,
                      marginTop: '3px',
                      whiteSpace: 'nowrap',
                      textShadow: '0 1px 3px rgba(0,0,0,0.35)',
                    }}>
                      <span style={{ color: '#FFFFFF' }}>MODELO: </span>
                      <span style={{ color: '#FFFF00' }}>{modelo}</span>
                    </div>
                  </div>
                </div>

                {/* Logo Residencial Los Quetzales */}
                <div style={{
                  width: '24%',
                  height: '130px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img
                    src="/carta-compromiso-logo.png?v=2"
                    alt="Residencial Los Quetzales"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '115px',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </div>
              </div>

              {/* PÁRRAFO INTRODUCTORIO */}
              <div style={{
                fontSize: '11.5pt',
                lineHeight: 1.45,
                textAlign: 'left',
                marginBottom: '22px',
                color: '#000000',
              }}>
                Este documento se incluye al contrato para formalizar con la empresa{' '}
                <strong>3 FR Especialistas en construcción S. A. DE C.V.</strong> el cual hace referencia a las promociones vigentes en el momento de apartar sobre la casa y modelo mencionado. Estos beneficios serán entregados y colocados a la vivienda correspondiente.
              </div>

              {/* CAMPOS DEL CLIENTE Y UBICACIÓN */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '26px',
                fontSize: '11pt',
              }}>
                {/* Nombre del cliente */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  <span style={{ fontWeight: 400, whiteSpace: 'nowrap', minWidth: '135px' }}>
                    Nombre del cliente:
                  </span>
                  <div style={{
                    flex: 1,
                    borderBottom: '1px solid #000',
                    paddingBottom: '2px',
                    paddingLeft: '8px',
                    fontWeight: 500,
                    fontSize: '11pt',
                  }}>
                    {nombresUnidos}
                  </div>
                </div>

                {/* N° de INE */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  <span style={{ fontWeight: 400, whiteSpace: 'nowrap', minWidth: '135px' }}>
                    N° de INE:
                  </span>
                  <div style={{
                    width: '320px',
                    borderBottom: '1px solid #000',
                    paddingBottom: '2px',
                    paddingLeft: '8px',
                    fontWeight: 500,
                    fontSize: '11pt',
                  }}>
                    {numeroIne}
                  </div>
                </div>

                {/* Ubicación */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  <span style={{ fontWeight: 400, whiteSpace: 'nowrap', minWidth: '135px' }}>
                    Ubicación:
                  </span>
                  <div style={{
                    width: '260px',
                    borderBottom: '1px solid #000',
                    paddingBottom: '2px',
                    paddingLeft: '8px',
                    fontWeight: 500,
                    fontSize: '11pt',
                  }}>
                    {ubicacionTexto}
                  </div>
                  <div style={{
                    width: '60px',
                    borderBottom: '1px solid #000',
                    paddingBottom: '2px',
                    textAlign: 'center',
                    fontWeight: 500,
                    fontSize: '11pt',
                  }}>
                    {ubicacionNumero}
                  </div>
                </div>

                {/* Fecha */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                  <span style={{ fontWeight: 400, whiteSpace: 'nowrap', minWidth: '135px' }}>
                    Fecha:
                  </span>
                  <div style={{
                    width: '200px',
                    borderBottom: '1px solid #000',
                    paddingBottom: '2px',
                    textAlign: 'center',
                    fontWeight: 500,
                    fontSize: '11pt',
                  }}>
                    {formatDateSlash(fechaDoc)}
                  </div>
                </div>
              </div>

              {/* TABLA DE EQUIPAMIENTO */}
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '10.5pt',
                marginBottom: '28px',
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: '#1F497D',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    textAlign: 'center',
                  }}>
                    <th style={{ padding: '8px 6px', border: '1px solid #1F497D', width: '21%' }}>EQUIPAMIENTO</th>
                    <th style={{ padding: '8px 6px', border: '1px solid #1F497D', width: '22%' }}>DETALLES</th>
                    <th style={{ padding: '8px 6px', border: '1px solid #1F497D', width: '21%' }}>CANTIDAD</th>
                    <th style={{ padding: '8px 6px', border: '1px solid #1F497D', width: '24%' }}>ADICIONAL</th>
                    <th style={{ padding: '8px 6px', border: '1px solid #1F497D', width: '12%' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {equipamiento.map((row, idx) => {
                    const isEven = idx % 2 === 1;
                    const rowBg = isEven ? '#F2F2F2' : '#FFFFFF';
                    return (
                      <tr key={row.id} style={{ textAlign: 'center' }}>
                        <td style={{
                          padding: '10px 6px',
                          backgroundColor: rowBg,
                          borderTop: '1px solid #BFBFBF',
                          borderBottom: '3px double #808080',
                          borderLeft: 'none',
                          borderRight: 'none',
                        }}>
                          {row.equipamiento}
                        </td>
                        <td style={{
                          padding: '10px 6px',
                          backgroundColor: rowBg,
                          borderTop: '1px solid #BFBFBF',
                          borderBottom: '3px double #808080',
                        }}>
                          {row.detalles}
                        </td>
                        <td style={{
                          padding: '10px 6px',
                          backgroundColor: rowBg,
                          borderTop: '1px solid #BFBFBF',
                          borderBottom: '3px double #808080',
                        }}>
                          {row.cantidad}
                        </td>
                        <td style={{
                          padding: '10px 6px',
                          backgroundColor: rowBg,
                          borderTop: '1px solid #BFBFBF',
                          borderBottom: '3px double #808080',
                        }}>
                          {row.adicional}
                        </td>
                        <td style={{
                          padding: '10px 6px',
                          backgroundColor: row.total ? '#C6D9F1' : rowBg,
                          borderTop: '1px solid #BFBFBF',
                          borderBottom: '3px double #808080',
                          fontWeight: 500,
                        }}>
                          {row.total}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Tres filas vacías decorativas como en el formato original */}
                  {[0, 1, 2].map((emptyIdx) => {
                    const isEven = (equipamiento.length + emptyIdx) % 2 === 1;
                    const rowBg = isEven ? '#F2F2F2' : '#FFFFFF';
                    return (
                      <tr key={`empty-${emptyIdx}`}>
                        <td colSpan={5} style={{
                          height: '24px',
                          backgroundColor: rowBg,
                          borderTop: '1px solid #D9D9D9',
                          borderBottom: '3px double #A6A6A6',
                        }} />
                      </tr>
                    );
                  })}

                  {/* Filas de Mantenimiento y Fondo de Emergencia */}
                  <tr>
                    <td colSpan={5} style={{
                      padding: '7px 8px',
                      backgroundColor: '#F2F2F2',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '10.5pt',
                      borderTop: '1px solid #BFBFBF',
                      borderBottom: '3px double #808080',
                    }}>
                      {textoMantenimiento}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} style={{
                      padding: '7px 8px',
                      backgroundColor: '#FFFFFF',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '10.5pt',
                      borderTop: '1px solid #BFBFBF',
                      borderBottom: '1px solid #BFBFBF',
                    }}>
                      {textoFondoEmergencia}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* BLOQUE DE FIRMAS */}
            <div style={{ marginTop: '30px', paddingBottom: '15px' }}>
              {/* Primera fila de firmas: Cliente y Sello */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '80px',
                padding: '0 45px',
                marginBottom: '68px',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #000', height: '42px', marginBottom: '6px' }} />
                  <div style={{ fontSize: '10.5pt', color: '#000' }}>Firma del cliente de enterado</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #000', height: '42px', marginBottom: '6px' }} />
                  <div style={{ fontSize: '10.5pt', color: '#000' }}>Sello de validación</div>
                </div>
              </div>

              {/* Segunda fila de firmas: Asesor, Gerente Ventas, Titulación */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '36px',
                padding: '0 10px',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #000', height: '42px', marginBottom: '6px' }} />
                  <div style={{ fontSize: '10.5pt', color: '#000' }}>Firma de asesor</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #000', height: '42px', marginBottom: '6px' }} />
                  <div style={{ fontSize: '10.5pt', color: '#000' }}>Firma del gerente ventas</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ borderBottom: '1px solid #000', height: '42px', marginBottom: '6px' }} />
                  <div style={{ fontSize: '10.5pt', color: '#000' }}>Firma de titulación de recibido</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
