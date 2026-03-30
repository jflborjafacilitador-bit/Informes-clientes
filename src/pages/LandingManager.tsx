import { useState, useEffect } from 'react';
import { LayoutTemplate, Loader2, ExternalLink, RefreshCw, AlertCircle, ToggleLeft, ToggleRight, Copy } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export default function LandingManager() {
  const [landings, setLandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    loadLandings();
    
    // Configurar suscripción realtime para detectar cambios
    const channel = supabase.channel('landings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_landing_configs' }, () => {
        loadLandings();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadLandings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_landing_configs')
        .select(`
          *,
          profiles:user_id (email)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setLandings(data || []);
    } catch (err) {
      console.error('Error cargando landings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (id: string, updates: any) => {
    setSavingId(id);
    try {
      const { error } = await supabase
        .from('user_landing_configs')
        .update(updates)
        .eq('id', id);
        
      if (error) throw error;
      
      // La actualización en UI ocurrirá via realtime
      setLandings(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    } catch (err) {
      console.error('Error actualizando config:', err);
      alert('Hubo un error al actualizar la landing. Revisa la consola.');
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = (id: string, currentVal: boolean) => {
    updateConfig(id, { is_active: !currentVal });
  };
  
  const handleTextChange = (id: string, field: string, value: string) => {
    setLandings(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };
  
  const saveTextChanges = (id: string, field: string, value: string) => {
    updateConfig(id, { [field]: value });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ padding: '2rem 3rem' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.8rem', margin: 0 }}>
            <LayoutTemplate color="var(--primary-accent)" size={28} />
            Gestión de Landing Pages
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Panel administrativo para habilitar y editar el contenido público de captura de leads.
          </p>
        </div>
        <button 
          onClick={loadLandings} 
          disabled={loading}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
            padding: '8px 16px', borderRadius: '8px', color: 'var(--text-main)',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          Refrescar
        </button>
      </header>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 size={32} color="var(--primary-accent)" className="spin" />
        </div>
      ) : landings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: '16px', border: '1px dashed var(--border-glass)' }}>
          <AlertCircle size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-main)', marginBottom: '0.5rem' }}>No hay configuaciones</h3>
          <p style={{ color: 'var(--text-muted)' }}>Los usuarios deben configurar su Landing por primera vez en la pestaña Usuarios para que aparezca aquí.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
          {landings.map((landing) => {
            const isSaving = savingId === landing.id;
            const liveUrl = `${window.location.origin}/registro/${landing.slug}`;
            const userEmail = landing.profiles?.email || 'Usuario desconocido';

            return (
              <div key={landing.id} style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: `1px solid ${landing.is_active ? 'rgba(34,197,94,0.3)' : 'var(--border-glass)'}`,
                overflow: 'hidden',
                transition: 'all 0.3s'
              }}>
                <div style={{ 
                  padding: '1rem 1.5rem', 
                  borderBottom: '1px solid var(--border-glass)',
                  background: landing.is_active ? 'rgba(34,197,94,0.05)' : 'rgba(0,0,0,0.1)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', margin: 0, color: 'var(--text-main)' }}>{userEmail}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/{landing.slug}</span>
                      <button 
                        onClick={() => copyToClipboard(liveUrl)}
                        title="Copiar URL"
                        style={{ background: 'transparent', border: 'none', color: 'var(--primary-accent)', cursor: 'pointer', padding: 2 }}
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleToggleActive(landing.id, landing.is_active)}
                    disabled={isSaving}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: landing.is_active ? 'var(--primary-hover)' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{landing.is_active ? 'Activa' : 'Inactiva'}</span>
                    {landing.is_active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                  </button>
                </div>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Nombre del Asesor */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Identidad Pública del Asesor
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={landing.asesor_display_name || ''}
                        onChange={(e) => handleTextChange(landing.id, 'asesor_display_name', e.target.value)}
                        onBlur={(e) => saveTextChanges(landing.id, 'asesor_display_name', e.target.value)}
                        style={{
                          flex: 1, padding: '10px 14px', borderRadius: '8px',
                          background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                          color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none'
                        }}
                        placeholder="Ej. Juan Pérez - Experto Inmobiliario"
                      />
                      {isSaving && <Loader2 size={16} className="spin" style={{ alignSelf: 'center', color: 'var(--primary-accent)' }} />}
                    </div>
                  </div>

                  {/* Mensaje de Bienvenida */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Mensaje Inicial de IA / Webhook
                    </label>
                    <textarea
                      value={landing.welcome_message || ''}
                      onChange={(e) => handleTextChange(landing.id, 'welcome_message', e.target.value)}
                      onBlur={(e) => saveTextChanges(landing.id, 'welcome_message', e.target.value)}
                      rows={3}
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: '8px',
                        background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                        color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none',
                        resize: 'none'
                      }}
                    />
                  </div>
                  
                  {/* Vista Previa Boton */}
                  <div style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--border-glass)' }}>
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glow-border"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        padding: '12px', background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                        borderRadius: '10px', textDecoration: 'none', fontWeight: 600,
                        opacity: landing.is_active ? 1 : 0.5,
                        pointerEvents: landing.is_active ? 'auto' : 'none'
                      }}
                    >
                      <ExternalLink size={18} />
                      Vista Previa de Landing
                    </a>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
