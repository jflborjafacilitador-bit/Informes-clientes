import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Header />
          <div className="content-wrapper animate-fade-in">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/reportes" element={<div className="glass-panel" style={{ padding: '2rem' }}><h2>Sección de Reportes</h2></div>} />
              <Route path="/configuracion" element={<div className="glass-panel" style={{ padding: '2rem' }}><h2>Configuración Global</h2></div>} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
