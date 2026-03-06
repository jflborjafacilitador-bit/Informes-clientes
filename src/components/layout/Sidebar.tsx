import { Home, Users, BarChart2, Settings, LogOut, UserCog, X, Building2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { signOut, role } = useAuth();

  const links = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/inventario', icon: Building2, label: 'Inventario' },
    { to: '/reportes', icon: BarChart2, label: 'Reportes' },
    { to: '/configuracion', icon: Settings, label: 'Configuración' },
    ...(role === 'super_admin' ? [{ to: '/usuarios', icon: UserCog, label: 'Usuarios' }] : []),
  ];

  return (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      {/* Header del sidebar */}
      <div style={{ padding: '2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/Logo 1.1 sin fondo.png" alt="Logo Los Quetzales" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', margin: 0 }} className="glow-text">Los Quetzales</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Panel Administrativo</span>
              <span style={{
                fontSize: '0.62rem', fontWeight: '700',
                color: 'var(--primary-accent)',
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: '4px',
                padding: '0px 5px',
              }}>v{__APP_VERSION__}</span>
            </div>
          </div>
        </div>
        {/* Botón cerrar — solo visible en móvil */}
        <button
          onClick={onClose}
          className="sidebar-close-btn"
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={20} />
        </button>
      </div>

      <nav style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;

          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={onClose}  /* cierra el drawer en móvil al navegar */
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                textDecoration: 'none',
                color: isActive ? '#fff' : 'var(--text-muted)',
                background: isActive ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                border: isActive ? '1px solid var(--border-glass)' : '1px solid transparent',
                transition: 'all 0.3s ease'
              }}
              className={isActive ? 'glow-border' : ''}
            >
              <Icon size={20} color={isActive ? 'var(--primary-accent)' : 'currentColor'} />
              <span style={{ fontWeight: isActive ? '500' : '400' }}>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-glass)' }}>
        <button
          onClick={() => signOut()}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '10px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            borderRadius: '8px',
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
