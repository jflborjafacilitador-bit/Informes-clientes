import { useState, useEffect, useCallback } from 'react';
import { Building2, RefreshCw, Home, CheckCircle, Clock, XCircle, Zap, Save } from 'lucide-react';
import { fetchInventario, type InventarioItem } from '../services/inventarioService';
import {
    fetchEstatusOverrides,
    upsertEstatus,
    casaKey,
    resolveEstatus,
    type EstatusManual,
} from '../services/inventarioEstatusService';
import { useAuth } from '../contexts/AuthContext';
import MapEditor from '../components/MapEditor';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ESTATUS_CONFIG: Record<EstatusManual, { label: string; color: string; bg: string; border: string; dot: string }> = {
    DISPONIBLE: {
        label: '● DISPONIBLE',
        color: '#22c55e',
        bg: 'rgba(34,197,94,0.12)',
        border: 'rgba(34,197,94,0.3)',
        dot: '🟢',
    },
    EN_PROCESO: {
        label: '● EN PROCESO',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.12)',
        border: 'rgba(245,158,11,0.3)',
        dot: '🟡',
    },
    VENDIDA: {
        label: '● VENDIDA',
        color: '#ef4444',
        bg: 'rgba(239,68,68,0.10)',
        border: 'rgba(239,68,68,0.25)',
        dot: '🔴',
    },
};


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
function EstatusBadge({ estatus }: { estatus: EstatusManual }) {
    const cfg = ESTATUS_CONFIG[estatus] ?? ESTATUS_CONFIG.DISPONIBLE;
    return (
        <span style={{
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '0.72rem',
            fontWeight: '700',
            background: cfg.bg,
            color: cfg.color,
            border: `1px solid ${cfg.border}`,
            whiteSpace: 'nowrap',
        }}>
            {cfg.label}
        </span>
    );
}

// ─── Selector de estatus ──────────────────────────────────────────────────────
function EstatusSelector({
    mza, casa, condominio, current, userId, onChanged,
}: {
    mza: string; casa: string; condominio: string;
    current: EstatusManual; userId: string;
    onChanged: (key: string, newEstatus: EstatusManual) => void;
}) {
    const [saving, setSaving] = useState(false);
    const [local, setLocal] = useState<EstatusManual>(current);

    // sincronizar si el prop cambia (ej. recarga)
    useEffect(() => { setLocal(current); }, [current]);

    const handleChange = async (val: EstatusManual) => {
        setLocal(val);
        setSaving(true);
        try {
            await upsertEstatus(mza, casa, condominio, val, userId);
            onChanged(casaKey(mza, casa), val);
        } catch {
            setLocal(current); // revertir en error
        } finally {
            setSaving(false);
        }
    };

    const cfg = ESTATUS_CONFIG[local];

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <select
                value={local}
                onChange={e => handleChange(e.target.value as EstatusManual)}
                disabled={saving}
                style={{
                    padding: '4px 8px',
                    borderRadius: '20px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    background: cfg.bg,
                    color: cfg.color,
                    border: `1px solid ${cfg.border}`,
                    outline: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                    transition: 'all 0.2s',
                    fontFamily: 'inherit',
                }}
            >
                <option value="DISPONIBLE">🟢 Disponible</option>
                <option value="EN_PROCESO">🟡 En Proceso</option>
                <option value="VENDIDA">🔴 Vendida</option>
            </select>
            {saving && <Save size={12} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ALL_STATUSES: EstatusManual[] = ['DISPONIBLE', 'EN_PROCESO', 'VENDIDA'];

export default function Inventario() {
    const { user, isReadonly } = useAuth();
    const [items, setItems] = useState<InventarioItem[]>([]);
    const [overrides, setOverrides] = useState<Map<string, EstatusManual>>(new Map());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros y Vistas
    const [vista, setVista] = useState<'lista' | 'plano_mza3' | 'plano_mza2'>('lista');
    const [filtroCondominio, setFiltroCondominio] = useState('Todos');
    const [filtroEstatus, setFiltroEstatus] = useState('Todos');

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [data, ovr] = await Promise.all([fetchInventario(), fetchEstatusOverrides()]);
            setItems(data);
            setOverrides(ovr);
        } catch {
            setError('No se pudo cargar el inventario. Verifica tu conexión.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);



    /** Callback cuando el usuario cambia el estatus de una casa */
    const handleEstatusChanged = (key: string, newEstatus: EstatusManual) => {
        setOverrides(prev => {
            const next = new Map(prev);
            next.set(key, newEstatus);
            return next;
        });
    };

    // ── Valores únicos para filtros ──
    const condominios = ['Todos', ...Array.from(new Set(items.map(i => i.condominio).filter(Boolean)))];

    // ── Filtrado ──
    const filtered = items.filter(item => {
        const condOk = filtroCondominio === 'Todos' || item.condominio === filtroCondominio;
        const est = resolveEstatus(item.mza, item.casa, item.estatus, overrides);
        const estatusOk = filtroEstatus === 'Todos' || est === filtroEstatus;
        return condOk && estatusOk;
    });

    // ── Métricas ──
    const total = items.length;
    const disponibles = items.filter(i => resolveEstatus(i.mza, i.casa, i.estatus, overrides) === 'DISPONIBLE').length;
    const enProceso = items.filter(i => resolveEstatus(i.mza, i.casa, i.estatus, overrides) === 'EN_PROCESO').length;
    const vendidas = items.filter(i => resolveEstatus(i.mza, i.casa, i.estatus, overrides) === 'VENDIDA').length;
    const inmediatas = items.filter(
        i => resolveEstatus(i.mza, i.casa, i.estatus, overrides) === 'DISPONIBLE' &&
            i.fechaEscrituracion.toUpperCase() === 'INMEDIATA'
    ).length;

    // ── Precomputar Mapas de Datos para MapEditor ──
    const itemsDataMap = new Map<string, any>();
    const statusesMap = new Map<string, EstatusManual>();
    items.forEach(item => {
        const k = casaKey(item.mza, item.casa);
        itemsDataMap.set(k, item);
        statusesMap.set(k, resolveEstatus(item.mza, item.casa, item.estatus, overrides));
    });

    // ── Filtro button style ──
    const btnStyle = (active: boolean, activeColor = 'var(--primary-accent)'): React.CSSProperties => ({
        padding: '6px 14px',
        borderRadius: '20px',
        border: `1px solid ${active ? activeColor : 'var(--border-glass)'}`,
        background: active ? `${activeColor}1a` : 'transparent',
        color: active ? activeColor : 'var(--text-muted)',
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
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Disponibilidad en tiempo real desde Google Sheets. Los cambios de estatus se guardan en la nube.</p>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '18px', marginBottom: '24px' }}>
                <StatCard title="Total Casas" value={loading ? '...' : total} icon={Home} color="#00f0ff" subtitle="En el inventario" />
                <StatCard title="Disponibles" value={loading ? '...' : disponibles} icon={CheckCircle} color="#22c55e" subtitle="Listas para venta" />
                <StatCard title="En Proceso" value={loading ? '...' : enProceso} icon={Clock} color="#f59e0b" subtitle="En trámite de compra" />
                <StatCard title="Vendidas" value={loading ? '...' : vendidas} icon={XCircle} color="#ef4444" subtitle="Concluidas" />
                <StatCard title="Entrega Inmediata" value={loading ? '...' : inmediatas} icon={Zap} color="#a855f7" subtitle="Escrituración inmediata" />
            </div>

            {/* Barra de progreso visual */}
            {!loading && total > 0 && (
                <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.82rem', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ color: '#22c55e', fontWeight: '600' }}>🟢 {disponibles} Disponibles</span>
                        <span style={{ color: '#f59e0b', fontWeight: '600' }}>🟡 {enProceso} En Proceso</span>
                        <span style={{ color: '#ef4444', fontWeight: '600' }}>🔴 {vendidas} Vendidas</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                        <div style={{ height: '100%', width: `${(disponibles / total) * 100}%`, background: 'linear-gradient(90deg, #22c55e, #10b981)', transition: 'width 0.8s ease' }} />
                        <div style={{ height: '100%', width: `${(enProceso / total) * 100}%`, background: 'linear-gradient(90deg, #f59e0b, #d97706)', transition: 'width 0.8s ease' }} />
                        <div style={{ height: '100%', width: `${(vendidas / total) * 100}%`, background: 'linear-gradient(90deg, #ef4444, #dc2626)', transition: 'width 0.8s ease' }} />
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
                            <button key={c} onClick={() => setFiltroCondominio(c)} style={btnStyle(filtroCondominio === c)}>{c}</button>
                        ))}
                    </div>
                    <div style={{ width: '1px', height: '20px', background: 'var(--border-glass)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', flexShrink: 0 }}>Estatus:</span>
                        <button onClick={() => setFiltroEstatus('Todos')} style={btnStyle(filtroEstatus === 'Todos')}>Todos</button>
                        {ALL_STATUSES.map(s => {
                            const cfg = ESTATUS_CONFIG[s];
                            return (
                                <button
                                    key={s}
                                    onClick={() => setFiltroEstatus(s)}
                                    style={btnStyle(filtroEstatus === s, cfg.color)}
                                >
                                    {cfg.dot} {s === 'EN_PROCESO' ? 'En Proceso' : s === 'VENDIDA' ? 'Vendida' : 'Disponible'}
                                </button>
                            );
                        })}
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Selector de Vistas Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
                <button
                    onClick={() => setVista('lista')}
                    style={{
                        padding: '8px 16px', borderRadius: '8px',
                        background: vista === 'lista' ? 'var(--primary-accent)' : 'transparent',
                        color: vista === 'lista' ? '#000' : 'var(--text-muted)',
                        border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    Vista Lista (General)
                </button>
                <button
                    onClick={() => setVista('plano_mza3')}
                    style={{
                        padding: '8px 16px', borderRadius: '8px',
                        background: vista === 'plano_mza3' ? 'var(--primary-accent)' : 'transparent',
                        color: vista === 'plano_mza3' ? '#000' : 'var(--text-muted)',
                        border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    Plano Manzana 3
                </button>
                <button
                    onClick={() => setVista('plano_mza2')}
                    style={{
                        padding: '8px 16px', borderRadius: '8px',
                        background: vista === 'plano_mza2' ? 'var(--primary-accent)' : 'transparent',
                        color: vista === 'plano_mza2' ? '#000' : 'var(--text-muted)',
                        border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                >
                    Plano Manzana 2
                </button>
            </div>

            {/* Renderizado Condicional Lista vs Plano */}
            {vista === 'lista' ? (
                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                            Cargando inventario...
                        </div>
                    ) : error ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>⚠️ {error}</div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Sin resultados con los filtros actuales.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-glass)' }}>
                                        {['Mza', 'Casa', 'Condominio', 'Prototipo', 'DTU', 'M2 Constr.', 'M2 Terreno', 'Esquema de Venta', 'Estatus', 'Escrituración', 'Marcar Estatus'].map(h => (
                                            <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((item, idx) => {
                                        const effectiveEstatus = resolveEstatus(item.mza, item.casa, item.estatus, overrides);
                                        return (
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
                                                    <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', background: 'rgba(0,240,255,0.07)', color: 'var(--primary-accent)' }}>
                                                        {item.prototipo}
                                                    </span>
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
                                                    <EstatusBadge estatus={effectiveEstatus} />
                                                </td>
                                                <td style={{
                                                    padding: '12px 16px',
                                                    color: item.fechaEscrituracion.toUpperCase() === 'INMEDIATA' ? '#f59e0b' : 'var(--text-muted)',
                                                    fontWeight: item.fechaEscrituracion.toUpperCase() === 'INMEDIATA' ? '600' : '400',
                                                }}>
                                                    {item.fechaEscrituracion}
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    {user && !isReadonly ? (
                                                        <EstatusSelector
                                                            mza={item.mza}
                                                            casa={item.casa}
                                                            condominio={item.condominio}
                                                            current={effectiveEstatus}
                                                            userId={user.id}
                                                            onChanged={handleEstatusChanged}
                                                        />
                                                    ) : (
                                                        <EstatusBadge estatus={effectiveEstatus} />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : vista === 'plano_mza3' ? (
                <div style={{ height: '70vh', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }} className="glass-panel">
                            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                            Cargando plano e inventario...
                        </div>
                    ) : (
                        <MapEditor 
                            key="mza3"
                            condominio="Manzana 3" 
                            imageUrl="/Planos/plano manzana 3 2.1.jpeg" 

                            houseStatuses={statusesMap}
                            itemsData={itemsDataMap}
                        />
                    )}
                </div>
            ) : vista === 'plano_mza2' ? (
                <div style={{ height: '70vh', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }} className="glass-panel">
                            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                            Cargando plano e inventario...
                        </div>
                    ) : (
                        <MapEditor 
                            key="mza2"
                            condominio="Manzana 2" 
                            imageUrl="/Planos/CONDOMINIO 2 TUCAN.png" 
                            houseStatuses={statusesMap}
                            itemsData={itemsDataMap}
                        />
                    )}
                </div>
            ) : null}

            {/* Keyframes */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
