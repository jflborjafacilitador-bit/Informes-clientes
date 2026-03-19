import { Tag } from 'lucide-react';
import { PRECIOS } from '../data/precios';

const fmt = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

export default function Precios() {
    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '10px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: 10,
                        background: 'rgba(56,189,248,0.1)',
                        border: '1px solid var(--border-glass)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Tag size={20} color="#38bdf8" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }} className="glow-text">
                            Lista de Precios Base
                        </h1>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                            Tarifario para Residencial Los Quetzales
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {Object.keys(PRECIOS).map(manzana => (
                        <div key={manzana} className="glass-panel animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
                            <h2 style={{ fontSize: '1.2rem', color: 'var(--primary-accent)', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
                                {manzana}
                            </h2>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                                    <thead>
                                        <tr style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <th style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-glass)' }}>Modelo</th>
                                            <th style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-glass)' }}>Versión</th>
                                            <th style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-glass)', textAlign: 'right' }}>Precio Base</th>
                                            <th style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-glass)', textAlign: 'right' }}>Valor Avalúo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {PRECIOS[manzana].map((item, index) => (
                                            <tr key={index} style={{ borderBottom: index < PRECIOS[manzana].length - 1 ? '1px solid var(--ghost-bg)' : 'none', transition: 'background 0.2s', }}>
                                                <td style={{ padding: '12px 16px', color: 'var(--text-main)', fontWeight: 500 }}>{item.modelo}</td>
                                                <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{item.version}</td>
                                                <td style={{ padding: '12px 16px', color: 'var(--primary-accent)', textAlign: 'right', fontWeight: 600 }}>{fmt(item.precio)}</td>
                                                <td style={{ padding: '12px 16px', color: 'var(--text-main)', textAlign: 'right' }}>{item.avaluo ? fmt(item.avaluo) : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
