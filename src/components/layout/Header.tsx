import { Bell, Search, User, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const { session, role } = useAuth();

    return (
        <header className="top-header">
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '12px' }}>
                {/* Hamburger — solo visible en móvil vía CSS */}
                <button
                    onClick={onMenuClick}
                    className="hamburger-btn"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: '8px',
                        width: '40px', height: '40px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        flexShrink: 0,
                    }}
                >
                    <Menu size={20} />
                </button>

                <div style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '400px',
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <Search size={18} style={{ position: 'absolute', left: '16px', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar clientes, registros..."
                        style={{
                            width: '100%',
                            padding: '10px 16px 10px 44px',
                            borderRadius: '20px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border-glass)',
                            color: 'var(--text-main)',
                            outline: 'none',
                            fontFamily: 'inherit',
                            transition: 'all 0.3s'
                        }}
                        onFocus={(e) => {
                            e.currentTarget.style.background = 'rgba(34, 197, 94, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                            e.currentTarget.style.boxShadow = '0 0 15px rgba(34, 197, 94, 0.1)';
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            e.currentTarget.style.borderColor = 'var(--border-glass)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none', borderRadius: '50%',
                    width: '40px', height: '40px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-main)', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.2s', flexShrink: 0,
                }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                    <Bell size={18} />
                    <span style={{
                        position: 'absolute', top: '8px', right: '8px',
                        width: '8px', height: '8px',
                        background: 'var(--primary-accent)', borderRadius: '50%',
                        boxShadow: '0 0 8px var(--primary-accent)'
                    }}></span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    {/* Nombre — oculto en pantallas muy pequeñas */}
                    <div style={{ textAlign: 'right' }} className="header-user-info">
                        <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '500' }}>
                            {session?.user.email?.split('@')[0] || 'Tú'}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--primary-accent)', textTransform: 'capitalize' }}>
                            {role === 'super_admin' ? 'Master View' : role}
                        </p>
                    </div>
                    <div style={{
                        width: '40px', height: '40px',
                        borderRadius: '50%', background: 'var(--bg-panel)',
                        border: '2px solid var(--secondary-accent)', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <User size={20} color="var(--secondary-accent)" />
                    </div>
                </div>
            </div>
        </header>
    );
}
