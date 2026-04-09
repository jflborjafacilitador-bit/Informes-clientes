import { useState, useEffect } from 'react';
import { UserPlus, Shield, Trash2, Globe, Users } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import LandingConfigModal from '../components/landing/LandingConfigModal';

const ROLES = ['super_admin', 'gerente', 'asesor', 'recepcion', 'escrituracion', 'readonly'];

const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Director',
    gerente: 'Gerente',
    asesor: 'Asesor',
    recepcion: 'Recepción',
    escrituracion: 'Escrituración',
    readonly: 'Solo lectura',
};

const ROLE_COLORS: Record<string, string> = {
    super_admin: '#00f0ff',
    gerente: '#f59e0b',
    asesor: '#10b981',
    recepcion: '#a855f7',
    escrituracion: '#6366f1',
    readonly: '#6b7280',
};

// ── Tab definitions ──────────────────────────────────────────
type TabKey = 'todos' | 'asesores' | 'gerencia' | 'operaciones' | 'readonly';

const TABS: { key: TabKey; label: string; roles: string[] | null; color: string }[] = [
    { key: 'todos',       label: 'Todos',       roles: null,                              color: '#00f0ff' },
    { key: 'asesores',    label: 'Asesores',    roles: ['asesor'],                        color: '#10b981' },
    { key: 'gerencia',    label: 'Gerencia',    roles: ['gerente', 'super_admin'],         color: '#f59e0b' },
    { key: 'operaciones', label: 'Operaciones', roles: ['recepcion', 'escrituracion'],     color: '#a855f7' },
    { key: 'readonly',    label: 'Solo lectura', roles: ['readonly'],                      color: '#6b7280' },
];

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
    const [activeTab, setActiveTab] = useState<TabKey>('todos');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ email: '', password: '', role: 'asesor' });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [landingUser, setLandingUser] = useState<any>(null);

    useEffect(() => { loadUsers(); }, []);

    // Presencia en tiempo real
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

    // ── Carga mejorada: merge auth.users + profiles ───────────
    const loadUsers = async () => {
        setLoading(true);

        // 1. Intentar RPC para ver auth.users completo (requiere migración aplicada)
        const { data: authUsers, error: rpcError } = await supabase.rpc('get_all_auth_users');

        // 2. Siempre obtener profiles (fuente principal)
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, role, last_seen, last_action');

        if (rpcError || !authUsers) {
            // Fallback: si el RPC no existe aún, mostrar solo los profiles directos
            const sorted = (profiles || []).slice().sort((a: any, b: any) =>
                (a.role || '').localeCompare(b.role || '')
            );
            setUsers(sorted);
            setLoading(false);
            return;
        }

        const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

        // 3. Merge: auth.users como base → enriquecer con profile si existe
        const merged = (authUsers || []).map((au: any) => {
            const profile = profileMap.get(au.id);
            if (profile) return profile;
            // Usuario huérfano (en auth.users pero sin fila en profiles)
            return {
                id: au.id,
                email: au.email,
                role: '__no_profile__',
                last_seen: null,
                last_action: null,
                _orphan: true,
            };
        });

        // Ordenar: con perfil primero por rol, huérfanos al final
        merged.sort((a: any, b: any) => {
            if (a._orphan && !b._orphan) return 1;
            if (!a._orphan && b._orphan) return -1;
            return (a.role || '').localeCompare(b.role || '');
        });

        setUsers(merged);
        setLoading(false);
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        // Usar RPC admin_set_user_role (SECURITY DEFINER) para bypasear RLS.
        // El UPDATE directo falla silenciosamente porque RLS solo permite
        // que cada usuario actualice su propio perfil (id = auth.uid()).
        const { error } = await supabase.rpc('admin_set_user_role', {
            target_user_id: userId,
            new_role: newRole,
        });

        if (error) {
            setMsg({ text: `Error al cambiar rol: ${error.message}`, ok: false });
            return;
        }

        setUsers(prev => prev.map(u => u.id === userId
            ? { ...u, role: newRole, _orphan: false }
            : u
        ));
    };

    const handleCreate = async () => {
        if (!form.email || !form.password) {
            setMsg({ text: 'Email y contraseña son requeridos.', ok: false });
            return;
        }
        setSaving(true);
        setMsg(null);

        // Guardar sesión del admin ANTES del signUp
        const { data: { session: adminSession } } = await supabase.auth.getSession();

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: { data: { role: form.role } },
        });

        // Restaurar sesión del admin INMEDIATAMENTE
        if (adminSession?.access_token && adminSession?.refresh_token) {
            await supabase.auth.setSession({
                access_token:  adminSession.access_token,
                refresh_token: adminSession.refresh_token,
            });
        }

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

    const handleDelete = async (userId: string, email: string) => {
        if (!window.confirm(`¿Seguro que deseas eliminar al usuario ${email}? Esta acción no se puede deshacer.`)) return;
        setDeletingId(userId);
        await supabase.from('profiles').delete().eq('id', userId);
        setUsers(prev => prev.filter(u => u.id !== userId));
        setMsg({ text: `Usuario ${email} eliminado correctamente.`, ok: true });
        setDeletingId(null);
        setTimeout(() => setMsg(null), 4000);
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

    // ── Filtrado por tab activo ──────────────────────────────
    const tabDef = TABS.find(t => t.key === activeTab)!;
    const filteredUsers = tabDef.roles === null
        ? users
        : users.filter(u => tabDef.roles!.includes(u.role));

    const onlineCount = filteredUsers.filter(u => onlineIds.has(u.id)).length;
    const orphanCount = users.filter(u => u._orphan).length;

    const getTabCount = (tab: typeof TABS[0]) =>
        tab.roles === null ? users.length : users.filter(u => tab.roles!.includes(u.role)).length;

    return (
        <div style={{ paddingBottom: '40px' }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>
                        Gestión de <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>Usuarios</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        Administra accesos y roles del equipo.
                        {onlineCount > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '20px', padding: '2px 10px', fontSize: '0.78rem', color: '#10b981' }}>
                                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                                {onlineCount} en línea
                            </span>
                        )}
                        {orphanCount > 0 && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', padding: '2px 10px', fontSize: '0.78rem', color: '#ef4444' }}>
                                ⚠ {orphanCount} sin perfil
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
                        boxShadow: '0 0 15px rgba(0,240,255,0.3)',
                    }}>
                    <UserPlus size={18} />
                    {showForm ? 'Cancelar' : 'Agregar Usuario'}
                </button>
            </div>

            {/* ── Mensaje global ── */}
            {msg && (
                <p style={{ marginBottom: '12px', fontSize: '0.85rem', color: msg.ok ? 'var(--success)' : 'var(--danger)', background: msg.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${msg.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '8px', padding: '10px 14px' }}>
                    {msg.ok ? '✓' : '✗'} {msg.text}
                </p>
            )}

            {/* ── Formulario nuevo usuario ── */}
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
                </div>
            )}

            {/* ── Tabs de filtro por rol ── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {TABS.map(tab => {
                    const count = getTabCount(tab);
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
                                fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: isActive ? '600' : '400',
                                border: isActive
                                    ? `1px solid ${tab.color}55`
                                    : '1px solid rgba(255,255,255,0.07)',
                                background: isActive
                                    ? `${tab.color}14`
                                    : 'rgba(255,255,255,0.03)',
                                color: isActive ? tab.color : 'var(--text-muted)',
                                transition: 'all 0.2s',
                                boxShadow: isActive ? `0 0 12px ${tab.color}22` : 'none',
                            }}
                            onMouseEnter={e => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLButtonElement).style.background = `${tab.color}0a`;
                                    (e.currentTarget as HTMLButtonElement).style.color = tab.color;
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isActive) {
                                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                                }
                            }}
                        >
                            <Users size={14} />
                            {tab.label}
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                minWidth: '20px', height: '20px', padding: '0 6px',
                                borderRadius: '10px', fontSize: '0.72rem', fontWeight: '700',
                                background: isActive ? tab.color : 'rgba(255,255,255,0.08)',
                                color: isActive ? '#000' : 'var(--text-muted)',
                                transition: 'all 0.2s',
                            }}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── Tabla de usuarios ── */}
            <div className="glass-panel" style={{ padding: '24px', overflowX: 'auto' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando usuarios...</div>
                ) : filteredUsers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                        <Users size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
                        <p>No hay usuarios en esta categoría.</p>
                    </div>
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
                            {filteredUsers.map(user => {
                                const isOnline = onlineIds.has(user.id);
                                const isOrphan = user._orphan;
                                return (
                                    <tr key={user.id}
                                        style={{ borderBottom: '1px solid rgba(80,200,255,0.05)', transition: 'background 0.2s' }}
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

                                        {/* Email + badge huérfano */}
                                        <td style={{ padding: '14px 12px', fontWeight: '500', fontSize: '0.88rem' }}>
                                            {user.email}
                                            {isOrphan && (
                                                <span style={{
                                                    marginLeft: '8px', fontSize: '0.68rem', fontWeight: '700',
                                                    background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                                                    border: '1px solid rgba(239,68,68,0.3)', borderRadius: '4px',
                                                    padding: '1px 6px',
                                                }}>
                                                    Sin perfil
                                                </span>
                                            )}
                                        </td>

                                        {/* Rol */}
                                        <td style={{ padding: '14px 12px' }}>
                                            {isOrphan ? (
                                                <select
                                                    defaultValue="asesor"
                                                    onChange={e => handleRoleChange(user.id, e.target.value)}
                                                    style={{
                                                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600',
                                                        background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                                        border: '1px solid rgba(239,68,68,0.3)',
                                                        outline: 'none', cursor: 'pointer',
                                                    }}>
                                                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                                </select>
                                            ) : (
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
                                            )}
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
                                        <td style={{ padding: '14px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            {!isOrphan && (
                                                <button
                                                    title="Configurar Landing Webhook"
                                                    onClick={() => setLandingUser({ id: user.id, email: user.email, full_name: user.full_name || user.email.split('@')[0] })}
                                                    style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer', opacity: 0.8, marginRight: '10px' }}
                                                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                                                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'}>
                                                    <Globe size={16} />
                                                </button>
                                            )}
                                            <button
                                                title="Eliminar usuario"
                                                onClick={() => handleDelete(user.id, user.email)}
                                                disabled={deletingId === user.id}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: deletingId === user.id ? 'not-allowed' : 'pointer', opacity: 0.6 }}
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

            {landingUser && (
                <LandingConfigModal
                    user={landingUser}
                    onClose={() => setLandingUser(null)}
                />
            )}
        </div>
    );
}
