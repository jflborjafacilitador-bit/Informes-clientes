import { useState } from 'react';
import { Search, Filter, Edit2, Trash2, Eye } from 'lucide-react';
import { mockClients } from '../services/mockData';

export default function Clientes() {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredClients = mockClients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.segment.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>Gestión de <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>Clientes</span></h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Visualiza y segmenta todos los registros en tiempo real.</p>
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
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Nombre del Cliente</th>
                                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Segmento</th>
                                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Presupuesto</th>
                                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Fecha Registro</th>
                                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Estado</th>
                                <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>Acciones</th>
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
                                    <td style={{ padding: '16px' }}>{client.budget}</td>
                                    <td style={{ padding: '16px' }}>{client.date}</td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600',
                                            background: client.status === 'Activo' ? 'rgba(16, 185, 129, 0.1)' :
                                                client.status === 'En espera' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: client.status === 'Activo' ? 'var(--success)' :
                                                client.status === 'En espera' ? 'var(--warning)' : 'var(--danger)'
                                        }}>
                                            {client.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                            <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Ver Detalle"><Eye size={18} /></button>
                                            <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Editar"><Edit2 size={18} /></button>
                                            <button style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }} title="Eliminar"><Trash2 size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredClients.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No se encontraron clientes que coincidan con la búsqueda.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
