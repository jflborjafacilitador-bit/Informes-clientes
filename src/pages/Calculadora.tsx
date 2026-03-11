import { useState, useMemo } from 'react';
import { Calculator, ChevronDown } from 'lucide-react';

// ─── Datos de precios ────────────────────────────────────────────
const PRECIOS: Record<string, { modelo: string; version: string; precio: number }[]> = {
    'Manzana 2': [
        { modelo: 'QUETZAL', version: 'EQUIPADA', precio: 1587000 },
        { modelo: 'QUETZAL', version: 'EQUIPADA ELITE', precio: 1676000 },
        { modelo: 'QUETZAL', version: 'AUSTERA', precio: 1456000 },
        { modelo: 'QUETZAL', version: 'AUSTERA ELITE', precio: 1545000 },
        { modelo: 'QUETZAL PLUS', version: 'EQUIPADA', precio: 1943000 },
        { modelo: 'QUETZAL PLUS', version: 'EQUIPADA ELITE', precio: 2032000 },
        { modelo: 'QUETZAL PLUS', version: 'AUSTERA', precio: 1768000 },
        { modelo: 'QUETZAL PLUS', version: 'AUSTERA ELITE', precio: 1857000 },
    ],
    'Manzana 3': [
        { modelo: 'QUETZAL C/ROOF GARDEN', version: 'EQUIPADA', precio: 1752000 },
        { modelo: 'QUETZAL C/ROOF GARDEN', version: 'EQUIPADA ELITE', precio: 1839000 },
        { modelo: 'QUETZAL C/ROOF GARDEN', version: 'AUSTERA', precio: 1687000 },
        { modelo: 'QUETZAL C/ROOF GARDEN', version: 'AUSTERA ELITE', precio: 1774000 },
        { modelo: 'QUETZAL', version: 'EQUIPADA', precio: 1620000 },
        { modelo: 'QUETZAL', version: 'EQUIPADA ELITE', precio: 1689000 },
        { modelo: 'QUETZAL', version: 'AUSTERA', precio: 1503000 },
        { modelo: 'QUETZAL', version: 'AUSTERA ELITE', precio: 1590000 },
        { modelo: 'QUETZAL PLUS', version: 'EQUIPADA', precio: 1966000 },
        { modelo: 'QUETZAL PLUS', version: 'EQUIPADA ELITE', precio: 2053000 },
        { modelo: 'QUETZAL PLUS', version: 'AUSTERA', precio: 1807000 },
        { modelo: 'QUETZAL PLUS', version: 'AUSTERA ELITE', precio: 1895000 },
        { modelo: 'QUETZAL PLUS F.A.', version: 'EQUIPADA', precio: 1976000 },
        { modelo: 'QUETZAL PLUS F.A.', version: 'EQUIPADA ELITE', precio: 2083000 },
        { modelo: 'QUETZAL PLUS F.A.', version: 'AUSTERA', precio: 1837000 },
        { modelo: 'QUETZAL PLUS F.A.', version: 'AUSTERA ELITE', precio: 1925000 },
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

const num = (v: string) => parseFloat(v.replace(/,/g, '')) || 0;

const Field = ({
    label, value, onChange, readOnly = false,
}: {
    label: string; value: string; onChange?: (v: string) => void; readOnly?: boolean;
}) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
        </label>
        <input
            type="text"
            readOnly={readOnly}
            value={value}
            onChange={e => onChange?.(e.target.value)}
            style={{
                background: readOnly ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${readOnly ? 'rgba(34,197,94,0.2)' : 'var(--border-glass)'}`,
                borderRadius: 8,
                padding: '10px 14px',
                color: readOnly ? 'var(--primary-accent)' : 'var(--text-main)',
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                width: '100%',
                outline: 'none',
                cursor: readOnly ? 'default' : 'text',
                transition: 'border-color 0.2s',
            }}
            onFocus={e => { if (!readOnly) e.target.style.borderColor = 'rgba(34,197,94,0.5)'; }}
            onBlur={e => { if (!readOnly) e.target.style.borderColor = 'var(--border-glass)'; }}
        />
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
                    background: 'rgba(255,255,255,0.04)',
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

// ─── Componente principal ─────────────────────────────────────────
export default function Calculadora() {
    const [manzana, setManzana] = useState('');
    const [modelo, setModelo] = useState('');
    const [version, setVersion] = useState('');
    const [tipo, setTipo] = useState<TipoCredito | ''>('');

    // Campos editables
    const [gastosNot, setGastosNot] = useState('');
    const [credito, setCredito] = useState('');
    const [subcuenta, setSubcuenta] = useState('');
    const [creditoBanco, setCreditoBanco] = useState('');
    const [creditoFoviss, setCreditoFoviss] = useState('');
    const [apartado, setApartado] = useState('');
    const [descuento, setDescuento] = useState('');

    // Listas derivadas
    const modelos = useMemo(() =>
        manzana ? [...new Set(PRECIOS[manzana].map(r => r.modelo))] : [], [manzana]);

    const versiones = useMemo(() =>
        (manzana && modelo) ? PRECIOS[manzana].filter(r => r.modelo === modelo).map(r => r.version) : [], [manzana, modelo]);

    const precioBase = useMemo(() => {
        if (!manzana || !modelo || !version) return 0;
        return PRECIOS[manzana].find(r => r.modelo === modelo && r.version === version)?.precio ?? 0;
    }, [manzana, modelo, version]);

    // Calcular resultado
    const resultado = useMemo(() => {
        if (!tipo || !precioBase) return null;
        const pv = precioBase - num(descuento);
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
            diferencia = pv - apt;
            desglose = [
                { label: 'Valor Vivienda', monto: pv },
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

        return { diferencia, desglose, total };
    }, [tipo, precioBase, descuento, gastosNot, credito, subcuenta, creditoBanco, creditoFoviss, apartado]);

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
    };

    // Campos visibles según tipo
    const showGN = tipo && tipo !== 'CFE';
    const showCredito = tipo && ['INFONAVIT', 'FOVISSSTE', 'COFINAVIT', 'FOVISSSTE_INFONAVIT'].includes(tipo);
    const showSubcuenta = tipo && ['INFONAVIT', 'COFINAVIT', 'FOVISSSTE_INFONAVIT'].includes(tipo);
    const showBanco = tipo && ['BANCARIO', 'COFINAVIT'].includes(tipo);
    const showFoviss = tipo === 'FOVISSSTE_INFONAVIT';

    const panelStyle: React.CSSProperties = {
        background: 'rgba(15,25,20,0.65)',
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Encabezado */}
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
                        Residencial Los Quetzales — Calcula la diferencia final por tipo de crédito
                    </p>
                </div>
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

                {/* Precio base */}
                {precioBase > 0 && (
                    <div style={{
                        marginTop: '1rem', padding: '1rem', borderRadius: 12,
                        background: 'rgba(34,197,94,0.07)',
                        border: '1px solid rgba(34,197,94,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
                    }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Precio de Lista 2026</span>
                        <span style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary-accent)' }} className="glow-text">
                            {fmt(precioBase)}
                        </span>
                    </div>
                )}
            </div>

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
                                    background: tipo === t.value ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.02)',
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
                        <Field label="Precio de Venta" value={fmt(precioBase)} readOnly />
                        <Field label="Descuento (opcional)" value={descuento} onChange={setDescuento} />
                        {showGN && <Field label="Gastos Notariales" value={gastosNot} onChange={setGastosNot} />}
                        {showCredito && (
                            <Field
                                label={tipo === 'FOVISSSTE' ? 'Crédito FOVISSSTE' : tipo === 'COFINAVIT' || tipo === 'FOVISSSTE_INFONAVIT' ? 'Crédito INFONAVIT' : 'Crédito'}
                                value={credito} onChange={setCredito}
                            />
                        )}
                        {showSubcuenta && <Field label="Subcuenta Vivienda" value={subcuenta} onChange={setSubcuenta} />}
                        {showBanco && <Field label="Crédito Bancario" value={creditoBanco} onChange={setCreditoBanco} />}
                        {showFoviss && <Field label="Crédito FOVISSSTE" value={creditoFoviss} onChange={setCreditoFoviss} />}
                        <Field label="Apartado" value={apartado} onChange={setApartado} />
                    </div>
                </div>
            )}

            {/* Resultado */}
            {resultado && (
                <div style={{ ...panelStyle, border: resultado.diferencia >= 0 ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(239,68,68,0.4)' }}>
                    <h2 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        4 · Resultado
                    </h2>

                    {/* Desglose */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1.25rem' }}>
                        {resultado.desglose.map((d, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 12px', borderRadius: 8,
                                background: 'rgba(255,255,255,0.02)',
                                borderBottom: i < resultado.desglose.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
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
                        background: resultado.diferencia >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${resultado.diferencia >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                    }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>DIFERENCIA FINAL</div>
                            <div style={{ fontSize: '0.8rem', color: resultado.diferencia >= 0 ? 'var(--primary-accent)' : 'var(--danger)' }}>
                                {resultado.diferencia >= 0 ? '✓ Saldo a favor del cliente' : '⚠ Monto adicional requerido'}
                            </div>
                        </div>
                        <div style={{
                            fontSize: '2rem', fontWeight: 800,
                            color: resultado.diferencia >= 0 ? 'var(--primary-accent)' : 'var(--danger)',
                        }} className="glow-text">
                            {resultado.diferencia >= 0 ? '+' : ''}{fmt(resultado.diferencia)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
