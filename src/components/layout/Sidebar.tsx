import React from 'react';
import { Home, Users, BarChart2, Settings, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();

  const links = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/reportes', icon: BarChart2, label: 'Reportes' },
    { to: '/configuracion', icon: Settings, label: 'Configuración' },
  ];

  return (
    <aside className="sidebar">
      <div style={{ padding: '2rem 1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ 
          width: '40px', height: '40px', 
          borderRadius: '10px', 
          background: 'linear-gradient(135deg, var(--primary-accent), var(--secondary-accent))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)'
        }}>
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.2rem' }}>Q</span>
        </div>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600', m: 0 }} className="glow-text">Los Quetzales</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Panel Administrativo</span>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          
          return (
            <Link 
              key={link.to} 
              to={link.to}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                textDecoration: 'none',
                color: isActive ? '#fff' : 'var(--text-muted)',
                background: isActive ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
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
        <button style={{
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
