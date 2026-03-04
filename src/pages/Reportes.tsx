import { useState, useEffect, useRef } from 'react';
import { Search, X, CalendarDays, FileText, BarChart3, Save, Edit2, Trash2 } from 'lucide-react';
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
        loadAll();
        const channel = supabase.channel('realtime_notes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'client_notes' }, loadAll)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const loadAll = async () => {
        setLoading(true);
        const [sheetData, { data: notesData }] = await Promise.all([
            fetchClientsFromSheet(),
            supabase.from('client_notes').select('*').order('created_at', { ascending: false }),
        ]);
        const emailPrefix = session?.user?.email?.split('@')[0]?.toLowerCase() || '';
        const visible = role === 'asesor'
            ? sheetData.filter(c =>
                c.assigned_to === session?.user?.id ||
                (c.sheet_assigned && c.sheet_assigned.toLowerCase().includes(emailPrefix))
            )
            : sheetData;
        setClients(visible);
        setNotes(notesData || []);
        setLoading(false);
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
        setEditingId(null);
        setEditingText('');
        loadAll();
    };

    const filtered = clients.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
        const hasNotes = notes.some(n => n.client_id === c.id);
        return matchSearch && (!filterHasNotes || hasNotes);
    });

    const clientNotes = selectedClient ? notes.filter(n => n.client_id === selectedClient.id) : [];

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

// ─── Página Principal ──────────────────────────────────────
export default function Reportes() {
    const { session, role } = useAuth();
    const [tab, setTab] = useState<'citas' | 'notas' | 'resumen'>('citas');

    const tabs = [
        { key: 'citas', label: '📅 Citas', icon: CalendarDays },
        { key: 'notas', label: '📝 Notas', icon: FileText },
        ...(role === 'super_admin' || role === 'gerente' ? [{ key: 'resumen', label: '📊 Resumen', icon: BarChart3 }] : []),
    ] as { key: typeof tab; label: string; icon: any }[];

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', margin: 0 }}>Módulo de <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>Reportes</span></h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Seguimiento de citas y notas de clientes en tiempo real.</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0' }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{ padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--primary-accent)' : 'transparent'}`, color: tab === t.key ? 'var(--primary-accent)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: tab === t.key ? '700' : '400', fontSize: '0.9rem', transition: 'all 0.2s', marginBottom: '-1px' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Contenido del tab */}
            {tab === 'citas' && <TabCitas session={session} role={role || ''} />}
            {tab === 'notas' && <TabNotas session={session} role={role || ''} />}
            {tab === 'resumen' && <TabResumen />}
        </div>
    );
}
