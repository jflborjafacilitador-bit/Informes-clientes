import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, Info, AlertTriangle, UserPlus, Package } from 'lucide-react';
import { useNotifications, type AppNotification } from '../../hooks/useNotifications';

const getIcon = (type: string) => {
    switch (type) {
        case 'assigned_client': return <UserPlus size={16} color="var(--primary-accent)" />;
        case 'inventory_change': return <Package size={16} color="#f59e0b" />;
        case 'appointment_reminder': return <Bell size={16} color="#38bdf8" />;
        case 'system_alert': return <AlertTriangle size={16} color="#ef4444" />;
        default: return <Info size={16} color="var(--text-main)" />;
    }
};

const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Hace un momento';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Hace ${days} d`;
    return date.toLocaleDateString();
};

export default function NotificationDropdown() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleNotificationClick = (n: AppNotification) => {
        if (!n.read) markAsRead(n.id);
        // En un futuro se podría añadir navegación por tipo
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: isOpen ? 'var(--ghost-bg-hover)' : 'var(--ghost-bg)',
                    border: 'none', borderRadius: '50%',
                    width: '40px', height: '40px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-main)', cursor: 'pointer', position: 'relative',
                    transition: 'background 0.2s', flexShrink: 0,
                }}
                onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.background = 'var(--ghost-bg-hover)' }}
                onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.background = 'var(--ghost-bg)' }}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: '8px', right: '8px',
                        width: '8px', height: '8px',
                        background: 'var(--primary-accent)', borderRadius: '50%',
                        boxShadow: '0 0 8px var(--primary-accent)'
                    }}></span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '50px',
                    right: 0,
                    width: '320px',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
                    zIndex: 100,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '400px'
                }}>
                    <div style={{ 
                        padding: '12px 16px', 
                        borderBottom: '1px solid var(--border-glass)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.02)'
                    }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>Notificaciones</h4>
                        {unreadCount > 0 && (
                            <button 
                                onClick={markAllAsRead}
                                style={{ 
                                    background: 'none', border: 'none', 
                                    color: 'var(--text-muted)', fontSize: '0.75rem', 
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' 
                                }}
                            >
                                <CheckCircle2 size={12} />
                                Marcar todas
                            </button>
                        )}
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                No tienes notificaciones.
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div 
                                    key={n.id} 
                                    onClick={() => handleNotificationClick(n)}
                                    style={{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid rgba(255,255,255,0.03)',
                                        background: n.read ? 'transparent' : 'rgba(34,197,94,0.05)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        gap: '12px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = n.read ? 'rgba(255,255,255,0.02)' : 'rgba(34,197,94,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(34,197,94,0.05)'}
                                >
                                    <div style={{ 
                                        width: '32px', height: '32px', 
                                        borderRadius: '50%', background: 'var(--ghost-bg)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {getIcon(n.type)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                            <p style={{ 
                                                margin: 0, fontSize: '0.82rem', 
                                                fontWeight: n.read ? '500' : '700',
                                                color: n.read ? 'var(--text-main)' : '#fff',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                            }}>
                                                {n.title}
                                            </p>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                            {n.message}
                                        </p>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.7 }}>
                                            {formatTimeAgo(n.created_at)}
                                        </p>
                                    </div>
                                    {!n.read && (
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary-accent)', marginTop: '6px' }} />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
