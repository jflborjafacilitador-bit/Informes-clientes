import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Login from './pages/Login';
import Usuarios from './pages/Usuarios';
import Reportes from './pages/Reportes';
import Configuracion from './pages/Configuracion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './services/supabaseClient';
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function AppLayout({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Heartbeat de presencia: actualiza last_seen cada 2 min y registra en canal Realtime
  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;
    const userEmail = session.user.email ?? '';

    const updateLastSeen = () =>
      supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', userId);

    updateLastSeen();
    const interval = setInterval(updateLastSeen, 2 * 60 * 1000);

    const channel = supabase.channel('online_users', { config: { presence: { key: userId } } });
    channel
      .on('presence', { event: 'sync' }, () => { })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, email: userEmail, online_at: new Date().toISOString() });
        }
      });

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  if (!session) return <>{children}</>;

  const isMobile = () => window.innerWidth <= 768;

  // Estilos del sidebar calculados en React (no dependen de CSS externo)
  const sidebarStyle: React.CSSProperties = isMobile()
    ? {
      position: 'fixed',
      top: 0, left: 0,
      height: '100vh',
      width: '260px',
      zIndex: 200,
      transform: sidebarOpen ? 'translateX(0)' : 'translateX(-260px)',
      transition: 'transform 0.3s ease',
    }
    : {
      width: sidebarOpen ? '260px' : '0px',
      minWidth: sidebarOpen ? '260px' : '0px',
      overflow: 'hidden',
      transition: 'width 0.3s ease, min-width 0.3s ease',
      flexShrink: 0,
    };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* Overlay en móvil */}
      {sidebarOpen && isMobile() && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 199,
            backdropFilter: 'blur(3px)',
          }}
        />
      )}

      {/* Sidebar con estilo inline */}
      <div style={sidebarStyle}>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Contenido principal */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        minWidth: 0,
      }}>
        <Header onMenuClick={() => setSidebarOpen(o => !o)} />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div className="content-wrapper animate-fade-in">
            {children}
          </div>
        </div>
      </main>

      {/* Botón flotante toggle — siempre visible */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        title={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '24px',
          zIndex: 300,
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'var(--primary-accent)',
          border: 'none',
          color: '#000',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(34,197,94,0.5)',
          transition: 'background 0.2s, transform 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {sidebarOpen ? <PanelLeftClose size={22} /> : <PanelLeftOpen size={22} />}
      </button>

    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute><Reportes /></ProtectedRoute>} />
            <Route path="/configuracion" element={<ProtectedRoute><Configuracion /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute><Usuarios /></ProtectedRoute>} />
          </Routes>
        </AppLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;
