import { useState, useEffect } from 'react';
import {
    ChevronLeft, ChevronRight, Plus, X, Clock, Tag,
    AlignLeft, CalendarDays, MapPin, User, Phone,
    CheckCircle, Edit2, Trash2,
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// ─── Tipos ────────────────────────────────────────────────
interface Evento {
    id: string;
    titulo: string;
    descripcion: string | null;
    fecha: string;
    hora_inicio: string | null;
    hora_fin: string | null;
    tipo: string;
    estado: 'pendiente' | 'confirmada' | 'realizada' | 'cancelada';
    cliente_nombre: string | null;
    cliente_tel: string | null;
    ubicacion: string | null;
    created_by: string | null;
}

interface FormState {
    titulo: string;
    descripcion: string;
    hora_inicio: string;
    hora_fin: string;
    tipo: string;
    estado: string;
    cliente_nombre: string;
    cliente_tel: string;
    ubicacion: string;
}

const FORM_VACIO: FormState = {
    titulo: '', descripcion: '', hora_inicio: '', hora_fin: '',
    tipo: 'cita', estado: 'pendiente',
    cliente_nombre: '', cliente_tel: '', ubicacion: '',
};

// ─── Paletas ──────────────────────────────────────────────
const TIPO_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
    cita:   { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   label: 'Cita' },
    visita: { color: '#38bdf8', bg: 'rgba(56,189,248,0.15)',  label: 'Visita' },
    evento: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  label: 'Evento' },
    otro:   { color: '#a855f7', bg: 'rgba(168,85,247,0.15)',  label: 'Otro' },
};

const ESTADO_CONFIG: Record<string, { color: string; bg: string; label: string; dot: string }> = {
    pendiente:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'Pendiente',  dot: '#f59e0b' },
    confirmada: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   label: 'Confirmada', dot: '#22c55e' },
    realizada:  { color: '#64748b', bg: 'rgba(100,116,139,0.12)', label: 'Realizada',  dot: '#64748b' },
    cancelada:  { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   label: 'Cancelada',  dot: '#ef4444' },
};

// ─── Constantes ───────────────────────────────────────────
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DIAS_LARGO  = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const ES_FIN_DE_SEMANA = [0, 6]; // Dom, Sáb

type ModalState =
    | { mode: 'new';  fecha: string }
    | { mode: 'edit'; evento: Evento }
    | { mode: 'view'; evento: Evento }
    | { mode: 'day';  fecha: string; eventos: Evento[] }
    | null;

// ─── Helpers ──────────────────────────────────────────────
const padDate = (n: number) => String(n).padStart(2, '0');

const formatFechaLargo = (fechaStr: string) => {
    const [y, m, d] = fechaStr.split('-').map(Number);
    const f = new Date(y, m - 1, d);
    return `${DIAS_LARGO[f.getDay()]} ${d} de ${MESES[m - 1]}`;
};

// ─── Componente principal ─────────────────────────────────
export default function Calendario() {
    const { session, isReadonly } = useAuth();

    const [eventos, setEventos]   = useState<Evento[]>([]);
    const [loading, setLoading]   = useState(true);
    const [hoy]                   = useState(new Date());
    const [viewYear, setViewYear] = useState(hoy.getFullYear());
    const [viewMonth, setViewMonth] = useState(hoy.getMonth());
    const [modal, setModal]       = useState<ModalState>(null);
    const [form, setForm]         = useState<FormState>(FORM_VACIO);
    const [saving, setSaving]     = useState(false);
    const [filtroEstado, setFiltroEstado] = useState<string>('todos');
    const [filtroTipo, setFiltroTipo]     = useState<string>('todos');

    // ── Carga ────────────────────────────────────────────
    const load = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('eventos')
            .select('*')
            .order('fecha')
            .order('hora_inicio');
        if (data) setEventos(data as Evento[]);
        setLoading(false);
    };

    useEffect(() => {
        load();
        // Realtime: actualización instantánea cuando está habilitado en Supabase
        const ch = supabase.channel('eventos_rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'eventos' }, load)
            .subscribe();
        // Polling cada 30 s como respaldo (por si Realtime no está en la publication)
        const poll = setInterval(load, 30_000);
        return () => {
            supabase.removeChannel(ch);
            clearInterval(poll);
        };
    }, []);

    // ── Navegación ───────────────────────────────────────
    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };

    // ── Grid ─────────────────────────────────────────────
    const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    const eventosDelDia = (day: number) => {
        const key = `${viewYear}-${padDate(viewMonth + 1)}-${padDate(day)}`;
        return eventos.filter(e => e.fecha === key);
    };

    const isToday = (day: number) =>
        day === hoy.getDate() && viewMonth === hoy.getMonth() && viewYear === hoy.getFullYear();

    // ── Filtros para panel lateral ────────────────────────
    const hoyStr  = hoy.toISOString().slice(0, 10);
    const proximos = eventos
        .filter(e => e.fecha >= hoyStr)
        .filter(e => filtroEstado === 'todos' || e.estado === filtroEstado)
        .filter(e => filtroTipo   === 'todos' || e.tipo   === filtroTipo);

    // ── Modales ──────────────────────────────────────────
    const openNewModal = (fecha: string) => {
        setForm({ ...FORM_VACIO });
        setModal({ mode: 'new', fecha });
    };

    const openEditModal = (evento: Evento) => {
        setForm({
            titulo:         evento.titulo,
            descripcion:    evento.descripcion  ?? '',
            hora_inicio:    evento.hora_inicio  ?? '',
            hora_fin:       evento.hora_fin     ?? '',
            tipo:           evento.tipo,
            estado:         evento.estado,
            cliente_nombre: evento.cliente_nombre ?? '',
            cliente_tel:    evento.cliente_tel    ?? '',
            ubicacion:      evento.ubicacion      ?? '',
        });
        setModal({ mode: 'edit', evento });
    };

    const openDayModal = (day: number, evs: Evento[]) => {
        const fecha = `${viewYear}-${padDate(viewMonth + 1)}-${padDate(day)}`;
        setModal({ mode: 'day', fecha, eventos: evs });
    };

    // ── CRUD ─────────────────────────────────────────────
    const handleSave = async () => {
        if (!form.titulo.trim()) return;
        if (modal?.mode !== 'new' && modal?.mode !== 'edit') return;
        setSaving(true);

        const payload = {
            titulo:         form.titulo.trim(),
            descripcion:    form.descripcion || null,
            hora_inicio:    form.hora_inicio || null,
            hora_fin:       form.hora_fin    || null,
            tipo:           form.tipo,
            estado:         form.estado,
            cliente_nombre: form.cliente_nombre || null,
            cliente_tel:    form.cliente_tel    || null,
            ubicacion:      form.ubicacion      || null,
        };

        if (modal.mode === 'new') {
            await supabase.from('eventos').insert({
                ...payload,
                fecha:      modal.fecha,
                created_by: session?.user?.email || null,
            });
        } else {
            await supabase.from('eventos').update(payload).eq('id', modal.evento.id);
        }

        setModal(null);
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        await supabase.from('eventos').delete().eq('id', id);
        setEventos(prev => prev.filter(e => e.id !== id));
        setModal(null);
    };

    const handleEstadoRapido = async (ev: Evento, nuevoEstado: string) => {
        await supabase.from('eventos').update({ estado: nuevoEstado }).eq('id', ev.id);
        setEventos(prev => prev.map(e => e.id === ev.id ? { ...e, estado: nuevoEstado as Evento['estado'] } : e));
    };

    // ── Estilos base ─────────────────────────────────────
    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '9px 12px', borderRadius: '8px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)',
        color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit',
        fontSize: '0.88rem', boxSizing: 'border-box',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '0.75rem', color: 'var(--text-muted)',
        display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px',
    };

    // ─────────────────────────────────────────────────────
    return (
        <div>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>
                        Calendario <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>de Eventos</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Gestión de citas, visitas y eventos del equipo.</p>
                </div>
                {!isReadonly && (
                    <button
                        onClick={() => openNewModal(hoyStr)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--primary-accent)', color: 'var(--primary-accent)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600' }}
                    >
                        <Plus size={18} /> Agregar Evento
                    </button>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', alignItems: 'start' }}>

                {/* ── Grid mensual ── */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    {/* Nav mes */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <button onClick={prevMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}>
                            <ChevronLeft size={20} />
                        </button>
                        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{MESES[viewMonth]} {viewYear}</h2>
                        <button onClick={nextMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}>
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Cabecera días */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
                        {DIAS_SEMANA.map((d, i) => (
                            <div key={d} style={{
                                textAlign: 'center', fontSize: '0.72rem', fontWeight: '600', padding: '4px 0',
                                color: ES_FIN_DE_SEMANA.includes(i) ? 'var(--primary-accent)' : 'var(--text-muted)',
                            }}>{d}</div>
                        ))}
                    </div>

                    {/* Celdas */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                        {cells.map((day, idx) => {
                            if (!day) return <div key={idx} />;
                            const evs    = eventosDelDia(day);
                            const today  = isToday(day);
                            const diaSem = (firstDay + day - 1) % 7;
                            const esFDS  = ES_FIN_DE_SEMANA.includes(diaSem);

                            // Color de fondo según el estado del evento más prioritario
                            const estadoPrio = evs.find(e => e.estado === 'confirmada')
                                ?? evs.find(e => e.estado === 'pendiente')
                                ?? evs[0];
                            const estadoCfg = estadoPrio
                                ? ESTADO_CONFIG[estadoPrio.estado] ?? ESTADO_CONFIG.pendiente
                                : null;

                            return (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        if (evs.length > 0) openDayModal(day, evs);
                                        else openNewModal(`${viewYear}-${padDate(viewMonth + 1)}-${padDate(day)}`);
                                    }}
                                    style={{
                                        minHeight: '72px', padding: '6px', borderRadius: '8px', cursor: 'pointer',
                                        background: today
                                            ? 'rgba(34,197,94,0.08)'
                                            : estadoCfg
                                                ? estadoCfg.bg
                                                : esFDS
                                                    ? 'rgba(255,255,255,0.02)'
                                                    : 'transparent',
                                        border: today
                                            ? '1px solid rgba(34,197,94,0.4)'
                                            : esFDS
                                                ? '1px solid rgba(255,255,255,0.06)'
                                                : '1px solid transparent',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = today
                                        ? 'rgba(34,197,94,0.08)'
                                        : estadoCfg ? estadoCfg.bg : esFDS ? 'rgba(255,255,255,0.02)' : 'transparent')}
                                >
                                    <div style={{
                                        fontSize: '0.8rem', fontWeight: today ? '700' : '400',
                                        color: today ? 'var(--primary-accent)' : esFDS ? 'rgba(56,189,248,0.7)' : 'var(--text-main)',
                                        marginBottom: '4px',
                                    }}>{day}</div>

                                    {evs.slice(0, 2).map(ev => {
                                        const estadoCfgEv = ESTADO_CONFIG[ev.estado] ?? ESTADO_CONFIG.pendiente;
                                        const tipoCfg = TIPO_CONFIG[ev.tipo]  ?? TIPO_CONFIG.otro;
                                        return (
                                            <div
                                                key={ev.id}
                                                onClick={e => { e.stopPropagation(); setModal({ mode: 'view', evento: ev }); }}
                                                title={ev.titulo}
                                                style={{
                                                    fontSize: '0.62rem', fontWeight: '600',
                                                    padding: '2px 5px', borderRadius: '4px', marginBottom: '2px',
                                                    background: tipoCfg.bg, color: tipoCfg.color,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                    // Tachado si cancelada
                                                    textDecoration: ev.estado === 'cancelada' ? 'line-through' : 'none',
                                                    opacity: ev.estado === 'realizada' ? 0.55 : 1,
                                                }}
                                            >
                                                {/* Dot de estado */}
                                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: estadoCfgEv.dot, flexShrink: 0, display: 'inline-block' }} />
                                                {ev.titulo}
                                            </div>
                                        );
                                    })}

                                    {evs.length > 2 && (
                                        <div
                                            onClick={e => { e.stopPropagation(); openDayModal(day, evs); }}
                                            style={{ fontSize: '0.6rem', color: 'var(--primary-accent)', fontWeight: '600', cursor: 'pointer', marginTop: '2px' }}
                                        >
                                            +{evs.length - 2} más →
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Panel lateral ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Filtros */}
                    <div className="glass-panel" style={{ padding: '16px' }}>
                        <p style={{ margin: '0 0 10px', fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Filtros</p>
                        {/* Estado */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                            {['todos', 'pendiente', 'confirmada', 'realizada', 'cancelada'].map(s => {
                                const cfg = s === 'todos' ? null : ESTADO_CONFIG[s];
                                const active = filtroEstado === s;
                                return (
                                    <button
                                        key={s}
                                        onClick={() => setFiltroEstado(s)}
                                        style={{
                                            padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600,
                                            cursor: 'pointer', fontFamily: 'inherit',
                                            background: active ? (cfg?.bg ?? 'rgba(56,189,248,0.15)') : 'transparent',
                                            border: `1px solid ${active ? (cfg?.color ?? 'var(--primary-accent)') : 'var(--border-glass)'}`,
                                            color: active ? (cfg?.color ?? 'var(--primary-accent)') : 'var(--text-muted)',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {s === 'todos' ? 'Todos' : cfg!.label}
                                    </button>
                                );
                            })}
                        </div>
                        {/* Tipo */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {['todos', 'cita', 'visita', 'evento', 'otro'].map(t => {
                                const cfg = t === 'todos' ? null : TIPO_CONFIG[t];
                                const active = filtroTipo === t;
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setFiltroTipo(t)}
                                        style={{
                                            padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600,
                                            cursor: 'pointer', fontFamily: 'inherit',
                                            background: active ? (cfg?.bg ?? 'rgba(56,189,248,0.15)') : 'transparent',
                                            border: `1px solid ${active ? (cfg?.color ?? 'var(--primary-accent)') : 'var(--border-glass)'}`,
                                            color: active ? (cfg?.color ?? 'var(--primary-accent)') : 'var(--text-muted)',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {t === 'todos' ? 'Todos' : cfg!.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Próximos eventos */}
                    <div className="glass-panel" style={{ padding: '20px' }}>
                        <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem' }}>📅 Próximos eventos</h3>
                        <p style={{ margin: '0 0 14px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                            {loading ? 'Cargando...' : `${proximos.length} evento${proximos.length !== 1 ? 's' : ''}`}
                        </p>
                        <div style={{ maxHeight: 'calc(100vh - 480px)', overflowY: 'auto', paddingRight: '4px' }}>
                            {loading ? null : proximos.length === 0
                                ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin eventos con estos filtros.</p>
                                : proximos.map(ev => {
                                    const tipoCfg   = TIPO_CONFIG[ev.tipo]    ?? TIPO_CONFIG.otro;
                                    const estadoCfg = ESTADO_CONFIG[ev.estado] ?? ESTADO_CONFIG.pendiente;
                                    return (
                                        <div
                                            key={ev.id}
                                            onClick={() => setModal({ mode: 'view', evento: ev })}
                                            style={{
                                                padding: '10px 12px', borderRadius: '8px', marginBottom: '8px',
                                                background: tipoCfg.bg, border: `1px solid ${tipoCfg.color}33`,
                                                cursor: 'pointer', transition: 'opacity 0.15s',
                                                opacity: ev.estado === 'realizada' ? 0.55 : 1,
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                                            onMouseLeave={e => (e.currentTarget.style.opacity = ev.estado === 'realizada' ? '0.55' : '1')}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                                                <div style={{
                                                    fontSize: '0.8rem', fontWeight: '700', color: tipoCfg.color,
                                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    textDecoration: ev.estado === 'cancelada' ? 'line-through' : 'none',
                                                }}>{ev.titulo}</div>
                                                <span style={{
                                                    fontSize: '0.62rem', fontWeight: 600, padding: '1px 6px', borderRadius: '10px',
                                                    background: estadoCfg.bg, color: estadoCfg.color, whiteSpace: 'nowrap', flexShrink: 0,
                                                }}>{estadoCfg.label}</span>
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                                {formatFechaLargo(ev.fecha)}{ev.hora_inicio ? ` · ${ev.hora_inicio.slice(0, 5)}` : ''}
                                            </div>
                                            {ev.cliente_nombre && (
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    👤 {ev.cliente_nombre}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* ──────────── MODALES ──────────── */}
            {modal && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                    onClick={() => setModal(null)}
                >
                    <div
                        className="glass-panel"
                        style={{ width: '100%', maxWidth: modal.mode === 'day' ? '540px' : '500px', padding: '28px', position: 'relative', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button onClick={() => setModal(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <X size={20} />
                        </button>

                        {/* ── Vista de DÍA ── */}
                        {modal.mode === 'day' && (() => {
                            const evsDia = modal.eventos.slice().sort((a, b) => (a.hora_inicio ?? '').localeCompare(b.hora_inicio ?? ''));
                            return (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <CalendarDays size={20} color="var(--primary-accent)" />
                                        <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{formatFechaLargo(modal.fecha)}</h3>
                                    </div>
                                    <p style={{ margin: '0 0 18px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                        {evsDia.length} evento{evsDia.length !== 1 ? 's' : ''} este día
                                    </p>
                                    <div style={{ flex: 1, paddingRight: '4px', marginBottom: '16px' }}>
                                        {evsDia.map(ev => {
                                            const tipoCfg   = TIPO_CONFIG[ev.tipo]    ?? TIPO_CONFIG.otro;
                                            const estadoCfg = ESTADO_CONFIG[ev.estado] ?? ESTADO_CONFIG.pendiente;
                                            return (
                                                <div
                                                    key={ev.id}
                                                    onClick={() => setModal({ mode: 'view', evento: ev })}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '10px', marginBottom: '8px', background: tipoCfg.bg, border: `1px solid ${tipoCfg.color}44`, cursor: 'pointer', transition: 'opacity 0.15s', opacity: ev.estado === 'realizada' ? 0.55 : 1 }}
                                                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                                                    onMouseLeave={e => (e.currentTarget.style.opacity = ev.estado === 'realizada' ? '0.55' : '1')}
                                                >
                                                    <div style={{ width: '4px', height: '40px', borderRadius: '4px', background: tipoCfg.color, flexShrink: 0 }} />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: tipoCfg.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: ev.estado === 'cancelada' ? 'line-through' : 'none' }}>
                                                            {ev.titulo}
                                                        </div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            {ev.hora_inicio ? `${ev.hora_inicio.slice(0, 5)}${ev.hora_fin ? ` – ${ev.hora_fin.slice(0, 5)}` : ''}` : 'Sin hora'}
                                                            {ev.cliente_nombre && <span style={{ marginLeft: '8px' }}>· {ev.cliente_nombre}</span>}
                                                        </div>
                                                    </div>
                                                    <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: estadoCfg.bg, color: estadoCfg.color, flexShrink: 0 }}>
                                                        {estadoCfg.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {!isReadonly && (
                                        <button onClick={() => openNewModal(modal.fecha)} style={{ width: '100%', padding: '11px', borderRadius: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--primary-accent)', color: 'var(--primary-accent)', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <Plus size={16} /> Nuevo evento este día
                                        </button>
                                    )}
                                </>
                            );
                        })()}

                        {/* ── Formulario: Nuevo / Editar ── */}
                        {(modal.mode === 'new' || modal.mode === 'edit') && (
                            <>
                                <h3 style={{ margin: '0 0 4px' }}>
                                    {modal.mode === 'new' ? 'Nuevo Evento' : 'Editar Evento'}
                                </h3>
                                <p style={{ margin: '0 0 20px', fontSize: '0.8rem', color: 'var(--primary-accent)' }}>
                                    {formatFechaLargo(modal.mode === 'new' ? modal.fecha : modal.evento.fecha)}
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* Título */}
                                    <input
                                        placeholder="Título del evento *"
                                        value={form.titulo}
                                        onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                                        style={inputStyle}
                                    />

                                    {/* Cliente */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={labelStyle}><User size={12} /> Nombre del cliente</label>
                                            <input placeholder="Juan García..." value={form.cliente_nombre} onChange={e => setForm(p => ({ ...p, cliente_nombre: e.target.value }))} style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}><Phone size={12} /> Teléfono</label>
                                            <input placeholder="52..." value={form.cliente_tel} onChange={e => setForm(p => ({ ...p, cliente_tel: e.target.value }))} style={inputStyle} />
                                        </div>
                                    </div>

                                    {/* Horas */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={labelStyle}><Clock size={12} /> Inicio</label>
                                            <input type="time" value={form.hora_inicio} onChange={e => setForm(p => ({ ...p, hora_inicio: e.target.value }))} style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}><Clock size={12} /> Fin</label>
                                            <input type="time" value={form.hora_fin} onChange={e => setForm(p => ({ ...p, hora_fin: e.target.value }))} style={inputStyle} />
                                        </div>
                                    </div>

                                    {/* Ubicación */}
                                    <div>
                                        <label style={labelStyle}><MapPin size={12} /> Ubicación</label>
                                        <input placeholder="Sala de ventas, Manzana 3..." value={form.ubicacion} onChange={e => setForm(p => ({ ...p, ubicacion: e.target.value }))} style={inputStyle} />
                                    </div>

                                    {/* Tipo y Estado */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={labelStyle}><Tag size={12} /> Tipo</label>
                                            <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))} style={inputStyle}>
                                                {Object.entries(TIPO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={labelStyle}><CheckCircle size={12} /> Estado</label>
                                            <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))} style={inputStyle}>
                                                {Object.entries(ESTADO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Descripción */}
                                    <div>
                                        <label style={labelStyle}><AlignLeft size={12} /> Notas</label>
                                        <textarea rows={3} placeholder="Notas adicionales..." value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} />
                                    </div>

                                    <button
                                        onClick={handleSave}
                                        disabled={saving || !form.titulo.trim()}
                                        style={{ padding: '11px', borderRadius: '8px', background: 'var(--primary-accent)', border: 'none', color: '#000', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: !form.titulo.trim() ? 0.5 : 1, fontFamily: 'inherit' }}
                                    >
                                        {saving ? 'Guardando...' : modal.mode === 'new' ? 'Guardar Evento' : 'Actualizar Evento'}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ── Ver evento ── */}
                        {modal.mode === 'view' && (() => {
                            const ev       = modal.evento;
                            const tipoCfg  = TIPO_CONFIG[ev.tipo]    ?? TIPO_CONFIG.otro;
                            const estaCfg  = ESTADO_CONFIG[ev.estado] ?? ESTADO_CONFIG.pendiente;
                            return (
                                <>
                                    {/* Badges tipo + estado */}
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                        <span style={{ padding: '2px 12px', borderRadius: '20px', background: tipoCfg.bg, color: tipoCfg.color, fontSize: '0.75rem', fontWeight: '600' }}>
                                            {tipoCfg.label}
                                        </span>
                                        <span style={{ padding: '2px 12px', borderRadius: '20px', background: estaCfg.bg, color: estaCfg.color, fontSize: '0.75rem', fontWeight: '600' }}>
                                            {estaCfg.label}
                                        </span>
                                    </div>

                                    <h3 style={{ margin: '0 0 6px', fontSize: '1.3rem', textDecoration: ev.estado === 'cancelada' ? 'line-through' : 'none' }}>{ev.titulo}</h3>

                                    <p style={{ margin: '0 0 4px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        📅 {formatFechaLargo(ev.fecha)}{ev.hora_inicio ? ` · ${ev.hora_inicio.slice(0, 5)}${ev.hora_fin ? ` – ${ev.hora_fin.slice(0, 5)}` : ''}` : ''}
                                    </p>
                                    {ev.ubicacion && <p style={{ margin: '0 0 4px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>📍 {ev.ubicacion}</p>}
                                    {ev.cliente_nombre && <p style={{ margin: '0 0 4px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>👤 {ev.cliente_nombre}{ev.cliente_tel ? ` · ${ev.cliente_tel}` : ''}</p>}
                                    {ev.descripcion && <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', margin: '12px 0', lineHeight: 1.6 }}>{ev.descripcion}</p>}
                                    {ev.created_by && <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Creado por {ev.created_by.split('@')[0]}</p>}

                                    {/* Cambio rápido de estado */}
                                    {!isReadonly && (
                                        <div style={{ margin: '16px 0 12px' }}>
                                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>Cambiar estado</p>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {Object.entries(ESTADO_CONFIG).map(([k, cfg]) => (
                                                    <button
                                                        key={k}
                                                        onClick={() => handleEstadoRapido(ev, k)}
                                                        style={{
                                                            padding: '4px 12px', borderRadius: '20px', fontSize: '0.73rem', fontWeight: 600,
                                                            cursor: 'pointer', fontFamily: 'inherit',
                                                            background: ev.estado === k ? cfg.bg : 'transparent',
                                                            border: `1px solid ${ev.estado === k ? cfg.color : 'var(--border-glass)'}`,
                                                            color: ev.estado === k ? cfg.color : 'var(--text-muted)',
                                                        }}
                                                    >
                                                        {cfg.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Acciones */}
                                    {!isReadonly && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                                            <button
                                                onClick={() => openEditModal(ev)}
                                                style={{ padding: '10px', borderRadius: '8px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            >
                                                <Edit2 size={14} /> Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ev.id)}
                                                style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                            >
                                                <Trash2 size={14} /> Eliminar
                                            </button>
                                        </div>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
