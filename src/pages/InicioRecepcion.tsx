import { useEffect, useState } from 'react';
import { UtensilsCrossed, CalendarDays, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { Link } from 'react-router-dom';

interface StockSummary {
    total: number;
    critico: number;  // < 5
    bajo: number;     // 5-9
    ok: number;       // >= 10
}

export default function InicioRecepcion() {
    const { session } = useAuth();
    const [stock, setStock] = useState<StockSummary | null>(null);
    const [hora, setHora] = useState(new Date());

    const nombre = session?.user?.email?.split('@')[0] ?? 'Recepción';

    useEffect(() => {
        const interval = setInterval(() => setHora(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const load = async () => {
            const { data } = await supabase.from('catering_items').select('cantidad');
            if (!data) return;
            const summary: StockSummary = { total: data.length, critico: 0, bajo: 0, ok: 0 };
            data.forEach(({ cantidad }) => {
                if (cantidad >= 10) summary.ok++;
                else if (cantidad >= 5) summary.bajo++;
                else summary.critico++;
            });
            setStock(summary);
        };
        load();

        const channel = supabase.channel('recepcion_stock')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'catering_items' }, load)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const saludo = () => {
        const h = hora.getHours();
        if (h < 12) return 'Buenos días';
        if (h < 18) return 'Buenas tardes';
        return 'Buenas noches';
    };

    const horaStr = hora.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
    const fechaStr = hora.toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div style={{ paddingBottom: '40px' }}>
            {/* Header de bienvenida */}
            <div className="glass-panel" style={{
                padding: '2rem 2.5rem',
                marginBottom: '24px',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(0,240,255,0.06))',
                border: '1px solid rgba(34,197,94,0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
            }}>
                <div>
                    <p style={{ color: 'var(--text-muted)', margin: '0 0 4px', fontSize: '0.9rem' }}>{saludo()},</p>
                    <h1 style={{ margin: 0, fontSize: '2rem' }} className="glow-text">
                        {nombre} 👋
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: '6px 0 0', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                        {fechaStr}
                    </p>
                </div>
                <div style={{
                    fontSize: '2.8rem', fontWeight: '800', color: 'var(--primary-accent)',
                    fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px',
                }}>
                    {horaStr}
                </div>
            </div>

            {/* Resumen del inventario */}
            <h2 style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: '500' }}>
                Inventario de Catering
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '28px' }}>

                {/* Total */}
                <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
                    <Package size={28} color="var(--primary-accent)" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '2.2rem', fontWeight: '800' }}>{stock?.total ?? '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Productos totales</div>
                </div>

                {/* OK */}
                <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', border: '1px solid rgba(34,197,94,0.3)' }}>
                    <CheckCircle size={28} color="#22c55e" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#22c55e' }}>{stock?.ok ?? '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>En buen nivel (≥10)</div>
                </div>

                {/* Bajo */}
                <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', border: '1px solid rgba(245,158,11,0.3)' }}>
                    <AlertTriangle size={28} color="#f59e0b" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#f59e0b' }}>{stock?.bajo ?? '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Stock bajo (5–9)</div>
                </div>

                {/* Crítico */}
                <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', border: stock?.critico ? '1px solid rgba(239,68,68,0.4)' : undefined }}>
                    <AlertTriangle size={28} color="#ef4444" style={{ marginBottom: '8px' }} />
                    <div style={{ fontSize: '2.2rem', fontWeight: '800', color: '#ef4444' }}>{stock?.critico ?? '—'}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Crítico (&lt;5)</div>
                </div>
            </div>

            {/* Accesos rápidos */}
            <h2 style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '14px', fontWeight: '500' }}>
                Accesos rápidos
            </h2>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <Link to="/catering" style={{ textDecoration: 'none' }}>
                    <div className="glass-panel" style={{
                        padding: '20px 28px', display: 'flex', alignItems: 'center', gap: '14px',
                        cursor: 'pointer', border: '1px solid rgba(34,197,94,0.2)',
                        transition: 'border-color 0.2s',
                    }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(34,197,94,0.6)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(34,197,94,0.2)')}>
                        <UtensilsCrossed size={26} color="var(--primary-accent)" />
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>Catering & Bebidas</div>
                            <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)' }}>Ajustar inventario</div>
                        </div>
                    </div>
                </Link>

                <Link to="/calendario" style={{ textDecoration: 'none' }}>
                    <div className="glass-panel" style={{
                        padding: '20px 28px', display: 'flex', alignItems: 'center', gap: '14px',
                        cursor: 'pointer', border: '1px solid rgba(0,240,255,0.2)',
                        transition: 'border-color 0.2s',
                    }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,240,255,0.6)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(0,240,255,0.2)')}>
                        <CalendarDays size={26} color="var(--secondary-accent)" />
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>Calendario</div>
                            <div style={{ fontSize: '0.77rem', color: 'var(--text-muted)' }}>Ver eventos del día</div>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
