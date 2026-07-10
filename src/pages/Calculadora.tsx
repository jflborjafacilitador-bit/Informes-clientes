import { useState, useMemo, useEffect } from 'react';
import { Calculator, ChevronDown, Download, CheckSquare, Square } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PRECIOS } from '../data/precios';
import { fetchInventario, type InventarioItem } from '../services/inventarioService';
import { fetchEstatusOverrides, resolveEstatus } from '../services/inventarioEstatusService';

type TipoCredito =
    | 'INFONAVIT'
    | 'FOVISSSTE'
    | 'CFE'
    | 'BANCARIO'
    | 'COFINAVIT'
    | 'FOVISSSTE_INFONAVIT';

const TIPOS_CREDITO: { value: TipoCredito; label: string }[] = [
    { value: 'INFONAVIT', label: 'INFONAVIT Tradicional' },
    { value: 'FOVISSSTE', label: 'FOVISSSTE' },
    { value: 'CFE', label: 'CFE (Contado)' },
    { value: 'BANCARIO', label: 'Crédito Bancario' },
    { value: 'COFINAVIT', label: 'COFINAVIT' },
    { value: 'FOVISSSTE_INFONAVIT', label: 'FOVISSSTE + INFONAVIT' },
];

// ─── Helpers ─────────────────────────────────────────────────────
const fmt = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

// Remove symbols so formatting like "$83,000" correctly parses into `83000`.
const num = (v: string | number) => typeof v === 'number' ? v : (parseFloat((v || '').replace(/[^0-9.-]+/g, '')) || 0);

const cleanProto = (p: string): string => {
    const s = (p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (s.includes('ROOF')) return 'ROOF';
    if (s.includes('FA')) return 'FA';
    if (s.includes('PLUS')) return 'PLUS';
    if (s.includes('QUETZAL')) return 'QUETZAL';
    return s;
};

const Field = ({
    label, value, onChange, readOnly = false, helperText, prefix, placeholder, isNumeric = true,
}: {
    label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean; helperText?: React.ReactNode; prefix?: string; placeholder?: string; isNumeric?: boolean;
}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
        </label>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {prefix && <span style={{ position: 'absolute', left: 12, color: readOnly ? 'var(--primary-accent)' : 'var(--text-muted)', fontSize: '0.95rem' }}>{prefix}</span>}
            <input
                type="text"
                readOnly={readOnly}
                value={value}
                placeholder={placeholder}
                onChange={e => onChange?.(e.target.value)}
                style={{
                    background: readOnly ? 'rgba(34,197,94,0.05)' : 'var(--panel-item-bg)',
                    border: `1px solid ${readOnly ? 'rgba(34,197,94,0.2)' : 'var(--border-glass)'}`,
                    borderRadius: 8,
                    padding: `10px 14px 10px ${prefix ? '24px' : '14px'}`,
                    color: readOnly ? 'var(--primary-accent)' : 'var(--text-main)',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    width: '100%',
                    outline: 'none',
                    cursor: readOnly ? 'default' : 'text',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                }}
                onFocus={e => { if (!readOnly) e.target.style.borderColor = 'rgba(34,197,94,0.5)'; }}
                onBlur={e => {
                    if (!readOnly) {
                        e.target.style.borderColor = 'var(--border-glass)';
                        // Autoguardado con formato al salir
                        if (isNumeric && value && onChange) onChange(fmt(num(value)));
                    }
                }}
            />
        </div>
        {helperText && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{helperText}</div>}
    </div>
);

const Select = ({ label, value, options, onChange }: {
    label: string; value: string; options: string[]; onChange: (v: string) => void;
}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'relative' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
        </label>
        <div style={{ position: 'relative' }}>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    width: '100%',
                    background: 'var(--panel-item-bg)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: 8,
                    padding: '10px 36px 10px 14px',
                    color: value ? 'var(--text-main)' : 'var(--text-muted)',
                    fontSize: '0.95rem',
                    fontFamily: 'inherit',
                    appearance: 'none',
                    cursor: 'pointer',
                    outline: 'none',
                }}
            >
                <option value="" style={{ color: 'var(--text-main)', background: 'var(--bg-dark)' }}>— Seleccionar —</option>
                {options.map(o => <option key={o} value={o} style={{ color: 'var(--text-main)', background: 'var(--bg-dark)' }}>{o}</option>)}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>
    </div>
);

const CheckboxOption = ({ label, price, checked, onChange, isCustom = false, customValue, onCustomValueChange }: any) => (
    <div
        onClick={() => onChange(!checked)}
        style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
            borderRadius: 8, background: checked ? 'rgba(34,197,94,0.1)' : 'var(--panel-item-bg)',
            border: `1px solid ${checked ? 'rgba(34,197,94,0.3)' : 'var(--border-glass)'}`,
            cursor: 'pointer', transition: 'all 0.2s', flexWrap: 'wrap'
        }}
    >
        {checked ? <CheckSquare size={18} color="var(--primary-accent)" /> : <Square size={18} color="var(--text-muted)" />}
        <span style={{ fontSize: '0.85rem', color: checked ? 'var(--text-main)' : 'var(--text-muted)', flex: 1 }}>{label}</span>
        {isCustom ? (
            <input
                type="text"
                placeholder="$ Costo"
                value={customValue}
                onChange={e => onCustomValueChange?.(e.target.value)}
                onBlur={e => { if (e.target.value && onCustomValueChange) onCustomValueChange(fmt(num(e.target.value))); }}
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--ghost-bg)', border: '1px solid var(--border-glass)',
                    borderRadius: 4, padding: '4px 8px', color: 'var(--text-main)',
                    width: '90px', fontSize: '0.8rem', outline: 'none'
                }}
            />
        ) : price !== undefined && (
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: checked ? 'var(--primary-accent)' : 'var(--text-muted)' }}>
                +{fmt(price)}
            </span>
        )}
    </div>
);

interface ExtraItem {
    id: string;
    nombre: string;
    precio: number;
    descripcion?: string;
}

const EXTRAS_DISPONIBLES: ExtraItem[] = [
    { id: 'cocina_granito', nombre: 'Cocina Integral Equipada con Barra de Granito', precio: 65000 },
    { id: 'closet_quetzal', nombre: 'Clóset Quetzal', precio: 29000 },
    { id: 'closet_quetzal_plus', nombre: 'Clóset Quetzal Plus', precio: 68000 },
    { id: 'persianas_quetzal', nombre: 'Persianas Quetzal', precio: 11500 },
    { id: 'persianas_quetzal_plus', nombre: 'Persianas Quetzal Plus', precio: 16500 },
    { id: 'jaula_patio', nombre: 'Jaula Patio de Servicio', precio: 5000 },
    { id: 'proteccion_puerta', nombre: 'Protección Puerta Principal', precio: 7800 },
    { id: 'puerta_ventanal', nombre: 'Puerta Ventanal PB.', precio: 13000 },
    { id: 'cancel_cristal', nombre: 'Cancel de Baño con Cristal', precio: 10000 },
    { id: 'paquete_persianas_cocina', nombre: 'Paquete Persianas Cocina y Escaleras', precio: 6000 },
    { id: 'paquete_herreria_completo', nombre: 'Paquete Herrería Completo', precio: 71781 },
    { id: 'paquete_herreria_pb', nombre: 'Paquete 1 Herrería P.B', precio: 29557, descripcion: 'Corrediza puerta principal, corrediza ventanal principal, jaula patio de servicio, ventana escalera (tronera)' },
    { id: 'paquete_herreria_n1', nombre: 'Paquete 2 Herrería N1', precio: 22017, descripcion: 'Corrediza ventanal recámara 1 (terraza), protección recámara 2 (patio trasero), protección baño, ventana escalera (tronera)' },
    { id: 'paquete_herreria_n2', nombre: 'Paquete 3 Herrería N2', precio: 20207, descripcion: 'Corrediza ventanal recámara 3 (terraza), protección recámara 3 (patio trasero), protección baño' }
];

export default function Calculadora() {
    const [searchParams] = useSearchParams();
    const [isGenerating, setIsGenerating] = useState(false);

    const mzParam = searchParams.get('manzana') || '';
    const initialMza = mzParam ? (mzParam.toLowerCase().startsWith('manzana') ? mzParam : `Manzana ${mzParam}`) : '';
    
    // Convert 'QUETZA' to 'QUETZAL' if it comes misspelled from map data
    const rawModelo = (searchParams.get('modelo') || '').toUpperCase();
    let initialModelo = rawModelo;
    if (rawModelo.includes('ROOF')) initialModelo = 'QUETZAL C/ROOF GARDEN';
    else if (rawModelo.includes('PLUS') && rawModelo.includes('F.A')) initialModelo = 'QUETZAL PLUS F.A.';
    else if (rawModelo.includes('PLUS')) initialModelo = 'QUETZAL PLUS';
    else if (rawModelo.includes('QUETZ')) initialModelo = 'QUETZAL';
    const [manzana, setManzana] = useState(initialMza);
    const [modelo, setModelo] = useState(initialModelo);
    const [version, setVersion] = useState(searchParams.get('version') || '');
    const [tipo, setTipo] = useState<TipoCredito | ''>('');
    const [nombreCliente, setNombreCliente] = useState('');

    // Inventario y disponibilidad de casas
    const [inventarioItems, setInventarioItems] = useState<InventarioItem[]>([]);
    const [estatusOverrides, setEstatusOverrides] = useState<Map<string, any>>(new Map());
    const [casaSeleccionada, setCasaSeleccionada] = useState('');

    // Campos editables
    const [gastosNot, setGastosNot] = useState('');
    const [credito, setCredito] = useState('');
    const [subcuenta, setSubcuenta] = useState('');
    const [creditoBanco, setCreditoBanco] = useState('');
    const [creditoFoviss, setCreditoFoviss] = useState('');
    const [apartado, setApartado] = useState('');
    const [descuento, setDescuento] = useState('');
    
    // Especial Contado / CFE
    const [montoDisponible, setMontoDisponible] = useState('');
    const [usarAvaluo, setUsarAvaluo] = useState(false);

    // Nuevas configuraciones de crédito conyugal y subtipos
    const [esConyugal, setEsConyugal] = useState(false);
    const [esFovisssteDirecto, setEsFovisssteDirecto] = useState(false);
    const [creditoConyuge, setCreditoConyuge] = useState('');
    const [subcuentaConyuge, setSubcuentaConyuge] = useState('');
    const [creditoBancoConyuge, setCreditoBancoConyuge] = useState('');
    const [ahorroVoluntarioConyuge, setAhorroVoluntarioConyuge] = useState('');

    // Nuevos campos de gastos e impuestos editables
    const [ahorroVoluntario, setAhorroVoluntario] = useState('');
    const [gastosTitulacion, setGastosTitulacion] = useState('');
    const [gastosTitulacionConyuge, setGastosTitulacionConyuge] = useState('');
    const [gastosOriginacion, setGastosOriginacion] = useState('');
    const [gastosOriginacionConyuge, setGastosOriginacionConyuge] = useState('');
    const [impuestosDerechos, setImpuestosDerechos] = useState('');
    const [pagoInicial, setPagoInicial] = useState('');

    // Extras
    const [extraEsquina, setExtraEsquina] = useState(false);
    const [costoEsquina, setCostoEsquina] = useState('$20,000');
    const [extrasSeleccionados, setExtrasSeleccionados] = useState<ExtraItem[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const toggleExtra = (item: ExtraItem) => {
        if (extrasSeleccionados.find(e => e.id === item.id)) {
            setExtrasSeleccionados(extrasSeleccionados.filter(e => e.id !== item.id));
        } else {
            setExtrasSeleccionados([...extrasSeleccionados, item]);
        }
    };

    // Listas derivadas
    const modelos = useMemo(() =>
        manzana && PRECIOS[manzana] ? [...new Set(PRECIOS[manzana].map(r => r.modelo))] : [], [manzana]);

    const versiones = useMemo(() =>
        (manzana && PRECIOS[manzana] && modelo) ? PRECIOS[manzana].filter(r => r.modelo === modelo).map(r => r.version) : [], [manzana, modelo]);

    const casasFiltradas = useMemo(() => {
        if (!manzana || !modelo) return [];
        const selMzaNum = manzana.replace(/[^0-9]/g, '');
        const targetCleanProto = cleanProto(modelo);
        return inventarioItems.filter(item => {
            const mzaNum = item.mza.replace(/[^0-9]/g, '');
            const mzaOk = mzaNum === selMzaNum;
            if (!mzaOk) return false;
            
            // Estricta coincidencia de modelo
            if (cleanProto(item.prototipo) !== targetCleanProto) return false;

            // Solo mostrar casas con estatus DISPONIBLE
            const est = resolveEstatus(item.mza, item.casa, item.estatus, estatusOverrides);
            return est === 'DISPONIBLE';
        });
    }, [inventarioItems, manzana, modelo, estatusOverrides]);

    const estatusCasaSeleccionada = useMemo(() => {
        if (!casaSeleccionada || !manzana) return null;
        const selMzaNum = manzana.replace(/[^0-9]/g, '');
        const item = inventarioItems.find(i => i.mza.replace(/[^0-9]/g, '') === selMzaNum && i.casa === casaSeleccionada);
        if (!item) return null;
        return resolveEstatus(item.mza, item.casa, item.estatus, estatusOverrides);
    }, [casaSeleccionada, manzana, inventarioItems, estatusOverrides]);

    const precioBase = useMemo(() => {
        if (!manzana || !PRECIOS[manzana] || !modelo || !version) return 0;
        return PRECIOS[manzana].find(r => r.modelo === modelo && r.version === version)?.precio ?? 0;
    }, [manzana, modelo, version]);

    const valAvaluo = useMemo(() => {
        if (!manzana || !PRECIOS[manzana] || !modelo || !version) return 0;
        return PRECIOS[manzana].find(r => r.modelo === modelo && r.version === version)?.avaluo ?? 0;
    }, [manzana, modelo, version]);

    const precioOperacion = usarAvaluo && valAvaluo > 0 ? valAvaluo : precioBase;

    const extrasTotal = useMemo(() => {
        let t = 0;
        if (extraEsquina) t += num(costoEsquina);
        extrasSeleccionados.forEach(item => {
            t += item.precio;
        });
        return t;
    }, [extraEsquina, costoEsquina, extrasSeleccionados]);

    // Calcular resultado
    const resultado = useMemo(() => {
        if (!tipo || !precioOperacion) return null;
        const subtotal = precioOperacion - num(descuento);
        const pv = subtotal + extrasTotal; // Precio de Venta (con extras)
        const apt = num(apartado);

        let diferencia = 0;
        let desglose: { label: string; monto: number }[] = [];

        // Parsing fields
        const credVal = num(credito);
        const subVal = num(subcuenta);
        const ahorroVal = num(ahorroVoluntario);
        const impDerVal = num(impuestosDerechos);
        const avaluoVal = 0;
        const titVal = num(gastosTitulacion);

        const credConyVal = num(creditoConyuge);
        const subConyVal = num(subcuentaConyuge);
        const titConyVal = num(gastosTitulacionConyuge);
        const ahorroConyVal = num(ahorroVoluntarioConyuge);

        const origVal = num(gastosOriginacion);
        const origConyVal = num(gastosOriginacionConyuge);

        const credBcoVal = num(creditoBanco);
        const credBcoConyVal = num(creditoBancoConyuge);

        const pagoInitVal = num(pagoInicial);

        if (tipo === 'INFONAVIT') {
            if (esConyugal) {
                // INFONAVIT Conyugal
                const capacidadTitular = credVal + subVal - titVal;
                const capacidadConyuge = credConyVal + subConyVal - titConyVal;
                const capacidadTotal = capacidadTitular + capacidadConyuge + ahorroVal - impDerVal - avaluoVal;
                diferencia = pv - capacidadTotal;

                desglose = [
                    { label: 'Valor Vivienda (con Extras)', monto: pv },
                    { label: 'Impuestos y Derechos (Aprox.)', monto: impDerVal },
                    { label: 'Crédito INFONAVIT Titular', monto: -credVal },
                    { label: 'Subcuenta Vivienda Titular', monto: -subVal },
                    { label: 'Gastos Titulación Titular', monto: titVal },
                    { label: 'Crédito INFONAVIT Cónyuge', monto: -credConyVal },
                    { label: 'Subcuenta Vivienda Cónyuge', monto: -subConyVal },
                    { label: 'Gastos Titulación Cónyuge', monto: titConyVal },
                    { label: 'Ahorro Voluntario', monto: -ahorroVal },
                    { label: 'Apartado', monto: -apt },
                ];
            } else {
                // INFONAVIT Individual
                const capacidadTotal = credVal + subVal + ahorroVal - impDerVal - avaluoVal - titVal;
                diferencia = pv - capacidadTotal;

                desglose = [
                    { label: 'Valor Vivienda (con Extras)', monto: pv },
                    { label: 'Impuestos y Derechos (Aprox.)', monto: impDerVal },
                    { label: 'Gastos de Titulación', monto: titVal },
                    { label: 'Crédito INFONAVIT', monto: -credVal },
                    { label: 'Subcuenta de Vivienda', monto: -subVal },
                    { label: 'Ahorro Voluntario', monto: -ahorroVal },
                    { label: 'Apartado', monto: -apt },
                ];
            }
        } else if (tipo === 'FOVISSSTE') {
            if (esFovisssteDirecto) {
                // FOVISSSTE Directo
                if (esConyugal) {
                    // FOVISSSTE Directo Conyugal
                    const totalCost = pv + impDerVal + origVal + origConyVal;
                    diferencia = totalCost - credVal - credConyVal;

                    desglose = [
                        { label: 'Valor Vivienda (con Extras)', monto: pv },
                        { label: 'Gastos Notariales / Derechos', monto: impDerVal },
                        { label: 'Gastos Originación Titular', monto: origVal },
                        { label: 'Gastos Originación Cónyuge', monto: origConyVal },
                        { label: 'Crédito FOVISSSTE Titular', monto: -credVal },
                        { label: 'Crédito FOVISSSTE Cónyuge', monto: -credConyVal },
                        { label: 'Apartado / Anticipo', monto: -apt },
                    ];
                } else {
                    // FOVISSSTE Directo Individual
                    const totalCost = pv + impDerVal + origVal;
                    diferencia = totalCost - credVal;

                    desglose = [
                        { label: 'Valor Vivienda (con Extras)', monto: pv },
                        { label: 'Gastos Notariales y Avalúo', monto: impDerVal },
                        { label: 'Gastos de Originación', monto: origVal },
                        { label: 'Crédito FOVISSSTE', monto: -credVal },
                        { label: 'Apartado / Anticipo', monto: -apt },
                    ];
                }
            } else {
                // FOVISSSTE Tradicional
                if (esConyugal) {
                    // FOVISSSTE Tradicional Conyugal
                    const totalCost = pv + impDerVal;
                    diferencia = totalCost - credVal - credConyVal;

                    desglose = [
                        { label: 'Valor Vivienda (con Extras)', monto: pv },
                        { label: 'Gastos Notariales y Avalúo', monto: impDerVal },
                        { label: 'Crédito FOVISSSTE Titular', monto: -credVal },
                        { label: 'Crédito FOVISSSTE Cónyuge', monto: -credConyVal },
                        { label: 'Apartado', monto: -apt },
                    ];
                } else {
                    // FOVISSSTE Tradicional Individual
                    const totalCost = pv + impDerVal;
                    diferencia = totalCost - credVal;

                    desglose = [
                        { label: 'Valor Vivienda (con Extras)', monto: pv },
                        { label: 'Gastos Notariales y Avalúo', monto: impDerVal },
                        { label: 'Crédito FOVISSSTE', monto: -credVal },
                        { label: 'Apartado', monto: -apt },
                    ];
                }
            }
        } else if (tipo === 'CFE') {
            // Contado / CFE
            const totalCost = pv;
            diferencia = totalCost - pagoInitVal - apt;

            desglose = [
                { label: 'Valor Vivienda (con Extras)', monto: pv },
                { label: 'Pago Inicial', monto: -pagoInitVal },
                { label: 'Apartado', monto: -apt },
            ];
        } else if (tipo === 'BANCARIO') {
            // Bancario
            const totalCost = pv + impDerVal;
            const recursos = esConyugal
                ? (credBcoVal + credBcoConyVal + ahorroVal + ahorroConyVal)
                : (credBcoVal + ahorroVal);
            diferencia = totalCost - recursos;

            if (esConyugal) {
                desglose = [
                    { label: 'Valor Vivienda (con Extras)', monto: pv },
                    { label: 'Gastos Notariales Aprox.', monto: impDerVal },
                    { label: 'Crédito Bancario Titular', monto: -credBcoVal },
                    { label: 'Ahorro Voluntario Titular', monto: -ahorroVal },
                    { label: 'Crédito Bancario Cónyuge', monto: -credBcoConyVal },
                    { label: 'Ahorro Voluntario Cónyuge', monto: -ahorroConyVal },
                    { label: 'Apartado', monto: -apt },
                ];
            } else {
                desglose = [
                    { label: 'Valor Vivienda (con Extras)', monto: pv },
                    { label: 'Gastos Notariales Aprox.', monto: impDerVal },
                    { label: 'Crédito Bancario', monto: -credBcoVal },
                    { label: 'Ahorro Voluntario', monto: -ahorroVal },
                    { label: 'Apartado', monto: -apt },
                ];
            }
        } else if (tipo === 'COFINAVIT') {
            // Cofinavit
            const totalCost = pv + impDerVal;
            const recursosTitular = credVal + subVal + ahorroVal + credBcoVal;
            const recursosConyuge = credConyVal + subConyVal + ahorroConyVal + credBcoConyVal;
            const recursos = esConyugal ? (recursosTitular + recursosConyuge) : recursosTitular;
            diferencia = totalCost - recursos;

            if (esConyugal) {
                desglose = [
                    { label: 'Valor Vivienda (con Extras)', monto: pv },
                    { label: 'Gastos Notariales Aprox.', monto: impDerVal },
                    { label: 'Crédito Cofinavit Titular', monto: -credVal },
                    { label: 'Subcuenta Vivienda Titular', monto: -subVal },
                    { label: 'Crédito Bancario Titular', monto: -credBcoVal },
                    { label: 'Ahorro Voluntario Titular', monto: -ahorroVal },
                    { label: 'Crédito Cofinavit Cónyuge', monto: -credConyVal },
                    { label: 'Subcuenta Vivienda Cónyuge', monto: -subConyVal },
                    { label: 'Crédito Bancario Cónyuge', monto: -credBcoConyVal },
                    { label: 'Ahorro Voluntario Cónyuge', monto: -ahorroConyVal },
                    { label: 'Apartado', monto: -apt },
                ];
            } else {
                desglose = [
                    { label: 'Valor Vivienda (con Extras)', monto: pv },
                    { label: 'Gastos Notariales Aprox.', monto: impDerVal },
                    { label: 'Crédito Cofinavit', monto: -credVal },
                    { label: 'Subcuenta de Vivienda', monto: -subVal },
                    { label: 'Crédito Bancario', monto: -credBcoVal },
                    { label: 'Ahorro Voluntario', monto: -ahorroVal },
                    { label: 'Apartado', monto: -apt },
                ];
            }
        } else if (tipo === 'FOVISSSTE_INFONAVIT') {
            // Info-Fovissste (Inherently Joint)
            const totalCost = pv + impDerVal;
            const recursosFovissste = credVal + subVal;
            const recursosInfonavit = credConyVal + subConyVal + ahorroConyVal - titConyVal;
            diferencia = totalCost - recursosFovissste - recursosInfonavit;

            desglose = [
                { label: 'Valor Vivienda (con Extras)', monto: pv },
                { label: 'Gastos Notariales', monto: impDerVal },
                { label: 'Crédito FOVISSSTE (Titular)', monto: -credVal },
                { label: 'Subcuenta FOVISSSTE (Titular)', monto: -subVal },
                { label: 'Crédito INFONAVIT (Cónyuge)', monto: -credConyVal },
                { label: 'Subcuenta INFONAVIT (Cónyuge)', monto: -subConyVal },
                { label: 'Gastos Titulación (Cónyuge)', monto: titConyVal },
                { label: 'Ahorro Voluntario (Cónyuge)', monto: -ahorroConyVal },
                { label: 'Apartado', monto: -apt },
            ];
        }

        const diferenciaFinal = diferencia - apt;
        return { diferencia: diferenciaFinal, desglose, total: pv + impDerVal, extrasTotal };
    }, [
        tipo, precioOperacion, descuento, gastosNot, credito, subcuenta, creditoBanco, creditoFoviss, apartado, extrasTotal,
        esConyugal, esFovisssteDirecto, creditoConyuge, subcuentaConyuge, creditoBancoConyuge, ahorroVoluntarioConyuge,
        ahorroVoluntario, gastosTitulacion, gastosTitulacionConyuge, gastosOriginacion, gastosOriginacionConyuge,
        impuestosDerechos, pagoInicial, montoDisponible
    ]);

    // Efecto para calcular Gastos Notariales en base al Avalúo
    useEffect(() => {
        if (!tipo || !precioBase) return;

        const currentItem = PRECIOS[manzana]?.find(r => r.modelo === modelo && r.version === version);
        const av = currentItem?.avaluo || precioBase;

        // 1. Impuestos y Derechos
        let pctImpuestos = 0.05; // Infonavit / Cofinavit
        if (tipo === 'FOVISSSTE' || tipo === 'FOVISSSTE_INFONAVIT') pctImpuestos = 0.07;
        else if (tipo === 'BANCARIO') pctImpuestos = 0.075;
        setImpuestosDerechos(fmt(av * pctImpuestos));

        // 3. Gastos de Titulación (titular)
        const credVal = num(credito);
        if (tipo === 'INFONAVIT' || tipo === 'COFINAVIT') {
            setGastosTitulacion(fmt(credVal * 0.03));
        } else {
            setGastosTitulacion('$0');
        }

        // 4. Gastos de Titulación (cónyuge)
        const credConyVal = num(creditoConyuge);
        if (esConyugal && (tipo === 'INFONAVIT' || tipo === 'COFINAVIT')) {
            setGastosTitulacionConyuge(fmt(credConyVal * 0.03));
        } else {
            setGastosTitulacionConyuge('$0');
        }

        // 5. Gastos de Originación
        if (tipo === 'FOVISSSTE' && esFovisssteDirecto) {
            setGastosOriginacion(fmt(37500));
            if (esConyugal) {
                setGastosOriginacionConyuge(fmt(37500));
            } else {
                setGastosOriginacionConyuge('$0');
            }
        } else {
            setGastosOriginacion('$0');
            setGastosOriginacionConyuge('$0');
        }

        // 6. Pago Inicial (Contado / CFE)
        if (tipo === 'CFE') {
            setPagoInicial(fmt(10000));
        } else {
            setPagoInicial('$0');
        }

        // 7. Gastos Notariales Aprox. (Para pantallas viejas que usan gastosNot)
        let pctNot = 0.05;
        if (tipo === 'INFONAVIT') pctNot = 0.05;
        else if (tipo === 'FOVISSSTE' || tipo === 'CFE' || tipo === 'FOVISSSTE_INFONAVIT') pctNot = 0.07;
        else if (tipo === 'BANCARIO' || tipo === 'COFINAVIT') pctNot = 0.06;
        setGastosNot(fmt(av * pctNot));

    }, [tipo, manzana, modelo, version, precioBase, credito, creditoConyuge, esConyugal, esFovisssteDirecto]);

    // Cargar inventario al montar
    useEffect(() => {
        const loadInventario = async () => {
            try {
                const data = await fetchInventario();
                setInventarioItems(data);
            } catch (err) {
                console.error("Error al cargar inventario desde Excel:", err);
            }
            try {
                const ovr = await fetchEstatusOverrides();
                setEstatusOverrides(ovr);
            } catch (err) {
                console.error("Error al cargar estatus overrides desde Supabase:", err);
                setEstatusOverrides(new Map());
            }
        };
        loadInventario();
    }, []);



    // Reset al cambiar manzana
    const handleManzana = (v: string) => {
        setManzana(v); setModelo(''); setVersion('');
        resetCampos();
        setCasaSeleccionada('');
    };
    const handleModelo = (v: string) => { setModelo(v); setVersion(''); resetCampos(); setCasaSeleccionada(''); };
    const handleVersion = (v: string) => { setVersion(v); resetCampos(); };

    const handleTipo = (v: string) => { setTipo(v as TipoCredito); resetCampos(); };

    const resetCampos = () => {
        setGastosNot(''); setCredito(''); setSubcuenta('');
        setCreditoBanco(''); setCreditoFoviss(''); setApartado(''); setDescuento('');
        setMontoDisponible('');
        setExtraEsquina(false);
        setUsarAvaluo(false);
        setExtrasSeleccionados([]);

        // Reset nuevos campos
        setEsConyugal(false);
        setEsFovisssteDirecto(false);
        setCreditoConyuge('');
        setSubcuentaConyuge('');
        setCreditoBancoConyuge('');
        setAhorroVoluntarioConyuge('');
        setAhorroVoluntario('');
        setGastosTitulacion('');
        setGastosTitulacionConyuge('');
        setGastosOriginacion('');
        setGastosOriginacionConyuge('');
        setImpuestosDerechos('');
        setPagoInicial('');
    };

    // Funciones de conveniencia para botón "Apartado"
    const applyApartado = (pct: number | 'FIXED') => {
        if (!precioOperacion) return;
        if (pct === 'FIXED') {
            setApartado(fmt(20000));
        } else {
            setApartado(fmt(precioOperacion * pct));
        }
    };

    const handleDownloadPDF = async () => {
        setIsGenerating(true);
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            
            // Colores corporativos
            const verdeQuetzal = [34, 197, 94]; // rgb(34,197,94)
            const grisOscuro = [40, 40, 40];
            const grisClaro = [240, 240, 240];

            // 1. Encabezado Header
            // Dibujar fondo de encabezado
            doc.setFillColor(verdeQuetzal[0], verdeQuetzal[1], verdeQuetzal[2]);
            doc.rect(0, 0, 210, 40, 'F');
            
            // Textos del encabezado
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text('COTIZACIÓN COMERCIAL', 105, 20, { align: 'center' });
            
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.text('Residencial Los Quetzales', 105, 28, { align: 'center' });
            
            const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
            doc.setFontSize(10);
            doc.text(`Fecha: ${fecha}`, 190, 35, { align: 'right' });

            // 2. Datos de la Propiedad (Tabla)
            doc.setTextColor(grisOscuro[0], grisOscuro[1], grisOscuro[2]);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Datos de la Propiedad', 15, 50);

            let propertyBody = [];
            if (nombreCliente.trim()) {
                propertyBody.push(['Cliente', nombreCliente.trim()]);
            }
            propertyBody.push(
                ['Manzana', manzana],
                ['Modelo', modelo],
                ['Versión', version]
            );
            if (casaSeleccionada) {
                propertyBody.push(['Casa / Lote', casaSeleccionada]);
                if (estatusCasaSeleccionada) {
                    const estLabel = estatusCasaSeleccionada === 'DISPONIBLE' ? 'Disponible' : estatusCasaSeleccionada === 'EN_PROCESO' ? 'En Proceso / Reservada' : 'Vendida';
                    propertyBody.push(['Disponibilidad', estLabel]);
                }
            }
            propertyBody.push(
                [usarAvaluo ? 'Valor de Avalúo (Base Calculada)' : 'Precio Base', fmt(precioOperacion || 0)]
            );

            // Añadir extras a la propiedad
            if (num(descuento) > 0) propertyBody.push(['Descuento', `-${fmt(num(descuento))}`]);
            
            // Si la versión no es AUSTERA, detallar el equipamiento incluido de serie
            const versionUpper = version.toUpperCase();
            const esEquipada = versionUpper.includes('EQUIPADA');
            const esElite = versionUpper.includes('ELITE');
            const esPlus = modelo.toUpperCase().includes('PLUS');

            if (esEquipada) {
                const closetVal = esPlus ? 68000 : 29000;
                const persianasVal = esPlus ? 16500 : 11500;
                propertyBody.push(
                    ['Equipamiento: Cocina con Granito', `Incluido (${fmt(65000)})`],
                    ['Equipamiento: Clósets en Recámaras', `Incluido (${fmt(closetVal)})`],
                    ['Equipamiento: Persianas de Serie', `Incluido (${fmt(persianasVal)})`],
                    ['Equipamiento: Cancel de Baño (Rec. Principal)', `Incluido (${fmt(10000)})`]
                );
            }
            if (esElite) {
                propertyBody.push(
                    ['Equipamiento: Recámara Adicional PB (Elite)', `Incluido (${fmt(88000)})`]
                );
            }

            if (extraEsquina) propertyBody.push(['Extra: Terreno Excedente / Esquina', fmt(num(costoEsquina))]);
            extrasSeleccionados.forEach(item => {
                propertyBody.push([`Extra: ${item.nombre}`, fmt(item.precio)]);
            });

            propertyBody.push(['Precio de Venta (Con Extras)', fmt((precioOperacion || 0) - num(descuento) + (resultado?.extrasTotal || 0))]);

            autoTable(doc, {
                startY: 55,
                head: [['Concepto', 'Detalle']],
                body: propertyBody,
                theme: 'striped',
                headStyles: { fillColor: grisOscuro as [number, number, number], textColor: 255 },
                styles: { fontSize: 10, cellPadding: 3 },
                margin: { bottom: 30 },
                columnStyles: { 
                    0: { fontStyle: 'bold', cellWidth: 100 }, 
                    1: { halign: 'right' } 
                }
            });

            // 3. Esquema Financiero (Tabla)
            let finalY = (doc as any).lastAutoTable.finalY || 55;
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`Esquema Financiero: ${TIPOS_CREDITO.find(t => t.value === tipo)?.label || ''}`, 15, finalY + 15);

            let desgloseFormat = resultado?.desglose.map(d => [
                d.label, 
                { content: fmt(Math.abs(d.monto)), styles: { textColor: d.monto < 0 ? [37, 99, 235] : grisOscuro } }
            ]) || [];

            autoTable(doc, {
                startY: finalY + 20,
                head: [['Concepto', 'Monto']],
                body: desgloseFormat as any[],
                theme: 'plain',
                headStyles: { fillColor: grisClaro as [number, number, number], textColor: grisOscuro as [number, number, number] },
                styles: { fontSize: 11, cellPadding: 4, lineColor: [200, 200, 200], lineWidth: 0.1 },
                margin: { bottom: 30 },
                columnStyles: { 
                    0: { fontStyle: 'normal' }, 
                    1: { halign: 'right', fontStyle: 'bold' } 
                }
            });

            // 4. Resultado Final
            finalY = (doc as any).lastAutoTable.finalY + 10;
            const esAFavor = (resultado?.diferencia || 0) <= 0;
            const colorResultado = esAFavor ? verdeQuetzal : [37, 99, 235]; // Verde o Azul

            // Evitar que la caja de resultado se sobreponga al pie de página (leyenda)
            if (finalY + 25 > 265) {
                doc.addPage();
                finalY = 20; // Comenzar en la parte superior de la nueva página
            }
            
            doc.setDrawColor(colorResultado[0], colorResultado[1], colorResultado[2]);
            doc.setFillColor(colorResultado[0], colorResultado[1], colorResultado[2]);
            
            // Caja de resultado suave (fondo)
            const gState = new (doc as any).GState({ opacity: 0.1 });
            doc.setGState(gState);
            doc.rect(15, finalY, 180, 25, 'F');
            const gStateSolid = new (doc as any).GState({ opacity: 1 });
            doc.setGState(gStateSolid);
            
            // Borde de caja y textos
            doc.rect(15, finalY, 180, 25, 'D');
            
            doc.setTextColor(colorResultado[0], colorResultado[1], colorResultado[2]);
            doc.setFontSize(10);
            doc.text('DIFERENCIA FINAL', 20, finalY + 8);
            doc.setFontSize(9);
            doc.text(esAFavor ? 'Saldo a favor del cliente' : 'A cubrir con recursos propios', 20, finalY + 14);

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            const difText = `${esAFavor ? '+' : '-'}${fmt(Math.abs(resultado?.diferencia || 0))}`;
            doc.text(difText, 185, finalY + 15, { align: 'right' });

            // 5. Pie de Página y Avisos (En todas las páginas del documento)
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setTextColor(100, 100, 100);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                const footerText = "Nota: Esta cotización es de carácter informativo y está sujeta a cambios sin previo aviso conforme a la validación de capacidad de crédito y disponibilidad de vivienda. Los gastos notariales y de titulación son aproximados.";
                const lines = doc.splitTextToSize(footerText, 180);
                doc.text(lines, 15, 275); // Posicionado cerca del fondo A4 (297mm)
            }

            // Cargar e insertar Logo asincrónicamente
            try {
                const imgData = await new Promise<string | null>((resolve) => {
                    const img = new Image();
                    img.src = '/Logo 1.1 sin fondo.png';
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        // Reducir la escala para evitar errores de memoria o canvas gigantes
                        const maxW = 800;
                        const scale = img.width > maxW ? maxW / img.width : 1;
                        canvas.width = img.width * scale;
                        canvas.height = img.height * scale;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            resolve(canvas.toDataURL('image/png'));
                        } else {
                            resolve(null);
                        }
                    };
                    img.onerror = () => resolve(null);
                });

                if (imgData) {
                    // El logo siempre se inserta en la página 1 en el encabezado
                    doc.setPage(1);
                    doc.addImage(imgData, 'PNG', 15, 5, 52, 28);
                }
            } catch (e) {
                console.error("Error cargando logo en PDF", e);
            }

            doc.save(`Cotizacion_${modelo}_${tipo}.pdf`);
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Hubo un error al generar el PDF. Verifica la consola.');
        } finally {
            setIsGenerating(false);
        }
    };



    const panelStyle: React.CSSProperties = {
        background: 'var(--bg-panel)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--border-glass)',
        borderRadius: 16,
        padding: '1.5rem',
    };

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1rem',
    };

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '10px' }}>

                {/* Encabezado */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 42, height: 42, borderRadius: 10,
                            background: 'rgba(34,197,94,0.1)',
                            border: '1px solid var(--border-glass)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Calculator size={20} color="var(--primary-accent)" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }} className="glow-text">
                                Calculadora de Vivienda
                            </h1>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                                Residencial Los Quetzales — Cotización Comercial
                            </p>
                        </div>
                    </div>
                    {tipo && resultado && (
                        <button
                            onClick={handleDownloadPDF}
                            disabled={isGenerating}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: 'rgba(34,197,94,0.15)', color: 'var(--primary-accent)',
                                border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8,
                                padding: '8px 16px', fontSize: '0.85rem', fontWeight: 600,
                                cursor: isGenerating ? 'wait' : 'pointer', transition: 'all 0.2s',
                            }}
                        >
                            <Download size={16} />
                            {isGenerating ? 'Generando PDF...' : 'Descargar Cotización (PDF)'}
                        </button>
                    )}
                </div>

                {/* Paso 1: Selección de vivienda */}
                <div style={panelStyle}>
                    <h2 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        1 · Seleccionar Vivienda
                    </h2>
                    <div style={gridStyle}>
                        <Select label="Manzana" value={manzana} options={Object.keys(PRECIOS)} onChange={handleManzana} />
                        <Select label="Modelo" value={modelo} options={modelos} onChange={handleModelo} />
                        <Select label="Versión" value={version} options={versiones} onChange={handleVersion} />
                        {manzana && modelo && (
                            <Select
                                label="Casa / Lote (Opcional)"
                                value={casaSeleccionada}
                                options={['', ...casasFiltradas.map(c => c.casa)]}
                                onChange={setCasaSeleccionada}
                            />
                        )}
                    </div>

                    {casaSeleccionada && estatusCasaSeleccionada && (
                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Estatus de disponibilidad:</span>
                            <span style={{
                                fontWeight: 700,
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                background: estatusCasaSeleccionada === 'DISPONIBLE' ? 'rgba(34,197,94,0.15)' : estatusCasaSeleccionada === 'EN_PROCESO' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                color: estatusCasaSeleccionada === 'DISPONIBLE' ? '#22c55e' : estatusCasaSeleccionada === 'EN_PROCESO' ? '#f59e0b' : '#ef4444',
                                border: `1px solid ${estatusCasaSeleccionada === 'DISPONIBLE' ? 'rgba(34,197,94,0.3)' : estatusCasaSeleccionada === 'EN_PROCESO' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`
                            }}>
                                {estatusCasaSeleccionada === 'DISPONIBLE' ? '🟢 DISPONIBLE' : estatusCasaSeleccionada === 'EN_PROCESO' ? '🟡 EN PROCESO / RESERVADA' : '🔴 VENDIDA'}
                            </span>
                        </div>
                    )}

                    {/* Precio base y avalúo */}
                    {precioBase > 0 && (
                        <div style={{
                            marginTop: '1rem', padding: '1rem', borderRadius: 12,
                            background: 'rgba(34,197,94,0.07)',
                            border: '1px solid rgba(34,197,94,0.2)',
                            display: 'flex', flexDirection: 'column', gap: 12,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Precio Base 2026</span>
                                    <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary-accent)' }} className="glow-text">
                                        {fmt(precioBase)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'right' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Valor de Avalúo</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                        {fmt(valAvaluo)}
                                    </span>
                                </div>
                            </div>
                            <div style={{ borderTop: '1px solid rgba(34,197,94,0.2)', paddingTop: '12px' }}>
                                <CheckboxOption label="Usar Valor de Avalúo para cálculo de la cotización" checked={usarAvaluo} onChange={setUsarAvaluo} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Opcional: Equipamiento Extra */}
                {precioBase > 0 && (
                    <div style={panelStyle}>
                        <h2 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Equipamiento Extra / Adicionales (Opcional)
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', alignItems: 'start' }}>
                                
                                {/* Checkbox para Esquina */}
                                <div>
                                    <CheckboxOption label="Esquina / Terreno Excedente" checked={extraEsquina} onChange={setExtraEsquina} isCustom customValue={costoEsquina} onCustomValueChange={setCostoEsquina} />
                                </div>

                                {/* Botón para abrir Modal de Selección Múltiple */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                                        Seleccionar Equipamiento Adicional (Lista de Precios)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(true)}
                                        style={{
                                            width: '100%',
                                            background: 'var(--panel-item-bg)',
                                            border: '1px solid var(--border-glass)',
                                            borderRadius: 8,
                                            padding: '12px 14px',
                                            color: 'var(--text-main)',
                                            fontSize: '0.95rem',
                                            fontFamily: 'inherit',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            outline: 'none',
                                            textAlign: 'left',
                                            transition: 'all 0.2s',
                                            boxSizing: 'border-box',
                                            height: '42px',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
                                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-glass)'}
                                    >
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%', color: extrasSeleccionados.length > 0 ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                            {extrasSeleccionados.length === 0 
                                                ? 'Ninguno seleccionado (Clic para elegir)' 
                                                : `${extrasSeleccionados.length} extra(s) seleccionado(s) — Ver / Editar`}
                                        </span>
                                        <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                                    </button>
                                </div>
                            </div>

                            {/* Listado de extras seleccionados */}
                            {extrasSeleccionados.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border-glass)' }}>
                                    {extrasSeleccionados.map(item => (
                                        <div
                                            key={item.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                background: 'rgba(34,197,94,0.1)',
                                                border: '1px solid rgba(34,197,94,0.2)',
                                                borderRadius: 6,
                                                padding: '4px 8px',
                                                fontSize: '0.75rem',
                                                color: 'var(--text-main)',
                                            }}
                                        >
                                            <span>{item.nombre} ({fmt(item.precio)})</span>
                                            <span
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleExtra(item);
                                                }}
                                                style={{
                                                    cursor: 'pointer',
                                                    color: 'var(--text-muted)',
                                                    fontWeight: 'bold',
                                                    marginLeft: 2,
                                                    fontSize: '0.8rem',
                                                    lineHeight: 1
                                                }}
                                            >
                                                ✕
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Paso 2: Tipo de crédito */}
                {precioBase > 0 && (
                    <div style={panelStyle}>
                        <h2 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            2 · Tipo de Crédito
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                            {TIPOS_CREDITO.map(t => (
                                <button
                                    key={t.value}
                                    onClick={() => handleTipo(tipo === t.value ? '' : t.value)}
                                    style={{
                                        padding: '0.75rem 1rem',
                                        borderRadius: 10,
                                        border: `1px solid ${tipo === t.value ? 'rgba(34,197,94,0.5)' : 'var(--border-glass)'}`,
                                        background: tipo === t.value ? 'rgba(34,197,94,0.12)' : 'var(--panel-item-bg)',
                                        color: tipo === t.value ? 'var(--primary-accent)' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        fontWeight: tipo === t.value ? 600 : 400,
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s',
                                        textAlign: 'center',
                                    }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Sub-opciones de Crédito conyugal y directo */}
                        {tipo && (tipo === 'INFONAVIT' || tipo === 'FOVISSSTE' || tipo === 'BANCARIO' || tipo === 'COFINAVIT') && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: '1.25rem', padding: '12px', borderRadius: 8, background: 'var(--ghost-bg)', border: '1px solid var(--border-glass)' }}>
                                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                        <input
                                            type="checkbox"
                                            checked={esConyugal}
                                            onChange={e => setEsConyugal(e.target.checked)}
                                            style={{ cursor: 'pointer', accentColor: 'var(--primary-accent)' }}
                                        />
                                        ¿Es crédito conyugal / Unamos Créditos?
                                    </label>

                                    {tipo === 'FOVISSSTE' && (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                            <input
                                                type="checkbox"
                                                checked={esFovisssteDirecto}
                                                onChange={e => setEsFovisssteDirecto(e.target.checked)}
                                                style={{ cursor: 'pointer', accentColor: 'var(--primary-accent)' }}
                                            />
                                            ¿Es Fovissste Directo? (Con Gastos de Originación)
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Paso 3: Campos del crédito */}
                {tipo && precioBase > 0 && (
                    <div style={panelStyle}>
                        <h2 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            3 · Datos del Crédito
                        </h2>
                        <div style={gridStyle}>
                            <Field label="Nombre del Cliente (Opcional)" value={nombreCliente} onChange={setNombreCliente} placeholder="Ej. Juan Pérez" isNumeric={false} />
                            <Field label="Costo Total de Operación" value={fmt(precioOperacion + (resultado?.extrasTotal || 0))} readOnly helperText={(usarAvaluo ? "Valor Avalúo" : "Precio Base") + " + Extras"} />
                            <Field label="Descuento (opcional)" value={descuento} onChange={setDescuento} />

                            {tipo !== 'CFE' && (
                                <Field
                                    label="Impuestos y Derechos (Aprox.)"
                                    value={impuestosDerechos}
                                    onChange={setImpuestosDerechos}
                                    helperText="Tasa estimada según tipo de crédito"
                                />
                            )}

                            {/* Costo de Avalúo removido por requerimiento */}

                            {tipo === 'CFE' && (
                                <Field
                                    label="Pago Inicial"
                                    value={pagoInicial}
                                    onChange={setPagoInicial}
                                    helperText="Monto inicial del plan de pagos"
                                />
                            )}

                            {/* ─── DATOS TITULAR ─── */}
                            {tipo !== 'CFE' && (
                                <Field
                                    label={esConyugal ? "Crédito Titular" : "Monto de Crédito Autorizado"}
                                    value={credito}
                                    onChange={setCredito}
                                />
                            )}

                            {['INFONAVIT', 'COFINAVIT', 'FOVISSSTE_INFONAVIT'].includes(tipo) && (
                                <Field
                                    label={esConyugal ? "Subcuenta Titular" : "Subcuenta de Vivienda"}
                                    value={subcuenta}
                                    onChange={setSubcuenta}
                                />
                            )}

                            {['INFONAVIT', 'COFINAVIT'].includes(tipo) && (
                                <Field
                                    label={esConyugal ? "Gastos Titulación Titular" : "Gastos de Titulación y Financieros"}
                                    value={gastosTitulacion}
                                    onChange={setGastosTitulacion}
                                    helperText="Aproximadamente 3% del crédito"
                                />
                            )}

                            {tipo === 'FOVISSSTE' && esFovisssteDirecto && (
                                <Field
                                    label={esConyugal ? "Gastos Originación Titular" : "Gastos de Originación"}
                                    value={gastosOriginacion}
                                    onChange={setGastosOriginacion}
                                    helperText="Costo fijo de originación de crédito"
                                />
                            )}

                            {['BANCARIO', 'COFINAVIT'].includes(tipo) && (
                                <Field
                                    label={esConyugal ? "Crédito Bancario Titular" : "Crédito Bancario"}
                                    value={creditoBanco}
                                    onChange={setCreditoBanco}
                                />
                            )}

                            {['INFONAVIT', 'BANCARIO', 'COFINAVIT'].includes(tipo) && (
                                <Field
                                    label={esConyugal ? "Ahorro Voluntario Titular" : "Ahorro Voluntario"}
                                    value={ahorroVoluntario}
                                    onChange={setAhorroVoluntario}
                                />
                            )}

                            {/* ─── DATOS CÓNYUGE (Si aplica) ─── */}
                            {(esConyugal || tipo === 'FOVISSSTE_INFONAVIT') && (
                                <>
                                    <Field
                                        label={tipo === 'FOVISSSTE_INFONAVIT' ? "Crédito INFONAVIT (Cónyuge)" : "Crédito Cónyuge"}
                                        value={creditoConyuge}
                                        onChange={setCreditoConyuge}
                                    />
                                    {['INFONAVIT', 'COFINAVIT', 'FOVISSSTE_INFONAVIT'].includes(tipo) && (
                                        <Field
                                            label={tipo === 'FOVISSSTE_INFONAVIT' ? "Subcuenta INFONAVIT (Cónyuge)" : "Subcuenta Cónyuge"}
                                            value={subcuentaConyuge}
                                            onChange={setSubcuentaConyuge}
                                        />
                                    )}
                                    {['INFONAVIT', 'COFINAVIT', 'FOVISSSTE_INFONAVIT'].includes(tipo) && (
                                        <Field
                                            label="Gastos Titulación Cónyuge"
                                            value={gastosTitulacionConyuge}
                                            onChange={setGastosTitulacionConyuge}
                                            helperText="Aproximadamente 3% del crédito"
                                        />
                                    )}
                                    {tipo === 'FOVISSSTE' && esFovisssteDirecto && (
                                        <Field
                                            label="Gastos Originación Cónyuge"
                                            value={gastosOriginacionConyuge}
                                            onChange={setGastosOriginacionConyuge}
                                        />
                                    )}
                                    {['BANCARIO', 'COFINAVIT'].includes(tipo) && (
                                        <Field
                                            label="Crédito Bancario Cónyuge"
                                            value={creditoBancoConyuge}
                                            onChange={setCreditoBancoConyuge}
                                        />
                                    )}
                                    {['INFONAVIT', 'BANCARIO', 'COFINAVIT', 'FOVISSSTE_INFONAVIT'].includes(tipo) && (
                                        <Field
                                            label="Ahorro Voluntario Cónyuge"
                                            value={ahorroVoluntarioConyuge}
                                            onChange={setAhorroVoluntarioConyuge}
                                        />
                                    )}
                                </>
                            )}

                            {/* ─── APARTADO Y PRESETS ─── */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <Field label="Apartado" value={apartado} onChange={setApartado} />
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                    <button onClick={() => applyApartado(0.01)} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, background: 'var(--ghost-bg)', color: 'var(--text-muted)', border: '1px solid var(--border-glass)', cursor: 'pointer' }}>1%</button>
                                    <button onClick={() => applyApartado(0.10)} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, background: 'var(--ghost-bg)', color: 'var(--text-muted)', border: '1px solid var(--border-glass)', cursor: 'pointer' }}>10%</button>
                                    <button onClick={() => applyApartado('FIXED')} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 4, background: 'var(--ghost-bg)', color: 'var(--text-muted)', border: '1px solid var(--border-glass)', cursor: 'pointer' }}>$20,000</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Resultado */}
                {resultado && (
                    <div style={{ ...panelStyle, border: resultado.diferencia <= 0 ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(239,68,68,0.4)' }}>
                        <h2 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            4 · Resultado
                        </h2>

                        {/* Desglose */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1.25rem' }}>
                            {resultado.desglose.map((d, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 12px', borderRadius: 8,
                                    background: 'var(--panel-item-bg)',
                                    borderBottom: i < resultado.desglose.length - 1 ? '1px solid var(--ghost-bg)' : 'none',
                                }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{d.label}</span>
                                    <span style={{
                                        fontWeight: 600, fontSize: '0.9rem',
                                        color: d.monto < 0 ? '#f97316' : d.label === 'Valor Total' ? 'var(--text-main)' : 'var(--text-main)',
                                    }}>
                                        {fmt(Math.abs(d.monto))}
                                        {d.monto < 0 && <span style={{ fontSize: '0.75rem', marginLeft: 4, color: '#f97316' }}>↓</span>}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Diferencia final */}
                        <div style={{
                            padding: '1.25rem',
                            borderRadius: 12,
                            background: resultado.diferencia <= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${resultado.diferencia <= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                        }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>DIFERENCIA FINAL</div>
                                <div style={{ fontSize: '0.8rem', color: resultado.diferencia <= 0 ? 'var(--primary-accent)' : 'var(--danger)' }}>
                                    {resultado.diferencia <= 0 ? '✓ Saldo a favor del cliente' : '⚠ A cubrir con recursos propios'}
                                </div>
                            </div>
                            <div style={{
                                fontSize: '2rem', fontWeight: 800,
                                color: resultado.diferencia <= 0 ? 'var(--primary-accent)' : 'var(--danger)',
                            }} className="glow-text">
                                {resultado.diferencia <= 0 ? '+' : '-'}{fmt(Math.abs(resultado.diferencia))}
                            </div>
                        </div>

                        {/* Botón de descargar PDF al final */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.25rem' }}>
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isGenerating}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    width: '100%',
                                    background: 'var(--primary-accent)', color: '#0a0f0d',
                                    border: 'none', borderRadius: 10,
                                    padding: '12px 24px', fontSize: '0.95rem', fontWeight: 700,
                                    cursor: isGenerating ? 'wait' : 'pointer', transition: 'all 0.2s',
                                    boxShadow: '0 4px 12px rgba(34,197,94,0.3)',
                                }}
                            >
                                <Download size={18} />
                                {isGenerating ? 'Generando PDF...' : 'Descargar Cotización en PDF'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Selección de Extras */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '20px',
                }}>
                    <div style={{
                        background: 'var(--bg-panel)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: 16,
                        width: '100%',
                        maxWidth: '650px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        overflow: 'hidden',
                    }}>
                        {/* Cabecera del Modal */}
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid var(--border-glass)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.02)'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                    Equipamiento Extra y Adicionales
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Selecciona los artículos adicionales de la lista de precios oficial.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '1.2rem',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    outline: 'none',
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Lista de Extras (Scrollable) */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            overflowY: 'auto',
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                        }}>
                            {EXTRAS_DISPONIBLES.map(item => {
                                const isSelected = !!extrasSeleccionados.find(e => e.id === item.id);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => toggleExtra(item)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: 12,
                                            padding: '10px 14px',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            background: isSelected ? 'rgba(34,197,94,0.08)' : 'var(--panel-item-bg)',
                                            border: `1px solid ${isSelected ? 'rgba(34,197,94,0.3)' : 'var(--border-glass)'}`,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <div style={{ marginTop: 2 }}>
                                            {isSelected ? <CheckSquare size={16} color="var(--primary-accent)" /> : <Square size={16} color="var(--text-muted)" />}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                                {item.nombre}
                                            </span>
                                            {item.descripcion && (
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>
                                                    {item.descripcion}
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isSelected ? 'var(--primary-accent)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            +{fmt(item.precio)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pie del Modal */}
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            borderTop: '1px solid var(--border-glass)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.02)'
                        }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>TOTAL EN EXTRAS</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-accent)' }}>
                                    {fmt(extrasSeleccionados.reduce((sum, item) => sum + item.precio, 0))}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    background: 'var(--primary-accent)',
                                    color: '#0a0f0d',
                                    border: 'none',
                                    borderRadius: 8,
                                    padding: '10px 20px',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 12px rgba(34,197,94,0.2)',
                                }}
                            >
                                Listo / Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
