import { useState, useEffect } from 'react';
import { UserPlus, Shield, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const ROLES = ['super_admin', 'gerente', 'asesor', 'readonly'];

const ROLE_LABELS: Record<string, string> = {
    super_admin: 'Director',
    gerente: 'Gerente',
    asesor: 'Asesor',
    readonly: 'Solo lectura',
};

const ROLE_COLORS: Record<string, string> = {
    super_admin: '#00f0ff',
    gerente: '#f59e0b',
    asesor: '#10b981',
    readonly: '#6b7280',
};

export default function Usuarios() {
    const { role: myRole } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ email: '', password: '', role: 'asesor' });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        setLoading(true);
        const { data } = await supabase.from('profiles').select('*').order('role');
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

        // 1. Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
        });

        if (authError || !authData.user) {
            setMsg({ text: authError?.message || 'Error creando usuario.', ok: false });
            setSaving(false);
            return;
        }

        // 2. Insertar en profiles con el rol elegido
        const { error: profileError } = await supabase.from('profiles').upsert({
            id: authData.user.id,
            email: form.email,
            role: form.role,
        });

        if (profileError) {
            setMsg({ text: 'Usuario creado pero error al asignar rol: ' + profileError.message, ok: false });
        } else {
            setMsg({ text: `Usuario ${form.email} creado con rol "${ROLE_LABELS[form.role]}". Debe confirmar su email.`, ok: true });
            setForm({ email: '', password: '', role: 'asesor' });
            setShowForm(false);
            loadUsers();
        }
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

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Gestión de <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>Usuarios</span></h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Administra accesos y roles del equipo.</p>
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
                            <input
                                type="email"
                                placeholder="usuario@quetzales.com"
                                value={form.email}
                                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
                                    color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Contraseña temporal</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)',
                                    color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Rol</label>
                            <select
                                value={form.role}
                                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                                    background: 'var(--bg-panel)', border: '1px solid var(--border-glass)',
                                    color: 'var(--text-main)', outline: 'none'
                                }}>
                                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </select>
                        </div>
                        <button
                            onClick={handleCreate}
                            disabled={saving}
                            style={{
                                padding: '10px 20px', borderRadius: '8px',
                                background: saving ? 'rgba(255,255,255,0.1)' : 'var(--primary-accent)',
                                border: 'none', color: '#000', fontWeight: '700',
                                cursor: saving ? 'not-allowed' : 'pointer'
                            }}>
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
            <div className="glass-panel" style={{ padding: '24px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Cargando usuarios...</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>#</th>
                                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Email</th>
                                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Rol</th>
                                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user, i) => (
                                <tr key={user.id} style={{ borderBottom: '1px solid rgba(80,200,255,0.05)' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{i + 1}</td>
                                    <td style={{ padding: '16px', fontWeight: '500' }}>{user.email}</td>
                                    <td style={{ padding: '16px' }}>
                                        <select
                                            value={user.role}
                                            onChange={e => handleRoleChange(user.id, e.target.value)}
                                            style={{
                                                padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '600',
                                                background: `${ROLE_COLORS[user.role] || '#6b7280'}18`,
                                                color: ROLE_COLORS[user.role] || '#6b7280',
                                                border: `1px solid ${ROLE_COLORS[user.role] || '#6b7280'}44`,
                                                outline: 'none', cursor: 'pointer'
                                            }}>
                                            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <button
                                            title="Eliminar usuario"
                                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.6 }}
                                            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                                            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.6'}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
