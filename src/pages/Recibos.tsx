import React, { useState, useEffect, useRef } from 'react';
import {
  Receipt, Download, Save, Plus, Trash2, Upload, Image as ImageIcon,
  History, Search, Edit3, CheckCircle2, AlertCircle, Sparkles
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { fetchInventario, type InventarioItem } from '../services/inventarioService';

export interface ReciboRecord {
  folio: number;
  fecha: string; // YYYY-MM-DD
  monto: string;
  privada: string;
  concepto: string;
  mz: string;
  casa: string;
  compradores: string[];
  tipoCredito: string;
  formaPago: string;
  rap: string;
  elaboro: string;
  nombreAsesor: string;
  imagenRecibo?: string; // DataURL comprimido
  updatedAt: string;
}

export interface ReciboIndexItem {
  folio: number;
  fecha: string;
  monto: string;
  privada: string;
  concepto: string;
  mz: string;
  casa: string;
  cliente: string;
  tipoCredito: string;
  formaPago: string;
  rap: string;
  elaboro: string;
  nombreAsesor: string;
  tieneImagen: boolean;
  updatedAt: string;
}

interface RecibosIndexPayload {
  ultimoFolioBase: number;
  items: ReciboIndexItem[];
}

const STORAGE_INDEX_KEY = 'quetzales_recibos_index_v1';
const STORAGE_ITEM_PREFIX = 'quetzales_recibo_folio_';
const SUPABASE_INDEX_KEY = 'recibos_index';
const SUPABASE_ITEM_PREFIX = 'recibo_folio_';
const DEFAULT_BASE_FOLIO = 244;

function formatCurrency(val: string | number): string {
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return '$0.00';
  return num.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateSlash(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getTodayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Comprime una imagen a JPEG ligero para guardar sin problemas en BD y localStorage */
async function compressImageFile(file: File, maxDim = 1000, quality = 0.84): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(ev.target?.result as string);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = ev.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Recibos() {
  const { session } = useAuth();
  const [casas, setCasas] = useState<InventarioItem[]>([]);
  const [selectedCasaId, setSelectedCasaId] = useState<string>('');

  // Estado de historial y consecutivo
  const [historial, setHistorial] = useState<ReciboIndexItem[]>([]);
  const [ultimoFolioBase, setUltimoFolioBase] = useState<number>(DEFAULT_BASE_FOLIO);
  const [loadingHistorial, setLoadingHistorial] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [editingExistingFolio, setEditingExistingFolio] = useState<number | null>(null);

  // Campos editables del recibo
  const [folio, setFolio] = useState<string>(String(DEFAULT_BASE_FOLIO + 1));
  const [fecha, setFecha] = useState<string>(getTodayIso);
  const [monto, setMonto] = useState<string>('15000');
  const [privada, setPrivada] = useState<string>('AVE DEL PARAISO');
  const [concepto, setConcepto] = useState<string>('APARTADO');
  const [mz, setMz] = useState<string>('3');
  const [casa, setCasa] = useState<string>('1');
  const [compradores, setCompradores] = useState<string[]>(['NOMBRE DEL CLIENTE']);
  const [tipoCredito, setTipoCredito] = useState<string>('BANCARIO');
  const [formaPago, setFormaPago] = useState<string>('TRANSFERENCIA');
  const [rap, setRap] = useState<string>('');
  const [elaboro, setElaboro] = useState<string>('DANIELA');
  const [nombreAsesor, setNombreAsesor] = useState<string>('NOMBRE DEL ASESOR');
  const [imagenRecibo, setImagenRecibo] = useState<string>('');
  const [imageFit, setImageFit] = useState<'contain' | 'cover'>('contain');

  // Estados de acción
  const [saving, setSaving] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calcular cuál es el último folio registrado y el siguiente sugerido
  const maxSavedFolio = historial.reduce(
    (max, item) => (item.folio > max ? item.folio : max),
    ultimoFolioBase
  );
  const siguienteFolioSugerido = maxSavedFolio + 1;

  // Cargar inventario e historial al iniciar
  useEffect(() => {
    fetchInventario()
      .then((items) => setCasas(items))
      .catch(() => {});
    loadIndexFromStorageAndRemote();
  }, []);

  // Permitir pegar imagen directamente con Ctrl+V
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const compressed = await compressImageFile(file);
            setImagenRecibo(compressed);
            showMessage('ok', 'Comprobante pegado desde el portapapeles.');
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const showMessage = (type: 'ok' | 'err', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => {
      setStatusMsg((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const loadIndexFromStorageAndRemote = async () => {
    setLoadingHistorial(true);
    let localPayload: RecibosIndexPayload | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_INDEX_KEY);
      if (raw) localPayload = JSON.parse(raw);
    } catch {
      // ignore
    }

    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', SUPABASE_INDEX_KEY)
        .maybeSingle();

      if (!error && data?.value) {
        const remotePayload = JSON.parse(data.value) as RecibosIndexPayload;
        const mergedMap = new Map<number, ReciboIndexItem>();
        (localPayload?.items || []).forEach((it) => mergedMap.set(it.folio, it));
        (remotePayload.items || []).forEach((it) => {
          const existing = mergedMap.get(it.folio);
          if (!existing || new Date(it.updatedAt) >= new Date(existing.updatedAt)) {
            mergedMap.set(it.folio, it);
          }
        });
        const mergedItems = Array.from(mergedMap.values()).sort((a, b) => b.folio - a.folio);
        const base = Math.max(
          remotePayload.ultimoFolioBase || DEFAULT_BASE_FOLIO,
          localPayload?.ultimoFolioBase || DEFAULT_BASE_FOLIO
        );
        setHistorial(mergedItems);
        setUltimoFolioBase(base);
        const maxF = mergedItems.reduce((m, x) => (x.folio > m ? x.folio : m), base);
        setFolio(String(maxF + 1));
        localStorage.setItem(
          STORAGE_INDEX_KEY,
          JSON.stringify({ ultimoFolioBase: base, items: mergedItems })
        );
        setLoadingHistorial(false);
        return;
      }
    } catch {
      // fallback a local
    }

    if (localPayload) {
      const sorted = (localPayload.items || []).sort((a, b) => b.folio - a.folio);
      const base = localPayload.ultimoFolioBase || DEFAULT_BASE_FOLIO;
      setHistorial(sorted);
      setUltimoFolioBase(base);
      const maxF = sorted.reduce((m, x) => (x.folio > m ? x.folio : m), base);
      setFolio(String(maxF + 1));
    } else {
      setHistorial([]);
      setUltimoFolioBase(DEFAULT_BASE_FOLIO);
      setFolio(String(DEFAULT_BASE_FOLIO + 1));
    }
    setLoadingHistorial(false);
  };

  // Autocompletar ubicación desde el inventario
  const handleSelectCasa = (id: string) => {
    setSelectedCasaId(id);
    if (!id) return;
    const [mzaStr, casaNum] = id.split('::');
    const found = casas.find((c) => String(c.mza) === mzaStr && c.casa === casaNum);
    if (!found) return;

    const condUpper = (found.condominio || '').toUpperCase().trim();
    const privName = condUpper.includes('TUC')
      ? 'TUCÁN'
      : condUpper.includes('AVE') || condUpper.includes('PARAISO')
        ? 'AVE DEL PARAISO'
        : condUpper || 'AVE DEL PARAISO';

    setPrivada(privName);
    setMz(String(found.mza));
    setCasa(String(found.casa));
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

  // Subir archivo de imagen
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file);
      setImagenRecibo(compressed);
      showMessage('ok', 'Imagen del recibo cargada correctamente.');
    } catch {
      showMessage('err', 'No se pudo procesar la imagen seleccionada.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Preparar un nuevo recibo con el folio consecutivo
  const handleNuevoReciboConsecutivo = () => {
    setEditingExistingFolio(null);
    setFolio(String(siguienteFolioSugerido));
    setFecha(getTodayIso());
    setMonto('15000');
    setConcepto('APARTADO');
    setCompradores(['NOMBRE DEL CLIENTE']);
    setRap('');
    setImagenRecibo('');
    showMessage('ok', `Listo para capturar el recibo consecutivo #${siguienteFolioSugerido}.`);
  };

  // Guardar recibo (nuevo o modificación)
  const handleSaveRecibo = async (silent = false): Promise<boolean> => {
    const numFolio = parseInt(folio.trim(), 10);
    if (isNaN(numFolio) || numFolio <= 0) {
      showMessage('err', 'Ingresa un número de recibo (# RECIBO) válido.');
      return false;
    }

    setSaving(true);
    const nowIso = new Date().toISOString();
    const clienteUnido =
      compradores
        .map((c) => c.trim())
        .filter(Boolean)
        .join(' Y ') || 'SIN NOMBRE';

    const fullRecord: ReciboRecord = {
      folio: numFolio,
      fecha,
      monto,
      privada,
      concepto,
      mz,
      casa,
      compradores: compradores.map((c) => c.trim()).filter(Boolean),
      tipoCredito,
      formaPago,
      rap,
      elaboro,
      nombreAsesor,
      imagenRecibo,
      updatedAt: nowIso,
    };

    const indexItem: ReciboIndexItem = {
      folio: numFolio,
      fecha,
      monto,
      privada,
      concepto,
      mz,
      casa,
      cliente: clienteUnido,
      tipoCredito,
      formaPago,
      rap,
      elaboro,
      nombreAsesor,
      tieneImagen: Boolean(imagenRecibo),
      updatedAt: nowIso,
    };

    try {
      // 1. Guardar en localStorage
      const updatedItems = [
        indexItem,
        ...historial.filter((item) => item.folio !== numFolio),
      ].sort((a, b) => b.folio - a.folio);

      const newBase = Math.max(ultimoFolioBase, numFolio);
      const indexPayload: RecibosIndexPayload = {
        ultimoFolioBase: newBase,
        items: updatedItems,
      };

      localStorage.setItem(STORAGE_ITEM_PREFIX + numFolio, JSON.stringify(fullRecord));
      localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(indexPayload));

      setHistorial(updatedItems);
      setUltimoFolioBase(newBase);
      setEditingExistingFolio(numFolio);

      // 2. Guardar en Supabase (app_config) para sincronización multi-dispositivo
      await Promise.all([
        supabase.from('app_config').upsert(
          {
            key: SUPABASE_ITEM_PREFIX + numFolio,
            value: JSON.stringify(fullRecord),
            updated_by: session?.user?.id,
            updated_at: nowIso,
          },
          { onConflict: 'key' }
        ),
        supabase.from('app_config').upsert(
          {
            key: SUPABASE_INDEX_KEY,
            value: JSON.stringify(indexPayload),
            updated_by: session?.user?.id,
            updated_at: nowIso,
          },
          { onConflict: 'key' }
        ),
      ]);

      if (!silent) {
        showMessage(
          'ok',
          `Recibo #${numFolio} guardado correctamente. Siguiente consecutivo: #${Math.max(newBase, updatedItems[0]?.folio || newBase) + 1}`
        );
      }
      return true;
    } catch (err) {
      console.error('Error al guardar recibo:', err);
      if (!silent) {
        showMessage('ok', `Recibo #${numFolio} guardado localmente en este equipo.`);
      }
      return true;
    } finally {
      setSaving(false);
    }
  };

  // Cargar un recibo existente para modificarlo o rehacerlo
  const handleLoadRecibo = async (item: ReciboIndexItem) => {
    setFolio(String(item.folio));
    setFecha(item.fecha);
    setMonto(item.monto);
    setPrivada(item.privada);
    setConcepto(item.concepto);
    setMz(item.mz);
    setCasa(item.casa);
    setCompradores(item.cliente ? item.cliente.split(' Y ') : ['NOMBRE DEL CLIENTE']);
    setTipoCredito(item.tipoCredito);
    setFormaPago(item.formaPago);
    setRap(item.rap || '');
    setElaboro(item.elaboro);
    setNombreAsesor(item.nombreAsesor);
    setEditingExistingFolio(item.folio);

    // Buscar el registro completo con imagen en localStorage o Supabase
    try {
      const localRaw = localStorage.getItem(STORAGE_ITEM_PREFIX + item.folio);
      if (localRaw) {
        const parsed = JSON.parse(localRaw) as ReciboRecord;
        if (parsed.compradores?.length) setCompradores(parsed.compradores);
        setImagenRecibo(parsed.imagenRecibo || '');
      } else {
        setImagenRecibo('');
      }

      const { data } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', SUPABASE_ITEM_PREFIX + item.folio)
        .maybeSingle();

      if (data?.value) {
        const remoteParsed = JSON.parse(data.value) as ReciboRecord;
        if (remoteParsed.compradores?.length) setCompradores(remoteParsed.compradores);
        setImagenRecibo(remoteParsed.imagenRecibo || '');
        localStorage.setItem(STORAGE_ITEM_PREFIX + item.folio, data.value);
      }
    } catch {
      // ignore
    }

    showMessage('ok', `Recibo #${item.folio} cargado para modificación o reimpresión.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Eliminar un recibo del historial
  const handleDeleteRecibo = async (folioToDelete: number) => {
    if (!window.confirm(`¿Seguro que deseas eliminar el registro del Recibo #${folioToDelete}?`)) {
      return;
    }
    const updatedItems = historial.filter((it) => it.folio !== folioToDelete);
    const indexPayload: RecibosIndexPayload = {
      ultimoFolioBase,
      items: updatedItems,
    };
    setHistorial(updatedItems);
    localStorage.removeItem(STORAGE_ITEM_PREFIX + folioToDelete);
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(indexPayload));

    if (editingExistingFolio === folioToDelete) {
      setEditingExistingFolio(null);
    }

    try {
      await supabase.from('app_config').upsert(
        {
          key: SUPABASE_INDEX_KEY,
          value: JSON.stringify(indexPayload),
          updated_by: session?.user?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
    } catch {
      // ignore
    }
    showMessage('ok', `Recibo #${folioToDelete} eliminado del historial.`);
  };

  // Ajustar manualmente el último folio base si quieren sincronizar numeración
  const handleAdjustBaseFolio = async () => {
    const input = window.prompt(
      'Ingresa el número del último recibo emitido (ej. 244) para que el consecutivo continúe a partir de ahí:',
      String(maxSavedFolio)
    );
    if (!input) return;
    const num = parseInt(input.trim(), 10);
    if (isNaN(num) || num < 0) return;
    setUltimoFolioBase(num);
    setFolio(String(num + 1));
    setEditingExistingFolio(null);
    const payload: RecibosIndexPayload = {
      ultimoFolioBase: num,
      items: historial,
    };
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(payload));
    try {
      await supabase.from('app_config').upsert(
        {
          key: SUPABASE_INDEX_KEY,
          value: JSON.stringify(payload),
          updated_by: session?.user?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
    } catch {
      // ignore
    }
    showMessage('ok', `Contador actualizado. Último folio: #${num} → Siguiente: #${num + 1}.`);
  };

  // Descargar PDF (y guardar automáticamente)
  const handleDownloadPDF = async (saveFirst = true) => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      if (saveFirst) {
        await handleSaveRecibo(true);
      }

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
        .slice(0, 28);
      pdf.save(`RECIBO_${folio}_MZ${mz}_CASA${casa}_${cleanClient}.pdf`);
      showMessage('ok', `Recibo #${folio} guardado y descargado en PDF.`);
    } catch (err) {
      console.error('Error generando PDF de recibo:', err);
      showMessage('err', 'Error al generar el PDF del recibo.');
    } finally {
      setExporting(false);
    }
  };

  const nombresUnidos =
    compradores
      .map((c) => c.trim())
      .filter(Boolean)
      .join(' Y ') || 'NOMBRE DEL CLIENTE';

  const filteredHistorial = historial.filter((it) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      String(it.folio).includes(q) ||
      it.cliente.toLowerCase().includes(q) ||
      it.casa.toLowerCase().includes(q) ||
      it.mz.toLowerCase().includes(q) ||
      it.concepto.toLowerCase().includes(q) ||
      it.nombreAsesor.toLowerCase().includes(q)
    );
  });

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.52rem 0.7rem',
    borderRadius: '8px',
    border: '1px solid var(--border-glass)',
    background: 'rgba(15,23,42,0.6)',
    color: 'var(--text-main)',
    fontSize: '0.84rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.71rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '0.28rem',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  };

  const cellBorder = '1px solid #333333';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '2.5rem' }}>
      {/* BARRA SUPERIOR DE TÍTULO Y ESTADO DE CONSECUTIVO */}
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
            background: 'rgba(16,185,129,0.14)',
            border: '1px solid rgba(16,185,129,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399',
          }}>
            <Receipt size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Generador y Control de Recibos
              </h1>
              {/* Aviso de en cuál recibo vamos */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 11px',
                borderRadius: '999px',
                fontSize: '0.76rem',
                fontWeight: 700,
                background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.4)',
                color: '#93c5fd',
              }}>
                Último registrado: #{maxSavedFolio} · Siguiente: #{siguienteFolioSugerido}
              </span>
              {editingExistingFolio !== null ? (
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: 'rgba(245,158,11,0.16)',
                  border: '1px solid rgba(245,158,11,0.4)',
                  color: '#fbbf24',
                }}>
                  Modo Edición: Recibo #{editingExistingFolio}
                </span>
              ) : (
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  background: 'rgba(34,197,94,0.14)',
                  border: '1px solid rgba(34,197,94,0.35)',
                  color: '#4ade80',
                }}>
                  Capturando Recibo #{folio}
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Edita los datos, adjunta o pega (`Ctrl+V`) la imagen del comprobante, guarda el registro con continuidad o modifica recibos anteriores.
            </p>
          </div>
        </div>

        {/* Botones de Acción Principal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleNuevoReciboConsecutivo}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.6rem 0.95rem',
              borderRadius: '10px',
              border: '1px solid rgba(59,130,246,0.4)',
              background: 'rgba(59,130,246,0.12)',
              color: '#93c5fd',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} /> Nuevo (#{siguienteFolioSugerido})
          </button>

          <button
            type="button"
            onClick={() => handleSaveRecibo(false)}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.62rem 1.05rem',
              borderRadius: '10px',
              border: '1px solid rgba(34,197,94,0.45)',
              background: 'rgba(34,197,94,0.16)',
              color: '#4ade80',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: saving ? 'wait' : 'pointer',
            }}
          >
            <Save size={16} />
            {saving ? 'Guardando...' : editingExistingFolio ? `Actualizar #${folio}` : `Guardar #${folio}`}
          </button>

          <button
            type="button"
            onClick={() => handleDownloadPDF(true)}
            disabled={exporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.65rem 1.2rem',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: exporting ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
            }}
          >
            <Download size={17} />
            {exporting ? 'Generando PDF...' : 'Guardar y Descargar PDF'}
          </button>
        </div>
      </div>

      {/* Mensaje de confirmación / alerta */}
      {statusMsg && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: '0.75rem 1.1rem',
          borderRadius: '12px',
          background: statusMsg.type === 'ok' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${statusMsg.type === 'ok' ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}`,
          color: statusMsg.type === 'ok' ? '#4ade80' : '#f87171',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}>
          {statusMsg.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* GRID PRINCIPAL: FORMULARIO IZQUIERDA + VISTA PREVIA DERECHA */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(350px, 460px) 1fr',
        gap: '1.25rem',
        alignItems: 'start',
      }} className="contratos-grid">
        {/* PANEL DE CONTROLES */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-glass)',
          borderRadius: '16px',
          padding: '1.2rem',
        }}>
          {/* 1. Control de Folio e Inventario */}
          <div style={{
            padding: '0.9rem',
            borderRadius: '12px',
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.22)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#34d399', fontWeight: 700, fontSize: '0.84rem' }}>
                <Sparkles size={15} />
                1. Folio del Recibo y Vivienda
              </span>
              <button
                type="button"
                onClick={handleAdjustBaseFolio}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-muted)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                }}
                title="Ajustar el número base en el que vamos"
              >
                Ajustar contador
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.55rem', marginBottom: '0.7rem' }}>
              <div>
                <label style={labelStyle}># RECIBO</label>
                <input
                  type="text"
                  value={folio}
                  onChange={(e) => setFolio(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{ ...inputStyle, fontWeight: 700, color: '#34d399', fontSize: '0.95rem' }}
                />
              </div>
              <div>
                <label style={labelStyle}>FECHA</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>MONTO ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <label style={labelStyle}>Autocompletar Ubicación desde Inventario (Opcional)</label>
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

          {/* 2. Ubicación y Concepto */}
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '0.85rem' }}>
            <span style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.6rem' }}>
              2. Ubicación y Concepto
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.55rem', marginBottom: '0.55rem' }}>
              <div>
                <label style={labelStyle}>PRIVADA</label>
                <input
                  type="text"
                  value={privada}
                  onChange={(e) => setPrivada(e.target.value.toUpperCase())}
                  placeholder="AVE DEL PARAISO"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>CONCEPTO</label>
                <input
                  type="text"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value.toUpperCase())}
                  placeholder="APARTADO"
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
              <div>
                <label style={labelStyle}>MANZANA (MZ)</label>
                <input
                  type="text"
                  value={mz}
                  onChange={(e) => setMz(e.target.value.toUpperCase())}
                  placeholder="3"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>CASA</label>
                <input
                  type="text"
                  value={casa}
                  onChange={(e) => setCasa(e.target.value.toUpperCase())}
                  placeholder="77"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* 3. Datos del Cliente, Crédito y Pago */}
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                3. Cliente, Crédito y Forma de Pago
              </span>
              <button
                type="button"
                onClick={handleAddComprador}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  border: '1px solid rgba(59,130,246,0.4)',
                  background: 'rgba(59,130,246,0.12)',
                  color: '#60a5fa',
                  fontSize: '0.73rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={12} /> Agregar persona
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.6rem' }}>
              {compradores.map((nombre, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => handleUpdateComprador(idx, e.target.value)}
                    placeholder={`Nombre del cliente ${idx + 1}`}
                    style={inputStyle}
                  />
                  {compradores.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveComprador(idx)}
                      style={{
                        padding: '0.48rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(239,68,68,0.3)',
                        background: 'rgba(239,68,68,0.1)',
                        color: '#f87171',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.8fr', gap: '0.55rem', marginBottom: '0.55rem' }}>
              <div>
                <label style={labelStyle}>TIPO DE CRÉDITO</label>
                <input
                  type="text"
                  value={tipoCredito}
                  onChange={(e) => setTipoCredito(e.target.value.toUpperCase())}
                  placeholder="BANCARIO"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>FORMA DE PAGO</label>
                <input
                  type="text"
                  value={formaPago}
                  onChange={(e) => setFormaPago(e.target.value.toUpperCase())}
                  placeholder="TRANSFERENCIA"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>RAP</label>
                <input
                  type="text"
                  value={rap}
                  onChange={(e) => setRap(e.target.value.toUpperCase())}
                  placeholder="Opcional"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
              <div>
                <label style={labelStyle}>ELABORÓ</label>
                <input
                  type="text"
                  value={elaboro}
                  onChange={(e) => setElaboro(e.target.value.toUpperCase())}
                  placeholder="DANIELA"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>NOMBRE DE ASESOR</label>
                <input
                  type="text"
                  value={nombreAsesor}
                  onChange={(e) => setNombreAsesor(e.target.value.toUpperCase())}
                  placeholder="SHENDEL"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* 4. Adjuntar Imagen del Recibo */}
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ImageIcon size={15} color="#34d399" />
                4. Imagen del Comprobante (Sección RECIBO)
              </span>
              {imagenRecibo && (
                <button
                  type="button"
                  onClick={() => setImagenRecibo('')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid rgba(239,68,68,0.35)',
                    background: 'rgba(239,68,68,0.1)',
                    color: '#f87171',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={12} /> Quitar imagen
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '1.5px dashed rgba(52,211,153,0.45)',
                borderRadius: '10px',
                padding: '0.85rem',
                textAlign: 'center',
                background: 'rgba(16,185,129,0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Upload size={20} color="#34d399" style={{ marginBottom: '4px' }} />
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Haz clic para adjuntar imagen del recibo
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                También puedes copiar una captura y presionar <strong>Ctrl + V</strong> en cualquier momento
              </div>
            </div>

            {imagenRecibo && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.55rem' }}>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>Ajuste dentro del recuadro:</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => setImageFit('contain')}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      border: imageFit === 'contain' ? '1px solid #34d399' : '1px solid var(--border-glass)',
                      background: imageFit === 'contain' ? 'rgba(16,185,129,0.2)' : 'transparent',
                      color: imageFit === 'contain' ? '#34d399' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    Completa (Contain)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageFit('cover')}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      border: imageFit === 'cover' ? '1px solid #34d399' : '1px solid var(--border-glass)',
                      background: imageFit === 'cover' ? 'rgba(16,185,129,0.2)' : 'transparent',
                      color: imageFit === 'cover' ? '#34d399' : 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    Expandir (Cover)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* VISTA PREVIA DEL RECIBO (IDÉNTICA AL EXCEL) */}
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
              padding: '34px 44px 38px 44px',
              boxSizing: 'border-box',
              fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
              boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* ENCABEZADO CON OLA AZUL Y LOGO QUETZALES */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              marginBottom: '18px',
            }}>
              <div style={{
                width: '73%',
                height: '115px',
                overflow: 'hidden',
              }}>
                <img
                  src="/carta-compromiso-wave.png?v=2"
                  alt="Banner Azul"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill',
                    display: 'block',
                  }}
                />
              </div>
              <div style={{
                width: '25%',
                height: '115px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img
                  src="/carta-compromiso-logo.png?v=2"
                  alt="Residencial Los Quetzales"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '108px',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </div>
            </div>

            {/* BLOQUE SUPERIOR: FECHA, MONTO, UBICACIÓN, PRIVADA, CONCEPTO, MZ, CASA, # RECIBO */}
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              fontSize: '10.5pt',
              marginBottom: '14px',
            }}>
              <colgroup>
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '14.5%' }} />
                <col style={{ width: '14.5%' }} />
              </colgroup>
              <tbody>
                {/* Fila 10: FECHA | valor (2 cols) | vacío | MONTO: | valor (2 cols) */}
                <tr style={{ height: '26px' }}>
                  <td style={{
                    backgroundColor: '#EAD1DC',
                    border: cellBorder,
                    fontWeight: 700,
                    padding: '4px 8px',
                    textAlign: 'left',
                  }}>
                    FECHA
                  </td>
                  <td colSpan={2} style={{
                    backgroundColor: '#FFFFFF',
                    border: cellBorder,
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}>
                    {formatDateSlash(fecha)}
                  </td>
                  <td style={{ border: 'none' }} />
                  <td style={{
                    backgroundColor: '#EAD1DC',
                    border: cellBorder,
                    fontWeight: 700,
                    padding: '4px 8px',
                    textAlign: 'left',
                  }}>
                    MONTO:
                  </td>
                  <td colSpan={2} style={{
                    backgroundColor: '#FFFFFF',
                    border: cellBorder,
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '11pt',
                  }}>
                    {formatCurrency(monto)}
                  </td>
                </tr>

                {/* Fila 11: UBICACIÓN */}
                <tr style={{ height: '24px' }}>
                  <td colSpan={4} style={{
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '10.5pt',
                    padding: '4px 0 2px 0',
                  }}>
                    UBICACIÓN
                  </td>
                  <td colSpan={3} />
                </tr>

                {/* Fila 12: PRIVADA: | valor (2 cols) | vacío | CONCEPTO: | valor (2 cols) */}
                <tr style={{ height: '26px' }}>
                  <td style={{
                    backgroundColor: '#EAD1DC',
                    border: cellBorder,
                    fontWeight: 700,
                    padding: '4px 8px',
                  }}>
                    PRIVADA:
                  </td>
                  <td colSpan={2} style={{
                    backgroundColor: '#FFFFFF',
                    border: cellBorder,
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}>
                    {privada}
                  </td>
                  <td style={{ border: 'none' }} />
                  <td style={{
                    backgroundColor: '#EAD1DC',
                    border: cellBorder,
                    fontWeight: 700,
                    padding: '4px 8px',
                  }}>
                    CONCEPTO:
                  </td>
                  <td colSpan={2} style={{
                    backgroundColor: '#FFFFFF',
                    border: cellBorder,
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontWeight: 600,
                  }}>
                    {concepto}
                  </td>
                </tr>

                {/* Fila 13: Espaciador */}
                <tr style={{ height: '12px' }}>
                  <td colSpan={7} />
                </tr>

                {/* Fila 14: MZ: | val | CASA: | val | # RECIBO: | val (2 cols) */}
                <tr style={{ height: '26px' }}>
                  <td style={{
                    backgroundColor: '#EAD1DC',
                    border: cellBorder,
                    fontWeight: 700,
                    padding: '4px 8px',
                  }}>
                    MZ:
                  </td>
                  <td style={{
                    backgroundColor: '#FFFFFF',
                    border: cellBorder,
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontWeight: 700,
                  }}>
                    {mz}
                  </td>
                  <td style={{
                    backgroundColor: '#EAD1DC',
                    border: cellBorder,
                    fontWeight: 700,
                    padding: '4px 8px',
                  }}>
                    CASA:
                  </td>
                  <td style={{
                    backgroundColor: '#FFFFFF',
                    border: cellBorder,
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontWeight: 700,
                  }}>
                    {casa}
                  </td>
                  <td style={{
                    backgroundColor: '#EAD1DC',
                    border: cellBorder,
                    fontWeight: 700,
                    padding: '4px 8px',
                  }}>
                    # RECIBO:
                  </td>
                  <td colSpan={2} style={{
                    backgroundColor: '#FFFFFF',
                    border: cellBorder,
                    padding: '4px 8px',
                    textAlign: 'center',
                    fontWeight: 700,
                    fontSize: '11.5pt',
                  }}>
                    {folio}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* TABLA DE CLIENTE / TIPO DE CRÉDITO / FORMA DE PAGO / RAP */}
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              fontSize: '10pt',
              marginBottom: '22px',
            }}>
              <colgroup>
                <col style={{ width: '32%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr style={{ height: '38px' }}>
                  <th style={{
                    backgroundColor: '#D0E0E3',
                    border: cellBorder,
                    fontWeight: 700,
                    textAlign: 'center',
                    padding: '6px',
                  }}>
                    NOMBRE DEL CLIENTE:
                  </th>
                  <th style={{
                    backgroundColor: '#D0E0E3',
                    border: cellBorder,
                    fontWeight: 700,
                    textAlign: 'center',
                    padding: '6px',
                  }}>
                    TIPO DE CREDITO:
                  </th>
                  <th style={{
                    backgroundColor: '#D0E0E3',
                    border: cellBorder,
                    fontWeight: 700,
                    textAlign: 'center',
                    padding: '6px',
                  }}>
                    FORMA DE PAGO:
                  </th>
                  <th style={{
                    backgroundColor: '#D0E0E3',
                    border: cellBorder,
                    fontWeight: 700,
                    textAlign: 'center',
                    padding: '6px',
                  }}>
                    RAP:
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ height: '52px' }}>
                  <td style={{
                    backgroundColor: '#FBE4D5',
                    border: cellBorder,
                    textAlign: 'center',
                    fontWeight: 600,
                    padding: '8px 6px',
                    fontSize: '10pt',
                  }}>
                    {nombresUnidos}
                  </td>
                  <td style={{
                    backgroundColor: '#FBE4D5',
                    border: cellBorder,
                    textAlign: 'center',
                    fontWeight: 600,
                    padding: '8px 6px',
                  }}>
                    {tipoCredito}
                  </td>
                  <td style={{
                    backgroundColor: '#FBE4D5',
                    border: cellBorder,
                    textAlign: 'center',
                    fontWeight: 600,
                    padding: '8px 6px',
                  }}>
                    {formaPago}
                  </td>
                  <td style={{
                    backgroundColor: '#FBE4D5',
                    border: cellBorder,
                    textAlign: 'center',
                    fontWeight: 600,
                    padding: '8px 6px',
                  }}>
                    {rap}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* SECCIÓN INFERIOR: IZQUIERDA (RECIBO + ASESOR) | DERECHA (ELABORÓ + FIRMA + SELLO) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '57% 40%',
              justifyContent: 'space-between',
              alignItems: 'stretch',
              flex: 1,
            }}>
              {/* COLUMNA IZQUIERDA: RECIBO (IMAGEN) Y NOMBRE DE ASESOR */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Encabezado RECIBO */}
                <div style={{
                  backgroundColor: '#78909C',
                  border: cellBorder,
                  height: '44px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '20pt',
                  letterSpacing: '0.02em',
                  color: '#000000',
                }}>
                  RECIBO
                </div>

                {/* Contenedor de la Imagen del Recibo */}
                <div style={{
                  backgroundColor: '#EBEFF1',
                  borderLeft: cellBorder,
                  borderRight: cellBorder,
                  borderBottom: cellBorder,
                  height: '430px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '14px',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}>
                  {imagenRecibo ? (
                    <img
                      src={imagenRecibo}
                      alt="Comprobante de Recibo"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: imageFit,
                        display: 'block',
                      }}
                    />
                  ) : (
                    <div style={{
                      color: '#64748b',
                      fontSize: '10.5pt',
                      textAlign: 'center',
                      border: '1px dashed #94a3b8',
                      borderRadius: '8px',
                      padding: '28px 20px',
                      background: 'rgba(255,255,255,0.55)',
                    }}>
                      Espacio para el comprobante / recibo de pago
                    </div>
                  )}
                </div>

                {/* Franja separadora gris-azulada (Fila 42 del Excel) */}
                <div style={{
                  backgroundColor: '#BBC8CE',
                  borderLeft: cellBorder,
                  borderRight: cellBorder,
                  borderBottom: cellBorder,
                  height: '18px',
                }} />

                {/* NOMBRE DE ASESOR: */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderLeft: cellBorder,
                  borderRight: cellBorder,
                  borderBottom: cellBorder,
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '10.5pt',
                }}>
                  NOMBRE DE ASESOR:
                </div>

                {/* Valor del Asesor (Verde pastel #C5E0B3) */}
                <div style={{
                  backgroundColor: '#C5E0B3',
                  borderLeft: cellBorder,
                  borderRight: cellBorder,
                  borderBottom: cellBorder,
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '11pt',
                }}>
                  {nombreAsesor}
                </div>
              </div>

              {/* COLUMNA DERECHA: ELABORÓ, FIRMA Y SELLO */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                {/* Bloque ELABORÓ (alineado a la derecha como cols G:H del Excel) */}
                <div style={{ width: '78%', marginLeft: 'auto' }}>
                  <div style={{
                    backgroundColor: '#EAD1DC',
                    border: cellBorder,
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '10.5pt',
                  }}>
                    ELABORÓ:
                  </div>
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderLeft: cellBorder,
                    borderRight: cellBorder,
                    borderBottom: cellBorder,
                    height: '78px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '11pt',
                  }}>
                    {elaboro}
                  </div>
                </div>

                {/* Bloque FIRMA (recuadro blanco arriba, etiqueta FIRMA: abajo) */}
                <div style={{ width: '78%', marginLeft: 'auto', marginTop: '18px' }}>
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    border: cellBorder,
                    height: '82px',
                  }} />
                  <div style={{
                    backgroundColor: '#EAD1DC',
                    borderLeft: cellBorder,
                    borderRight: cellBorder,
                    borderBottom: cellBorder,
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '10.5pt',
                  }}>
                    FIRMA:
                  </div>
                </div>

                {/* Bloque SELLO (ocupa todo el ancho F:H de la columna derecha) */}
                <div style={{ width: '100%', marginTop: '18px' }}>
                  <div style={{
                    backgroundColor: '#C9DAF8',
                    border: cellBorder,
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '10.5pt',
                  }}>
                    SELLO:
                  </div>
                  <div style={{
                    backgroundColor: '#EEF7E3',
                    borderLeft: cellBorder,
                    borderRight: cellBorder,
                    borderBottom: cellBorder,
                    height: '215px',
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* HISTORIAL DE RECIBOS GUARDADOS (PARA CONTINUIDAD Y REHACER / MODIFICAR) */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-glass)',
        borderRadius: '16px',
        padding: '1.25rem',
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <History size={20} color="#34d399" />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Registro e Historial de Recibos Guardados ({historial.length})
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Selecciona cualquier recibo guardado si necesitas modificarlo, cambiar su comprobante o volver a descargar su PDF.
              </p>
            </div>
          </div>

          <div style={{ position: 'relative', minWidth: '270px' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por # recibo, cliente, casa..."
              style={{ ...inputStyle, paddingLeft: '32px' }}
            />
          </div>
        </div>

        {loadingHistorial ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Cargando registro de recibos...
          </div>
        ) : filteredHistorial.length === 0 ? (
          <div style={{
            padding: '1.75rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            border: '1px dashed var(--border-glass)',
            borderRadius: '12px',
          }}>
            Aún no hay recibos guardados con ese criterio. El contador actual está en <strong>#{maxSavedFolio}</strong> (siguiente sugerido: <strong>#{siguienteFolioSugerido}</strong>).
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0.75rem' }}># Recibo</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Fecha</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Cliente</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Ubicación</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Concepto</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Monto</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Asesor / Elaboró</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Comprobante</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistorial.map((item) => {
                  const isCurrent = editingExistingFolio === item.folio;
                  return (
                    <tr
                      key={item.folio}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        background: isCurrent ? 'rgba(16,185,129,0.08)' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: '#34d399' }}>
                        #{item.folio}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-main)' }}>
                        {formatDateSlash(item.fecha)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {item.cliente}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)' }}>
                        MZ {item.mz} · Casa {item.casa} ({item.privada})
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-main)' }}>
                        {item.concepto}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {formatCurrency(item.monto)}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)' }}>
                        {item.nombreAsesor} / {item.elaboro}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem' }}>
                        {item.tieneImagen ? (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.7rem',
                            background: 'rgba(34,197,94,0.14)',
                            color: '#4ade80',
                            fontWeight: 600,
                          }}>
                            Con imagen
                          </span>
                        ) : (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            fontSize: '0.7rem',
                            background: 'rgba(148,163,184,0.12)',
                            color: 'var(--text-muted)',
                          }}>
                            Sin imagen
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => handleLoadRecibo(item)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '7px',
                              border: '1px solid rgba(59,130,246,0.4)',
                              background: 'rgba(59,130,246,0.14)',
                              color: '#93c5fd',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            <Edit3 size={13} /> Cargar / Modificar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecibo(item.folio)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '5px 8px',
                              borderRadius: '7px',
                              border: '1px solid rgba(239,68,68,0.35)',
                              background: 'rgba(239,68,68,0.1)',
                              color: '#f87171',
                              cursor: 'pointer',
                            }}
                            title="Eliminar registro"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
