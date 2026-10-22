import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    FileSignature,
    Plus,
    Trash2,
    Download,
    Highlighter,
    Sparkles,
    Building2,
    UserPlus,
    Calendar,
    RotateCcw,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PRECIOS } from '../data/precios';
import { fetchInventario, type InventarioItem } from '../services/inventarioService';
import { fetchEstatusOverrides, resolveEstatus, type EstatusManual } from '../services/inventarioEstatusService';

// ─── Tipos de Esquema (Las 6 calculadoras del Excel) ─────────────────────────
export type EsquemaContrato =
    | 'INFONAVIT_TRADICIONAL'
    | 'FOVISSSTE'
    | 'CFE'
    | 'BANCARIO'
    | 'COFINAVIT'
    | 'FOVISSSTE_INFONAVIT';

const ESQUEMAS: {
    id: EsquemaContrato;
    tituloTabla: string;
    institucionDefault: string;
    pctGastosDefault: number; // % sobre valor avalúo
}[] = [
    {
        id: 'INFONAVIT_TRADICIONAL',
        tituloTabla: 'INFONAVIT TRADICIONAL',
        institucionDefault: 'INFONAVIT',
        pctGastosDefault: 0.05,
    },
    {
        id: 'FOVISSSTE',
        tituloTabla: 'FOVISSSTE',
        institucionDefault: 'FOVISSSTE',
        pctGastosDefault: 0.07,
    },
    {
        id: 'CFE',
        tituloTabla: 'CFE',
        institucionDefault: 'CFE',
        pctGastosDefault: 0,
    },
    {
        id: 'BANCARIO',
        tituloTabla: 'BANCARIO',
        institucionDefault: 'INSTITUCIÓN BANCARIA',
        pctGastosDefault: 0.06,
    },
    {
        id: 'COFINAVIT',
        tituloTabla: 'COFINAVIT',
        institucionDefault: 'INFONAVIT Y BANCARIO (COFINAVIT)',
        pctGastosDefault: 0.05,
    },
    {
        id: 'FOVISSSTE_INFONAVIT',
        tituloTabla: 'FOVISSSTE INFONAVIT',
        institucionDefault: 'FOVISSSTE E INFONAVIT',
        pctGastosDefault: 0.07,
    },
];

// ─── Conversor de Número a Letras (Pesos Mexicanos) ──────────────────────────
function unidades(num: number): string {
    switch (num) {
        case 1: return 'UN';
        case 2: return 'DOS';
        case 3: return 'TRES';
        case 4: return 'CUATRO';
        case 5: return 'CINCO';
        case 6: return 'SEIS';
        case 7: return 'SIETE';
        case 8: return 'OCHO';
        case 9: return 'NUEVE';
        default: return '';
    }
}

function decenasY(strSin: string, numUnidades: number): string {
    if (numUnidades > 0) return `${strSin} Y ${unidades(numUnidades)}`;
    return strSin;
}

function decenas(num: number): string {
    const decena = Math.floor(num / 10);
    const unidad = num - decena * 10;
    switch (decena) {
        case 1:
            switch (unidad) {
                case 0: return 'DIEZ';
                case 1: return 'ONCE';
                case 2: return 'DOCE';
                case 3: return 'TRECE';
                case 4: return 'CATORCE';
                case 5: return 'QUINCE';
                default: return `DIECI${unidades(unidad)}`;
            }
        case 2:
            if (unidad === 0) return 'VEINTE';
            return `VEINTI${unidades(unidad)}`;
        case 3: return decenasY('TREINTA', unidad);
        case 4: return decenasY('CUARENTA', unidad);
        case 5: return decenasY('CINCUENTA', unidad);
        case 6: return decenasY('SESENTA', unidad);
        case 7: return decenasY('SETENTA', unidad);
        case 8: return decenasY('OCHENTA', unidad);
        case 9: return decenasY('NOVENTA', unidad);
        case 0: return unidades(unidad);
        default: return '';
    }
}

function centenas(num: number): string {
    const centena = Math.floor(num / 100);
    const decena = num - centena * 100;
    switch (centena) {
        case 1:
            if (decena > 0) return `CIENTO ${decenas(decena)}`;
            return 'CIEN';
        case 2: return `DOSCIENTOS ${decenas(decena)}`.trim();
        case 3: return `TRESCIENTOS ${decenas(decena)}`.trim();
        case 4: return `CUATROCIENTOS ${decenas(decena)}`.trim();
        case 5: return `QUINIENTOS ${decenas(decena)}`.trim();
        case 6: return `SEISCIENTOS ${decenas(decena)}`.trim();
        case 7: return `SETECIENTOS ${decenas(decena)}`.trim();
        case 8: return `OCHOCIENTOS ${decenas(decena)}`.trim();
        case 9: return `NOVECIENTOS ${decenas(decena)}`.trim();
        default: return decenas(decena);
    }
}

function seccion(num: number, divisor: number, strSingular: string, strPlural: string): string {
    const cientos = Math.floor(num / divisor);
    const resto = num - cientos * divisor;
    let letras = '';
    if (cientos > 0) {
        if (cientos > 1) letras = `${centenas(cientos)} ${strPlural}`;
        else letras = strSingular;
    }
    if (resto > 0) letras += '';
    return letras;
}

function miles(num: number): string {
    const divisor = 1000;
    const cientos = Math.floor(num / divisor);
    const resto = num - cientos * divisor;
    const strMiles = seccion(num, divisor, 'MIL', 'MIL');
    const strCentenas = centenas(resto);
    if (strMiles === '') return strCentenas;
    return `${strMiles} ${strCentenas}`.trim();
}

function millones(num: number): string {
    const divisor = 1000000;
    const cientos = Math.floor(num / divisor);
    const resto = num - cientos * divisor;
    const strMillones = seccion(num, divisor, 'UN MILLÓN', 'MILLONES');
    const strMiles = miles(resto);
    if (strMillones === '') return strMiles;
    return `${strMillones} ${strMiles}`.trim();
}

export function numeroALetrasMXN(monto: number): string {
    const clean = Math.max(0, isNaN(monto) ? 0 : monto);
    const enteros = Math.floor(clean);
    const centavos = Math.round((clean - enteros) * 100);
    const centavosStr = `${String(centavos).padStart(2, '0')}/100`;
    if (enteros === 0) return `CERO PESOS ${centavosStr}`;
    const letras = millones(enteros);
    // Si son millones exactos (ej. 2,000,000 -> DOS MILLONES DE PESOS)
    const esMillonExacto = enteros >= 1000000 && enteros % 1000000 === 0;
    return `${letras} ${esMillonExacto ? 'DE PESOS' : 'PESOS'} ${centavosStr}`;
}

// ─── Formateadores ───────────────────────────────────────────────────────────
const fmtMoney = (n: number, decimals = 2) =>
    n.toLocaleString('es-MX', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

const parseNum = (v: string | number): number => {
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    const cleaned = (v || '').replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
};

const MESES = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

function formatDateSpanishUpper(isoDate: string): string {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate.toUpperCase();
    const [y, m, d] = parts;
    const mesIdx = parseInt(m, 10) - 1;
    const mesNombre = MESES[mesIdx] || m;
    return `${d.padStart(2, '0')} DE ${mesNombre} ${y}`;
}

interface CompromisoPago {
    id: string;
    cantidad: string;
    fecha: string;
}

// Renderiza cada palabra en su propio span de una sola línea para evitar el bug de html2canvas
// donde un span multilínea con backgroundColor pinta un rectángulo que tapa el texto previo.
function HighlightWords({
    text,
    active,
    bold = false,
}: {
    text: string;
    active: boolean;
    bold?: boolean;
}) {
    if (!active) {
        return bold ? <strong>{text}</strong> : <span>{text}</span>;
    }
    const words = text.split(/\s+/).filter(Boolean);
    return (
        <>
            {words.map((word, i) => (
                <React.Fragment key={i}>
                    <span
                        style={{
                            backgroundColor: '#ffff00',
                            fontWeight: bold ? 'bold' : 'normal',
                            paddingLeft: '2.5px',
                            paddingRight: '2.5px',
                            marginLeft: '-1.5px',
                            marginRight: '-1.5px',
                        }}
                    >
                        {word}
                    </span>
                    {i < words.length - 1 ? ' ' : ''}
                </React.Fragment>
            ))}
        </>
    );
}

export default function Contratos() {
    const contractRef = useRef<HTMLDivElement>(null);
    const [generatingPdf, setGeneratingPdf] = useState(false);

    // ── Inventario para autocompletado rápido ──
    const [inventario, setInventario] = useState<InventarioItem[]>([]);
    const [overrides, setOverrides] = useState<Map<string, EstatusManual>>(new Map());
    const [quickMza, setQuickMza] = useState('Manzana 3');
    const [quickCasa, setQuickCasa] = useState('');
    const [quickVersion, setQuickVersion] = useState('EQUIPADA');

    useEffect(() => {
        fetchInventario().then(setInventario).catch(console.error);
        fetchEstatusOverrides().then(setOverrides).catch(console.error);
    }, []);

    // ── 1. Compradores (1 o más personas) ──
    const [compradores, setCompradores] = useState<string[]>([
        'NOMBRE DEL COMPRADOR',
    ]);
    const [direccionCliente, setDireccionCliente] = useState('');
    const [telefonoCliente, setTelefonoCliente] = useState('');
    const [correoCliente, setCorreoCliente] = useState('');
    const [mostrarNombrePie, setMostrarNombrePie] = useState(false);

    // ── 2. Esquema y Campos de la Tabla Financiera ──
    const [esquema, setEsquema] = useState<EsquemaContrato>('INFONAVIT_TRADICIONAL');
    const [institucionTexto, setInstitucionTexto] = useState('INFONAVIT');

    const [modelo, setModelo] = useState('QUETZAL');
    const [ubicacion, setUbicacion] = useState('MZ 3 CASA 1');
    const [valorAvaluo, setValorAvaluo] = useState('1770000');
    const [valorVivienda, setValorVivienda] = useState('1622000');
    const [gastosNotariales, setGastosNotariales] = useState('88500');
    const [autoGastos, setAutoGastos] = useState(false);
    const [incluirGastosCfe, setIncluirGastosCfe] = useState(false);

    // Créditos según esquema
    const [credito, setCredito] = useState('1500000');
    const [subcuenta, setSubcuenta] = useState('150000');
    const [creditoBanco, setCreditoBanco] = useState('500000');
    const [creditoFovissste, setCreditoFovissste] = useState('1000000');
    const [apartado, setApartado] = useState('10000');

    // ── 3. Compromisos de pago y fecha ──
    const [compromisos, setCompromisos] = useState<CompromisoPago[]>([
        { id: '1', cantidad: '', fecha: '' },
    ]);
    const [lugarFirma, setLugarFirma] = useState('AYALA, MORELOS');
    const [fechaFirmaIso, setFechaFirmaIso] = useState(() => new Date().toISOString().slice(0, 10));

    // ── 4. Opciones visuales del documento ──
    const [resaltarCambios, setResaltarCambios] = useState(true);
    const [colorearTablaAzul, setColorearTablaAzul] = useState(true);

    // Sincronizar institución por defecto al cambiar esquema
    const handleEsquemaChange = (nuevo: EsquemaContrato) => {
        setEsquema(nuevo);
        const cfg = ESQUEMAS.find(e => e.id === nuevo);
        if (cfg) {
            setInstitucionTexto(cfg.institucionDefault);
            if (cfg.pctGastosDefault > 0) {
                const av = parseNum(valorAvaluo);
                if (av > 0) {
                    setGastosNotariales(String(Math.round(av * cfg.pctGastosDefault * 100) / 100));
                }
            } else {
                setGastosNotariales('0');
            }
        }
    };

    // Autocompletar desde selector de inventario/precios
    const handleSelectCasaInventario = (casaNum: string) => {
        setQuickCasa(casaNum);
        if (!casaNum) return;
        const mzaNum = quickMza.replace(/\D/g, '');
        const item = inventario.find(i => i.mza.replace(/\D/g, '') === mzaNum && i.casa === casaNum);
        if (!item) return;

        // Mapear prototipo a modelo de PRECIOS
        const rawProto = item.prototipo.toUpperCase();
        let modeloPrecio = item.prototipo.toUpperCase();
        if (rawProto.includes('ROOF')) modeloPrecio = 'QUETZAL C/ROOF GARDEN';
        else if (rawProto.includes('PLUS') && rawProto.includes('F.A')) modeloPrecio = 'QUETZAL PLUS F.A.';
        else if (rawProto.includes('PLUS')) modeloPrecio = 'QUETZAL PLUS';
        else if (rawProto.includes('QUETZ')) modeloPrecio = 'QUETZAL';

        const nombreModeloContrato =
            quickVersion && quickVersion !== 'EQUIPADA'
                ? `${item.prototipo.toUpperCase()} (${quickVersion})`
                : item.prototipo.toUpperCase();

        setModelo(nombreModeloContrato);
        setUbicacion(`MZ ${mzaNum} CASA ${item.casa}`);

        const listaMza = PRECIOS[quickMza] || [];
        const matchPrecio =
            listaMza.find(p => p.modelo === modeloPrecio && p.version === quickVersion) ||
            listaMza.find(p => p.modelo === modeloPrecio);

        if (matchPrecio) {
            const av = matchPrecio.avaluo ?? matchPrecio.precio;
            const pv = matchPrecio.precio;
            setValorAvaluo(String(av));
            setValorVivienda(String(pv));
            const cfg = ESQUEMAS.find(e => e.id === esquema);
            if (cfg && cfg.pctGastosDefault > 0) {
                setGastosNotariales(String(Math.round(av * cfg.pctGastosDefault)));
            }
        }
    };

    // Actualizar precios si cambia la versión rápida y ya hay casa seleccionada
    const handleVersionQuickChange = (ver: string) => {
        setQuickVersion(ver);
        if (!quickCasa) return;
        const mzaNum = quickMza.replace(/\D/g, '');
        const item = inventario.find(i => i.mza.replace(/\D/g, '') === mzaNum && i.casa === quickCasa);
        if (!item) return;

        const rawProto = item.prototipo.toUpperCase();
        let modeloPrecio = item.prototipo.toUpperCase();
        if (rawProto.includes('ROOF')) modeloPrecio = 'QUETZAL C/ROOF GARDEN';
        else if (rawProto.includes('PLUS') && rawProto.includes('F.A')) modeloPrecio = 'QUETZAL PLUS F.A.';
        else if (rawProto.includes('PLUS')) modeloPrecio = 'QUETZAL PLUS';
        else if (rawProto.includes('QUETZ')) modeloPrecio = 'QUETZAL';

        setModelo(ver && ver !== 'EQUIPADA' ? `${item.prototipo.toUpperCase()} ${ver}` : item.prototipo.toUpperCase());

        const listaMza = PRECIOS[quickMza] || [];
        const matchPrecio = listaMza.find(p => p.modelo === modeloPrecio && p.version === ver);
        if (matchPrecio) {
            const av = matchPrecio.avaluo ?? matchPrecio.precio;
            setValorAvaluo(String(av));
            setValorVivienda(String(matchPrecio.precio));
            const cfg = ESQUEMAS.find(e => e.id === esquema);
            if (cfg && cfg.pctGastosDefault > 0 && autoGastos) {
                setGastosNotariales(String(Math.round(av * cfg.pctGastosDefault)));
            }
        }
    };

    // Recalcular gastos notariales cuando autoGastos está activo
    useEffect(() => {
        if (!autoGastos) return;
        const cfg = ESQUEMAS.find(e => e.id === esquema);
        if (cfg && cfg.pctGastosDefault > 0) {
            const av = parseNum(valorAvaluo);
            setGastosNotariales(String(Math.round(av * cfg.pctGastosDefault * 100) / 100));
        }
    }, [valorAvaluo, esquema, autoGastos]);

    // Casas disponibles de la manzana seleccionada
    const casasDisponiblesMza = useMemo(() => {
        const mzaNum = quickMza.replace(/\D/g, '');
        return inventario.filter(i => {
            if (i.mza.replace(/\D/g, '') !== mzaNum) return false;
            return resolveEstatus(i.mza, i.casa, i.estatus, overrides) === 'DISPONIBLE';
        });
    }, [inventario, overrides, quickMza]);

    // ── Cálculos exactos de las 6 tablas del Excel ──
    const calculos = useMemo(() => {
        const av = parseNum(valorAvaluo);
        const vv = parseNum(valorVivienda);
        const gn = parseNum(gastosNotariales);
        const cr = parseNum(credito);
        const sub = parseNum(subcuenta);
        const crBco = parseNum(creditoBanco);
        const crFov = parseNum(creditoFovissste);
        const apt = parseNum(apartado);

        const valorTotal = vv + (esquema === 'CFE' && !incluirGastosCfe ? 0 : gn);
        const diferenciaTotalCfe = (incluirGastosCfe ? valorTotal : vv) - cr;

        let diferencia = 0;
        let montoCreditoTexto = cr;

        switch (esquema) {
            case 'INFONAVIT_TRADICIONAL':
                // Excel: C22 + C23 + C24 - C21
                diferencia = cr + sub + apt - valorTotal;
                montoCreditoTexto = cr;
                break;
            case 'FOVISSSTE':
                // Excel: F22 + F23 - F21
                diferencia = cr + apt - valorTotal;
                montoCreditoTexto = cr;
                break;
            case 'CFE':
                // Excel: I21 = I19 - I20 (DIFERENCIA TOTAL), I23 = I21 - I22 (DIFERENCIA)
                diferencia = diferenciaTotalCfe - apt;
                montoCreditoTexto = cr;
                break;
            case 'BANCARIO':
                // Excel: C35 + C36 - C34
                diferencia = cr + apt - valorTotal;
                montoCreditoTexto = cr;
                break;
            case 'COFINAVIT':
                // Excel: F36 + F37 + F38 + F39 - F35
                diferencia = cr + sub + crBco + apt - valorTotal;
                montoCreditoTexto = cr + crBco;
                break;
            case 'FOVISSSTE_INFONAVIT':
                // Excel: I36 + I37 + I38 + I39 - I35
                diferencia = cr + sub + crFov + apt - valorTotal;
                montoCreditoTexto = cr + crFov;
                break;
        }

        return {
            av,
            vv,
            gn,
            cr,
            sub,
            crBco,
            crFov,
            apt,
            valorTotal,
            diferenciaTotalCfe,
            diferencia,
            montoCreditoTexto,
        };
    }, [esquema, valorAvaluo, valorVivienda, gastosNotariales, credito, subcuenta, creditoBanco, creditoFovissste, apartado, incluirGastosCfe]);

    // ── Filas de la tabla según el esquema seleccionado (idéntico al Excel) ──
    const filasTabla = useMemo(() => {
        const { av, vv, gn, cr, sub, crBco, crFov, apt, valorTotal, diferenciaTotalCfe, diferencia } = calculos;

        if (esquema === 'INFONAVIT_TRADICIONAL') {
            return [
                { label: 'MODELO', value: modelo, isMoney: false, editable: true },
                { label: 'UBICACIÓN', value: ubicacion, isMoney: false, editable: true },
                { label: 'VALOR AVALUO', value: fmtMoney(av), isMoney: true, editable: false },
                { label: 'VALOR VIVIENDA', value: fmtMoney(vv), isMoney: true, editable: true },
                { label: 'GASTOS NOTARIALES', value: fmtMoney(gn), isMoney: true, editable: false },
                { label: 'VALOR TOTAL', value: fmtMoney(valorTotal), isMoney: true, editable: false },
                { label: 'CREDITO', value: fmtMoney(cr), isMoney: true, editable: true },
                { label: 'SUBCUENTA', value: fmtMoney(sub), isMoney: true, editable: true },
                { label: 'APARTADO', value: fmtMoney(apt), isMoney: true, editable: true },
                { label: 'DIFERENCIA', value: fmtMoney(Math.abs(diferencia)), isMoney: true, editable: false },
            ];
        }
        if (esquema === 'FOVISSSTE') {
            return [
                { label: 'MODELO', value: modelo, isMoney: false, editable: true },
                { label: 'UBICACIÓN', value: ubicacion, isMoney: false, editable: true },
                { label: 'VALOR AVALUO', value: fmtMoney(av), isMoney: true, editable: false },
                { label: 'VALOR VIVIENDA', value: fmtMoney(vv), isMoney: true, editable: true },
                { label: 'GASTOS NOTARIALES', value: fmtMoney(gn), isMoney: true, editable: false },
                { label: 'VALOR TOTAL', value: fmtMoney(valorTotal), isMoney: true, editable: false },
                { label: 'CREDITO', value: fmtMoney(cr), isMoney: true, editable: true },
                { label: 'APARTADO', value: fmtMoney(apt), isMoney: true, editable: true },
                { label: 'DIFERENCIA', value: fmtMoney(Math.abs(diferencia)), isMoney: true, editable: false },
            ];
        }
        if (esquema === 'CFE') {
            return [
                { label: 'MODELO', value: modelo, isMoney: false, editable: true },
                { label: 'UBICACIÓN', value: ubicacion, isMoney: false, editable: true },
                { label: 'VALOR AVALUO', value: fmtMoney(av), isMoney: true, editable: false },
                { label: 'VALOR VIVIENDA', value: fmtMoney(vv), isMoney: true, editable: true },
                ...(incluirGastosCfe
                    ? [
                          { label: 'GASTOS NOTARIALES (APROX.)', value: fmtMoney(gn), isMoney: true, editable: false },
                          { label: 'VALOR TOTAL', value: fmtMoney(valorTotal), isMoney: true, editable: false },
                      ]
                    : []),
                { label: 'CREDITO', value: fmtMoney(cr), isMoney: true, editable: true },
                { label: 'DIFERENCIA TOTAL', value: fmtMoney(diferenciaTotalCfe), isMoney: true, editable: false },
                { label: 'APARTADO', value: fmtMoney(apt), isMoney: true, editable: true },
                { label: 'DIFERENCIA', value: fmtMoney(Math.abs(diferencia)), isMoney: true, editable: false },
            ];
        }
        if (esquema === 'BANCARIO') {
            return [
                { label: 'MODELO', value: modelo, isMoney: false, editable: true },
                { label: 'UBICACIÓN', value: ubicacion, isMoney: false, editable: true },
                { label: 'VALOR AVALUO', value: fmtMoney(av), isMoney: true, editable: false },
                { label: 'VALOR VIVIENDA', value: fmtMoney(vv), isMoney: true, editable: true },
                { label: 'GASTOS NOTARIALES', value: fmtMoney(gn), isMoney: true, editable: false },
                { label: 'VALOR TOTAL', value: fmtMoney(valorTotal), isMoney: true, editable: false },
                { label: 'CREDITO', value: fmtMoney(cr), isMoney: true, editable: true },
                { label: 'APARTADO', value: fmtMoney(apt), isMoney: true, editable: true },
                { label: 'DIFERENCIA', value: fmtMoney(diferencia), isMoney: true, editable: false },
            ];
        }
        if (esquema === 'COFINAVIT') {
            return [
                { label: 'MODELO', value: modelo, isMoney: false, editable: true },
                { label: 'UBICACIÓN', value: ubicacion, isMoney: false, editable: true },
                { label: 'VALOR AVALUO', value: fmtMoney(av), isMoney: true, editable: false },
                { label: 'VALOR VIVIENDA', value: fmtMoney(vv), isMoney: true, editable: true },
                { label: 'GASTOS NOTARIALES', value: fmtMoney(gn), isMoney: true, editable: false },
                { label: 'VALOR TOTAL', value: fmtMoney(valorTotal), isMoney: true, editable: false },
                { label: 'CREDITO', value: fmtMoney(cr), isMoney: true, editable: true },
                { label: 'SUBCUENTA', value: fmtMoney(sub), isMoney: true, editable: true },
                { label: 'CREDITO BANCO', value: fmtMoney(crBco), isMoney: true, editable: true },
                { label: 'APARTADO', value: fmtMoney(apt), isMoney: true, editable: true },
                { label: 'DIFERENCIA', value: fmtMoney(Math.abs(diferencia)), isMoney: true, editable: false },
            ];
        }
        // FOVISSSTE_INFONAVIT
        return [
            { label: 'MODELO', value: modelo, isMoney: false, editable: true },
            { label: 'UBICACIÓN', value: ubicacion, isMoney: false, editable: true },
            { label: 'VALOR AVALUO', value: fmtMoney(av), isMoney: true, editable: false },
            { label: 'VALOR VIVIENDA', value: fmtMoney(vv), isMoney: true, editable: true },
            { label: 'GASTOS NOTARIALES FOVISSSTE', value: fmtMoney(gn), isMoney: true, editable: false },
            { label: 'VALOR TOTAL', value: fmtMoney(valorTotal), isMoney: true, editable: false },
            { label: 'CREDITO INFONAVIT', value: fmtMoney(cr), isMoney: true, editable: true },
            { label: 'SUBCUENTA', value: fmtMoney(sub), isMoney: true, editable: true },
            { label: 'CREDITO FOVISSSTE', value: fmtMoney(crFov), isMoney: true, editable: true },
            { label: 'APARTADO', value: fmtMoney(apt), isMoney: true, editable: true },
            { label: 'DIFERENCIA', value: fmtMoney(Math.abs(diferencia)), isMoney: true, editable: false },
        ];
    }, [esquema, modelo, ubicacion, calculos, incluirGastosCfe]);

    // ── Textos compuestos para el contrato ──
    const nombresCompradoresStr = useMemo(() => {
        const limpios = compradores.map(c => c.trim().toUpperCase()).filter(Boolean);
        if (limpios.length === 0) return '_______________________________';
        if (limpios.length === 1) return limpios[0];
        if (limpios.length === 2) {
            const conj = limpios[1].startsWith('I') || limpios[1].startsWith('HI') ? 'E' : 'Y';
            return `${limpios[0]} ${conj} ${limpios[1]}`;
        }
        const ult = limpios[limpios.length - 1];
        const conj = ult.startsWith('I') || ult.startsWith('HI') ? 'E' : 'Y';
        return `${limpios.slice(0, -1).join(', ')} ${conj} ${ult}`;
    }, [compradores]);

    const creditoEnLetras = useMemo(() => {
        const m = calculos.montoCreditoTexto;
        const tieneDecimales = Math.round((m - Math.floor(m)) * 100) > 0;
        const numStr = tieneDecimales ? fmtMoney(m, 2) : fmtMoney(m, 0);
        return `$${numStr} ${numeroALetrasMXN(m)})`;
    }, [calculos.montoCreditoTexto]);

    const apartadoEnLetras = useMemo(() => {
        const m = calculos.apt;
        const tieneDecimales = Math.round((m - Math.floor(m)) * 100) > 0;
        const numStr = tieneDecimales ? fmtMoney(m, 2) : fmtMoney(m, 0);
        return `$${numStr} ${numeroALetrasMXN(m)})`;
    }, [calculos.apt]);

    const fechaFirmaTexto = useMemo(() => formatDateSpanishUpper(fechaFirmaIso), [fechaFirmaIso]);

    const tituloTablaActual = useMemo(
        () => ESQUEMAS.find(e => e.id === esquema)?.tituloTabla ?? 'INFONAVIT TRADICIONAL',
        [esquema]
    );

    // ── Handlers de Compradores ──
    const addComprador = () => setCompradores(prev => [...prev, '']);
    const updateComprador = (idx: number, val: string) =>
        setCompradores(prev => prev.map((c, i) => (i === idx ? val : c)));
    const removeComprador = (idx: number) =>
        setCompradores(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

    // ── Handlers de Compromisos de Pago ──
    const addCompromiso = () =>
        setCompromisos(prev => [...prev, { id: String(Date.now()), cantidad: '', fecha: '' }]);
    const updateCompromiso = (id: string, field: 'cantidad' | 'fecha', val: string) =>
        setCompromisos(prev => prev.map(c => (c.id === id ? { ...c, [field]: val } : c)));
    const removeCompromiso = (id: string) =>
        setCompromisos(prev => (prev.length > 1 ? prev.filter(c => c.id !== id) : prev));

    // ── Descargar PDF de alta resolución (1 página tamaño Carta exacta) ──
    const handleDescargarPDF = async () => {
        if (!contractRef.current) return;
        setGeneratingPdf(true);
        try {
            const canvas = await html2canvas(contractRef.current, {
                scale: 2.5,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'letter', // 215.9 x 279.4 mm
            });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);

            const cleanName = nombresCompradoresStr
                .replace(/[^A-Z0-9ÁÉÍÓÚÑ ]/gi, '')
                .trim()
                .replace(/\s+/g, '_')
                .slice(0, 40);
            pdf.save(`Oferta_Compra_${ubicacion.replace(/\s+/g, '_')}_${cleanName || 'Cliente'}.pdf`);
        } catch (err) {
            console.error('Error al generar PDF del contrato:', err);
            alert('Hubo un error al generar el PDF.');
        } finally {
            setGeneratingPdf(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '9px 12px',
        borderRadius: '8px',
        border: '1px solid var(--border-glass)',
        background: 'var(--panel-item-bg)',
        color: 'var(--text-main)',
        fontSize: '0.88rem',
        fontFamily: 'inherit',
        outline: 'none',
        boxSizing: 'border-box',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.73rem',
        color: 'var(--text-muted)',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: '4px',
        display: 'block',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: 'rgba(34,197,94,0.12)',
                            border: '1px solid rgba(34,197,94,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <FileSignature size={22} color="var(--primary-accent)" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
                            Generador de <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>Contratos</span>
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                            Oferta de compra con calculadora integrada por esquema de crédito y exportación a PDF
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={() => setResaltarCambios(r => !r)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '9px 14px',
                            borderRadius: '10px',
                            border: `1px solid ${resaltarCambios ? '#eab308' : 'var(--border-glass)'}`,
                            background: resaltarCambios ? 'rgba(234,179,8,0.15)' : 'var(--panel-item-bg)',
                            color: resaltarCambios ? '#facc15' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                        }}
                        title="Activa o desactiva el marcador amarillo en los campos modificables dentro del PDF"
                    >
                        <Highlighter size={16} />
                        {resaltarCambios ? 'Resaltado Amarillo: ON' : 'Resaltado Amarillo: OFF'}
                    </button>

                    <button
                        type="button"
                        onClick={handleDescargarPDF}
                        disabled={generatingPdf}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '10px',
                            border: '1px solid var(--primary-accent)',
                            background: 'linear-gradient(135deg, rgba(34,197,94,0.22) 0%, rgba(16,185,129,0.15) 100%)',
                            color: 'var(--primary-accent)',
                            cursor: generatingPdf ? 'wait' : 'pointer',
                            fontFamily: 'inherit',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            boxShadow: '0 4px 16px rgba(34,197,94,0.18)',
                        }}
                    >
                        <Download size={17} />
                        {generatingPdf ? 'Generando PDF...' : 'Descargar Contrato PDF'}
                    </button>
                </div>
            </div>

            {/* ── Selector de los 6 Esquemas de Crédito (Calculadoras del Excel) ── */}
            <div className="glass-panel" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Sparkles size={15} color="var(--primary-accent)" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Selecciona la Calculadora / Esquema del Contrato:
                    </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {ESQUEMAS.map(item => {
                        const active = esquema === item.id;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => handleEsquemaChange(item.id)}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '10px',
                                    border: `1px solid ${active ? 'var(--primary-accent)' : 'var(--border-glass)'}`,
                                    background: active ? 'rgba(34,197,94,0.15)' : 'var(--panel-item-bg)',
                                    color: active ? 'var(--primary-accent)' : 'var(--text-muted)',
                                    fontWeight: active ? 700 : 500,
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {item.tituloTabla}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Layout Principal: Izquierda Controles | Derecha Vista Previa Contrato ── */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(340px, 460px) 1fr',
                    gap: '20px',
                    alignItems: 'start',
                }}
                className="contratos-grid"
            >
                {/* ──────────────── PANEL IZQUIERDO: FORMULARIO Y CALCULADORA ──────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* 1. Titulares / Compradores */}
                    <div className="glass-panel" style={{ padding: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <UserPlus size={17} color="var(--primary-accent)" />
                                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                                    1. Comprador(es) / Titular(es)
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={addComprador}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '5px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(34,197,94,0.35)',
                                    background: 'rgba(34,197,94,0.1)',
                                    color: 'var(--primary-accent)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                <Plus size={14} /> Agregar persona
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {compradores.map((nombre, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        value={nombre}
                                        onChange={e => updateComprador(idx, e.target.value.toUpperCase())}
                                        placeholder={`Nombre completo del comprador ${idx + 1}`}
                                        style={inputStyle}
                                    />
                                    {compradores.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeComprador(idx)}
                                            style={{
                                                background: 'rgba(239,68,68,0.12)',
                                                border: '1px solid rgba(239,68,68,0.3)',
                                                color: '#ef4444',
                                                borderRadius: '8px',
                                                padding: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                            title="Quitar persona"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '10px', fontSize: '0.74rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '8px 10px', borderRadius: '6px' }}>
                            <strong>Aparecerá como:</strong>{' '}
                            <span style={{ color: 'var(--primary-accent)', fontWeight: 600 }}>{nombresCompradoresStr}</span>
                        </div>
                    </div>

                    {/* 2. Autocompletar rápido desde Inventario (Opcional) */}
                    <div className="glass-panel" style={{ padding: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <Building2 size={17} color="#38bdf8" />
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                                2. Cargar Casa del Inventario (Opcional)
                            </h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={labelStyle}>Manzana</label>
                                <select
                                    value={quickMza}
                                    onChange={e => {
                                        setQuickMza(e.target.value);
                                        setQuickCasa('');
                                    }}
                                    style={inputStyle}
                                >
                                    {Object.keys(PRECIOS).map(m => (
                                        <option key={m} value={m} style={{ background: '#0f172a', color: '#fff' }}>
                                            {m}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Casa Disp.</label>
                                <select
                                    value={quickCasa}
                                    onChange={e => handleSelectCasaInventario(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="" style={{ background: '#0f172a', color: '#fff' }}>
                                        — Elegir —
                                    </option>
                                    {casasDisponiblesMza.map(c => (
                                        <option key={`${c.mza}-${c.casa}`} value={c.casa} style={{ background: '#0f172a', color: '#fff' }}>
                                            Casa {c.casa} ({c.prototipo})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Versión</label>
                                <select
                                    value={quickVersion}
                                    onChange={e => handleVersionQuickChange(e.target.value)}
                                    style={inputStyle}
                                >
                                    {['EQUIPADA', 'EQUIPADA ELITE', 'AUSTERA', 'AUSTERA ELITE'].map(v => (
                                        <option key={v} value={v} style={{ background: '#0f172a', color: '#fff' }}>
                                            {v}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 3. Tabla Calculadora del Contrato (Campos Modificables) */}
                    <div className="glass-panel" style={{ padding: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-accent)' }}>
                                3. Datos de {tituloTablaActual}
                            </h3>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={colorearTablaAzul}
                                    onChange={e => setColorearTablaAzul(e.target.checked)}
                                />
                                Celdas azules
                            </label>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Institución Otorgante (Cláusula Primera)</label>
                                <input
                                    type="text"
                                    value={institucionTexto}
                                    onChange={e => setInstitucionTexto(e.target.value.toUpperCase())}
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Modelo</label>
                                <input
                                    type="text"
                                    value={modelo}
                                    onChange={e => setModelo(e.target.value.toUpperCase())}
                                    style={{ ...inputStyle, borderColor: 'rgba(56,189,248,0.4)' }}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Ubicación (Mza y Casa)</label>
                                <input
                                    type="text"
                                    value={ubicacion}
                                    onChange={e => setUbicacion(e.target.value.toUpperCase())}
                                    style={{ ...inputStyle, borderColor: 'rgba(56,189,248,0.4)' }}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Valor Avalúo ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={valorAvaluo}
                                    onChange={e => setValorAvaluo(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Valor Vivienda ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={valorVivienda}
                                    onChange={e => setValorVivienda(e.target.value)}
                                    style={{ ...inputStyle, borderColor: 'rgba(56,189,248,0.4)' }}
                                />
                            </div>

                            {esquema === 'CFE' && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = !incluirGastosCfe;
                                            setIncluirGastosCfe(next);
                                            if (next && parseNum(gastosNotariales) === 0) {
                                                setGastosNotariales(
                                                    String(Math.round(parseNum(valorAvaluo) * 0.07 * 100) / 100)
                                                );
                                            }
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: `1px solid ${incluirGastosCfe ? 'var(--primary-accent)' : 'rgba(56,189,248,0.35)'}`,
                                            background: incluirGastosCfe ? 'rgba(34,197,94,0.12)' : 'rgba(56,189,248,0.08)',
                                            color: incluirGastosCfe ? 'var(--primary-accent)' : '#38bdf8',
                                            fontSize: '0.8rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            fontFamily: 'inherit',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            marginBottom: incluirGastosCfe ? '8px' : 0,
                                        }}
                                    >
                                        {incluirGastosCfe ? (
                                            <>✓ Gastos Notariales (Valor Aproximado) Incluidos — Quitar</>
                                        ) : (
                                            <>+ Agregar Gastos Notariales (Valor Aproximado)</>
                                        )}
                                    </button>
                                </div>
                            )}

                            {(esquema !== 'CFE' || incluirGastosCfe) && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <label style={{ ...labelStyle, marginBottom: 0 }}>
                                            {esquema === 'FOVISSSTE_INFONAVIT'
                                                ? 'Gastos Notariales Fovissste ($)'
                                                : esquema === 'CFE'
                                                ? 'Gastos Notariales Aprox. ($)'
                                                : 'Gastos Notariales ($)'}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const cfg = ESQUEMAS.find(e => e.id === esquema);
                                                const pct = esquema === 'CFE' ? 0.07 : cfg?.pctGastosDefault ?? 0.05;
                                                if (pct > 0) {
                                                    setGastosNotariales(
                                                        String(Math.round(parseNum(valorAvaluo) * pct * 100) / 100)
                                                    );
                                                }
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#38bdf8',
                                                fontSize: '0.72rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: 0,
                                            }}
                                            title="Calcular porcentaje automático sobre avalúo"
                                        >
                                            <RotateCcw size={11} /> Calcular % Avalúo {esquema === 'CFE' ? '(7%)' : ''}
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={gastosNotariales}
                                        onChange={e => {
                                            setAutoGastos(false);
                                            setGastosNotariales(e.target.value);
                                        }}
                                        style={inputStyle}
                                    />
                                </div>
                            )}

                            <div>
                                <label style={labelStyle}>
                                    {esquema === 'FOVISSSTE_INFONAVIT' ? 'Crédito Infonavit ($)' : 'Crédito ($)'}
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={credito}
                                    onChange={e => setCredito(e.target.value)}
                                    style={{ ...inputStyle, borderColor: 'rgba(56,189,248,0.4)' }}
                                />
                            </div>

                            {(esquema === 'INFONAVIT_TRADICIONAL' ||
                                esquema === 'COFINAVIT' ||
                                esquema === 'FOVISSSTE_INFONAVIT') && (
                                <div>
                                    <label style={labelStyle}>Subcuenta ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={subcuenta}
                                        onChange={e => setSubcuenta(e.target.value)}
                                        style={{ ...inputStyle, borderColor: 'rgba(56,189,248,0.4)' }}
                                    />
                                </div>
                            )}

                            {esquema === 'COFINAVIT' && (
                                <div>
                                    <label style={labelStyle}>Crédito Banco ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={creditoBanco}
                                        onChange={e => setCreditoBanco(e.target.value)}
                                        style={{ ...inputStyle, borderColor: 'rgba(56,189,248,0.4)' }}
                                    />
                                </div>
                            )}

                            {esquema === 'FOVISSSTE_INFONAVIT' && (
                                <div>
                                    <label style={labelStyle}>Crédito Fovissste ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={creditoFovissste}
                                        onChange={e => setCreditoFovissste(e.target.value)}
                                        style={{ ...inputStyle, borderColor: 'rgba(56,189,248,0.4)' }}
                                    />
                                </div>
                            )}

                            <div>
                                <label style={labelStyle}>Apartado ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={apartado}
                                    onChange={e => setApartado(e.target.value)}
                                    style={{ ...inputStyle, borderColor: 'rgba(56,189,248,0.4)' }}
                                />
                            </div>
                        </div>

                        {/* Resumen de Valor Total y Diferencia */}
                        <div
                            style={{
                                marginTop: '12px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                background: 'rgba(34,197,94,0.06)',
                                border: '1px solid rgba(34,197,94,0.2)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.82rem',
                            }}
                        >
                            <span>
                                <strong>{esquema === 'CFE' ? 'Dif. Total:' : 'Valor Total:'}</strong> $
                                {fmtMoney(esquema === 'CFE' ? calculos.diferenciaTotalCfe : calculos.valorTotal)}
                            </span>
                            <span style={{ color: 'var(--primary-accent)', fontWeight: 700 }}>
                                Diferencia: ${fmtMoney(esquema === 'BANCARIO' ? calculos.diferencia : Math.abs(calculos.diferencia))}
                            </span>
                        </div>
                    </div>

                    {/* 4. Fecha de Firma, Compromisos de Pago y Pie de Firma */}
                    <div className="glass-panel" style={{ padding: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <Calendar size={17} color="var(--primary-accent)" />
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                                4. Fecha de Firma y Compromisos
                            </h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                            <div>
                                <label style={labelStyle}>Lugar de Firma</label>
                                <input
                                    type="text"
                                    value={lugarFirma}
                                    onChange={e => setLugarFirma(e.target.value.toUpperCase())}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Fecha de Firma</label>
                                <input
                                    type="date"
                                    value={fechaFirmaIso}
                                    onChange={e => setFechaFirmaIso(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Tabla de Compromisos de Pago (SEGUNDA) */}
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <label style={{ ...labelStyle, marginBottom: 0 }}>
                                    Tabla Compromiso de Pago (Opcional)
                                </label>
                                <button
                                    type="button"
                                    onClick={addCompromiso}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--primary-accent)',
                                        fontSize: '0.74rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}
                                >
                                    <Plus size={13} /> Fila
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {compromisos.map(c => (
                                    <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '6px' }}>
                                        <input
                                            type="text"
                                            placeholder="Cantidad (ej. $53,330.00)"
                                            value={c.cantidad}
                                            onChange={e => updateCompromiso(c.id, 'cantidad', e.target.value)}
                                            style={inputStyle}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Fecha (ej. 15/11/2026)"
                                            value={c.fecha}
                                            onChange={e => updateCompromiso(c.id, 'fecha', e.target.value.toUpperCase())}
                                            style={inputStyle}
                                        />
                                        {compromisos.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeCompromiso(c.id)}
                                                style={{
                                                    background: 'rgba(239,68,68,0.12)',
                                                    border: '1px solid rgba(239,68,68,0.3)',
                                                    color: '#ef4444',
                                                    borderRadius: '8px',
                                                    padding: '0 8px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Datos de contacto opcionales al pie */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={labelStyle}>Dirección Cliente (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Dejar vacío para llenar a mano"
                                    value={direccionCliente}
                                    onChange={e => setDireccionCliente(e.target.value.toUpperCase())}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Teléfono Cliente (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Dejar vacío para llenar a mano"
                                    value={telefonoCliente}
                                    onChange={e => setTelefonoCliente(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Correo Electrónico (Opcional)</label>
                                <input
                                    type="email"
                                    placeholder="Dejar vacío para llenar a mano (ej. cliente@correo.com)"
                                    value={correoCliente}
                                    onChange={e => setCorreoCliente(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={mostrarNombrePie}
                                onChange={e => setMostrarNombrePie(e.target.checked)}
                            />
                            Imprimir también el nombre en el renglón "NOMBRE:" al pie de firma
                        </label>
                    </div>
                </div>

                {/* ──────────────── PANEL DERECHO: VISTA PREVIA EXACTA DE LA HOJA CARTA ──────────────── */}
                <div
                    className="glass-panel"
                    style={{
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        overflowX: 'auto',
                        background: 'rgba(15, 23, 42, 0.6)',
                        position: 'sticky',
                        top: '16px',
                    }}
                >
                    <div
                        style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px',
                            fontSize: '0.78rem',
                            color: 'var(--text-muted)',
                        }}
                    >
                        <span>Vista Previa en Tiempo Real (Tamaño Carta — 2 Columnas)</span>
                        <span>Los campos resaltados reflejan tus cambios al instante</span>
                    </div>

                    {/* Hoja Tamaño Carta proporcional (816px x 1056px = 8.5in x 11in @ 96dpi) */}
                    <div
                        ref={contractRef}
                        style={{
                            width: '816px',
                            minWidth: '816px',
                            height: '1056px',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            padding: '44px 48px',
                            boxSizing: 'border-box',
                            fontFamily: 'Arial, Helvetica, sans-serif',
                            fontSize: '10.6px',
                            lineHeight: '1.28',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            columnGap: '34px',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
                            position: 'relative',
                        }}
                    >
                        {/* ══════════ COLUMNA IZQUIERDA ══════════ */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                            <p style={{ margin: '0 0 10px 0', textAlign: 'justify' }}>
                                Oferta de compra que hace{' '}
                                <HighlightWords text={nombresCompradoresStr} active={resaltarCambios} bold /> a{' '}
                                <strong>3 FR ESPECIALISTAS EN CONSTRUCCION S.A. DE C.V.</strong> la cual me permito poner a su
                                consideración, que hago en este acto, sobre una vivienda ubicada en el Conjunto Urbano{' '}
                                <strong>RESIDENCIAL LOS QUETZALES</strong>, cuyas características se detallan en el plano
                                arquitectónico y lista de especificaciones generales de construcción, al tenor de los siguientes
                                antecedentes y términos.
                            </p>

                            <p style={{ margin: '0 0 10px 0', textAlign: 'center', fontWeight: 'bold' }}>
                                ANTECEDENTES
                            </p>

                            <p style={{ margin: '0 0 10px 0', textAlign: 'justify' }}>
                                PRIMERA: Manifiesto que soy sujeto preliminar de crédito ante la institución{' '}
                                <strong>{institucionTexto}</strong>, con capacidad jurídica para obligarme en los términos de la
                                mencionada institución para adquirir un crédito por la cantidad de{' '}
                                <HighlightWords text={creditoEnLetras} active={resaltarCambios} bold />
                            </p>

                            <p style={{ margin: '0 0 10px 0', textAlign: 'justify' }}>
                                SEGUNDA: Este monto podrá variar según mi situación económica (ingresos y egresos), edad, reporte
                                en buró de crédito y cualquier otra que contemplen las políticas de la institución otorgante.
                            </p>

                            <p style={{ margin: '0 0 10px 0', textAlign: 'justify' }}>
                                TERCERA: Manifiesto que conozco la ubicación y características del Conjunto Habitacional
                                mencionado, así como las especificaciones técnicas y condiciones de venta de las viviendas, las
                                cuales pueden cambiar por variaciones en el monto del salario mínimo u otras variables.
                            </p>

                            <p style={{ margin: '2px 0 10px 0', textAlign: 'center', fontWeight: 'bold' }}>
                                TÉRMINOS:
                            </p>

                            <p style={{ margin: '0 0 10px 0', textAlign: 'justify' }}>
                                PRIMERA: Por medio de esta declaración unilateral de mi voluntad, me obligo, si ustedes así lo
                                aprueban, a firmar la escritura pública de compraventa respecto a la vivienda que me sea asignada,
                                y bajo los siguientes términos
                            </p>

                            {/* ── Tabla Financiera Incrustada (idéntica al Word/Excel) ── */}
                            <table
                                style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    marginBottom: '12px',
                                    fontSize: '10.2px',
                                    border: '1px solid #000',
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th
                                            colSpan={2}
                                            style={{
                                                border: '1px solid #000',
                                                padding: '3px 6px',
                                                textAlign: 'center',
                                                fontWeight: 'normal',
                                                backgroundColor: '#ffffff',
                                            }}
                                        >
                                            {tituloTablaActual}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filasTabla.map((fila, i) => {
                                        const bgCell =
                                            colorearTablaAzul && fila.editable ? '#d9e8f5' : '#ffffff';
                                        return (
                                            <tr key={i}>
                                                <td
                                                    style={{
                                                        border: '1px solid #000',
                                                        padding: '2.5px 6px',
                                                        width: '48%',
                                                        backgroundColor: '#ffffff',
                                                    }}
                                                >
                                                    {fila.label}
                                                </td>
                                                <td
                                                    style={{
                                                        border: '1px solid #000',
                                                        padding: '2.5px 6px',
                                                        backgroundColor: bgCell,
                                                    }}
                                                >
                                                    {fila.isMoney ? (
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <span>$</span>
                                                            <span>{fila.value}</span>
                                                        </div>
                                                    ) : (
                                                        <span>{fila.value}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            <p style={{ margin: '0 0 10px 0', textAlign: 'justify' }}>
                                Para formalizar esta oferta de compra me comprometo a pagar{' '}
                                <HighlightWords text={apartadoEnLetras} active={resaltarCambios} /> por concepto de apartado.
                            </p>

                            <p style={{ margin: '0 0 10px 0', textAlign: 'justify' }}>
                                En caso de existir diferencia adicional a mi cargo por cualquier concepto tanto en el precio como
                                en gastos, esta la cubriré con recursos propios que entregaré antes de la firma de las escrituras.
                            </p>

                            <p style={{ margin: '0 0 8px 0', textAlign: 'left' }}>
                                SEGUNDA: &nbsp;La diferencia será liquidada de la siguiente forma:
                            </p>

                            {/* ── Tabla de Cantidad y Fecha Compromiso ── */}
                            <table
                                style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    marginBottom: '12px',
                                    fontSize: '10px',
                                    border: '1px solid #000',
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th
                                            style={{
                                                border: '1px solid #000',
                                                padding: '3px 6px',
                                                width: '45%',
                                                textAlign: 'center',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            CANTIDAD
                                        </th>
                                        <th
                                            style={{
                                                border: '1px solid #000',
                                                padding: '3px 6px',
                                                width: '55%',
                                                textAlign: 'center',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            FECHA COMPROMISO
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {compromisos.map(c => (
                                        <tr key={c.id}>
                                            <td
                                                style={{
                                                    border: '1px solid #000',
                                                    padding: '4px 6px',
                                                    height: '16px',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {c.cantidad}
                                            </td>
                                            <td
                                                style={{
                                                    border: '1px solid #000',
                                                    padding: '4px 6px',
                                                    height: '16px',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {c.fecha}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <p style={{ margin: '0 0 10px 0', textAlign: 'justify' }}>
                                En caso de aceptación de mi oferta, en el supuesto que me llegase a atrasar en cualquiera de los
                                pagos descritos en el cuadro que antecede me obligo al pago de intereses a razón del{' '}
                                <strong style={{ textDecoration: 'underline' }}>3% mensual</strong> por incurrir en mora de pago.
                            </p>

                            <p style={{ margin: '0 0 10px 0', textAlign: 'justify' }}>
                                Autorizo que las cantidades antes señaladas serán en depósito en garantía, para ser aplicado una
                                vez que se cumpla la condición estipulada en esta oferta consistente en el otorgamiento del
                                crédito por parte de la Institución Crediticia al momento de la firma de escritura.
                            </p>

                            <p style={{ margin: 0, textAlign: 'justify' }}>
                                TERCERA: La presente oferta se entenderá cancelada y quedará sin efectos, por las causas
                                enunciadas más no limitadas siguientes:
                            </p>
                        </div>

                        {/* ══════════ COLUMNA DERECHA ══════════ */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                            <div style={{ paddingLeft: '18px', marginBottom: '10px' }}>
                                {[
                                    ['A.', 'Por no cubrir a tiempo cualquiera de los pagos estipulados por diferencia y/o apartado.'],
                                    ['B.', 'Si por alguna razón imputable a mí no me fuera otorgado el crédito por parte de la institución Crediticia.'],
                                    ['C.', 'Si se otorga un crédito inferior y no fuera cubierta la diferencia con anticipación a la firma de la escritura.'],
                                    ['D.', 'Si no presentara la documentación solicitada por la institución para el otorgamiento del crédito.'],
                                    ['E.', 'Si presentara datos o documentación falsos.'],
                                ].map(([letra, texto]) => (
                                    <div
                                        key={letra}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '20px 1fr',
                                            marginBottom: '2px',
                                            textAlign: 'justify',
                                        }}
                                    >
                                        <span>{letra}</span>
                                        <span>{texto}</span>
                                    </div>
                                ))}
                            </div>

                            <p style={{ margin: '0 0 10px 0', textAlign: 'justify' }}>
                                En caso de cancelación de la presente oferta pagaré como pena convencional 3% del valor de
                                compraventa, cantidad que solicito sea descontada de los depósitos que previamente realice y me
                                sea devuelta la cantidad restante previa solicitud por escrito que haga de la misma.
                            </p>

                            <p style={{ margin: '0 0 10px 0', textAlign: 'justify' }}>
                                CUARTA: Solicito que en caso de ser autorizada esta oferta y una vez que se firme el contrato de
                                compraventa respectivo, así como se me otorgue el crédito requerido, se escriture la vivienda
                                objeto de este ofrecimiento con el Notario Público que ustedes designen, siempre y cuando les haya
                                cubierto el total de los depósitos en garantía, los gastos, impuestos, derechos y honorarios
                                notariales.
                            </p>

                            <p style={{ margin: '0 0 10px 0', textAlign: 'justify' }}>
                                QUINTA: Si pago en los plazos señalados en la cláusula cuarta y se me otorga el crédito requerido
                                para dar cumplimiento a esta oferta, solicito que la vivienda objeto de la misma me sea entregada
                                dentro de un plazo de 30 días posteriores a la fecha en que la institución haya liquidado la
                                vivienda a <strong>3 FR ESPECIALISTAS EN CONSTRUCCION S.A. DE C.V.</strong> así mismo, a partir de
                                la fecha de escrituración, me obligo a lo siguiente:
                            </p>

                            <div style={{ paddingLeft: '18px', marginBottom: '10px' }}>
                                {[
                                    ['A.', 'Pagar a la institución, en los términos del crédito contratado, las amortizaciones mensuales del mismo.'],
                                    ['B.', 'Pagar los gastos, derechos, impuestos, etc. Que se originen con motivo de la vivienda adquirida y del condominio del cual forma parte.'],
                                    ['C.', 'Pagar en caso de no haber recibido la vivienda por causas imputables a mi parte, los gastos extraordinarios por concepto de vigilancia, mantenimiento o deterioro que llegase a originar mi negativa tácita o expresa de recibirla, entendiéndose por negativa tácita, el hecho de no acudir oportunamente a recibirla no obstante de haber sido plenamente notificado.'],
                                    ['D.', 'Al cumplimiento del Régimen de Propiedad en Condómino correspondiente, así como el pago de las cuotas de mantenimiento acordadas por la asamblea de Condóminos.'],
                                ].map(([letra, texto]) => (
                                    <div
                                        key={letra}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '20px 1fr',
                                            marginBottom: '2px',
                                            textAlign: 'justify',
                                        }}
                                    >
                                        <span>{letra}</span>
                                        <span>{texto}</span>
                                    </div>
                                ))}
                            </div>

                            <p style={{ margin: '0 0 10px 0', textAlign: 'justify' }}>
                                SEXTA: Entendiendo, que, en caso de variar negativamente mis condiciones económicas y crediticias,
                                el <strong>MONTO DE CREDITO AUTORIZADO</strong>, podría disminuir o{' '}
                                <strong>NO SER AUTORIZADO.</strong>
                            </p>

                            <p style={{ margin: '0 0 12px 0', textAlign: 'justify' }}>
                                SEPTIMA: Manifiesto que la vigencia de la presente oferta es de 90 días naturales contados a
                                partir de esta fecha. En caso de requerir un plazo mayor, los solicitaré por escrito a .{' '}
                                <strong>3 FR ESPECIALISTAS EN CONSTRUCCION S.A. DE C.V.</strong> con acuse de recibo. En caso de
                                no ser aprobada la presente oferta, deslindo a{' '}
                                <strong>3 FR ESPECIALISTAS EN CONSTRUCCION S.A. DE C.V.</strong> de cualquier responsabilidad, ya
                                que estoy enterado que dicha oferta no obliga de manera alguna a la referida persona moral.
                            </p>

                            <p style={{ margin: '0 0 14px 0', textAlign: 'left' }}>
                                La presente es firmada en {lugarFirma} a{' '}
                                <HighlightWords text={fechaFirmaTexto} active={resaltarCambios} />
                            </p>

                            <div style={{ fontWeight: 'bold', fontSize: '10.5px', lineHeight: '1.45', marginBottom: 'auto' }}>
                                <div>NOMBRE: {mostrarNombrePie ? <span style={{ fontWeight: 'normal' }}>{nombresCompradoresStr}</span> : null}</div>
                                <div>DIRECCION: {direccionCliente ? <span style={{ fontWeight: 'normal' }}>{direccionCliente}</span> : null}</div>
                                <div>TELEFONO: {telefonoCliente ? <span style={{ fontWeight: 'normal' }}>{telefonoCliente}</span> : null}</div>
                                <div>CORREO: {correoCliente ? <span style={{ fontWeight: 'normal' }}>{correoCliente}</span> : null}</div>
                            </div>

                            {/* Línea de Firma al fondo de la columna derecha */}
                            <div style={{ marginTop: '70px', textAlign: 'center' }}>
                                <div
                                    style={{
                                        borderTop: '1px solid #000',
                                        width: '82%',
                                        margin: '0 auto 4px auto',
                                    }}
                                />
                                <strong style={{ fontSize: '10.2px' }}>FIRMA DEL CLIENTE</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media (max-width: 1100px) {
                    .contratos-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
