import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, AlertCircle, CalendarCheck, UserX, ArrowUpRight } from 'lucide-react';
import { fetchClientsFromSheet } from '../services/googleSheets';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLORS: Record<string, string> = {
    'Nuevo': '#00f0ff',
    'Citado': '#10b981',
    'Activo': '#22c55e',
    'En seguimiento': '#f59e0b',
    'Reprogramo': '#38bdf8',
    'En espera': '#f97316',
    'No responde': '#ef4444',
    'No esta interesado': '#dc2626',
    'Repetido': '#991b1b',
    'Numero sin Whatsapp': '#eab308',
    'Presupuesto insuficiente': '#8b5cf6',
};

const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
    <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
            position: 'absolute', top: '-20px', right: '-20px',
            width: '100px', height: '100px',
            background: `radial-gradient(circle, ${color}33 0%, transparent 70%)`,
            borderRadius: '50%'
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '8px' }}>{title}</p>
                <h3 style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }} className="glow-text">{value}</h3>
                {subtitle && <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '6px' }}>{subtitle}</p>}
            </div>
            <div style={{
                background: `${color}22`, color,
                padding: '12px', borderRadius: '12px',
                boxShadow: `0 0 15px ${color}44`
            }}>
                <Icon size={24} />
            </div>
        </div>
    </div>
);

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'rgba(7,9,14,0.95)', border: '1px solid var(--border-glass)',
                borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem'
            }}>
                <p style={{ margin: 0, fontWeight: '600', color: payload[0].payload.fill }}>{payload[0].name}</p>
                <p style={{ margin: '4px 0 0', color: 'var(--text-main)' }}>{payload[0].value} clientes</p>
            </div>
        );
    }
    return null;
};

export default function Dashboard() {
    const { session, role } = useAuth();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (session) {
            loadData();
            const channel = supabase.channel('realtime_dashboard')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'client_overrides' }, () => { loadData(); })
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [session]);

    const loadData = async () => {
        setLoading(true);
        try {
            const sheetData = await fetchClientsFromSheet();
            const { data: overrides } = await supabase
                .from('client_overrides')
                .select('client_id, status, assigned_to, assigned_email, budget_range');

            const merged = sheetData.map(client => {
                const override = overrides?.find(o => o.client_id === client.id);
                if (override) {
                    return {
                        ...client,
                        status: override.status || client.status,
                        assigned_to: override.assigned_to || undefined,
                        assigned_email: override.assigned_email || undefined,
                    };
                }
                return client;
            });

            // Asesor solo ve sus propios clientes
            const visible = role === 'asesor'
                ? merged.filter(c => c.assigned_to === session?.user?.id)
                : merged;
            setClients(visible);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    // --- Métricas ---
    const total = clients.length;
    const pendientes = clients.filter(c => c.status === 'Nuevo').length;
    const citados = clients.filter(c => c.status === 'Citado').length;
    const sinAsignar = clients.filter(c => !c.assigned_to).length;

    // --- Donut: distribución por estado ---
    const statusCounts: Record<string, number> = {};
    clients.forEach(c => {
        statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });
    const pieData = Object.entries(statusCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] || '#6b7280' }));

    // --- Panel urgentes: Nuevos sin asignar ---
    const urgentes = clients
        .filter(c => c.status === 'Nuevo' && !c.assigned_to)
        .slice(0, 6);

    // --- Panel asesores: cuántos clientes tiene cada uno ---
    const asesorMap: Record<string, number> = {};
    clients.forEach(c => {
        if (c.assigned_email) {
            const nombre = c.assigned_email.split('@')[0];
            asesorMap[nombre] = (asesorMap[nombre] || 0) + 1;
        }
    });
    const topAsesores = Object.entries(asesorMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Dashboard <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>General</span></h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Pipeline de ventas en tiempo real.</p>
                </div>
            </div>

            {/* Tarjetas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatCard title="Total Prospectos" value={loading ? '...' : total} icon={Users} color="var(--primary-accent)" subtitle="Registros activos en Google Sheets" />
                <StatCard title="Pendientes de contacto" value={loading ? '...' : pendientes} icon={AlertCircle} color="#f59e0b" subtitle='Status: "Nuevo" sin atender' />
                <StatCard title="Citados" value={loading ? '...' : citados} icon={CalendarCheck} color="#10b981" subtitle="Con cita agendada" />
                <StatCard title="Sin asesor asignado" value={loading ? '...' : sinAsignar} icon={UserX} color="#ef4444" subtitle="Requieren asignación" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>

                {/* Donut Chart - Distribución por Estado */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0 }}>Distribución por Estado</h3>
                        <span style={{
                            padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)',
                            color: 'var(--success)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600'
                        }}>● Live</span>
                    </div>
                    {loading ? (
                        <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            Cargando datos...
                        </div>
                    ) : (
                        <div style={{ height: '320px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={120}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={index} fill={entry.fill} stroke="transparent" />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        formatter={(value) => <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Panel derecho */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Urgentes - Nuevos sin asignar */}
                    <div className="glass-panel" style={{ padding: '24px', flex: 1 }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem' }}>
                            ⚡ Urgentes — Nuevos sin asignar
                            <span style={{ marginLeft: '8px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem' }}>
                                {sinAsignar}
                            </span>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {loading ? (
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando...</p>
                            ) : urgentes.length === 0 ? (
                                <p style={{ color: 'var(--success)', fontSize: '0.85rem' }}>✓ Todos asignados</p>
                            ) : (
                                urgentes.map(c => (
                                    <div key={c.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 12px', background: 'rgba(239,68,68,0.05)',
                                        border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px'
                                    }}>
                                        <div>
                                            <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600' }}>{c.name}</p>
                                            <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.segment}</p>
                                        </div>
                                        <ArrowUpRight size={14} color="#ef4444" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Top Asesores */}
                    <div className="glass-panel" style={{ padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem' }}>🏆 Cartera por Asesor</h3>
                        {loading ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando...</p>
                        ) : topAsesores.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin asignaciones aún.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {topAsesores.map(([nombre, count], i) => (
                                    <div key={nombre} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{
                                            width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            background: i === 0 ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.05)',
                                            color: i === 0 ? '#eab308' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '700'
                                        }}>{i + 1}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{nombre}</span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{count}</span>
                                            </div>
                                            <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                                <div style={{
                                                    height: '100%', borderRadius: '2px',
                                                    width: `${(count / (topAsesores[0]?.[1] || 1)) * 100}%`,
                                                    background: 'linear-gradient(90deg, var(--primary-accent), var(--secondary-accent))'
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
