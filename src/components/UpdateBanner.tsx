import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export default function UpdateBanner() {
    const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
        onRegistered(r: ServiceWorkerRegistration | undefined) {
            // Revisar actualizaciones cada 60 minutos
            if (r) setInterval(() => r.update(), 60 * 60 * 1000);
        },
    });

    if (!needRefresh) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '1.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            background: 'rgba(10, 20, 15, 0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            borderRadius: '14px',
            padding: '0.9rem 1.2rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(34,197,94,0.15)',
            animation: 'fadeIn 0.4s ease forwards',
            minWidth: '280px',
            maxWidth: '90vw',
        }}>
            {/* Ícono pulsante */}
            <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                animation: 'pulse 2s infinite',
            }}>
                <RefreshCw size={16} color="var(--primary-accent)" />
            </div>

            {/* Texto */}
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    Nueva versión disponible
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Actualiza para ver los últimos cambios
                </div>
            </div>

            {/* Botón actualizar */}
            <button
                onClick={() => updateServiceWorker(true)}
                style={{
                    padding: '8px 14px',
                    background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.4)',
                    borderRadius: 8,
                    color: 'var(--primary-accent)',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(34,197,94,0.25)';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(34,197,94,0.3)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(34,197,94,0.15)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                Actualizar ↑
            </button>

            {/* Botón cerrar */}
            <button
                onClick={() => setNeedRefresh(false)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                    flexShrink: 0,
                    display: 'flex',
                    transition: 'color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-main)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
                <X size={16} />
            </button>
        </div>
    );
}
