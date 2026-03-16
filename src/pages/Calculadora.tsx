import { useState, useMemo, useEffect } from 'react';
import { Calculator, ChevronDown, Download, CheckSquare, Square } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Datos de precios ────────────────────────────────────────────
const PRECIOS: Record<string, { modelo: string; version: string; precio: number; avaluo?: number }[]> = {
    'Manzana 2': [
        { modelo: 'QUETZAL', version: 'EQUIPADA', precio: 1587000, avaluo: 1660000 },
        { modelo: 'QUETZAL', version: 'EQUIPADA ELITE', precio: 1676000, avaluo: 1660000 },
        { modelo: 'QUETZAL', version: 'AUSTERA', precio: 1456000, avaluo: 1660000 },
        { modelo: 'QUETZAL', version: 'AUSTERA ELITE', precio: 1545000, avaluo: 1660000 },
        { modelo: 'QUETZAL PLUS', version: 'EQUIPADA', precio: 1943000, avaluo: 2018000 },
        { modelo: 'QUETZAL PLUS', version: 'EQUIPADA ELITE', precio: 2032000, avaluo: 2018000 },
        { modelo: 'QUETZAL PLUS', version: 'AUSTERA', precio: 1768000, avaluo: 2018000 },
        { modelo: 'QUETZAL PLUS', version: 'AUSTERA ELITE', precio: 1857000, avaluo: 2018000 },
    ],
    'Manzana 3': [
        { modelo: 'QUETZAL C/ROOF GARDEN', version: 'EQUIPADA', precio: 1752000, avaluo: 1870000 },
        { modelo: 'QUETZAL C/ROOF GARDEN', version: 'EQUIPADA ELITE', precio: 1839000, avaluo: 1870000 },
        { modelo: 'QUETZAL C/ROOF GARDEN', version: 'AUSTERA', precio: 1687000, avaluo: 1870000 },
        { modelo: 'QUETZAL C/ROOF GARDEN', version: 'AUSTERA ELITE', precio: 1774000, avaluo: 1870000 },
        { modelo: 'QUETZAL', version: 'EQUIPADA', precio: 1620000, avaluo: 1770000 },
        { modelo: 'QUETZAL', version: 'EQUIPADA ELITE', precio: 1689000, avaluo: 1770000 },
        { modelo: 'QUETZAL', version: 'AUSTERA', precio: 1503000, avaluo: 1770000 },
        { modelo: 'QUETZAL', version: 'AUSTERA ELITE', precio: 1590000, avaluo: 1770000 },
        { modelo: 'QUETZAL PLUS', version: 'EQUIPADA', precio: 1966000, avaluo: 2120000 },
        { modelo: 'QUETZAL PLUS', version: 'EQUIPADA ELITE', precio: 2053000, avaluo: 2120000 },
        { modelo: 'QUETZAL PLUS', version: 'AUSTERA', precio: 1807000, avaluo: 2120000 },
        { modelo: 'QUETZAL PLUS', version: 'AUSTERA ELITE', precio: 1895000, avaluo: 2120000 },
        { modelo: 'QUETZAL PLUS F.A.', version: 'EQUIPADA', precio: 1976000, avaluo: 2150000 },
        { modelo: 'QUETZAL PLUS F.A.', version: 'EQUIPADA ELITE', precio: 2083000, avaluo: 2150000 },
        { modelo: 'QUETZAL PLUS F.A.', version: 'AUSTERA', precio: 1837000, avaluo: 2150000 },
        { modelo: 'QUETZAL PLUS F.A.', version: 'AUSTERA ELITE', precio: 1925000, avaluo: 2150000 },
    ],
};

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

const Field = ({
    label, value, onChange, readOnly = false, helperText, prefix,
}: {
    label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean; helperText?: React.ReactNode; prefix?: string;
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
                        if (value && onChange) onChange(fmt(num(value)));
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
                <option value="">— Seleccionar —</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
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

export default function Calculadora() {
    const [searchParams] = useSearchParams();
    const [isGenerating, setIsGenerating] = useState(false);

    const mzParam = searchParams.get('manzana') || '';
    const initialMza = mzParam ? (mzParam.toLowerCase().startsWith('manzana') ? mzParam : `Manzana ${mzParam}`) : '';

    const [manzana, setManzana] = useState(initialMza);
    const [modelo, setModelo] = useState(searchParams.get('modelo') || '');
    const [version, setVersion] = useState(searchParams.get('version') || '');
    const [tipo, setTipo] = useState<TipoCredito | ''>('');

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

    // Extras
    const [extraPersianas, setExtraPersianas] = useState(false);
    const [extraCancel, setExtraCancel] = useState(false);
    const [extraProtecciones, setExtraProtecciones] = useState(false);
    const [extraEsquina, setExtraEsquina] = useState(false);
    const [costoProtecciones, setCostoProtecciones] = useState('');
    const [costoEsquina, setCostoEsquina] = useState('$20,000');

    // Listas derivadas
    const modelos = useMemo(() =>
        manzana && PRECIOS[manzana] ? [...new Set(PRECIOS[manzana].map(r => r.modelo))] : [], [manzana]);

    const versiones = useMemo(() =>
        (manzana && PRECIOS[manzana] && modelo) ? PRECIOS[manzana].filter(r => r.modelo === modelo).map(r => r.version) : [], [manzana, modelo]);

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
        if (extraPersianas) t += 8000;
        if (extraCancel) t += 10000;
        if (extraEsquina) t += num(costoEsquina);
        if (extraProtecciones) t += num(costoProtecciones);
        return t;
    }, [extraPersianas, extraCancel, extraEsquina, extraProtecciones, costoProtecciones, costoEsquina]);

    // Calcular resultado
    const resultado = useMemo(() => {
        if (!tipo || !precioOperacion) return null;
        const subtotal = precioOperacion - num(descuento);
        const pv = subtotal + extrasTotal; // Precio de Venta (con extras)
        const gn = num(gastosNot);
        const total = pv + gn;
        const apt = num(apartado);
        let diferencia = 0;
        let desglose: { label: string; monto: number }[] = [];

        if (tipo === 'INFONAVIT') {
            const cred = num(credito);
            const sub = num(subcuenta);
            diferencia = total - cred - sub - apt;
            desglose = [
                { label: 'Valor Vivienda', monto: pv },
                { label: 'Gastos Notariales', monto: gn },
                { label: 'Valor Total', monto: total },
                { label: 'Crédito INFONAVIT', monto: -cred },
                { label: 'Subcuenta Vivienda', monto: -sub },
                { label: 'Apartado', monto: -apt },
            ];
        } else if (tipo === 'FOVISSSTE') {
            const cred = num(credito);
            diferencia = total - cred - apt;
            desglose = [
                { label: 'Valor Vivienda', monto: pv },
                { label: 'Gastos Notariales', monto: gn },
                { label: 'Valor Total', monto: total },
                { label: 'Crédito FOVISSSTE', monto: -cred },
                { label: 'Apartado', monto: -apt },
            ];
        } else if (tipo === 'CFE') {
            const disponible = num(montoDisponible);
            diferencia = total - disponible - apt;
            desglose = [
                { label: 'Valor Vivienda', monto: pv },
                { label: 'Gastos Notariales', monto: gn },
                { label: 'Valor Total', monto: total },
                { label: 'Monto Disponible', monto: -disponible },
                { label: 'Apartado', monto: -apt },
            ];
        } else if (tipo === 'BANCARIO') {
            const cred = num(creditoBanco);
            diferencia = total - cred - apt;
            desglose = [
                { label: 'Valor Vivienda', monto: pv },
                { label: 'Gastos Notariales', monto: gn },
                { label: 'Valor Total', monto: total },
                { label: 'Crédito Bancario', monto: -cred },
                { label: 'Apartado', monto: -apt },
            ];
        } else if (tipo === 'COFINAVIT') {
            const credInf = num(credito);
            const sub = num(subcuenta);
            const credBco = num(creditoBanco);
            diferencia = total - credInf - sub - credBco - apt;
            desglose = [
                { label: 'Valor Vivienda', monto: pv },
                { label: 'Gastos Notariales', monto: gn },
                { label: 'Valor Total', monto: total },
                { label: 'Crédito INFONAVIT', monto: -credInf },
                { label: 'Subcuenta Vivienda', monto: -sub },
                { label: 'Crédito Banco', monto: -credBco },
                { label: 'Apartado', monto: -apt },
            ];
        } else if (tipo === 'FOVISSSTE_INFONAVIT') {
            const credInf = num(credito);
            const sub = num(subcuenta);
            const credFov = num(creditoFoviss);
            diferencia = total - credInf - sub - credFov - apt;
            desglose = [
                { label: 'Valor Vivienda', monto: pv },
                { label: 'Gastos Not. FOVISSSTE', monto: gn },
                { label: 'Valor Total', monto: total },
                { label: 'Crédito INFONAVIT', monto: -credInf },
                { label: 'Subcuenta Vivienda', monto: -sub },
                { label: 'Crédito FOVISSSTE', monto: -credFov },
                { label: 'Apartado', monto: -apt },
            ];
        }

        return { diferencia, desglose, total, extrasTotal };
    }, [tipo, precioOperacion, descuento, gastosNot, credito, subcuenta, creditoBanco, creditoFoviss, apartado, extrasTotal, montoDisponible]);

    // Efecto para calcular Gastos Notariales en base al Avalúo
    useEffect(() => {
        if (!tipo || !precioBase) return;

        const currentItem = PRECIOS[manzana]?.find(r => r.modelo === modelo && r.version === version);
        if (!currentItem || !currentItem.avaluo) return;

        let pct = 0;
        if (tipo === 'INFONAVIT') pct = 0.05;
        else if (tipo === 'FOVISSSTE' || tipo === 'CFE' || tipo === 'FOVISSSTE_INFONAVIT') pct = 0.07;
        else if (tipo === 'BANCARIO' || tipo === 'COFINAVIT') pct = 0.06;

        if (pct > 0) {
            setGastosNot(fmt(currentItem.avaluo * pct));
        } else {
            setGastosNot('');
        }
    }, [tipo, manzana, modelo, version, precioBase]);

    // Reset al cambiar manzana
    const handleManzana = (v: string) => {
        setManzana(v); setModelo(''); setVersion('');
        resetCampos();
    };
    const handleModelo = (v: string) => { setModelo(v); setVersion(''); resetCampos(); };
    const handleVersion = (v: string) => { setVersion(v); resetCampos(); };

    const handleTipo = (v: string) => { setTipo(v as TipoCredito); resetCampos(); };

    const resetCampos = () => {
        setGastosNot(''); setCredito(''); setSubcuenta('');
        setCreditoBanco(''); setCreditoFoviss(''); setApartado(''); setDescuento('');
        setMontoDisponible('');
        setExtraPersianas(false); setExtraCancel(false); setExtraProtecciones(false); setExtraEsquina(false);
        setUsarAvaluo(false);
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

            let propertyBody = [
                ['Manzana', manzana],
                ['Modelo', modelo],
                ['Versión', version],
                [usarAvaluo ? 'Valor de Avalúo (Base Calculada)' : 'Precio Base', fmt(precioOperacion || 0)]
            ];

            // Añadir extras a la propiedad
            if (num(descuento) > 0) propertyBody.push(['Descuento', `-${fmt(num(descuento))}`]);
            if (extraEsquina) propertyBody.push(['Extra: Terreno Excedente / Esquina', fmt(num(costoEsquina))]);
            if (extraPersianas) propertyBody.push(['Extra: Persianas Cocina y Escalera', fmt(8000)]);
            if (extraCancel) propertyBody.push(['Extra: Cancel Extra', fmt(10000)]);
            if (extraProtecciones) propertyBody.push(['Extra: Protecciones', fmt(num(costoProtecciones))]);

            propertyBody.push(['Precio de Venta (Con Extras)', fmt((precioOperacion || 0) - num(descuento) + (resultado?.extrasTotal || 0))]);

            autoTable(doc, {
                startY: 55,
                head: [['Concepto', 'Detalle']],
                body: propertyBody,
                theme: 'striped',
                headStyles: { fillColor: grisOscuro as [number, number, number], textColor: 255 },
                styles: { fontSize: 10, cellPadding: 3 },
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
                columnStyles: { 
                    0: { fontStyle: 'normal' }, 
                    1: { halign: 'right', fontStyle: 'bold' } 
                }
            });

            // 4. Resultado Final
            finalY = (doc as any).lastAutoTable.finalY + 10;
            const esAFavor = (resultado?.diferencia || 0) <= 0;
            const colorResultado = esAFavor ? verdeQuetzal : [37, 99, 235]; // Verde o Azul
            
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

            // 5. Pie de Página y Avisos
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            const footerText = "Nota: Esta cotización es de carácter informativo y está sujeta a cambios sin previo aviso conforme a la validación de capacidad de crédito y disponibilidad de vivienda. Los gastos notariales y de titulación son aproximados.";
            
            const lines = doc.splitTextToSize(footerText, 180);
            doc.text(lines, 15, 275); // Posicionado cerca del fondo A4 (297mm)

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
                    // Dimensiones del logo en el PDF (mm)
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

    // Campos visibles según tipo
    const showGN = tipo; // Ahora GN se muestra en todos
    const showCredito = tipo && ['INFONAVIT', 'FOVISSSTE', 'COFINAVIT', 'FOVISSSTE_INFONAVIT'].includes(tipo);
    const showSubcuenta = tipo && ['INFONAVIT', 'COFINAVIT', 'FOVISSSTE_INFONAVIT'].includes(tipo);
    const showBanco = tipo && ['BANCARIO', 'COFINAVIT'].includes(tipo);
    const showFoviss = tipo === 'FOVISSSTE_INFONAVIT';
    const showMontoDisponible = tipo === 'CFE';

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
                    </div>

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
                        <div style={gridStyle}>
                            <CheckboxOption label="Esquina / Terreno Excedente" checked={extraEsquina} onChange={setExtraEsquina} isCustom customValue={costoEsquina} onCustomValueChange={setCostoEsquina} />
                            <CheckboxOption label="Persianas Cocina y Escalera" price={8000} checked={extraPersianas} onChange={setExtraPersianas} />
                            <CheckboxOption label="Cancel Extra" price={10000} checked={extraCancel} onChange={setExtraCancel} />
                            <CheckboxOption label="Paquete de Protecciones" checked={extraProtecciones} onChange={setExtraProtecciones} isCustom customValue={costoProtecciones} onCustomValueChange={setCostoProtecciones} />
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
                    </div>
                )}

                {/* Paso 3: Campos del crédito */}
                {tipo && precioBase > 0 && (
                    <div style={panelStyle}>
                        <h2 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            3 · Datos del Crédito
                        </h2>
                        <div style={gridStyle}>
                            <Field label="Costo Total de Operación" value={fmt(precioOperacion + (resultado?.extrasTotal || 0))} readOnly helperText={(usarAvaluo ? "Valor Avalúo" : "Precio Base") + " + Extras"} />
                            <Field label="Descuento (opcional)" value={descuento} onChange={setDescuento} />

                            {showGN && (
                                <Field
                                    label="Gastos Notariales"
                                    value={gastosNot}
                                    onChange={setGastosNot}
                                    helperText="Calculado automático según avalúo (Ignorar si no aplica)"
                                />
                            )}

                            {showMontoDisponible && (
                                <Field
                                    label="Monto que tiene el cliente (Disponible)"
                                    value={montoDisponible}
                                    onChange={setMontoDisponible}
                                    helperText="Fondos propios que aportará"
                                />
                            )}

                            {showCredito && (
                                <Field
                                    label={tipo === 'FOVISSSTE' ? 'Crédito FOVISSSTE' : tipo === 'COFINAVIT' || tipo === 'FOVISSSTE_INFONAVIT' ? 'Crédito INFONAVIT' : 'Crédito'}
                                    value={credito} onChange={setCredito}
                                />
                            )}
                            {showSubcuenta && <Field label="Subcuenta Vivienda" value={subcuenta} onChange={setSubcuenta} />}
                            {showBanco && <Field label="Crédito Bancario" value={creditoBanco} onChange={setCreditoBanco} />}
                            {showFoviss && <Field label="Crédito FOVISSSTE" value={creditoFoviss} onChange={setCreditoFoviss} />}

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
                    </div>
                )}
            </div>
        </div>
    );
}
