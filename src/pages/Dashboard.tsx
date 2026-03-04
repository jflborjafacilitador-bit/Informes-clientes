import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, Activity, DollarSign, ArrowUpRight, RefreshCw } from 'lucide-react';
import { fetchClientsFromSheet } from '../services/googleSheets';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
    <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
            position: 'absolute', top: '-20px', right: '-20px',
            width: '100px', height: '100px',
            background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
            borderRadius: '50%'
        }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>{title}</p>
                <h3 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }} className="glow-text">{value}</h3>
            </div>
            <div style={{
                background: `${color}22`,
                color: color,
                padding: '12px',
                borderRadius: '12px',
                boxShadow: `0 0 15px ${color}44`
            }}>
                <Icon size={24} />
            </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
            <ArrowUpRight size={16} color="var(--success)" />
            <span style={{ color: 'var(--success)', fontWeight: '500', fontSize: '0.85rem' }}>{trend}%</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>vs mes pasado</span>
        </div>
    </div>
);

export default function Dashboard() {
    const { session } = useAuth();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session) {
            loadData();
            const channel = supabase.channel('realtime_dashboard').on('postgres_changes', { event: '*', schema: 'public', table: 'client_overrides' }, () => {
                loadData();
            }).subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [session]);

    const loadData = async () => {
        setLoading(true);
        try {
            let gridData = await fetchClientsFromSheet();

            const { data: overrides, error } = await supabase
                .from('client_overrides')
                .select('client_id, status');

            if (!error && overrides && overrides.length > 0) {
                const empalmado = gridData.map(client => {
                    const override = overrides.find(o => o.client_id === client.id);
                    if (override) {
                        return { ...client, status: override.status || client.status };
                    }
                    return client;
                });
                setClients(empalmado);
            } else {
                setClients(gridData);
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    // Cálculos dinámicos basados en Sheets
    const totalClients = clients.length;

    // Contamos cuantos están inactivos para un placeholder de "Interacciones"
    const activeClients = clients.filter(c => c.status.toLowerCase() === 'activo').length;

    // Tasa de conversión simulada
    const conversionRate = totalClients > 0 ? ((activeClients / totalClients) * 100).toFixed(1) : '0';

    // Sumar presupuesto (simplificado)
    const totalBudget = clients.reduce((acc, curr) => {
        const val = parseInt(curr.budget.replace(/[^0-9.-]+/g, "")) || 0;
        return acc + val;
    }, 0);
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 3 });
    const formattedBudget = formatter.format(totalBudget);

    // Agrupar para el gráfico por Tipo de Segmento
    const segmentCounts: any = {};
    clients.forEach(c => {
        const seg = c.segment || 'Otros';
        if (!segmentCounts[seg]) segmentCounts[seg] = { usuarios: 0, interesados: 0 };

        if (c.status.toLowerCase() === 'activo') {
            segmentCounts[seg].usuarios += 1;
        } else {
            segmentCounts[seg].interesados += 1;
        }
    });

    const chartData = Object.keys(segmentCounts).map(seg => ({
        name: seg.substring(0, 10), // Truncar largo
        usuarios: segmentCounts[seg].usuarios * 100, // Multiplicador para escala visual
        interesados: segmentCounts[seg].interesados * 100
    }));

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Dashboard <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>General</span></h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Métricas en tiempo real de tu cartera de prospectos.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatCard title="Total Clientes" value={loading ? "..." : totalClients} icon={Users} trend="12.5" color="var(--primary-accent)" />
                <StatCard title="Interacciones Activas" value={loading ? "..." : activeClients} icon={Activity} trend="8.2" color="var(--secondary-accent)" />
                <StatCard title="Tasa de Conversión" value={loading ? "..." : `${conversionRate}%`} icon={TrendingUp} trend="4.1" color="var(--success)" />
                <StatCard title="Valor Proyectado" value={loading ? "..." : formattedBudget} icon={DollarSign} trend="15.3" color="var(--warning)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '20px' }}>
                {/* Chart Section */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>Rendimiento de Segmentos</h3>
                        <span style={{ padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {loading ? <RefreshCw size={14} className="animate-spin" /> : "●"} Live Data
                        </span>
                    </div>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData.length > 0 ? chartData : [{ name: 'Cargando...', usuarios: 0, interesados: 0 }]} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorUsuarios" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--primary-accent)" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="var(--primary-accent)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorInteresados" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--secondary-accent)" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="var(--secondary-accent)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'rgba(7, 9, 14, 0.9)', border: '1px solid var(--border-glass)', borderRadius: '8px', backdropFilter: 'blur(8px)' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="usuarios" stroke="var(--primary-accent)" fillOpacity={1} fill="url(#colorUsuarios)" strokeWidth={3} />
                                <Area type="monotone" dataKey="interesados" stroke="var(--secondary-accent)" fillOpacity={1} fill="url(#colorInteresados)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Registrations Table/List */}
                <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 20px 0' }}>Registros Recientes</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '20px' }}>Cargando desde Google Sheets...</div>
                        ) : clients.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No hay registros aún.</div>
                        ) : (
                            clients.slice(0, 5).map(client => (
                                <div key={client.id} style={{
                                    padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)',
                                    borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    transition: 'transform 0.2s'
                                }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                                >
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem' }}>{client.name}</h4>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{client.segment}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{
                                            display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '600',
                                            background: client.status === 'Activo' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                            color: client.status === 'Activo' ? 'var(--success)' : 'var(--warning)'
                                        }}>
                                            {client.status}
                                        </span>
                                    </div>
                                </div>
                            )))}
                    </div>
                    <button style={{
                        width: '100%', padding: '12px', marginTop: '20px',
                        background: 'transparent', border: '1px solid var(--border-glass)',
                        color: 'var(--text-main)', borderRadius: '8px', cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        Ver todos los clientes
                    </button>
                </div>
            </div>
        </div >
    );
}
