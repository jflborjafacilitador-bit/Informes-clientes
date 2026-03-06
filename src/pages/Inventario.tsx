import { useState, useEffect } from 'react';
import { Building2, RefreshCw, Home, CheckCircle, XCircle, Zap } from 'lucide-react';
import { fetchInventario, type InventarioItem } from '../services/inventarioService';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
            position: 'absolute', top: '-20px', right: '-20px',
            width: '90px', height: '90px',
            background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
            borderRadius: '50%',
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '6px' }}>{title}</p>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}
                    className="glow-text">{value}</h3>
                {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '5px' }}>{subtitle}</p>}
            </div>
            <div style={{
                background: `${color}22`, color,
                padding: '10px', borderRadius: '10px',
                boxShadow: `0 0 14px ${color}44`,
            }}>
                <Icon size={22} />
            </div>
        </div>
    </div>
);

// ─── Badge de estatus ─────────────────────────────────────────────────────────
function EstatusBadge({ estatus }: { estatus: string }) {
    const isDisponible = estatus === 'DISPONIBLE' || estatus === 'DUSPONIBLE'; // typo in sheet
    return (
        <span style={{
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '0.72rem',
            fontWeight: '700',
            background: isDisponible ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.10)',
            color: isDisponible ? '#22c55e' : '#ef4444',
            border: `1px solid ${isDisponible ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.25)'}`,
            whiteSpace: 'nowrap',
        }}>
            {isDisponible ? '● DISPONIBLE' : '● NO DISPONIBLE'}
        </span>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Inventario() {
    const [items, setItems] = useState<InventarioItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [filtroCondominio, setFiltroCondominio] = useState('Todos');
    const [filtroEstatus, setFiltroEstatus] = useState('Todos');

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchInventario();
            setItems(data);
        } catch (e) {
            setError('No se pudo cargar el inventario. Verifica tu conexión.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    // ── Valores únicos para filtros ──
    const condominios = ['Todos', ...Array.from(new Set(items.map(i => i.condominio).filter(Boolean)))];

    // ── Filtrado ──
    const filtered = items.filter(item => {
        const condOk = filtroCondominio === 'Todos' || item.condominio === filtroCondominio;
        const isDisponible = item.estatus === 'DISPONIBLE' || item.estatus === 'DUSPONIBLE';
        const estatusOk =
            filtroEstatus === 'Todos' ||
            (filtroEstatus === 'DISPONIBLE' && isDisponible) ||
            (filtroEstatus === 'NO DISPONIBLE' && !isDisponible);
        return condOk && estatusOk;
    });

    // ── Métricas ──
    const total = items.length;
    const disponibles = items.filter(i => i.estatus === 'DISPONIBLE' || i.estatus === 'DUSPONIBLE').length;
    const noDisponibles = total - disponibles;
    const inmediatas = items.filter(
        i => (i.estatus === 'DISPONIBLE' || i.estatus === 'DUSPONIBLE') &&
            i.fechaEscrituracion.toUpperCase() === 'INMEDIATA'
    ).length;

    // ── Filtro button style ──
    const btnStyle = (active: boolean): React.CSSProperties => ({
        padding: '6px 14px',
        borderRadius: '20px',
        border: `1px solid ${active ? 'var(--primary-accent)' : 'var(--border-glass)'}`,
        background: active ? 'rgba(34,197,94,0.1)' : 'transparent',
        color: active ? 'var(--primary-accent)' : 'var(--text-muted)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: '0.82rem',
        fontWeight: active ? '700' : '400',
        transition: 'all 0.2s',
    });

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>
                        Inventario <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>de Casas</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Disponibilidad en tiempo real desde Google Sheets.</p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '10px 18px', borderRadius: '10px',
                        background: 'rgba(34,197,94,0.1)',
                        border: '1px solid var(--primary-accent)',
                        color: 'var(--primary-accent)',
                        cursor: loading ? 'default' : 'pointer',
                        fontFamily: 'inherit', fontSize: '0.85rem',
                        transition: 'all 0.2s',
                        opacity: loading ? 0.6 : 1,
                    }}
                >
                    <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    Actualizar
                </button>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', marginBottom: '24px' }}>
                <StatCard title="Total Casas" value={loading ? '...' : total} icon={Home} color="#00f0ff" subtitle="En el inventario" />
                <StatCard title="Disponibles" value={loading ? '...' : disponibles} icon={CheckCircle} color="#22c55e" subtitle="Listas para venta" />
                <StatCard title="No Disponibles" value={loading ? '...' : noDisponibles} icon={XCircle} color="#ef4444" subtitle="En proceso / vendidas" />
                <StatCard title="Entrega Inmediata" value={loading ? '...' : inmediatas} icon={Zap} color="#f59e0b" subtitle="Escrituración inmediata" />
            </div>

            {/* Barra de progreso visual */}
            {!loading && total > 0 && (
                <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem' }}>
                        <span style={{ color: '#22c55e', fontWeight: '600' }}>🟢 {disponibles} Disponibles</span>
                        <span style={{ color: 'var(--text-muted)' }}>{Math.round((disponibles / total) * 100)}% disponible</span>
                        <span style={{ color: '#ef4444', fontWeight: '600' }}>🔴 {noDisponibles} No disponibles</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${(disponibles / total) * 100}%`,
                            background: 'linear-gradient(90deg, #22c55e, #10b981)',
                            borderRadius: '6px',
                            transition: 'width 0.8s ease',
                        }} />
                    </div>
                </div>
            )}

            {/* Filtros */}
            <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Building2 size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', flexShrink: 0 }}>Condominio:</span>
                        {condominios.map(c => (
                            <button
                                key={c}
                                onClick={() => setFiltroCondominio(c)}
                                style={btnStyle(filtroCondominio === c)}
                            >{c}</button>
                        ))}
                    </div>
                    <div style={{ width: '1px', height: '20px', background: 'var(--border-glass)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', flexShrink: 0 }}>Estatus:</span>
                        {['Todos', 'DISPONIBLE', 'NO DISPONIBLE'].map(s => (
                            <button
                                key={s}
                                onClick={() => setFiltroEstatus(s)}
                                style={{
                                    ...btnStyle(filtroEstatus === s),
                                    ...(s === 'DISPONIBLE' && filtroEstatus === s ? { color: '#22c55e', borderColor: '#22c55e', background: 'rgba(34,197,94,0.1)' } : {}),
                                    ...(s === 'NO DISPONIBLE' && filtroEstatus === s ? { color: '#ef4444', borderColor: '#ef4444', background: 'rgba(239,68,68,0.1)' } : {}),
                                }}
                            >{s}</button>
                        ))}
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Tabla */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                        Cargando inventario...
                    </div>
                ) : error ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>
                        ⚠️ {error}
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Sin resultados con los filtros actuales.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-glass)' }}>
                                    {['Mza', 'Casa', 'Condominio', 'Prototipo', 'DTU', 'M2 Constr.', 'M2 Terreno', 'Esquema de Venta', 'Estatus', 'Escrituración'].map(h => (
                                        <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((item, idx) => (
                                    <tr key={`${item.mza}-${item.casa}-${idx}`}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(34,197,94,0.04)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)')}
                                    >
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{item.mza}</td>
                                        <td style={{ padding: '12px 16px', fontWeight: '600' }}>{item.casa}</td>
                                        <td style={{ padding: '12px 16px' }}>{item.condominio}</td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem',
                                                background: 'rgba(0,240,255,0.07)', color: 'var(--primary-accent)',
                                            }}>{item.prototipo}</span>
                                        </td>
                                        <td style={{ padding: '12px 16px', color: item.dtu === 'Si' ? '#22c55e' : 'var(--text-muted)' }}>
                                            {item.dtu === 'Si' ? '✓ Listo' : item.fechaDtu}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{item.m2Construccion}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{item.m2Terreno}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '0.75rem', maxWidth: '180px' }}>
                                            {item.esquemaVenta}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <EstatusBadge estatus={item.estatus} />
                                        </td>
                                        <td style={{ padding: '12px 16px', color: item.fechaEscrituracion.toUpperCase() === 'INMEDIATA' ? '#f59e0b' : 'var(--text-muted)', fontWeight: item.fechaEscrituracion.toUpperCase() === 'INMEDIATA' ? '600' : '400' }}>
                                            {item.fechaEscrituracion}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Spinner keyframe */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
