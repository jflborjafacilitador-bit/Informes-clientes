import { useState, useEffect } from 'react';
import { UserPlus, Shield, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const ROLES = ['super_admin', 'gerente', 'asesor', 'recepcion', 'readonly'];

const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Director',
    gerente: 'Gerente',
    asesor: 'Asesor',
    recepcion: 'Recepción',
    readonly: 'Solo lectura',
};

const ROLE_COLORS: Record<string, string> = {
    super_admin: '#00f0ff',
    gerente: '#f59e0b',
    asesor: '#10b981',
    recepcion: '#a855f7',
    readonly: '#6b7280',
};

function timeAgo(dateStr: string | null | undefined): string {
    if (!dateStr) return 'Nunca';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Ayer';
    return `Hace ${days} días`;
}

export default function Usuarios() {
    const { role: myRole } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ email: '', password: '', role: 'asesor' });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

    useEffect(() => { loadUsers(); }, []);

    // Suscribirse al canal de presencia para ver quién está en línea
    useEffect(() => {
        const channel = supabase.channel('online_users');
        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const ids = new Set<string>();
                Object.values(state).forEach((presences: any[]) => {
                    presences.forEach(p => { if (p.user_id) ids.add(p.user_id); });
                });
                setOnlineIds(ids);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('profiles')
            .select('id, email, role, last_seen, last_action')
            .order('role');
        if (data) setUsers(data);
        setLoading(false);
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    };

    const handleCreate = async () => {
        if (!form.email || !form.password) {
            setMsg({ text: 'Email y contraseña son requeridos.', ok: false });
            return;
        }
        setSaving(true);
        setMsg(null);

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: { data: { role: form.role } },
        });

        if (authError || !authData.user) {
            setMsg({ text: authError?.message || 'Error creando usuario.', ok: false });
            setSaving(false);
            return;
        }

        await supabase.from('profiles').upsert(
            { id: authData.user.id, email: form.email, role: form.role },
            { onConflict: 'id', ignoreDuplicates: false }
        );

        setMsg({ text: `✓ Usuario ${form.email} creado como "${ROLE_LABELS[form.role]}".`, ok: true });
        setForm({ email: '', password: '', role: 'asesor' });
        setShowForm(false);
        loadUsers();
        setSaving(false);
    };

    if (myRole !== 'super_admin') {
        return (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                <Shield size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
                <h2>Acceso restringido</h2>
                <p style={{ color: 'var(--text-muted)' }}>Solo el Director puede gestionar usuarios.</p>
            </div>
        );
    }

    const onlineCount = users.filter(u => onlineIds.has(u.id)).length;

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Gestión de <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>Usuarios</span></h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Administra accesos y roles del equipo.
                        {onlineCount > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', padding: '2px 10px', fontSize: '0.78rem', color: '#10b981' }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                                {onlineCount} en línea
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'linear-gradient(135deg, var(--primary-accent), var(--secondary-accent))',
                        border: 'none', color: '#fff', padding: '10px 20px',
                        borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
                        boxShadow: '0 0 15px rgba(0,240,255,0.3)'
                    }}>
                    <UserPlus size={18} />
                    {showForm ? 'Cancelar' : 'Agregar Usuario'}
                </button>
            </div>

            {/* Formulario nuevo usuario */}
            {showForm && (
                <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 20px 0' }}>Nuevo Usuario</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px auto', gap: '12px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Email</label>
                            <input type="email" placeholder="usuario@quetzales.com" value={form.email}
                                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Contraseña temporal</label>
                            <input type="password" placeholder="••••••••" value={form.password}
                                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Rol</label>
                            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'var(--bg-panel)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', outline: 'none' }}>
                                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </select>
                        </div>
                        <button onClick={handleCreate} disabled={saving}
                            style={{ padding: '10px 20px', borderRadius: '8px', background: saving ? 'rgba(255,255,255,0.1)' : 'var(--primary-accent)', border: 'none', color: '#000', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer' }}>
                            {saving ? 'Creando...' : 'Crear'}
                        </button>
                    </div>
                    {msg && (
                        <p style={{ marginTop: '12px', fontSize: '0.85rem', color: msg.ok ? 'var(--success)' : 'var(--danger)' }}>
                            {msg.ok ? '✓' : '✗'} {msg.text}
                        </p>
                    )}
                </div>
            )}

            {/* Tabla de usuarios */}
            <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando usuarios...</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '640px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                <th style={{ padding: '14px 12px', color: 'var(--text-muted)', fontWeight: '500', width: '36px' }}></th>
                                <th style={{ padding: '14px 12px', color: 'var(--text-muted)', fontWeight: '500' }}>Email</th>
                                <th style={{ padding: '14px 12px', color: 'var(--text-muted)', fontWeight: '500' }}>Rol</th>
                                <th style={{ padding: '14px 12px', color: 'var(--text-muted)', fontWeight: '500' }}>Último visto</th>
                                <th style={{ padding: '14px 12px', color: 'var(--text-muted)', fontWeight: '500' }}>Última acción</th>
                                <th style={{ padding: '14px 12px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>Acc.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => {
                                const isOnline = onlineIds.has(user.id);
                                return (
                                    <tr key={user.id} style={{ borderBottom: '1px solid rgba(80,200,255,0.05)', transition: 'background 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                                        {/* Dot online */}
                                        <td style={{ padding: '14px 12px' }}>
                                            <span title={isOnline ? 'En línea' : 'Desconectado'} style={{
                                                display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%',
                                                background: isOnline ? '#10b981' : '#4b5563',
                                                boxShadow: isOnline ? '0 0 6px #10b981' : 'none',
                                                animation: isOnline ? 'pulse 2s infinite' : 'none',
                                            }} />
                                        </td>

                                        <td style={{ padding: '14px 12px', fontWeight: '500', fontSize: '0.88rem' }}>{user.email}</td>

                                        {/* Rol */}
                                        <td style={{ padding: '14px 12px' }}>
                                            <select value={user.role} onChange={e => handleRoleChange(user.id, e.target.value)}
                                                style={{
                                                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600',
                                                    background: `${ROLE_COLORS[user.role] || '#6b7280'}18`,
                                                    color: ROLE_COLORS[user.role] || '#6b7280',
                                                    border: `1px solid ${ROLE_COLORS[user.role] || '#6b7280'}44`,
                                                    outline: 'none', cursor: 'pointer',
                                                }}>
                                                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                            </select>
                                        </td>

                                        {/* Último visto */}
                                        <td style={{ padding: '14px 12px', fontSize: '0.8rem', color: isOnline ? '#10b981' : 'var(--text-muted)' }}>
                                            {isOnline ? '🟢 En línea' : timeAgo(user.last_seen)}
                                        </td>

                                        {/* Última acción */}
                                        <td style={{ padding: '14px 12px', fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {user.last_action || '—'}
                                        </td>

                                        {/* Acciones */}
                                        <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                                            <button title="Eliminar usuario"
                                                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.6 }}
                                                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                                                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.6'}>
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}
