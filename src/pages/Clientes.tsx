import { useState, useEffect } from 'react';
import { Search, Filter, Edit2, Trash2, Eye, RefreshCw, UserPlus } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function Clientes() {
    const { role, session } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [clients, setClients] = useState<any[]>([]);
    const [asesores, setAsesores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session) {
            loadData();
            if (role === 'super_admin') loadAsesores();

            // Suscripción al realtime para actualizar la UI si otro asesor cambia algo
            const channel = supabase.channel('realtime_clients').on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
                loadData();
            }).subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [session, role]);

    const loadData = async () => {
        setLoading(true);
        try {
            // RLS ya filtra lo que puede ver el usuario actual en la BD.
            const { data, error } = await supabase
                .from('clients')
                .select(`
                    *,
                    profiles:assigned_to (email)
                `)
                .order('created_at', { ascending: false });

            if (!error && data) {
                setClients(data);
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const loadAsesores = async () => {
        const { data } = await supabase.from('profiles').select('*').eq('role', 'asesor');
        if (data) setAsesores(data);
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        const { error } = await supabase.from('clients').update({ status: newStatus }).eq('id', id);
        if (!error) loadData();
    };

    const handleAssign = async (id: string, userId: string) => {
        const { error } = await supabase.from('clients').update({ assigned_to: userId }).eq('id', id);
        if (!error) loadData();
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.segment.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Gestión de <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>Clientes</span></h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                        Visualiza y segmenta todos los registros en tiempo real.
                        <span style={{ marginLeft: '10px', color: 'var(--text-main)', fontWeight: 'bold' }}>Total: {clients.length} / Activos: {clients.filter(c => c.status === 'Activo').length}</span>
                    </p>
                </div>
                <button style={{
                    background: 'linear-gradient(135deg, var(--primary-accent), var(--secondary-accent))',
                    border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px',
                    cursor: 'pointer', fontWeight: '600', boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)'
                }}>+ Registrar Cliente</button>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o segmento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 16px 10px 44px',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border-glass)',
                                color: 'var(--text-main)',
                                fontFamily: 'inherit',
                                outline: 'none'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary-accent)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-glass)'}
                        />
                    </div>
                    <button style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: 'var(--bg-panel)', border: '1px solid var(--border-glass)',
                        color: 'var(--text-main)', padding: '10px 16px', borderRadius: '8px',
                        cursor: 'pointer', transition: 'all 0.2s', fontWeight: '500'
                    }}>
                        <Filter size={18} />
                        Filtros Avanzados
                    </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            <RefreshCw className="animate-spin" size={30} style={{ margin: '0 auto 15px auto', display: 'block' }} color="var(--primary-accent)" />
                            Sincronizando registros con Google Sheets...
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                    <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Nombre del Cliente</th>
                                    <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Segmento</th>
                                    <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Asignación</th>
                                    <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Fecha Registro</th>
                                    <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Estado</th>
                                    {(role === 'super_admin' || role === 'asesor') && (
                                        <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>Acciones</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClients.map((client) => (
                                    <tr key={client.id} style={{
                                        borderBottom: '1px solid rgba(80, 200, 255, 0.05)',
                                        transition: 'background 0.2s'
                                    }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '16px', fontWeight: '500' }}>{client.name}</td>
                                        <td style={{ padding: '16px' }}>{client.segment}</td>
                                        <td style={{ padding: '16px' }}>
                                            {role === 'super_admin' ? (
                                                <select
                                                    value={client.assigned_to || ''}
                                                    onChange={(e) => handleAssign(client.id, e.target.value)}
                                                    style={{
                                                        background: 'var(--bg-panel)', color: 'var(--text-main)', border: '1px solid var(--border-glass)',
                                                        padding: '4px 8px', borderRadius: '4px', outline: 'none'
                                                    }}>
                                                    <option value="">Sin asignar</option>
                                                    {asesores.map(a => <option key={a.id} value={a.id}>{a.email.split('@')[0]}</option>)}
                                                </select>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>{client.profiles?.email?.split('@')[0] || 'Sin asignar'}</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px' }}>{new Date(client.date).toLocaleDateString()}</td>
                                        <td style={{ padding: '16px' }}>
                                            {(role === 'super_admin' || role === 'asesor') ? (
                                                <select
                                                    value={client.status}
                                                    onChange={(e) => handleStatusChange(client.id, e.target.value)}
                                                    style={{
                                                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600',
                                                        background: client.status === 'Activo' || client.status === 'Citado' ? 'rgba(16, 185, 129, 0.1)' :
                                                            client.status === 'En espera' || client.status === 'En seguimiento' ? 'rgba(245, 158, 11, 0.1)' :
                                                                client.status === 'No responde' || client.status === 'Repetido' ? 'rgba(239, 68, 68, 0.1)' :
                                                                    client.status === 'Numero sin Whatsapp' ? 'rgba(234, 179, 8, 0.1)' :
                                                                        client.status === 'Reprogramo' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                                        color: client.status === 'Activo' || client.status === 'Citado' ? 'var(--success)' :
                                                            client.status === 'En espera' || client.status === 'En seguimiento' ? 'var(--warning)' :
                                                                client.status === 'No responde' || client.status === 'Repetido' ? 'var(--danger)' :
                                                                    client.status === 'Numero sin Whatsapp' ? '#eab308' :
                                                                        client.status === 'Reprogramo' ? '#38bdf8' : '#8b5cf6',
                                                        border: '1px solid var(--border-glass)',
                                                        outline: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="Nuevo">Nuevo</option>
                                                    <option value="No responde">No responde</option>
                                                    <option value="Numero sin Whatsapp">Numero sin Whatsapp</option>
                                                    <option value="Reprogramo">Reprogramo</option>
                                                    <option value="Citado">Citado</option>
                                                    <option value="En seguimiento">En seguimiento</option>
                                                    <option value="No esta interesado">No esta interesado</option>
                                                    <option value="Repetido">Repetido</option>
                                                    <option value="Presupuesto insuficiente">Presupuesto insuficiente</option>
                                                    <option value="Activo">Activo</option>
                                                    <option value="En espera">En espera</option>
                                                </select>
                                            ) : (
                                                <span style={{
                                                    display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600',
                                                    background: client.status === 'Activo' || client.status === 'Citado' ? 'rgba(16, 185, 129, 0.1)' :
                                                        client.status === 'En espera' || client.status === 'En seguimiento' ? 'rgba(245, 158, 11, 0.1)' :
                                                            client.status === 'No responde' || client.status === 'Repetido' ? 'rgba(239, 68, 68, 0.1)' :
                                                                client.status === 'Numero sin Whatsapp' ? 'rgba(234, 179, 8, 0.1)' :
                                                                    client.status === 'Reprogramo' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                                                    color: client.status === 'Activo' || client.status === 'Citado' ? 'var(--success)' :
                                                        client.status === 'En espera' || client.status === 'En seguimiento' ? 'var(--warning)' :
                                                            client.status === 'No responde' || client.status === 'Repetido' ? 'var(--danger)' :
                                                                client.status === 'Numero sin Whatsapp' ? '#eab308' :
                                                                    client.status === 'Reprogramo' ? '#38bdf8' : '#8b5cf6'
                                                }}>
                                                    {client.status}
                                                </span>
                                            )}
                                        </td>
                                        {(role === 'super_admin' || role === 'asesor') && (
                                            <td style={{ padding: '16px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                    <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Editar Datos"><Edit2 size={18} /></button>
                                                    {role === 'super_admin' && (
                                                        <button style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Eliminar"><Trash2 size={18} /></button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {!loading && filteredClients.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No se encontraron clientes que coincidan con la búsqueda.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
