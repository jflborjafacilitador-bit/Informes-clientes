import React, { useState, useEffect } from 'react';
import { X, Save, Copy, Link, Bot, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

interface Props {
  user: any;
  onClose: () => void;
}

export default function LandingConfigModal({ user, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [instances, setInstances] = useState<any[]>([]);
  const [config, setConfig] = useState({
    id: null as string | null,
    slug: '',
    is_active: false,
    whatsapp_instance_id: '',
    n8n_webhook_url: '',
    welcome_message: '¡Hola! ☀️ Soy el Asistente Digital de Residencial Los Quetzales. Recibimos tu registro desde la página de tu asesor. ¿En qué te puedo ayudar hoy?'
  });
  const [msg, setMsg] = useState({ text: '', ok: true });

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    try {
      const { data: instData } = await supabase.from('whatsapp_instances').select('id, instance_name, phone_number').order('created_at');
      if (instData) setInstances(instData);

      const { data, error: sbError } = await supabase.from('user_landing_configs').select('*').eq('user_id', user.id).maybeSingle();
      
      if (sbError) throw sbError;

      if (data) {
        setConfig(data as any);
      } else {
        const defaultSlug = (user.email.split('@')[0] || 'asesor') + '-' + Math.floor(Math.random() * 1000);
        setConfig(c => ({ ...c, slug: defaultSlug }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.slug.match(/^[a-z0-9-]+$/)) {
      setMsg({ text: 'El slug solo puede contener letras minúsculas, números y guiones.', ok: false });
      return;
    }

    setSaving(true);
    setMsg({ text: '', ok: true });

    try {
      const payload = {
        user_id: user.id,
        slug: config.slug,
        is_active: config.is_active,
        whatsapp_instance_id: config.whatsapp_instance_id || null,
        n8n_webhook_url: config.n8n_webhook_url,
        welcome_message: config.welcome_message,
        asesor_display_name: user.full_name || user.email
      };

      if (config.id) {
        const { error } = await supabase.from('user_landing_configs').update(payload).eq('id', config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('user_landing_configs').insert([payload]).select().single();
        if (error) throw error;
        setConfig(c => ({ ...c, id: data.id }));
      }
      
      setMsg({ text: '¡Configuración guardada exitosamente!', ok: true });
      setTimeout(onClose, 2000);
    } catch (err: any) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setSaving(false);
    }
  };

  const domain = window.location.origin;
  const publicLink = `${domain}/registro/${config.slug}`;

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: '8px', 
    background: 'var(--bg-panel)', border: '1px solid var(--border-glass)', 
    color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box' as const
  };

  const labelStyle = {
    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', 
    color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div className="glass-panel" style={{ 
        width: '100%', maxWidth: '600px', background: 'var(--bg-panel)',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', 
        position: 'relative', overflow: 'hidden', padding: 0,
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)', borderRadius: '12px'
      }}>
        <div style={{ padding: '24px 30px', borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-panel)' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 24, right: 24, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', outline: 'none' }}>
            <X size={24} />
          </button>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: 'var(--text-main)' }}>
            <Link color="var(--primary-accent)" size={24} /> Configuración de Landing
          </h2>
        </div>

        <div style={{ padding: '30px', overflowY: 'auto' }}>
          <p style={{ color: 'var(--text-main)', marginBottom: '24px', background: 'var(--bg-panel)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '0.9rem' }}>
            Asesor seleccionado: <strong style={{ color: 'var(--primary-accent)' }}>{user.email}</strong>
          </p>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
               <p style={{ color: 'var(--text-muted)' }}>Cargando configuración...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-panel)', padding: '16px', borderRadius: '8px', border: '1px solid var(--primary-accent)' }}>
                <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', margin: 0, fontWeight: 600, color: 'var(--text-main)' }}>
                  <span>Activar página de registro pública</span>
                  <input type="checkbox" checked={config.is_active} onChange={e => setConfig(c => ({...c, is_active: e.target.checked}))} style={{ width: '20px', height: '20px', accentColor: 'var(--primary-accent)', cursor: 'pointer' }} />
                </label>
              </div>

              <div>
                <label style={labelStyle}>Enlace Personalizado (Slug)</label>
                <div style={{ display: 'flex', width: '100%' }}>
                  <span style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-glass)', borderRight: 'none', padding: '12px', borderRadius: '8px 0 0 8px', color: 'var(--text-muted)', fontFamily: 'monospace', display: 'flex', alignItems: 'center' }}>
                    /registro/
                  </span>
                  <input 
                    type="text" 
                    value={config.slug} 
                    onChange={e => setConfig(c => ({...c, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')}))}
                    required
                    style={{ ...inputStyle, borderRadius: '0 8px 8px 0', flex: 1 }} 
                  />
                </div>
              </div>

              {config.is_active && config.slug && (
                <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid var(--success)', padding: '16px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px', marginTop: 0 }}>URL Activa Pública</p>
                    <a href={publicLink} target="_blank" rel="noreferrer" style={{ color: 'var(--text-main)', textDecoration: 'none', fontFamily: 'monospace', fontSize: '0.9rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {publicLink}
                    </a>
                  </div>
                  <button type="button" onClick={() => navigator.clipboard.writeText(publicLink)} style={{ background: 'transparent', border: '1px solid var(--success)', color: 'var(--success)', cursor: 'pointer', padding: '8px', borderRadius: '6px', display: 'flex' }} title="Copiar enlace">
                    <Copy size={18} />
                  </button>
                </div>
              )}

              <div>
                <label style={labelStyle}><Bot size={16}/> WhatsApp (Emisor de Bienvenida)</label>
                <select 
                  value={config.whatsapp_instance_id || ''} 
                  onChange={e => setConfig(c => ({...c, whatsapp_instance_id: e.target.value}))}
                  style={{ ...inputStyle, cursor: 'pointer', appearance: 'auto' }}
                >
                  <option value="">-- No enviar WhatsApp automáticamente --</option>
                  {instances.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.instance_name} ({inst.phone_number || 'Sin número configurado'})</option>
                  ))}
                </select>
              </div>


              <div>
                <label style={labelStyle}>Mensaje de Auto-Bienvenida Automático</label>
                <textarea 
                  rows={4}
                  value={config.welcome_message} 
                  onChange={e => setConfig(c => ({...c, welcome_message: e.target.value}))}
                  disabled={!config.whatsapp_instance_id}
                  style={{ ...inputStyle, resize: 'none', opacity: !config.whatsapp_instance_id ? 0.6 : 1, cursor: !config.whatsapp_instance_id ? 'not-allowed' : 'text' }} 
                />
              </div>

              {msg.text && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', borderRadius: '8px', background: msg.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${msg.ok ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, color: msg.ok ? 'var(--success)' : 'var(--danger)' }}>
                  <div style={{ marginTop: '2px' }}>{msg.ok ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}</div>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>{msg.text}</p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid var(--border-glass)', gap: '16px', marginTop: '10px' }}>
                <button 
                  type="button"
                  onClick={onClose}
                  style={{ background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', cursor: 'pointer', padding: '10px 20px', borderRadius: '8px', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: saving ? 'var(--text-muted)' : 'var(--primary-accent)', color: '#000', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(0, 240, 255, 0.2)' }}
                >
                  <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}


