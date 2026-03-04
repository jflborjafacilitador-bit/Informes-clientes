import { useState, useEffect } from 'react';
import { User, Save, Plus, Trash2, RefreshCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// ─── Tab 1: Mi Perfil ─────────────────────────────────────
function TabPerfil({ session }: { session: any }) {
    const [displayName, setDisplayName] = useState('');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        // Cargar nombre actual desde profiles
        if (session?.user?.id) {
            supabase.from('profiles').select('display_name').eq('id', session.user.id).single()
                .then(({ data }) => { if (data?.display_name) setDisplayName(data.display_name); });
        }
    }, [session]);

    const saveName = async () => {
        setSaving(true);
        setMsg('');
        const { error } = await supabase.from('profiles')
            .update({ display_name: displayName.trim() })
            .eq('id', session.user.id);
        setSaving(false);
        setMsg(error ? '❌ Error al guardar.' : '✅ Nombre actualizado.');
        setTimeout(() => setMsg(''), 3000);
    };

    const sendReset = async () => {
        setResetting(true);
        const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        setResetting(false);
        setMsg(error ? '❌ Error al enviar correo.' : '📧 Correo de restablecimiento enviado.');
        setTimeout(() => setMsg(''), 4000);
    };

    const roleLabel: Record<string, string> = {
        super_admin: '🔑 Super Admin',
        gerente: '📊 Gerente',
        asesor: '👤 Asesor',
    };

    return (
        <div style={{ maxWidth: '520px' }}>
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Info básica */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <User size={26} color="#000" />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>{session?.user?.email}</p>
                        <span style={{ fontSize: '0.78rem', padding: '2px 10px', borderRadius: '20px', background: 'rgba(0,240,255,0.1)', color: 'var(--primary-accent)' }}>
                            {roleLabel[session?.user?.user_metadata?.role] || '—'}
                        </span>
                    </div>
                </div>

                {/* Nombre visible */}
                <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Nombre visible</label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Ej: Marlon García"
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                    />
                </div>

                <button onClick={saveName} disabled={saving || !displayName.trim()}
                    style={{ padding: '10px 20px', borderRadius: '8px', background: displayName.trim() ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)', border: 'none', color: displayName.trim() ? '#000' : 'var(--text-muted)', fontWeight: '700', cursor: displayName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
                    <Save size={16} /> {saving ? 'Guardando...' : 'Guardar nombre'}
                </button>

                <hr style={{ border: 'none', borderTop: '1px solid var(--border-glass)', margin: '4px 0' }} />

                {/* Cambiar contraseña */}
                <div>
                    <p style={{ margin: '0 0 6px', fontWeight: '600', fontSize: '0.9rem' }}>Contraseña</p>
                    <p style={{ margin: '0 0 12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>Te enviaremos un correo a <strong>{session?.user?.email}</strong> para restablecerla.</p>
                    <button onClick={sendReset} disabled={resetting}
                        style={{ padding: '10px 20px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid var(--danger)', color: 'var(--danger)', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {resetting ? 'Enviando...' : '🔐 Enviar correo de cambio de contraseña'}
                    </button>
                </div>

                {msg && <p style={{ margin: 0, fontSize: '0.85rem', color: msg.startsWith('✅') || msg.startsWith('📧') ? 'var(--success)' : 'var(--danger)' }}>{msg}</p>}
            </div>
        </div>
    );
}

// ─── Tab 2: Fuente de Datos ────────────────────────────────
function TabFuente({ session }: { session: any }) {
    const [url, setUrl] = useState('');
    const [original, setOriginal] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        supabase.from('app_config').select('value').eq('key', 'sheet_url').single()
            .then(({ data }) => {
                const val = data?.value || '';
                setUrl(val); setOriginal(val); setLoading(false);
            });
    }, []);

    const save = async () => {
        setSaving(true);
        setMsg('');
        const { error } = await supabase.from('app_config').upsert(
            { key: 'sheet_url', value: url.trim(), updated_by: session?.user?.id, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
        );
        setSaving(false);
        if (!error) { setOriginal(url.trim()); setMsg('✅ URL actualizada. Recarga la app para aplicar los cambios.'); }
        else setMsg('❌ Error al guardar.');
        setTimeout(() => setMsg(''), 5000);
    };

    return (
        <div style={{ maxWidth: '640px' }}>
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <p style={{ margin: '0 0 4px', fontWeight: '700' }}>🔗 URL del Google Sheet</p>
                    <p style={{ margin: '0 0 14px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Esta es la URL de exportación CSV que usa la app para cargar los clientes. Cámbiala si cambia la hoja de trabajo sin necesidad de hacer un nuevo deploy.
                    </p>
                    {loading ? <p style={{ color: 'var(--text-muted)' }}>Cargando...</p> : (
                        <textarea
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            rows={4}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${url !== original ? 'var(--primary-accent)' : 'var(--border-glass)'}`, color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.8rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                    )}
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={save} disabled={saving || url === original || !url.trim()}
                        style={{ padding: '10px 20px', borderRadius: '8px', background: url !== original && url.trim() ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)', border: 'none', color: url !== original && url.trim() ? '#000' : 'var(--text-muted)', fontWeight: '700', cursor: url !== original ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <Save size={16} /> {saving ? 'Guardando...' : 'Guardar URL'}
                    </button>
                    {url !== original && (
                        <button onClick={() => setUrl(original)} style={{ padding: '10px 14px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>
                            Cancelar
                        </button>
                    )}
                </div>
                {msg && <p style={{ margin: 0, fontSize: '0.85rem', color: msg.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>{msg}</p>}
            </div>
        </div>
    );
}

// ─── Tab 3: Estados ────────────────────────────────────────
function TabEstados() {
    const [statuses, setStatuses] = useState<{ id: string; label: string; sort_order: number }[]>([]);
    const [newLabel, setNewLabel] = useState('');
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [msg, setMsg] = useState('');

    const load = async () => {
        const { data } = await supabase.from('client_statuses').select('*').order('sort_order');
        setStatuses(data || []);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const addStatus = async () => {
        if (!newLabel.trim()) return;
        setAdding(true);
        const maxOrder = statuses.reduce((m, s) => Math.max(m, s.sort_order), 0);
        const { error } = await supabase.from('client_statuses').insert({ label: newLabel.trim(), sort_order: maxOrder + 1 });
        setAdding(false);
        setNewLabel('');
        if (error) { setMsg('❌ Error: ' + (error.message.includes('unique') ? 'Ese estado ya existe.' : error.message)); }
        else setMsg('✅ Estado agregado.');
        setTimeout(() => setMsg(''), 3000);
        load();
    };

    const deleteStatus = async (id: string) => {
        await supabase.from('client_statuses').delete().eq('id', id);
        load();
    };

    return (
        <div style={{ maxWidth: '480px' }}>
            <div className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                    <p style={{ margin: '0 0 4px', fontWeight: '700' }}>🏷️ Estados de cliente</p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>Agrega o elimina los estados que aparecen en el dropdown de clientes.</p>
                </div>

                {/* Agregar nuevo */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addStatus()}
                        placeholder="Nuevo estado..."
                        style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-glass)', color: 'var(--text-main)', fontFamily: 'inherit', outline: 'none' }}
                    />
                    <button onClick={addStatus} disabled={adding || !newLabel.trim()}
                        style={{ padding: '10px 14px', borderRadius: '8px', background: newLabel.trim() ? 'var(--primary-accent)' : 'rgba(255,255,255,0.05)', border: 'none', color: newLabel.trim() ? '#000' : 'var(--text-muted)', fontWeight: '700', cursor: newLabel.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Plus size={18} />
                    </button>
                </div>

                {msg && <p style={{ margin: 0, fontSize: '0.82rem', color: msg.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>{msg}</p>}

                {/* Lista de estados */}
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                        <RefreshCw size={16} className="animate-spin" /> Cargando...
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {statuses.map((s, i) => (
                            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: '20px', textAlign: 'right' }}>{i + 1}</span>
                                    <span style={{ fontSize: '0.88rem', fontWeight: '500' }}>{s.label}</span>
                                </div>
                                <button onClick={() => deleteStatus(s.id)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', opacity: 0.6 }}
                                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                                    title="Eliminar estado">
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Página Principal ──────────────────────────────────────
export default function Configuracion() {
    const { session, role } = useAuth();
    const [tab, setTab] = useState<'perfil' | 'fuente' | 'estados'>('perfil');

    const tabs = [
        { key: 'perfil' as const, label: '👤 Mi Perfil' },
        ...(role === 'super_admin' ? [
            { key: 'fuente' as const, label: '🔗 Fuente de Datos' },
            { key: 'estados' as const, label: '🏷️ Estados' },
        ] : []),
    ];

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', margin: 0 }}>
                    <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>Configuración</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Personaliza tu perfil y ajustes del sistema.</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', borderBottom: '1px solid var(--border-glass)' }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{ padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--primary-accent)' : 'transparent'}`, color: tab === t.key ? 'var(--primary-accent)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: tab === t.key ? '700' : '400', fontSize: '0.9rem', transition: 'all 0.2s', marginBottom: '-1px' }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'perfil' && <TabPerfil session={session} />}
            {tab === 'fuente' && <TabFuente session={session} />}
            {tab === 'estados' && <TabEstados />}
        </div>
    );
}
