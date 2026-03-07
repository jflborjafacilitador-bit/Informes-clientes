import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Tag, AlignLeft } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface Evento {
    id: string;
    titulo: string;
    descripcion: string | null;
    fecha: string;         // 'YYYY-MM-DD'
    hora_inicio: string | null;
    hora_fin: string | null;
    tipo: string;
    created_by: string | null;
}

const TIPO_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
    cita: { color: '#22c55e', bg: 'rgba(34,197,94,0.15)', label: 'Cita' },
    visita: { color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', label: 'Visita' },
    evento: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Evento' },
    otro: { color: '#a855f7', bg: 'rgba(168,85,247,0.15)', label: 'Otro' },
};

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

type ModalState = { mode: 'new'; fecha: string } | { mode: 'view'; evento: Evento } | null;

export default function Calendario() {
    const { session } = useAuth();
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoy] = useState(new Date());
    const [viewYear, setViewYear] = useState(hoy.getFullYear());
    const [viewMonth, setViewMonth] = useState(hoy.getMonth());
    const [modal, setModal] = useState<ModalState>(null);
    const [form, setForm] = useState({ titulo: '', descripcion: '', hora_inicio: '', hora_fin: '', tipo: 'cita' });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        const { data } = await supabase.from('eventos').select('*').order('fecha').order('hora_inicio');
        if (data) setEventos(data);
        setLoading(false);
    };

    useEffect(() => {
        load();
        const ch = supabase.channel('eventos_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' }, load)
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, []);

    // ── Navegación de mes ──
    const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
    const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

    // ── Grid del mes ──
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    const eventosDelDia = (day: number) => {
        const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return eventos.filter(e => e.fecha === key);
    };

    const isToday = (day: number) =>
        day === hoy.getDate() && viewMonth === hoy.getMonth() && viewYear === hoy.getFullYear();

    // ── Guardar evento ──
    const handleSave = async () => {
        if (!form.titulo.trim() || modal?.mode !== 'new') return;
        setSaving(true);
        await supabase.from('eventos').insert({
            titulo: form.titulo.trim(),
            descripcion: form.descripcion || null,
            fecha: modal.fecha,
            hora_inicio: form.hora_inicio || null,
            hora_fin: form.hora_fin || null,
            tipo: form.tipo,
            created_by: session?.user?.email || null,
        });
        setForm({ titulo: '', descripcion: '', hora_inicio: '', hora_fin: '', tipo: 'cita' });
        setModal(null);
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        await supabase.from('eventos').delete().eq('id', id);
        setEventos(prev => prev.filter(e => e.id !== id));
        setModal(null);
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '9px 12px', borderRadius: '8px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)',
        color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit', fontSize: '0.88rem',
        boxSizing: 'border-box',
    };

    // ── Lista de próximos eventos ──
    const hoyStr = hoy.toISOString().slice(0, 10);
    const proximos = eventos.filter(e => e.fecha >= hoyStr).slice(0, 8);

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>
                        Calendario <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>de Eventos</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Gestión de citas, visitas y eventos del equipo.</p>
                </div>
                <button onClick={() => { setForm({ titulo: '', descripcion: '', hora_inicio: '', hora_fin: '', tipo: 'cita' }); setModal({ mode: 'new', fecha: hoyStr }); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--primary-accent)', color: 'var(--primary-accent)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}>
                    <Plus size={18} /> Agregar Evento
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }}>

                {/* ── Calendario grid ── */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    {/* Nav mes */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <button onClick={prevMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}><ChevronLeft size={20} /></button>
                        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{MESES[viewMonth]} {viewYear}</h2>
                        <button onClick={nextMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}><ChevronRight size={20} /></button>
                    </div>

                    {/* Días de semana */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                        {DIAS_SEMANA.map(d => (
                            <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600', padding: '4px 0' }}>{d}</div>
                        ))}
                    </div>

                    {/* Celdas */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                        {cells.map((day, idx) => {
                            if (!day) return <div key={idx} />;
                            const evs = eventosDelDia(day);
                            const today = isToday(day);
                            const fechaDia = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            return (
                                <div key={idx}
                                    onClick={() => { setForm({ titulo: '', descripcion: '', hora_inicio: '', hora_fin: '', tipo: 'cita' }); setModal({ mode: 'new', fecha: fechaDia }); }}
                                    style={{
                                        minHeight: '72px', padding: '6px', borderRadius: '8px', cursor: 'pointer',
                                        background: today ? 'rgba(34,197,94,0.08)' : evs.length ? 'rgba(56,189,248,0.04)' : 'transparent',
                                        border: today ? '1px solid rgba(34,197,94,0.4)' : '1px solid transparent',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = today ? 'rgba(34,197,94,0.08)' : evs.length ? 'rgba(56,189,248,0.04)' : 'transparent')}
                                >
                                    <div style={{ fontSize: '0.8rem', fontWeight: today ? '700' : '400', color: today ? 'var(--primary-accent)' : 'var(--text-main)', marginBottom: '4px' }}>{day}</div>
                                    {evs.slice(0, 3).map(ev => {
                                        const cfg = TIPO_CONFIG[ev.tipo] || TIPO_CONFIG.otro;
                                        return (
                                            <div key={ev.id}
                                                onClick={e => { e.stopPropagation(); setModal({ mode: 'view', evento: ev }); }}
                                                style={{ fontSize: '0.62rem', fontWeight: '600', padding: '1px 5px', borderRadius: '4px', marginBottom: '2px', background: cfg.bg, color: cfg.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {ev.titulo}
                                            </div>
                                        );
                                    })}
                                    {evs.length > 3 && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+{evs.length - 3} más</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Panel próximos eventos ── */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem' }}>📅 Próximos eventos</h3>
                    {loading ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando...</p>
                        : proximos.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin eventos próximos.</p>
                            : proximos.map(ev => {
                                const cfg = TIPO_CONFIG[ev.tipo] || TIPO_CONFIG.otro;
                                return (
                                    <div key={ev.id} onClick={() => setModal({ mode: 'view', evento: ev })}
                                        style={{ padding: '10px 12px', borderRadius: '8px', marginBottom: '8px', background: cfg.bg, border: `1px solid ${cfg.color}33`, cursor: 'pointer' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: cfg.color }}>{ev.titulo}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            {ev.fecha} {ev.hora_inicio ? `· ${ev.hora_inicio.slice(0, 5)}` : ''}
                                        </div>
                                    </div>
                                );
                            })}
                </div>
            </div>

            {/* ── Modal ── */}
            {modal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                    onClick={() => setModal(null)}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', position: 'relative' }}
                        onClick={e => e.stopPropagation()}>
                        <button onClick={() => setModal(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        {modal.mode === 'new' ? (
                            <>
                                <h3 style={{ margin: '0 0 6px' }}>Nuevo Evento</h3>
                                <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: 'var(--primary-accent)' }}>{modal.fecha}</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <input placeholder="Título del evento *" value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} style={inputStyle} />
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}><Clock size={12} /> Inicio</label>
                                            <input type="time" value={form.hora_inicio} onChange={e => setForm(p => ({ ...p, hora_inicio: e.target.value }))} style={inputStyle} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}><Clock size={12} /> Fin</label>
                                            <input type="time" value={form.hora_fin} onChange={e => setForm(p => ({ ...p, hora_fin: e.target.value }))} style={inputStyle} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}><Tag size={12} /> Tipo</label>
                                        <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} style={{ ...inputStyle }}>
                                            {Object.entries(TIPO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px' }}><AlignLeft size={12} /> Descripción</label>
                                        <textarea rows={3} placeholder="Notas adicionales..." value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
                                    </div>
                                    <button onClick={handleSave} disabled={saving || !form.titulo.trim()} style={{ padding: '11px', borderRadius: '8px', background: 'var(--primary-accent)', border: 'none', color: '#000', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: !form.titulo.trim() ? 0.5 : 1 }}>
                                        {saving ? 'Guardando...' : 'Guardar Evento'}
                                    </button>
                                </div>
                            </>
                        ) : (
                            (() => {
                                const ev = modal.evento;
                                const cfg = TIPO_CONFIG[ev.tipo] || TIPO_CONFIG.otro;
                                return (
                                    <>
                                        <div style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '20px', background: cfg.bg, color: cfg.color, fontSize: '0.75rem', fontWeight: '600', marginBottom: '10px' }}>{cfg.label}</div>
                                        <h3 style={{ margin: '0 0 6px', fontSize: '1.3rem' }}>{ev.titulo}</h3>
                                        <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                            📅 {ev.fecha}{ev.hora_inicio ? ` · ${ev.hora_inicio.slice(0, 5)}${ev.hora_fin ? ` – ${ev.hora_fin.slice(0, 5)}` : ''}` : ''}
                                        </p>
                                        {ev.descripcion && <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '16px', lineHeight: 1.6 }}>{ev.descripcion}</p>}
                                        {ev.created_by && <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Creado por {ev.created_by.split('@')[0]}</p>}
                                        <button onClick={() => handleDelete(ev.id)} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
                                            Eliminar evento
                                        </button>
                                    </>
                                );
                            })()
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
