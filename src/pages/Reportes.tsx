import { useState, useEffect, useRef } from 'react';
import { Search, X, CalendarDays, FileText, BarChart3, Save, Edit2, Trash2, ClipboardList, Download, ChevronDown, ChevronUp, Activity } from 'lucide-react';

import { supabase } from '../services/supabaseClient';
import { fetchClientsFromSheet, type ClientData } from '../services/googleSheets';
import { useAuth } from '../contexts/AuthContext';

// ─── Tipos ────────────────────────────────────────────────
interface Appointment {
    id: string;
    client_id: string;
    client_name: string;
    client_phone: string;
    scheduled_date: string;
    outcome: 'pendiente' | 'asistio' | 'no_asistio' | 'reprogramo';
    reschedule_date?: string;
    note?: string;
    created_by: string;
    created_by_email: string;
    created_at: string;
}

interface ClientNote {
    id: string;
    client_id: string;
    client_name: string;
    note: string;
    created_by: string;
    created_by_email: string;
    created_at: string;
}

// ─── Badge de Resultado ────────────────────────────────────
const OutcomeBadge = ({ outcome }: { outcome: string }) => {
    const map: Record<string, { label: string; bg: string; color: string }> = {
        pendiente: { label: '⏳ Pendiente', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
        asistio: { label: '✅ Asistió', bg: 'rgba(16,185,129,0.12)', color: '#10b981' },
        no_asistio: { label: '❌ No asistió', bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
        reprogramo: { label: '🔄 Reprogramó', bg: 'rgba(56,189,248,0.12)', color: '#38bdf8' },
    };
    const s = map[outcome] || map.pendiente;
    return (
        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', background: s.bg, color: s.color }}>
            {s.label}
        </span>
    );
};

// ─── Modal de Cita ─────────────────────────────────────────
interface ApptModalProps {
    client: ClientData;
    existing?: Appointment;
    onClose: () => void;
    onSaved: () => void;
    userEmail: string;
    userId: string;
}
function AppointmentModal({ client, existing, onClose, onSaved, userEmail, userId }: ApptModalProps) {
    const [date, setDate] = useState(existing?.scheduled_date || new Date().toISOString().split('T')[0]);
    const [outcome, setOutcome] = useState<Appointment['outcome']>(existing?.outcome || 'pendiente');
    const [reschedule, setReschedule] = useState(existing?.reschedule_date || '');
    const [note, setNote] = useState(existing?.note || '');
    const [saving, setSaving] = useState(false);
    const dateRef = useRef<HTMLInputElement>(null);
    const rescheduleRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        setSaving(true);
        const payload = {
            client_id: client.id,
            client_name: client.name,
            client_phone: client.phone,
            scheduled_date: date,
            outcome,
            reschedule_date: outcome === 'reprogramo' ? reschedule : null,
            note: note || null,
            created_by: userId,
            created_by_email: userEmail,
            updated_at: new Date().toISOString(),
        };
        if (existing) {
            await supabase.from('appointments').update(payload).eq('id', existing.id);
        } else {
            await supabase.from('appointments').insert(payload);
        }
        setSaving(false);
        onSaved();
        onClose();
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '28px', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={20} />
                </button>
                <h3 style={{ margin: '0 0 4px 0' }}>📅 Registrar Cita</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 20px 0' }}>{client.name} · {client.phone}</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Fecha de cita */}
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Fecha de la cita</label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                ref={dateRef}
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-panel)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                            />
                            <button
                                type="button"
                                onClick={() => dateRef.current?.showPicker()}
                                title="Abrir calendario"
                                style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,240,255,0.08)', border: '1px solid var(--primary-accent)', color: 'var(--primary-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            >
                                <CalendarDays size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Resultado */}
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Resultado</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {(['pendiente', 'asistio', 'no_asistio', 'reprogramo'] as const).map(o => {
                                const labels: Record<string, string> = { pendiente: '⏳ Pendiente', asistio: '✅ Asistió', no_asistio: '❌ No asistió', reprogramo: '🔄 Reprogramó' };
                                const colors: Record<string, string> = { pendiente: '#f59e0b', asistio: '#10b981', no_asistio: '#ef4444', reprogramo: '#38bdf8' };
                                return (
                                    <button key={o} onClick={() => setOutcome(o)}
                                        style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${outcome === o ? colors[o] : 'var(--border-glass)'}`, background: outcome === o ? `${colors[o]}22` : 'transparent', color: outcome === o ? colors[o] : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600', fontSize: '0.82rem', transition: 'all 0.2s' }}>
                                        {labels[o]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Nueva fecha si reprogramó */}
                    {outcome === 'reprogramo' && (
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nueva fecha de cita</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                    ref={rescheduleRef}
                                    type="date"
                                    value={reschedule}
                                    onChange={e => setReschedule(e.target.value)}
                                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-panel)', border: '1px solid #38bdf8', color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => rescheduleRef.current?.showPicker()}
                                    title="Abrir calendario"
                                    style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(56,189,248,0.08)', border: '1px solid #38bdf8', color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                >
                                    <CalendarDays size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Nota */}
                    <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nota (opcional)</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)}
                            placeholder="Qué pasó en la cita, observaciones..."
                            rows={3}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-panel)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                    </div>

                    <button onClick={handleSave} disabled={saving}
                        style={{ padding: '12px', borderRadius: '8px', background: 'var(--primary-accent)', border: 'none', color: '#000', fontWeight: '700', cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', fontSize: '0.9rem' }}>
                        {saving ? 'Guardando...' : '💾 Guardar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── TAB 1: Citas ──────────────────────────────────────────
function TabCitas({ session, role }: { session: any; role: string }) {
    const [clients, setClients] = useState<ClientData[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modal, setModal] = useState<{ client: ClientData; existing?: Appointment } | null>(null);

    useEffect(() => {
        loadAll();
        const channel = supabase.channel('realtime_appointments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, loadAll)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const loadAll = async () => {
        setLoading(true);
        const [sheetData, { data: appts }, { data: overrides }] = await Promise.all([
            fetchClientsFromSheet(),
            supabase.from('appointments').select('*').order('created_at', { ascending: false }),
            supabase.from('client_overrides').select('client_id, status, assigned_to, assigned_email'),
        ]);

        // Mezclar status de Supabase sobre datos del Sheet
        const merged = sheetData.map(client => {
            const override = overrides?.find(o => o.client_id === client.id);
            if (override) {
                return {
                    ...client,
                    status: override.status || client.status,
                    assigned_to: override.assigned_to || client.assigned_to,
                    assigned_email: override.assigned_email || client.assigned_email,
                };
            }
            return client;
        });

        // Clientes citados: status Citado (ya sea del Sheet o de override) O con cita ya registrada
        const citados = merged.filter(c => c.status === 'Citado' || appts?.some(a => a.client_id === c.id));

        // Asesor ve los suyos por app (assigned_to) O por Excel (sheet_assigned contiene su email prefix)
        const emailPrefix = session?.user?.email?.split('@')[0]?.toLowerCase() || '';
        setClients(role === 'asesor'
            ? citados.filter(c =>
                c.assigned_to === session?.user?.id ||
                (c.sheet_assigned && c.sheet_assigned.toLowerCase().includes(emailPrefix))
            )
            : citados
        );
        setAppointments(appts || []);
        setLoading(false);
    };

    const filtered = clients.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
    );

    return (
        <div>
            {modal && (
                <AppointmentModal
                    client={modal.client}
                    existing={modal.existing}
                    onClose={() => setModal(null)}
                    onSaved={loadAll}
                    userEmail={session?.user?.email || ''}
                    userId={session?.user?.id || ''}
                />
            )}

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: 'var(--text-muted)' }} />
                    <input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px 10px 40px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Cargando citas...</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'left' }}>Cliente</th>
                                <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'left' }}>Teléfono</th>
                                <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'left' }}>Fecha Cita</th>
                                <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'left' }}>Resultado</th>
                                <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'left' }}>Nueva Fecha</th>
                                <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'left' }}>Nota</th>
                                <th style={{ padding: '14px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(client => {
                                const appt = appointments.find(a => a.client_id === client.id);
                                return (
                                    <tr key={client.id} style={{ borderBottom: '1px solid rgba(80,200,255,0.05)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '14px', fontWeight: '600' }}>{client.name}</td>
                                        <td style={{ padding: '14px', color: '#25d366', fontSize: '0.85rem' }}>📱 {client.phone}</td>
                                        <td style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{appt?.scheduled_date || '—'}</td>
                                        <td style={{ padding: '14px' }}>{appt ? <OutcomeBadge outcome={appt.outcome} /> : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin registrar</span>}</td>
                                        <td style={{ padding: '14px', color: '#38bdf8', fontSize: '0.85rem' }}>{appt?.reschedule_date || '—'}</td>
                                        <td style={{ padding: '14px', color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: '200px' }}>
                                            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{appt?.note || '—'}</span>
                                        </td>
                                        <td style={{ padding: '14px', textAlign: 'center' }}>
                                            <button onClick={() => setModal({ client, existing: appt })}
                                                style={{ padding: '6px 14px', borderRadius: '8px', background: appt ? 'rgba(56,189,248,0.1)' : 'rgba(0,240,255,0.1)', border: `1px solid ${appt ? '#38bdf8' : 'var(--primary-accent)'}`, color: appt ? '#38bdf8' : 'var(--primary-accent)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: '600' }}>
                                                {appt ? '✏️ Editar' : '+ Registrar'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No hay clientes citados aún.</div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── TAB 2: Notas ──────────────────────────────────────────
function TabNotas({ session, role }: { session: any; role: string }) {
    const [clients, setClients] = useState<ClientData[]>([]);
    const [notes, setNotes] = useState<ClientNote[]>([]);
    const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
    const [search, setSearch] = useState('');
    const [filterHasNotes, setFilterHasNotes] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState('');

    useEffect(() => {
        if (!session || !role) return;
        loadAll();
        const channel = supabase.channel('realtime_notes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'client_notes' }, loadAll)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user?.id, role]);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [sheetData, { data: notesData, error: notesError }, { data: overrides }] = await Promise.all([
                fetchClientsFromSheet(),
                supabase.from('client_notes').select('*').order('created_at', { ascending: false }),
                supabase.from('client_overrides').select('client_id, assigned_to, assigned_email, status'),
            ]);
            if (notesError) console.error('Error notas:', notesError);

            const emailPrefix = session?.user?.email?.split('@')[0]?.toLowerCase() || '';

            // Mezclar assigned_to de Supabase sobre datos del Sheet
            const merged = sheetData.map(client => {
                const override = overrides?.find(o => o.client_id === client.id);
                return override ? { ...client, assigned_to: override.assigned_to || client.assigned_to } : client;
            });

            const visible = role === 'asesor'
                ? merged.filter(c =>
                    c.assigned_to === session?.user?.id ||
                    (c.sheet_assigned && c.sheet_assigned.toLowerCase().includes(emailPrefix))
                )
                : merged;
            setClients(visible);
            setNotes(notesData || []);
        } catch (err) {
            console.error('Error en TabNotas loadAll:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveNote = async () => {
        if (!selectedClient || !newNote.trim()) return;
        setSaving(true);
        await supabase.from('client_notes').insert({
            client_id: selectedClient.id,
            client_name: selectedClient.name,
            note: newNote.trim(),
            created_by: session?.user?.id,
            created_by_email: session?.user?.email,
        });
        supabase.from('profiles').update({
            last_seen: new Date().toISOString(),
            last_action: `Agregó nota · ${selectedClient.name}`
        }).eq('id', session?.user?.id).then(() => { });
        setNewNote('');
        setSaving(false);
        loadAll();
    };

    // Permisos: asesores solo editan/eliminan sus notas; admins/gerentes todas
    const canEdit = (note: ClientNote) =>
        role !== 'asesor' || note.created_by === session?.user?.id;

    const deleteNote = async (id: string) => {
        if (!window.confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.')) return;
        await supabase.from('client_notes').delete().eq('id', id);
        loadAll();
    };

    const startEdit = (note: ClientNote) => {
        setEditingId(note.id);
        setEditingText(note.note);
    };

    const saveEdit = async () => {
        if (!editingId || !editingText.trim()) return;
        await supabase.from('client_notes').update({ note: editingText.trim() }).eq('id', editingId);
        supabase.from('profiles').update({
            last_seen: new Date().toISOString(),
            last_action: selectedClient ? `Editó nota · ${selectedClient.name}` : 'Editó nota'
        }).eq('id', session?.user?.id).then(() => { });
        setEditingId(null);
        setEditingText('');
        loadAll();
    };

    const filtered = clients.filter(c => {
        const matchSearch =
            c.name?.toLowerCase().includes(search.toLowerCase()) ||
            (c.phone ?? '').includes(search);
        const hasNotes = notes.some(n => String(n.client_id) === String(c.id));
        return matchSearch && (!filterHasNotes || hasNotes);
    });

    const clientNotes = selectedClient
        ? notes.filter(n => String(n.client_id) === String(selectedClient.id))
        : [];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', minHeight: '500px' }}>
            {/* Lista de clientes */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '70vh' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                    <input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {/* Filtro: solo con notas */}
                <button onClick={() => setFilterHasNotes(f => !f)}
                    style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid ${filterHasNotes ? 'var(--primary-accent)' : 'var(--border-glass)'}`, background: filterHasNotes ? 'rgba(0,240,255,0.1)' : 'transparent', color: filterHasNotes ? 'var(--primary-accent)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: filterHasNotes ? '700' : '400', transition: 'all 0.2s', textAlign: 'left' }}>
                    {filterHasNotes ? '✓ ' : ''}📝 Solo con notas
                </button>

                {loading ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando...</p> : (
                    filtered.map(c => {
                        const notesCount = notes.filter(n => n.client_id === c.id).length;
                        const isSelected = selectedClient?.id === c.id;
                        return (
                            <div key={c.id} onClick={() => setSelectedClient(c)}
                                style={{ padding: '12px 14px', borderRadius: '8px', background: isSelected ? 'rgba(0,240,255,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isSelected ? 'var(--primary-accent)' : 'var(--border-glass)'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                                <p style={{ margin: 0, fontWeight: '600', fontSize: '0.88rem' }}>{c.name}</p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {c.phone}
                                    {notesCount > 0 && <span style={{ marginLeft: '8px', background: 'rgba(0,240,255,0.15)', color: 'var(--primary-accent)', borderRadius: '10px', padding: '1px 7px', fontSize: '0.7rem' }}>{notesCount} nota{notesCount > 1 ? 's' : ''}</span>}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Panel de notas del cliente seleccionado */}
            <div>
                {!selectedClient ? (
                    <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div>
                            <FileText size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                            <p>Selecciona un cliente para ver y agregar notas</p>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Header cliente */}
                        <div className="glass-panel" style={{ padding: '16px 20px' }}>
                            <p style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>{selectedClient.name}</p>
                            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#25d366' }}>📱 {selectedClient.phone}</p>
                        </div>

                        {/* Nueva nota */}
                        <div className="glass-panel" style={{ padding: '20px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>➕ Nueva nota</label>
                            <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                                placeholder="Escribe lo que sabes del cliente, qué está considerando, objeciones, próximos pasos..."
                                rows={3}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
                            <button onClick={saveNote} disabled={saving || !newNote.trim()}
                                style={{ marginTop: '10px', padding: '10px 20px', borderRadius: '8px', background: newNote.trim() ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)', border: 'none', color: newNote.trim() ? '#000' : 'var(--text-muted)', cursor: newNote.trim() ? 'pointer' : 'not-allowed', fontWeight: '700', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <Save size={16} /> {saving ? 'Guardando...' : 'Guardar nota'}
                            </button>
                        </div>

                        {/* Historial de notas */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto' }}>
                            {clientNotes.length === 0 ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>Sin notas aún para este cliente.</p>
                            ) : (
                                clientNotes.map(n => {
                                    const isEditing = editingId === n.id;
                                    return (
                                        <div key={n.id} className="glass-panel" style={{ padding: '14px 18px' }}>
                                            {isEditing ? (
                                                <>
                                                    <textarea value={editingText} onChange={e => setEditingText(e.target.value)} rows={3} autoFocus
                                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--primary-accent)', color: 'var(--text-main)', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }} />
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button onClick={saveEdit}
                                                            style={{ padding: '6px 14px', borderRadius: '8px', background: 'var(--primary-accent)', border: 'none', color: '#000', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                                                            <Save size={13} /> Guardar
                                                        </button>
                                                        <button onClick={() => setEditingId(null)}
                                                            style={{ padding: '6px 14px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }}>
                                                            Cancelar
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <p style={{ margin: '0 0 8px', fontSize: '0.9rem', lineHeight: '1.5' }}>{n.note}</p>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                                                            👤 {n.created_by_email?.split('@')[0]} · {new Date(n.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        {canEdit(n) && (
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                <button onClick={() => startEdit(n)} title="Editar nota"
                                                                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                                                                    <Edit2 size={12} /> Editar
                                                                </button>
                                                                <button onClick={() => deleteNote(n.id)} title="Eliminar nota"
                                                                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                                                                    <Trash2 size={12} /> Eliminar
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── TAB 3: Resumen Gerencial ──────────────────────────────
function TabResumen() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.from('appointments').select('*').then(({ data }) => {
            setAppointments(data || []);
            setLoading(false);
        });
    }, []);

    // Agrupa por email del asesor
    const byAsesor: Record<string, { pendiente: number; asistio: number; no_asistio: number; reprogramo: number; total: number }> = {};
    appointments.forEach(a => {
        const key = a.created_by_email?.split('@')[0] || 'Desconocido';
        if (!byAsesor[key]) byAsesor[key] = { pendiente: 0, asistio: 0, no_asistio: 0, reprogramo: 0, total: 0 };
        byAsesor[key][a.outcome]++;
        byAsesor[key].total++;
    });
    const rows = Object.entries(byAsesor).sort((a, b) => b[1].total - a[1].total);

    const total = appointments.length;
    const asistieron = appointments.filter(a => a.outcome === 'asistio').length;
    const reprogramaron = appointments.filter(a => a.outcome === 'reprogramo').length;
    const noAsistieron = appointments.filter(a => a.outcome === 'no_asistio').length;

    return (
        <div>
            {/* Métricas globales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                {[
                    { label: 'Total citas', value: total, color: 'var(--primary-accent)' },
                    { label: '✅ Asistieron', value: asistieron, color: '#10b981' },
                    { label: '🔄 Reprogramaron', value: reprogramaron, color: '#38bdf8' },
                    { label: '❌ No asistieron', value: noAsistieron, color: '#ef4444' },
                ].map(m => (
                    <div key={m.label} className="glass-panel" style={{ padding: '18px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{m.label}</p>
                        <p style={{ margin: 0, fontSize: '2rem', fontWeight: '800', color: m.color }}>{loading ? '...' : m.value}</p>
                    </div>
                ))}
            </div>

            {/* Tabla por asesor */}
            <div className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px' }}>📊 Por asesor</h3>
                {loading ? <p style={{ color: 'var(--text-muted)' }}>Cargando...</p> : rows.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>Sin registros aún.</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                {['Asesor', 'Total', '✅ Asistió', '🔄 Reprogramó', '❌ No asistió', '⏳ Pendiente'].map(h => (
                                    <th key={h} style={{ padding: '12px 14px', color: 'var(--text-muted)', fontWeight: '500', textAlign: h === 'Asesor' ? 'left' : 'center' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(([nombre, c]) => (
                                <tr key={nombre} style={{ borderBottom: '1px solid rgba(80,200,255,0.05)' }}>
                                    <td style={{ padding: '12px 14px', fontWeight: '600' }}>{nombre}</td>
                                    <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--primary-accent)', fontWeight: '700' }}>{c.total}</td>
                                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#10b981' }}>{c.asistio}</td>
                                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#38bdf8' }}>{c.reprogramo}</td>
                                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#ef4444' }}>{c.no_asistio}</td>
                                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#f59e0b' }}>{c.pendiente}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

// ── TAB 4: Auditorías ──────────────────────────────────────────────────────────

interface AuditEntry {
    id: string;
    event_type: string;
    client_id: string;
    client_name: string | null;
    asesor_id: string | null;
    asesor_email: string | null;
    field_changed: string | null;
    old_value: string | null;
    new_value: string | null;
    created_at: string;
}

const EVENT_LABELS: Record<string, { label: string; bg: string; color: string }> = {
    status_change:     { label: 'Cambio de estado',  bg: 'rgba(56,189,248,0.12)',  color: '#0369a1' },
    assignment_change: { label: 'Asignación',         bg: 'rgba(139,92,246,0.12)', color: '#6d28d9' },
    discarded:         { label: 'Descartado',          bg: 'rgba(239,68,68,0.12)',  color: '#b91c1c' },
};

function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function getPeriodRange(period: string, customFrom: string, customTo: string): { from: Date; to: Date } {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
    const endOfDay   = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    switch (period) {
        case 'today': return { from: startOfDay(now), to: endOfDay(now) };
        case 'week': {
            const day = now.getDay();
            const monday = new Date(now); monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
            return { from: startOfDay(monday), to: endOfDay(now) };
        }
        case 'month': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
        case 'custom': return {
            from: customFrom ? new Date(customFrom + 'T00:00:00') : startOfDay(now),
            to:   customTo   ? new Date(customTo   + 'T23:59:59') : endOfDay(now),
        };
        default: return { from: startOfDay(now), to: endOfDay(now) };
    }
}

function TabAuditorias({ role: _role }: { role: string }) {
    const [logs, setLogs]             = useState<AuditEntry[]>([]);
    const [loading, setLoading]       = useState(true);
    const [period, setPeriod]         = useState('week');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo]     = useState('');
    const [filterAsesor, setFilterAsesor] = useState('');
    const [filterEvent, setFilterEvent]   = useState('');
    const [search, setSearch]         = useState('');
    const [sortAsc, setSortAsc]       = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [assignedTotals, setAssignedTotals] = useState<Record<string, number>>({});
    const [activeCardMenu, setActiveCardMenu] = useState<string | null>(null);
    const [assignedClients, setAssignedClients] = useState<Record<string, Array<{ name: string; status: string; date: string }>>>({});
    const [leaderboardMode, setLeaderboardMode] = useState<'cartera' | 'asignaciones'>('cartera');

    useEffect(() => { loadLogs(); }, [period, customFrom, customTo]);

    const loadLogs = async () => {
        setLoading(true);
        const { from, to } = getPeriodRange(period, customFrom, customTo);
        const [{ data, error }, sheetClients, { data: overrides }] = await Promise.all([
            // Logs del período filtrado
            supabase
                .from('audit_log')
                .select('*')
                .gte('created_at', from.toISOString())
                .lte('created_at', to.toISOString())
                .order('created_at', { ascending: false }),
            // Sheet completo (misma fuente que Dashboard)
            fetchClientsFromSheet(),
            // Overrides actuales (assigned_email del asesor real)
            supabase
                .from('client_overrides')
                .select('client_id, assigned_email'),
        ]);
        if (error) console.error('Error cargando audit_log:', error);
        setLogs(data || []);

        // Cartera total: misma lógica que Dashboard "Cartera por Asesor"
        // Merge Sheet + overrides, contar por assigned_email.split('@')[0]
        const overrideMap: Record<string, string> = {};
        (overrides || []).forEach((o: any) => {
            if (o.assigned_email) overrideMap[o.client_id] = o.assigned_email;
        });
        const asesorMap: Record<string, number> = {};
        (sheetClients || []).forEach((c: any) => {
            // Primero override, luego sheet_assigned (igual que Dashboard)
            const email = overrideMap[c.id] || c.assigned_email || c.sheet_assigned || '';
            if (email && email !== 'descartado' && email.toLowerCase() !== 'pendiente') {
                const nombre = email.includes('@') ? email.split('@')[0] : email;
                asesorMap[nombre] = (asesorMap[nombre] || 0) + 1;
            }
        });
        setAssignedTotals(asesorMap);
        setAssignedClients({});
        setLoading(false);
    };


    const filtered = logs.filter(l => {
        const matchAsesor = !filterAsesor || (l.asesor_email || '').toLowerCase().includes(filterAsesor.toLowerCase());
        const matchEvent  = !filterEvent  || l.event_type === filterEvent;
        const matchSearch = !search ||
            (l.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (l.asesor_email || '').toLowerCase().includes(search.toLowerCase());
        return matchAsesor && matchEvent && matchSearch;
    });

    const sorted = sortAsc ? [...filtered].reverse() : filtered;

    const kpis = [
        { label: 'Total eventos',    value: filtered.length,                                     color: '#006b2c' },
        { label: 'Asignaciones',     value: filtered.filter(l => l.event_type === 'assignment_change').length, color: '#6d28d9' },
        { label: 'Cambios de estado',value: filtered.filter(l => l.event_type === 'status_change').length,    color: '#0369a1' },
        { label: 'Descartados',      value: filtered.filter(l => l.event_type === 'discarded').length,        color: '#b91c1c' },
    ];

    const byAsesor: Record<string, { assignments: number; statusChanges: number; discarded: number; total: number }> = {};
    filtered.forEach(l => {
        const actor = (l.asesor_email || '').split('@')[0] || 'Sistema';
        if (!byAsesor[actor]) byAsesor[actor] = { assignments: 0, statusChanges: 0, discarded: 0, total: 0 };
        byAsesor[actor].total++;
        if (l.event_type === 'assignment_change') byAsesor[actor].assignments++;
        if (l.event_type === 'status_change')     byAsesor[actor].statusChanges++;
        if (l.event_type === 'discarded') {
            // Atribuir el descarte al asesor que TENÍA el cliente, no a quien descartó
            const victim = (l.extra_context as any)?.from_asesor
                ? ((l.extra_context as any).from_asesor as string).split('@')[0]
                : actor; // fallback a quien descartó (registros históricos sin extra_context)
            if (victim !== actor) {
                // Asegurarse que la víctima exista en el mapa
                if (!byAsesor[victim]) byAsesor[victim] = { assignments: 0, statusChanges: 0, discarded: 0, total: 0 };
            }
            byAsesor[victim].discarded++;
        }
    });

    const uniqueAsesores = [...new Set(logs.map(l => l.asesor_email).filter(Boolean))];

    // Clientes RECIBIDOS por asesor en el período (new_value = email del asesor receptor)
    const periodReceived: Record<string, number> = {};
    filtered.forEach(l => {
        if (
            l.event_type === 'assignment_change' &&
            l.new_value &&
            l.new_value !== 'Sin asignar' &&
            l.new_value !== 'pendiente' &&
            l.new_value !== 'Descartado' &&
            l.new_value !== 'descartado'
        ) {
            const key = l.new_value.split('@')[0];
            if (key) periodReceived[key] = (periodReceived[key] || 0) + 1;
        }
    });

    // Leaderboard: asesores con cartera acumulada o actividad en el período
    // Prioridad: assignedTotals (cartera acumulada) > periodReceived (actividad período)
    const allAsesorNames = [...new Set([
        ...Object.keys(assignedTotals),   // asesores con cartera (siempre presentes)
        ...Object.keys(periodReceived),    // asesores activos en el período
    ])];
    const leaderboardRows = allAsesorNames
        .map(name => ({
            name,
            totalAsignados: assignedTotals[name] || 0,
            periodReceived: periodReceived[name] || 0,
            periodStatusChanges: byAsesor[name]?.statusChanges || 0,
            periodDiscarded: byAsesor[name]?.discarded || 0,
        }))
        .filter(r => r.totalAsignados > 0 || r.periodReceived > 0)
        .sort((a, b) => leaderboardMode === 'asignaciones'
            ? b.periodReceived - a.periodReceived || b.totalAsignados - a.totalAsignados
            : b.totalAsignados - a.totalAsignados || b.periodReceived - a.periodReceived
        );
    const maxAssigned = Math.max(...leaderboardRows.map(r => r.totalAsignados), 1);
    const periodDisplayLabel = period === 'today' ? 'hoy' : period === 'week' ? 'esta semana' : period === 'month' ? 'este mes' : 'el período personalizado';

    const periodOptions = [
        { key: 'today', label: 'Hoy' },
        { key: 'week',  label: 'Esta semana' },
        { key: 'month', label: 'Este mes' },
        { key: 'custom',label: 'Personalizado' },
    ];

    const exportPdf = async () => {
        const { default: jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const { from, to } = getPeriodRange(period, customFrom, customTo);
        const periodLabel = `${from.toLocaleDateString('es-MX')} – ${to.toLocaleDateString('es-MX')}`;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        let y = 14;

        // ── Header profesional ──────────────────────────────────
        doc.setFillColor(0, 107, 44);
        doc.rect(0, 0, pageW, 22, 'F');
        doc.setFillColor(0, 80, 33);
        doc.rect(0, 21, pageW, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(15); doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE AUDITORÍA DE LEADS — LOS QUETZALES', pageW / 2, 10, { align: 'center' });
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.text('Documento Confidencial', pageW / 2, 16, { align: 'center' });
        doc.setTextColor(180, 255, 180); doc.setFontSize(7);
        doc.text(`Período: ${periodLabel}`, 10, 24.5);
        doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageW - 10, 24.5, { align: 'right' });
        y = 36;

        // ── KPIs con borde de color ─────────────────────────────
        const kpiColors: [number,number,number][] = [[0,107,44],[109,40,217],[3,105,161],[185,28,28]];
        const kpiW = (pageW - 20) / kpis.length;
        kpis.forEach((k, i) => {
            const x = 10 + i * kpiW; const [cr,cg,cb] = kpiColors[i];
            doc.setFillColor(248, 250, 252); doc.roundedRect(x, y, kpiW - 3, 20, 2, 2, 'F');
            doc.setFillColor(cr, cg, cb); doc.rect(x, y, kpiW - 3, 2.5, 'F');
            doc.setDrawColor(cr, cg, cb); doc.setLineWidth(0.5);
            doc.roundedRect(x, y, kpiW - 3, 20, 2, 2, 'S');
            doc.setLineWidth(0.2); doc.setDrawColor(200,200,200);
            doc.setTextColor(80, 80, 80); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
            doc.text(k.label, x + (kpiW-3)/2, y + 10, { align: 'center' });
            doc.setFontSize(16); doc.setFont('helvetica', 'bold');
            doc.setTextColor(cr, cg, cb);
            doc.text(String(k.value), x + (kpiW-3)/2, y + 18, { align: 'center' });
        });
        y += 26;

        // ── Análisis automático ─────────────────────────────────
        const topAsesor = leaderboardRows[0];
        if (topAsesor && kpis[1].value > 0) {
            doc.setFillColor(240, 253, 244);
            doc.roundedRect(10, y, pageW - 20, 10, 2, 2, 'F');
            doc.setTextColor(0, 80, 33); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
            doc.text('Análisis:', 14, y + 6.5);
            doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
            const txt = `El asesor con mayor cartera es ${topAsesor.name} (${topAsesor.totalAsignados} clientes). Recibió ${topAsesor.periodReceived} asignaciones ${periodDisplayLabel}. Total: ${kpis[0].value} eventos — ${kpis[1].value} asignaciones, ${kpis[2].value} cambios de estado, ${kpis[3].value} descartados.`;
            doc.text(txt, 38, y + 6.5, { maxWidth: pageW - 50 });
        }
        y += 15;

        // ── Tabla 1: Productividad por asesor ───────────────────
        doc.setTextColor(30,30,30); doc.setFontSize(9); doc.setFont('helvetica','bold');
        doc.text('Productividad por asesor', 10, y); y += 4;
        const maxCart = Math.max(...leaderboardRows.map(r => r.totalAsignados), 1);
        autoTable(doc, {
            startY: y,
            head: [['#','Asesor','Cartera Total',`Recibidos ${periodDisplayLabel}`,'Cambios Estado','Descartados']],
            body: leaderboardRows.map((r,i) => [i+1, r.name, r.totalAsignados, r.periodReceived, r.periodStatusChanges, r.periodDiscarded]),
            headStyles: { fillColor: [0,107,44], textColor: 255, fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 8, textColor: [30,30,30] },
            alternateRowStyles: { fillColor: [245,250,246] },
            columnStyles: { 0:{cellWidth:8,halign:'center'}, 2:{halign:'center',fontStyle:'bold',textColor:[0,107,44]}, 3:{halign:'center'}, 4:{halign:'center'}, 5:{halign:'center'} },
            margin: { left: 10, right: 10 },
            didDrawCell: (data: any) => {
                if (data.section === 'body' && data.column.index === 2) {
                    const val = leaderboardRows[data.row.index]?.totalAsignados || 0;
                    const barW = Math.max(1, ((data.cell.width - 6) * val) / maxCart);
                    doc.setFillColor(0, 150, 60);
                    doc.rect(data.cell.x + 3, data.cell.y + data.cell.height - 2.2, barW, 1.4, 'F');
                }
            },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
        if (y > pageH - 60) { doc.addPage(); y = 14; }

        // ── Tabla 2: Detalle de eventos ─────────────────────────
        doc.setTextColor(30,30,30); doc.setFontSize(9); doc.setFont('helvetica','bold');
        doc.text(`Detalle de eventos (${sorted.length} registros)`, 10, y); y += 4;
        const evRowBg: Record<string,[number,number,number]> = {
            assignment_change:[240,235,254], discarded:[254,226,226], status_change:[224,242,254],
        };
        autoTable(doc, {
            startY: y,
            head: [['Fecha/Hora','Asesor','Cliente','Evento','Anterior','Nuevo valor']],
            body: sorted.map(l => [
                fmtDate(l.created_at),
                (l.asesor_email||'').split('@')[0],
                l.client_name||'—',
                l.event_type,
                l.old_value||'—',
                l.new_value||'—',
            ]),
            headStyles: { fillColor: [30,41,59], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
            bodyStyles: { fontSize: 7.5, textColor: [40,40,40] },
            columnStyles: { 0:{cellWidth:34}, 1:{cellWidth:24}, 3:{cellWidth:30} },
            margin: { left: 10, right: 10 },
            didParseCell: (data: any) => {
                if (data.section === 'body') {
                    const evType = sorted[data.row.index]?.event_type;
                    const bg = evRowBg[evType];
                    if (bg) data.cell.styles.fillColor = bg;
                    if (data.column.index === 3) {
                        const ev = EVENT_LABELS[evType];
                        if (ev) {
                            const h = ev.color.replace('#','');
                            data.cell.styles.textColor = [parseInt(h.substring(0,2),16),parseInt(h.substring(2,4),16),parseInt(h.substring(4,6),16)];
                            data.cell.styles.fontStyle = 'bold';
                            data.cell.text = [ev.label];
                        }
                    }
                }
            },
        });

        // ── Pie de página ────────────────────────────────────────
        const totalPages = (doc as any).internal.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setDrawColor(200,200,200); doc.setLineWidth(0.3);
            doc.line(10, pageH-9, pageW-10, pageH-9);
            doc.setFontSize(6.5); doc.setTextColor(140,140,140); doc.setFont('helvetica','normal');
            doc.text('Los Quetzales CRM  ·  Confidencial', 10, pageH-5);
            doc.text(`Página ${p} de ${totalPages}`, pageW/2, pageH-5, { align: 'center' });
            doc.text(new Date().toLocaleDateString('es-MX'), pageW-10, pageH-5, { align: 'right' });
        }
        doc.save(`auditoria_${periodLabel.replace(/[\s/]/g,'_')}.pdf`);
    };



    const exportExcel = async () => {

        const XLSX = (await import('xlsx-js-style')) as any;
        const { from, to } = getPeriodRange(period, customFrom, customTo);
        const periodStr = `${from.toLocaleDateString('es-MX')} – ${to.toLocaleDateString('es-MX')}`;
        const wb = XLSX.utils.book_new();

        // ── Helpers de estilo ────────────────────────────────────
        const hdr = (txt: string, bg = '006b2c', color = 'FFFFFF') => ({
            v: txt, t: 's',
            s: { font: { bold: true, color: { rgb: color }, sz: 11 }, fill: { fgColor: { rgb: bg } }, alignment: { horizontal: 'center', vertical: 'center' }, border: { bottom: { style: 'thin', color: { rgb: 'CCCCCC' } } } }
        });
        const cell = (v: any, bold = false, bg = 'FFFFFF', color = '1e293b', align: string = 'left') => ({
            v, t: typeof v === 'number' ? 'n' : 's',
            s: { font: { bold, color: { rgb: color }, sz: 10 }, fill: { fgColor: { rgb: bg } }, alignment: { horizontal: align, vertical: 'center' } }
        });
        const setColWidths = (ws: any, widths: number[]) => { ws['!cols'] = widths.map(w => ({ wch: w })); };

        // ── Hoja 0: PORTADA ──────────────────────────────────────
        const coverWs: any = {};
        const coverData = [
            [{ v: '🏡 LOS QUETZALES — REPORTE DE AUDITORÍA', t: 's', s: { font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '006b2c' } }, alignment: { horizontal: 'center', vertical: 'center' } } }],
            [{ v: '', t: 's', s: { fill: { fgColor: { rgb: '006b2c' } } } }],
            [cell('Período', true, 'f0fdf4', '006b2c'), cell(periodStr, false, 'f0fdf4', '1e293b')],
            [cell('Generado', true, 'FFFFFF', '006b2c'), cell(new Date().toLocaleString('es-MX'), false, 'FFFFFF', '1e293b')],
            [cell('Total asesores', true, 'f0fdf4', '006b2c'), cell(leaderboardRows.length, false, 'f0fdf4', '1e293b')],
            [cell('Total eventos', true, 'FFFFFF', '006b2c'), cell(kpis[0].value, false, 'FFFFFF', '1e293b')],
            [cell('Asignaciones', true, 'f0fdf4', '006b2c'), cell(kpis[1].value, false, 'f0fdf4', '1e293b')],
            [cell('Cambios de estado', true, 'FFFFFF', '006b2c'), cell(kpis[2].value, false, 'FFFFFF', '1e293b')],
            [cell('Descartados', true, 'f0fdf4', '6b2c00'), cell(kpis[3].value, false, 'f0fdf4', '1e293b')],
        ];
        coverData.forEach((row, r) => row.forEach((c, col) => { const addr = XLSX.utils.encode_cell({ r, c: col }); coverWs[addr] = c; }));
        coverWs['!ref'] = `A1:B${coverData.length}`;
        coverWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 1 } }];
        coverWs['!rows'] = [{ hpt: 36 }, { hpt: 8 }];
        setColWidths(coverWs, [28, 40]);
        XLSX.utils.book_append_sheet(wb, coverWs, '📋 Portada');

        // ── Hoja 1: RESUMEN POR ASESOR ───────────────────────────
        const sumWs: any = {};
        const sumHeaders = ['#', 'Asesor', 'Cartera Total', `Recibidos ${periodDisplayLabel}`, 'Cambios Estado', 'Descartados'];
        sumHeaders.forEach((h, c) => { sumWs[XLSX.utils.encode_cell({ r: 0, c })] = hdr(h); });
        leaderboardRows.forEach((r, ri) => {
            const rowBg = ri % 2 === 0 ? 'FFFFFF' : 'f0fdf4';
            const vals = [ri + 1, r.name, r.totalAsignados, r.periodReceived, r.periodStatusChanges, r.periodDiscarded];
            vals.forEach((v, c) => {
                const isNum = typeof v === 'number';
                sumWs[XLSX.utils.encode_cell({ r: ri + 1, c })] = cell(v, c === 1, rowBg, isNum && c === 2 ? '006b2c' : '1e293b', isNum ? 'center' : 'left');
            });
        });
        // Fila totales
        const tr = leaderboardRows.length + 1;
        ['TOTAL', '', ...([2,3,4,5].map(c => leaderboardRows.reduce((s, r) => s + [r.totalAsignados, r.periodReceived, r.periodStatusChanges, r.periodDiscarded][c-2], 0)))]
            .forEach((v, c) => { sumWs[XLSX.utils.encode_cell({ r: tr, c })] = cell(v, true, 'e2e8f0', '1e293b', typeof v === 'number' ? 'center' : 'left'); });
        sumWs['!ref'] = `A1:F${tr + 1}`;
        sumWs['!freeze'] = { xSplit: 0, ySplit: 1 };
        sumWs['!autofilter'] = { ref: `A1:F1` };
        sumWs['!rows'] = [{ hpt: 20 }];
        setColWidths(sumWs, [6, 22, 18, 22, 18, 14]);
        XLSX.utils.book_append_sheet(wb, sumWs, '📊 Resumen por Asesor');

        // ── Hoja 2: DETALLE DE EVENTOS ───────────────────────────
        const evColors: Record<string, { bg: string; fg: string }> = {
            assignment_change: { bg: 'ede9fe', fg: '6d28d9' },
            discarded:         { bg: 'fee2e2', fg: 'b91c1c' },
            status_change:     { bg: 'e0f2fe', fg: '0369a1' },
        };
        const detWs: any = {};
        const detHeaders = ['Fecha/Hora', 'Asesor', 'Cliente', 'Evento', 'Valor anterior', 'Nuevo valor'];
        detHeaders.forEach((h, c) => { detWs[XLSX.utils.encode_cell({ r: 0, c })] = hdr(h, '1e293b', 'FFFFFF'); });
        sorted.forEach((l, ri) => {
            const ev = evColors[l.event_type] || { bg: 'FFFFFF', fg: '1e293b' };
            const rowBg = ri % 2 === 0 ? 'FFFFFF' : 'f8fafc';
            const vals = [
                fmtDate(l.created_at),
                (l.asesor_email || '').split('@')[0],
                l.client_name || '—',
                EVENT_LABELS[l.event_type]?.label || l.event_type,
                l.old_value || '—',
                l.new_value || '—',
            ];
            vals.forEach((v, c) => {
                const isEvt = c === 3;
                detWs[XLSX.utils.encode_cell({ r: ri + 1, c })] = cell(v, isEvt, isEvt ? ev.bg : rowBg, isEvt ? ev.fg : '1e293b');
            });
        });
        detWs['!ref'] = `A1:F${sorted.length + 1}`;
        detWs['!freeze'] = { xSplit: 0, ySplit: 1 };
        detWs['!autofilter'] = { ref: `A1:F1` };
        setColWidths(detWs, [22, 18, 28, 22, 22, 22]);
        XLSX.utils.book_append_sheet(wb, detWs, '📋 Detalle Eventos');

        XLSX.writeFile(wb, `auditoria_${periodStr.replace(/[\s/]/g, '_')}.xlsx`);
    };

    // ── Reporte individual por asesor ─────────────────────────────────────
    const getAsesorEventos = (name: string) =>
        logs.filter(l => {
            const actor = (l.asesor_email || '').split('@')[0];
            const receptor = (l.new_value || '').split('@')[0];
            return actor === name || (l.event_type === 'assignment_change' && receptor === name);
        });

    const exportPdfAsesor = async (name: string) => {
        const { default: jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const { from, to } = getPeriodRange(period, customFrom, customTo);
        const periodLabel = `${from.toLocaleDateString('es-MX')} – ${to.toLocaleDateString('es-MX')}`;
        // Carga lazy: si no hay cartera cacheada, la pedimos al servidor
        let cartera = assignedClients[name] || [];
        if (cartera.length === 0) {
            const { data: clientData } = await supabase.rpc('get_asesor_clients', { p_asesor_key: name });
            cartera = (clientData || []).map((c: any) => ({ name: c.client_name || c.client_id, status: c.status || '—', date: c.assigned_at || '—' }));
            setAssignedClients(prev => ({ ...prev, [name]: cartera }));
        }
        const eventos = getAsesorEventos(name);
        const row = leaderboardRows.find(r => r.name === name);
        const doc = new (jsPDF as any)({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        let y = 14;

        // Encabezado verde
        doc.setFillColor(0, 107, 44);
        doc.rect(0, 0, pageW, 26, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(15); doc.setFont('helvetica', 'bold');
        doc.text(`Reporte de Asesor: ${name}`, 10, 11);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text(`Período: ${periodLabel}   ·   Generado: ${new Date().toLocaleString('es-MX')}`, 10, 19);
        y = 32;

        // KPIs del asesor
        const asesorKpis = [
            { label: 'Cartera actual', value: cartera.length, color: '#006b2c' },
            { label: `Recibidos ${periodDisplayLabel}`, value: row?.periodReceived || 0, color: '#6d28d9' },
            { label: 'Cambios de estado', value: row?.periodStatusChanges || 0, color: '#0369a1' },
            { label: 'Descartados', value: row?.periodDiscarded || 0, color: '#b91c1c' },
        ];
        const kpiW = (pageW - 20) / asesorKpis.length;
        asesorKpis.forEach((k, i) => {
            const x = 10 + i * kpiW;
            doc.setFillColor(245, 248, 250);
            doc.roundedRect(x, y, kpiW - 3, 16, 2, 2, 'F');
            doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
            doc.text(k.label, x + (kpiW - 3) / 2, y + 5, { align: 'center' });
            const hex = k.color.replace('#', '');
            doc.setTextColor(parseInt(hex.substring(0,2),16), parseInt(hex.substring(2,4),16), parseInt(hex.substring(4,6),16));
            doc.setFontSize(14); doc.setFont('helvetica', 'bold');
            doc.text(String(k.value), x + (kpiW - 3) / 2, y + 13, { align: 'center' });
        });
        y += 22;

        // Tabla 1: Cartera de clientes
        doc.setTextColor(30,30,30); doc.setFontSize(10); doc.setFont('helvetica','bold');
        doc.text(`Cartera actual (${cartera.length} clientes)`, 10, y); y += 4;
        autoTable(doc, {
            startY: y,
            head: [['#', 'Cliente', 'Estado', 'Fecha asignación']],
            body: cartera.map((c, i) => [i + 1, c.name, c.status, c.date]),
            headStyles: { fillColor: [0,107,44], textColor: 255, fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [245,250,246] },
            columnStyles: { 0: { cellWidth: 8, halign: 'center' } },
            margin: { left: 10, right: 10 },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
        if (y > pageH - 60) { doc.addPage(); y = 14; }

        // Tabla 2: Actividad en el período
        doc.setTextColor(30,30,30); doc.setFontSize(10); doc.setFont('helvetica','bold');
        doc.text(`Actividad en el período (${eventos.length} eventos)`, 10, y); y += 4;
        autoTable(doc, {
            startY: y,
            head: [['Fecha/Hora', 'Evento', 'Cliente', 'Anterior', 'Nuevo valor']],
            body: eventos.map(l => [
                fmtDate(l.created_at),
                EVENT_LABELS[l.event_type]?.label || l.event_type,
                l.client_name || '—',
                l.old_value || '—',
                l.new_value || '—',
            ]),
            headStyles: { fillColor: [51,65,85], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
            bodyStyles: { fontSize: 7.5 },
            alternateRowStyles: { fillColor: [248,250,252] },
            columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 28 } },
            margin: { left: 10, right: 10 },
        });
        const total = (doc as any).internal.getNumberOfPages();
        for (let p = 1; p <= total; p++) {
            doc.setPage(p); doc.setFontSize(7); doc.setTextColor(160,160,160);
            doc.text(`Los Quetzales CRM  ·  Asesor: ${name}  ·  Página ${p} de ${total}`, pageW / 2, pageH - 6, { align: 'center' });
        }
        doc.save(`asesor_${name}_${periodLabel.replace(/[\s/]/g,'_')}.pdf`);
    };

    const exportExcelAsesor = async (name: string) => {
        const XLSX = (await import('xlsx-js-style')) as any;
        const { from, to } = getPeriodRange(period, customFrom, customTo);
        const periodStr = `${from.toLocaleDateString('es-MX')} – ${to.toLocaleDateString('es-MX')}`;
        let cartera = assignedClients[name] || [];
        if (cartera.length === 0) {
            const { data: clientData } = await supabase.rpc('get_asesor_clients', { p_asesor_key: name });
            cartera = (clientData || []).map((c: any) => ({ name: c.client_name || c.client_id, status: c.status || '—', date: c.assigned_at || '—' }));
            setAssignedClients(prev => ({ ...prev, [name]: cartera }));
        }
        const eventos = getAsesorEventos(name);
        const row = leaderboardRows.find(r => r.name === name);
        const wb = XLSX.utils.book_new();

        const hdr = (txt: string, bg = '006b2c') => ({ v: txt, t: 's', s: { font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 }, fill: { fgColor: { rgb: bg } }, alignment: { horizontal: 'center', vertical: 'center' } } });
        const cell = (v: any, bold = false, bg = 'FFFFFF', color = '1e293b', align = 'left') => ({ v, t: typeof v === 'number' ? 'n' : 's', s: { font: { bold, color: { rgb: color }, sz: 10 }, fill: { fgColor: { rgb: bg } }, alignment: { horizontal: align, vertical: 'center' } } });
        const setW = (ws: any, w: number[]) => { ws['!cols'] = w.map(wch => ({ wch })); };

        // ── Hoja 1: FICHA DE ASESOR ──────────────────────────────
        const fichaWs: any = {};
        const fichaData: [string, any][] = [
            ['🏡 LOS QUETZALES — REPORTE DE ASESOR', ''],
            ['', ''],
            ['ASESOR', name.toUpperCase()],
            ['PERÍODO', periodStr],
            ['CARTERA TOTAL', cartera.length],
            [`RECIBIDOS ${periodDisplayLabel.toUpperCase()}`, row?.periodReceived || 0],
            ['CAMBIOS DE ESTADO', row?.periodStatusChanges || 0],
            ['DESCARTADOS', row?.periodDiscarded || 0],
        ];
        fichaData.forEach(([label, val], r) => {
            if (r === 0) {
                fichaWs[XLSX.utils.encode_cell({ r, c: 0 })] = { v: label, t: 's', s: { font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '006b2c' } }, alignment: { horizontal: 'center' } } };
            } else if (r === 1) {
                fichaWs[XLSX.utils.encode_cell({ r, c: 0 })] = { v: '', t: 's', s: { fill: { fgColor: { rgb: '006b2c' } } } };
            } else {
                const rowBg = r % 2 === 0 ? 'FFFFFF' : 'f0fdf4';
                fichaWs[XLSX.utils.encode_cell({ r, c: 0 })] = cell(label, true, rowBg, '006b2c');
                fichaWs[XLSX.utils.encode_cell({ r, c: 1 })] = cell(val, false, rowBg, '1e293b', typeof val === 'number' ? 'center' : 'left');
            }
        });
        fichaWs['!ref'] = `A1:B${fichaData.length}`;
        fichaWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }];
        fichaWs['!rows'] = [{ hpt: 32 }];
        setW(fichaWs, [28, 32]);
        XLSX.utils.book_append_sheet(wb, fichaWs, '📋 Resumen');

        // ── Hoja 2: CARTERA DE CLIENTES ──────────────────────────
        const statusBg: Record<string, { bg: string; fg: string }> = {
            'Citado': { bg: 'd1fae5', fg: '065f46' }, 'Activo': { bg: 'dcfce7', fg: '166534' },
            'Nuevo': { bg: 'e0f2fe', fg: '0369a1' }, 'No responde': { bg: 'fee2e2', fg: 'b91c1c' },
            'Descartado': { bg: 'fef3c7', fg: '92400e' }, 'En seguimiento': { bg: 'fde68a', fg: '92400e' },
        };
        const cartWs: any = {};
        ['#', 'Cliente', 'Estado', 'Fecha asignación'].forEach((h, c) => { cartWs[XLSX.utils.encode_cell({ r: 0, c })] = hdr(h); });
        cartera.forEach((c, ri) => {
            const st = statusBg[c.status] || { bg: ri % 2 === 0 ? 'FFFFFF' : 'f0fdf4', fg: '1e293b' };
            cartWs[XLSX.utils.encode_cell({ r: ri+1, c: 0 })] = cell(ri+1, false, ri%2===0?'FFFFFF':'f0fdf4', '1e293b', 'center');
            cartWs[XLSX.utils.encode_cell({ r: ri+1, c: 1 })] = cell(c.name, false, ri%2===0?'FFFFFF':'f0fdf4');
            cartWs[XLSX.utils.encode_cell({ r: ri+1, c: 2 })] = cell(c.status, true, st.bg, st.fg, 'center');
            cartWs[XLSX.utils.encode_cell({ r: ri+1, c: 3 })] = cell(c.date, false, ri%2===0?'FFFFFF':'f0fdf4', '1e293b', 'center');
        });
        cartWs['!ref'] = `A1:D${cartera.length+1}`;
        cartWs['!freeze'] = { xSplit: 0, ySplit: 1 };
        cartWs['!autofilter'] = { ref: 'A1:D1' };
        setW(cartWs, [6, 35, 22, 18]);
        XLSX.utils.book_append_sheet(wb, cartWs, '👥 Clientes asignados');

        // ── Hoja 3: ACTIVIDAD DEL PERÍODO ────────────────────────
        const evColors: Record<string, { bg: string; fg: string }> = { assignment_change: { bg: 'ede9fe', fg: '6d28d9' }, discarded: { bg: 'fee2e2', fg: 'b91c1c' }, status_change: { bg: 'e0f2fe', fg: '0369a1' } };
        const actWs: any = {};
        ['Fecha/Hora', 'Evento', 'Cliente', 'Anterior', 'Nuevo valor'].forEach((h, c) => { actWs[XLSX.utils.encode_cell({ r: 0, c })] = hdr(h, '1e293b'); });
        eventos.forEach((l, ri) => {
            const ev = evColors[l.event_type] || { bg: 'FFFFFF', fg: '1e293b' };
            const rowBg = ri % 2 === 0 ? 'FFFFFF' : 'f8fafc';
            [fmtDate(l.created_at), EVENT_LABELS[l.event_type]?.label || l.event_type, l.client_name||'—', l.old_value||'—', l.new_value||'—']
                .forEach((v, c) => { actWs[XLSX.utils.encode_cell({ r: ri+1, c })] = cell(v, c===1, c===1?ev.bg:rowBg, c===1?ev.fg:'1e293b'); });
        });
        actWs['!ref'] = `A1:E${eventos.length+1}`;
        actWs['!freeze'] = { xSplit: 0, ySplit: 1 };
        setW(actWs, [22, 22, 28, 22, 22]);
        XLSX.utils.book_append_sheet(wb, actWs, '📅 Actividad del período');

        XLSX.writeFile(wb, `asesor_${name}_${periodStr.replace(/[\s/]/g,'_')}.xlsx`);
    };

    return (
        <div style={{ paddingBottom: '20px' }}>
            {/* ── Barra de filtros ── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
                {/* Período */}
                <div style={{ display: 'flex', gap: '4px', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '4px', background: 'var(--ghost-bg)' }}>
                    {periodOptions.map(opt => (
                        <button key={opt.key} onClick={() => setPeriod(opt.key)}
                            style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: period === opt.key ? '700' : '400', fontSize: '0.83rem', background: period === opt.key ? 'var(--primary-accent)' : 'transparent', color: period === opt.key ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Fechas custom */}
                {period === 'custom' && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                            style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '0.83rem' }} />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>hasta</span>
                        <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                            style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '0.83rem' }} />
                    </div>
                )}

                {/* Filtro asesor */}
                <select value={filterAsesor} onChange={e => setFilterAsesor(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '0.83rem', cursor: 'pointer' }}>
                    <option value=''>Todos los asesores</option>
                    {uniqueAsesores.map(email => (
                        <option key={email!} value={email!}>{email!.split('@')[0]}</option>
                    ))}
                </select>

                {/* Filtro tipo */}
                <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)}
                    style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '0.83rem', cursor: 'pointer' }}>
                    <option value=''>Todos los eventos</option>
                    <option value='status_change'>Cambios de estado</option>
                    <option value='assignment_change'>Asignaciones</option>
                    <option value='discarded'>Descartados</option>
                </select>

                {/* Buscar */}
                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '11px', top: '11px', color: 'var(--text-muted)' }} />
                    <input type='text' placeholder='Buscar cliente u asesor…' value={search} onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '0.83rem', outline: 'none', boxSizing: 'border-box' }} />
                </div>

                {/* Exportar — split button PDF / Excel */}
                <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: `1px solid ${sorted.length > 0 ? 'var(--primary-accent)' : 'var(--border-glass)'}` }}>
                        <button onClick={exportPdf} disabled={sorted.length === 0}
                            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px', border: 'none', background: sorted.length > 0 ? 'var(--primary-accent)' : 'var(--ghost-bg)', color: sorted.length > 0 ? '#fff' : 'var(--text-muted)', fontFamily: 'inherit', fontWeight: '700', fontSize: '0.83rem', cursor: sorted.length > 0 ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
                            <Download size={15} /> PDF
                        </button>
                        <button onClick={() => setShowExportMenu(v => !v)} disabled={sorted.length === 0}
                            title="Más opciones de exportación"
                            style={{ padding: '8px 10px', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.25)', background: sorted.length > 0 ? 'var(--primary-accent)' : 'var(--ghost-bg)', color: sorted.length > 0 ? '#fff' : 'var(--text-muted)', cursor: sorted.length > 0 ? 'pointer' : 'not-allowed', fontSize: '0.75rem', lineHeight: 1 }}>
                            ▾
                        </button>
                    </div>
                    {showExportMenu && sorted.length > 0 && (
                        <div onMouseLeave={() => setShowExportMenu(false)}
                            style={{ position: 'absolute', top: '110%', right: 0, zIndex: 200, background: 'var(--bg-panel)', border: '1px solid var(--border-glass)', borderRadius: '10px', overflow: 'hidden', minWidth: '180px', boxShadow: '0 8px 28px rgba(0,0,0,0.45)' }}>
                            <button onClick={() => { exportPdf(); setShowExportMenu(false); }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--ghost-bg)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                style={{ width: '100%', padding: '11px 16px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.84rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '9px' }}>
                                📄 Descargar PDF
                            </button>
                            <button onClick={() => { exportExcel(); setShowExportMenu(false); }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--ghost-bg)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                style={{ width: '100%', padding: '11px 16px', background: 'transparent', border: 'none', borderTop: '1px solid var(--border-glass)', color: 'var(--text-main)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.84rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '9px' }}>
                                📊 Descargar Excel
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── KPIs ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {kpis.map(k => (
                    <div key={k.label} className='glass-panel' style={{ padding: '18px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</p>
                        <p style={{ margin: 0, fontSize: '2rem', fontWeight: '800', color: k.color }}>{loading ? '…' : k.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Leaderboard por asesor ── */}
            {leaderboardRows.length > 0 && (
                <div className='glass-panel' style={{ padding: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '0.93rem', fontWeight: '700' }}>🏆 Productividad por asesor</h3>
                        {/* Toggle de modo */}
                        <div style={{ display: 'flex', gap: '4px', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '3px', background: 'var(--ghost-bg)' }}>
                            <button onClick={() => setLeaderboardMode('cartera')}
                                style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: leaderboardMode === 'cartera' ? '700' : '400', cursor: 'pointer', background: leaderboardMode === 'cartera' ? 'var(--primary-accent)' : 'transparent', color: leaderboardMode === 'cartera' ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                                🗂 Cartera total
                            </button>
                            <button onClick={() => setLeaderboardMode('asignaciones')}
                                style={{ padding: '5px 12px', borderRadius: '6px', border: 'none', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: leaderboardMode === 'asignaciones' ? '700' : '400', cursor: 'pointer', background: leaderboardMode === 'asignaciones' ? '#6d28d9' : 'transparent', color: leaderboardMode === 'asignaciones' ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
                                📥 Asignaciones {periodDisplayLabel}
                            </button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {leaderboardRows.map((r, idx) => {
                            const medalColors = ['#f59e0b', '#94a3b8', '#b45309'];
                            const avatarColor = idx < 3 ? medalColors[idx] : '#374151';
                            const displayValue = leaderboardMode === 'cartera' ? r.totalAsignados : r.periodReceived;
                            const maxValue = leaderboardMode === 'cartera'
                                ? maxAssigned
                                : Math.max(...leaderboardRows.map(x => x.periodReceived), 1);
                            const barPct = Math.round((displayValue / maxValue) * 100);
                            return (
                                <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '10px', background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-glass)', transition: 'background 0.2s', position: 'relative' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; setActiveCardMenu(null); }}>
                                    {/* Posición + Avatar */}
                                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', width: '36px' }}>
                                        <span style={{ fontSize: '0.68rem', color: avatarColor, fontWeight: '800' }}>#{idx + 1}</span>
                                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: `${avatarColor}22`, border: `2px solid ${avatarColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: '800', color: avatarColor }}>
                                            {r.name.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                    {/* Nombre + barra + métricas */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{r.name}</span>
                                            <span style={{ fontWeight: '800', fontSize: '1.3rem', color: avatarColor, lineHeight: 1 }}>{displayValue}</span>
                                        </div>
                                        {/* Barra de progreso */}
                                        <div style={{ height: '5px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', marginBottom: '8px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${barPct}%`, borderRadius: '4px', background: `linear-gradient(90deg, ${avatarColor}99, ${avatarColor})`, transition: 'width 0.6s ease' }} />
                                        </div>
                                        {/* Mini-métricas — distintas por modo */}
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                            {leaderboardMode === 'cartera' ? (
                                                /* MODO CARTERA: solo info de cartera, sin temporalidad */
                                                <>
                                                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(0,107,44,0.15)', color: '#4ade80' }}>
                                                        🗂 {r.totalAsignados} en cartera total
                                                    </span>
                                                    {r.periodReceived > 0 && (
                                                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(109,40,217,0.10)', color: '#a78bfa' }}>
                                                            📥 {r.periodReceived} recibidos {periodDisplayLabel}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                /* MODO ASIGNACIONES: solo info del período seleccionado */
                                                <>
                                                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: r.periodReceived > 0 ? 'rgba(109,40,217,0.15)' : 'rgba(100,100,100,0.08)', color: r.periodReceived > 0 ? '#8b5cf6' : 'var(--text-muted)' }}>
                                                        📥 {r.periodReceived > 0 ? `${r.periodReceived} asignados ${periodDisplayLabel}` : `Sin asignaciones ${periodDisplayLabel}`}
                                                    </span>
                                                    {r.periodStatusChanges > 0 && (
                                                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(3,105,161,0.12)', color: '#38bdf8' }}>
                                                            🔄 {r.periodStatusChanges} estados
                                                        </span>
                                                    )}
                                                    {r.periodDiscarded > 0 && (
                                                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(185,28,28,0.12)', color: '#f87171' }}>
                                                            🗑 {r.periodDiscarded} descartados
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {/* Botón reporte individual */}
                                    <div style={{ flexShrink: 0, position: 'relative' }}>
                                        <button
                                            onClick={e => { e.stopPropagation(); setActiveCardMenu(activeCardMenu === r.name ? null : r.name); }}
                                            title="Generar reporte de este asesor"
                                            style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--ghost-bg)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            📄 ▾
                                        </button>
                                        {activeCardMenu === r.name && (
                                            <div style={{ position: 'absolute', top: '110%', right: 0, zIndex: 300, background: 'var(--bg-panel)', border: '1px solid var(--border-glass)', borderRadius: '10px', overflow: 'hidden', minWidth: '185px', boxShadow: '0 8px 28px rgba(0,0,0,0.5)' }}>
                                                <button onClick={() => { exportPdfAsesor(r.name); setActiveCardMenu(null); }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--ghost-bg)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    style={{ width: '100%', padding: '11px 15px', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.83rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    📄 PDF — {r.name}
                                                </button>
                                                <button onClick={() => { exportExcelAsesor(r.name); setActiveCardMenu(null); }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--ghost-bg)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    style={{ width: '100%', padding: '11px 15px', background: 'transparent', border: 'none', borderTop: '1px solid var(--border-glass)', color: 'var(--text-main)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.83rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    📊 Excel — {r.name}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Tabla de eventos ── */}
            <div className='glass-panel' style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '0.93rem', fontWeight: '700' }}>
                        📋 Historial de eventos
                        <span style={{ marginLeft: '10px', fontSize: '0.78rem', fontWeight: '400', color: 'var(--text-muted)' }}>{sorted.length} registros</span>
                    </h3>
                    <button onClick={() => setSortAsc(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', border: '1px solid var(--border-glass)', borderRadius: '7px', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem' }}>
                        {sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {sortAsc ? 'Más antiguo primero' : 'Más reciente primero'}
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando registros…</div>
                ) : sorted.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                        <ClipboardList size={36} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.25 }} />
                        Sin eventos en este período. Los eventos se registrarán automáticamente a partir de ahora.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr>
                                    {['Fecha / Hora', 'Asesor', 'Cliente', 'Evento', 'Valor anterior', 'Nuevo valor'].map(h => (
                                        <th key={h} style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'left', borderBottom: '1px solid var(--border-glass)', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map(l => {
                                    const ev = EVENT_LABELS[l.event_type] || { label: l.event_type, bg: 'var(--ghost-bg)', color: 'var(--text-muted)' };
                                    return (
                                        <tr key={l.id}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--ghost-bg)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                            <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</td>
                                            <td style={{ padding: '11px 14px', fontWeight: '600', whiteSpace: 'nowrap' }}>{(l.asesor_email || '').split('@')[0]}</td>
                                            <td style={{ padding: '11px 14px' }}>{l.client_name || '—'}</td>
                                            <td style={{ padding: '11px 14px' }}>
                                                <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700', background: ev.bg, color: ev.color }}>{ev.label}</span>
                                            </td>
                                            <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: '0.83rem' }}>{l.old_value || '—'}</td>
                                            <td style={{ padding: '11px 14px', fontWeight: '600', color: 'var(--text-main)' }}>{l.new_value || '—'}</td>
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

// ── TAB 5: Última Actividad ───────────────────────────────────────────────────
interface ProfileActivity {
    id: string;
    email: string;
    role: string;
    last_seen: string | null;
    last_action: string | null;
}

function relativeTime(iso: string | null): string {
    if (!iso) return 'Nunca';
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000)      return '🟢 Ahora mismo';
    if (diff < 3600000)    return `🟢 Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 7200000)    return `🟡 Hace ${Math.floor(diff / 3600000)}h`;
    if (diff < 86400000)   return `🟡 Hace ${Math.floor(diff / 3600000)}h`;
    if (diff < 172800000)  return `🔴 Hace ${Math.floor(diff / 86400000)} día`;
    return `🔴 Hace ${Math.floor(diff / 86400000)} días`;
}

function isOnline(iso: string | null): boolean {
    if (!iso) return false;
    return Date.now() - new Date(iso).getTime() < 300000; // 5 min
}

function TabActividad() {
    const [profiles, setProfiles] = useState<ProfileActivity[]>([]);
    const [loading, setLoading]   = useState(true);
    const [search, setSearch]     = useState('');
    const [sortBy, setSortBy]     = useState<'last_seen' | 'name' | 'role'>('last_seen');
    const [now, setNow]           = useState(Date.now());

    // Actualizar timestamps cada 30 s
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(id);
    }, []);

    const load = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, email, role, last_seen, last_action')
            .order('last_seen', { ascending: false, nullsFirst: false });
        if (error) console.error('[TabActividad]', error.message);
        setProfiles((data as ProfileActivity[]) || []);
        setLoading(false);
    };

    useEffect(() => {
        load();
        const ch = supabase.channel('activity_tab')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, load)
            .subscribe();
        return () => { supabase.removeChannel(ch); };
    }, []);

    const ROLE_LABELS: Record<string, { label: string; color: string }> = {
        super_admin: { label: 'Super Admin', color: '#f59e0b' },
        master:      { label: 'Master',      color: '#8b5cf6' },
        gerente:     { label: 'Gerente',      color: '#38bdf8' },
        asesor:      { label: 'Asesor',       color: '#10b981' },
        readonly:    { label: 'Solo lectura', color: '#6b7280' },
    };

    const filtered = profiles
        .filter(p => {
            const q = search.toLowerCase();
            return p.email?.toLowerCase().includes(q) ?? false;
        })
        .sort((a, b) => {
            if (sortBy === 'last_seen') {
                return (b.last_seen ? new Date(b.last_seen).getTime() : 0)
                     - (a.last_seen ? new Date(a.last_seen).getTime() : 0);
            }
            if (sortBy === 'name') return a.email.localeCompare(b.email);
            return (a.role || '').localeCompare(b.role || '');
        });

    const onlineCount = profiles.filter(p => isOnline(p.last_seen)).length;

    // supress unused warning
    void now;

    return (
        <div>
            {/* KPIs rápidos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginBottom: '24px' }}>
                {[
                    { label: 'Total usuarios', value: profiles.length, color: 'var(--primary-accent)' },
                    { label: '🟢 En línea ahora', value: onlineCount, color: '#10b981' },
                    { label: '🔴 Sin conexión', value: profiles.length - onlineCount, color: '#ef4444' },
                    { label: 'Con actividad', value: profiles.filter(p => p.last_action).length, color: '#f59e0b' },
                ].map(m => (
                    <div key={m.label} className='glass-panel' style={{ padding: '16px 18px', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.label}</p>
                        <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: m.color }}>
                            {loading ? '…' : m.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Controles */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                    <input
                        type='text' placeholder='Buscar asesor...' value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', fontSize: '0.85rem' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {(['last_seen', 'name', 'role'] as const).map(s => (
                        <button key={s} onClick={() => setSortBy(s)}
                            style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${sortBy === s ? 'var(--primary-accent)' : 'var(--border-glass)'}`, background: sortBy === s ? 'rgba(0,240,255,0.1)' : 'transparent', color: sortBy === s ? 'var(--primary-accent)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: sortBy === s ? '700' : '400', transition: 'all 0.2s' }}>
                            {s === 'last_seen' ? '🕒 Reciente' : s === 'name' ? '🔤 Nombre' : '👤 Rol'}
                        </button>
                    ))}
                </div>
                <button onClick={load} title='Actualizar'
                    style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ↺ Actualizar
                </button>
            </div>

            {/* Tabla */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Cargando actividad...</div>
            ) : (
                <div className='glass-panel' style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.02)' }}>
                                    {['Usuario', 'Rol', 'Última conexión', 'Última acción', 'Estado'].map(h => (
                                        <th key={h} style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'left', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(p => {
                                    const nombre   = p.email?.split('@')[0] || '—';
                                    const online   = isOnline(p.last_seen);
                                    const roleInfo = ROLE_LABELS[p.role] || { label: p.role || '—', color: '#6b7280' };
                                    return (
                                        <tr key={p.id}
                                            style={{ borderBottom: '1px solid rgba(80,200,255,0.05)', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                                            {/* Usuario */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: online ? 'linear-gradient(135deg, #10b981, #00f0ff)' : 'linear-gradient(135deg, #374151, #1f2937)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: '700', color: online ? '#000' : 'var(--text-muted)' }}>
                                                            {nombre.charAt(0).toUpperCase()}
                                                        </div>
                                                        {online && (
                                                            <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', border: '2px solid var(--bg-main)', boxShadow: '0 0 6px #10b981' }} />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p style={{ margin: 0, fontWeight: '600', fontSize: '0.87rem' }}>{nombre}</p>
                                                        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.email}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Rol */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: '600', background: `${roleInfo.color}18`, color: roleInfo.color, border: `1px solid ${roleInfo.color}40` }}>
                                                    {roleInfo.label}
                                                </span>
                                            </td>

                                            {/* Última conexión */}
                                            <td style={{ padding: '14px 16px', fontSize: '0.82rem' }}>
                                                <span style={{ color: online ? '#10b981' : p.last_seen ? 'var(--text-muted)' : '#ef4444', fontWeight: online ? '600' : '400' }}>
                                                    {relativeTime(p.last_seen)}
                                                </span>
                                                {p.last_seen && (
                                                    <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                        {new Date(p.last_seen).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                )}
                                            </td>

                                            {/* Última acción */}
                                            <td style={{ padding: '14px 16px', fontSize: '0.82rem', maxWidth: '260px' }}>
                                                {p.last_action ? (
                                                    <span style={{ color: 'var(--text-main)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                                        {p.last_action}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin actividad registrada</span>
                                                )}
                                            </td>

                                            {/* Estado */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600', background: online ? 'rgba(16,185,129,0.12)' : 'rgba(107,114,128,0.12)', color: online ? '#10b981' : '#6b7280', border: `1px solid ${online ? 'rgba(16,185,129,0.3)' : 'rgba(107,114,128,0.2)'}` }}>
                                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: online ? '#10b981' : '#6b7280', boxShadow: online ? '0 0 6px #10b981' : 'none' }} />
                                                    {online ? 'En línea' : 'Desconectado'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
                                No hay usuarios que coincidan con tu búsqueda.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Página Principal ──────────────────────────────────────────────────────────
export default function Reportes() {
    const { session, role } = useAuth();
    const [tab, setTab] = useState<'citas' | 'notas' | 'resumen' | 'auditorias' | 'actividad'>('citas');

    const isAdmin = role === 'super_admin' || role === 'gerente' || role === 'master';

    const tabs = [
        { key: 'citas',       label: '📅 Citas',             icon: CalendarDays  },
        { key: 'notas',       label: '📝 Notas',             icon: FileText      },
        ...(isAdmin ? [
            { key: 'resumen',    label: '📊 Resumen',          icon: BarChart3     },
            { key: 'actividad',  label: '👥 Última Actividad',  icon: Activity      },
        ] : []),
        ...(role !== 'readonly' ? [{ key: 'auditorias', label: '📋 Auditorías', icon: ClipboardList }] : []),
    ] as { key: typeof tab; label: string; icon: any }[];

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', margin: 0 }}>Módulo de <span className='glow-text' style={{ color: 'var(--primary-accent)' }}>Reportes</span></h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Seguimiento de citas, notas, auditoría y actividad del equipo en tiempo real.</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0', flexWrap: 'wrap' }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{ padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--primary-accent)' : 'transparent'}`, color: tab === t.key ? 'var(--primary-accent)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: tab === t.key ? '700' : '400', fontSize: '0.9rem', transition: 'all 0.2s', marginBottom: '-1px' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'citas'      && <TabCitas session={session} role={role || ''} />}
            {tab === 'notas'      && <TabNotas session={session} role={role || ''} />}
            {tab === 'resumen'    && <TabResumen />}
            {tab === 'auditorias' && <TabAuditorias role={role || ''} />}
            {tab === 'actividad'  && <TabActividad />}
        </div>
    );
}


