import { Bell, User, Menu, Download, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useState, useEffect } from 'react';

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const { session, role } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        // Captura el evento antes de que el navegador muestre su propio banner
        const handler = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
        window.addEventListener('beforeinstallprompt', handler);
        // Detecta si ya está instalada (modo standalone)
        if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') { setInstalled(true); setInstallPrompt(null); }
    };

    return (
        <header className="top-header">
            <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '12px' }}>
                {/* Hamburger — solo visible en móvil vía CSS */}
                <button
                    onClick={onMenuClick}
                    className="hamburger-btn"
                    style={{
                        background: 'var(--ghost-bg)',
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
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Theme Toggle Button */}
                <button
                    onClick={toggleTheme}
                    title={`Cambiar a modo ${theme === 'dark' ? 'iluminado' : 'oscuro'}`}
                    style={{
                        background: 'var(--ghost-bg)',
                        border: 'none', borderRadius: '50%',
                        width: '40px', height: '40px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-main)', cursor: 'pointer', position: 'relative',
                        transition: 'background 0.2s, transform 0.2s', flexShrink: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ghost-bg-hover)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ghost-bg)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Botón instalar PWA — visible solo si el navegador lo permite y no está instalada */}
                {installPrompt && !installed && (
                    <button
                        onClick={handleInstall}
                        title="Instalar app"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 14px', borderRadius: '20px',
                            background: 'rgba(0,240,255,0.1)',
                            border: '1px solid var(--primary-accent)',
                            color: 'var(--primary-accent)',
                            cursor: 'pointer', fontFamily: 'inherit',
                            fontSize: '0.8rem', fontWeight: '600',
                            animation: 'pulse 2s infinite',
                            flexShrink: 0,
                        }}
                    >
                        <Download size={15} />
                        <span className="header-user-info">Instalar app</span>
                    </button>
                )}
                <button style={{
                    background: 'var(--ghost-bg)',
                    border: 'none', borderRadius: '50%',
                    width: '40px', height: '40px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-main)', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.2s', flexShrink: 0,
                }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--ghost-bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--ghost-bg)'}
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
