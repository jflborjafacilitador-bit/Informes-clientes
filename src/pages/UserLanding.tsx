import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

export default function UserLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    telefono: '',
    presupuesto: '',
    financiamiento: ''
  });

  useEffect(() => {
    async function loadLanding() {
      if (!slug) return;
      try {
        const { data, error } = await supabase
          .from('user_landing_configs')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (error) throw error;

        let wa_instance_name: string | null = null;
        if (data?.whatsapp_instance_id) {
          const { data: instData } = await supabase
            .from('whatsapp_instances')
            .select('instance_name')
            .eq('id', data.whatsapp_instance_id)
            .single();
          wa_instance_name = instData?.instance_name ?? null;
        }

        setConfig({ ...data, _wa_instance_name: wa_instance_name });
      } catch (err: any) {
        console.error('Error cargando landing:', err);
        setError('Página no encontrada o no disponible.');
      } finally {
        setLoading(false);
      }
    }
    loadLanding();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.telefono.length < 10) {
      alert('El teléfono debe tener mínimo 10 dígitos.');
      return;
    }
    setSubmitting(true);
    try {
      const { error: dbError } = await supabase.from('clients').insert({
        name: formData.nombre,
        email: formData.correo,
        phone: formData.telefono,
        origen: 'landing_propia',
        asesor_id: config.user_id,
        presupuesto: formData.presupuesto,
        tipo_financiamiento: formData.financiamiento,
        status: 'Lead'
      });

      if (dbError) {
        console.error("DB Error al registrar lead:", dbError);
        throw new Error(`Error BD: ${dbError.message || dbError.details || 'No se pudo guardar la info'}`);
      }

      const globalWebhookUrl = `${import.meta.env.VITE_N8N_BASE_URL}/webhook/landing-agent`;
      try {
        await fetch(globalWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            asesor_id: config.user_id,
            asesor_name: config.asesor_display_name,
            whatsapp_instance_id: config.whatsapp_instance_id,
            whatsapp_instance_name: config._wa_instance_name || null,
            welcome_message: config.welcome_message
          }),
        });
      } catch (e) {
        console.error("Error al disparar webhook AI", e);
      }
      setSubmitted(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const advisorInitial = (config?.asesor_display_name || 'A').charAt(0).toUpperCase();
  const advisorName = config?.asesor_display_name || 'Asesor';

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.pageRoot}>
        <div style={styles.loadingWrap}>
          <div style={styles.spinner} />
          <p style={{ color: '#d4af37', fontSize: '0.9rem', marginTop: '1rem', fontFamily: 'sans-serif' }}>
            Cargando...
          </p>
        </div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────────
  if (error || !config) {
    return (
      <div style={styles.pageRoot}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏡</div>
          <h1 style={{ color: '#fff', fontFamily: 'Georgia, serif', fontSize: '1.6rem', marginBottom: '0.5rem' }}>
            Página No Disponible
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'sans-serif' }}>
            Esta invitación ha expirado o no existe.
          </p>
        </div>
      </div>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; background: #FCFAF7; }

        .lq-input {
          width: 100%; padding: 14px 16px 14px 44px;
          border: 1px solid rgba(212,175,55,0.3);
          border-radius: 12px; font-size: 0.95rem; font-family: 'Outfit', sans-serif;
          background: rgba(255,255,255,0.8); color: #0C1A14;
          outline: none; transition: all 0.25s; appearance: none; -webkit-appearance: none;
        }
        .lq-input::placeholder { color: rgba(12,26,20,0.4); }
        .lq-input:focus {
          border-color: rgba(212,175,55,0.8);
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(212,175,55,0.1);
        }
        .lq-select {
          width: 100%; padding: 14px 16px;
          border: 1px solid rgba(212,175,55,0.3);
          border-radius: 12px; font-size: 0.95rem; font-family: 'Outfit', sans-serif;
          background: rgba(255,255,255,0.8); color: #0C1A14;
          outline: none; transition: all 0.25s; appearance: none; -webkit-appearance: none;
          cursor: pointer;
        }
        .lq-select:focus {
          border-color: rgba(212,175,55,0.8);
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(212,175,55,0.1);
        }
        .lq-select option { background: #ffffff; color: #0C1A14; }
        .lq-btn {
          width: 100%; padding: 16px;
          background: linear-gradient(135deg, #d4af37 0%, #c9a227 50%, #b8911e 100%);
          border: 1px solid rgba(255,255,255,0.2); border-radius: 12px;
          color: #ffffff; font-family: 'Outfit', sans-serif;
          font-size: 1.05rem; font-weight: 700; letter-spacing: 0.5px;
          cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 24px rgba(212,175,55,0.3);
        }
        .lq-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(212,175,55,0.4);
          background: linear-gradient(135deg, #e8c94a 0%, #d4af37 50%, #c9a227 100%);
        }
        .lq-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lq-spin { to { transform: rotate(360deg); } }
        @keyframes pulse-gold { 0%,100% { box-shadow: 0 0 0 0 rgba(212,175,55,0.5); } 50% { box-shadow: 0 0 0 12px rgba(212,175,55,0); } }

        .lq-card { animation: fadeInUp 0.6s ease both; }
        .lq-card-delay { animation: fadeInUp 0.6s ease 0.15s both; }
        .lq-success { animation: fadeInUp 0.5s ease both; }
        .lq-spinner { animation: lq-spin 0.9s linear infinite; }
        .lq-pulse { animation: pulse-gold 2s ease-in-out infinite; }
      `}</style>

      <div style={styles.pageRoot}>

        {/* ── Decorative BG orbs ─────────────────────────────────── */}
        <div style={styles.orb1} />
        <div style={styles.orb2} />

        {/* ── Main content ──────────────────────────────────────── */}
        <div style={styles.contentWrap}>

          {/* Brand header */}
          <div className="lq-card" style={styles.brandHeader}>
            <div style={styles.logoCircle}>
              <img src="/Logo 1.1 sin fondo.png" alt="Residencial Los Quetzales" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
            </div>
            <div>
              <h1 style={styles.brandName}>Residencial Los Quetzales</h1>
              <p style={styles.brandTagline}>✦ Invierte en tu futuro HOY ✦</p>
            </div>
          </div>

          {/* Card */}
          <div className="lq-card-delay" style={styles.card}>

            {submitted ? (
              /* ── Success state ─────────────────────────────── */
              <div className="lq-success" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div className="lq-pulse" style={styles.successIcon}>✓</div>
                <h2 style={styles.successTitle}>¡Solicitud Recibida!</h2>
                <p style={styles.successText}>
                  <strong>{advisorName}</strong> revisará tu información y recibirás un
                  WhatsApp en breve con todos los detalles.
                </p>
                <div style={styles.successBadge}>
                  <span>📲</span> Recibirás respuesta en menos de 24h
                </div>
              </div>
            ) : (
              /* ── Form ─────────────────────────────────────── */
              <>
                {/* Advisor badge */}
                <div style={styles.advisorBadge}>
                  <div style={styles.advisorAvatar}>{advisorInitial}</div>
                  <div>
                    <p style={styles.advisorLabel}>Asesorado por</p>
                    <p style={styles.advisorName}>{advisorName}</p>
                    <p style={styles.advisorRole}>Experto Inmobiliario · Residencial Los Quetzales</p>
                  </div>
                </div>

                <div style={styles.divider} />

                <h2 style={styles.formTitle}>Solicita Información Ahora</h2>
                <p style={styles.formSubtitle}>
                  Completa el formulario y tu asesor te contactará al instante.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                  {/* Nombre */}
                  <Field icon="👤" label="Nombre completo">
                    <input
                      required
                      type="text"
                      className="lq-input"
                      placeholder="Ej. Juan Pérez"
                      value={formData.nombre}
                      onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    />
                  </Field>

                  {/* WhatsApp */}
                  <Field icon="📱" label="WhatsApp">
                    <input
                      required
                      type="tel"
                      className="lq-input"
                      placeholder="10 dígitos (Ej. 5512345678)"
                      value={formData.telefono}
                      onChange={e => setFormData({ ...formData, telefono: e.target.value.replace(/\D/g, '') })}
                    />
                  </Field>

                  {/* Correo */}
                  <Field icon="✉️" label="Correo electrónico">
                    <input
                      required
                      type="email"
                      className="lq-input"
                      placeholder="tu@correo.com"
                      value={formData.correo}
                      onChange={e => setFormData({ ...formData, correo: e.target.value })}
                    />
                  </Field>

                  {/* Presupuesto */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={styles.label}>💰 Presupuesto aproximado <span style={{ color: '#d4af37' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <select
                        required
                        className="lq-select"
                        value={formData.presupuesto}
                        onChange={e => setFormData({ ...formData, presupuesto: e.target.value })}
                      >
                        <option value="" disabled>Selecciona una opción...</option>
                        <option value="Menos de 1.5 mdp">Menos de $1.5 millones MXN</option>
                        <option value="Entre 1.5 y 2.0 mdp">De $1.5M a $2.0 millones MXN</option>
                        <option value="Más de 2.0 mdp">Más de $2.0 millones MXN</option>
                      </select>
                      <span style={styles.selectArrow}>▾</span>
                    </div>
                  </div>

                  {/* Financiamiento */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={styles.label}>🏦 Tipo de financiamiento <span style={{ color: '#d4af37' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <select
                        required
                        className="lq-select"
                        value={formData.financiamiento}
                        onChange={e => setFormData({ ...formData, financiamiento: e.target.value })}
                      >
                        <option value="" disabled>¿Cómo planeas pagar?</option>
                        <option value="INFONAVIT Tradicional">INFONAVIT Tradicional</option>
                        <option value="FOVISSSTE">FOVISSSTE</option>
                        <option value="CFE (Contado)">CFE o Contado</option>
                        <option value="Crédito Bancario">Crédito Bancario</option>
                        <option value="COFINAVIT">COFINAVIT</option>
                        <option value="FOVISSSTE + INFONAVIT">FOVISSSTE + INFONAVIT</option>
                      </select>
                      <span style={styles.selectArrow}>▾</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="lq-btn"
                    style={{ marginTop: '0.5rem' }}
                  >
                    {submitting ? '⏳ Enviando solicitud...' : '🚀 Solicitar Información'}
                  </button>

                  <p style={styles.privacy}>
                    🔒 Tus datos están protegidos. Solo los usamos para contactarte.
                  </p>
                </form>
              </>
            )}
          </div>

          {/* Trust badges */}
          {!submitted && (
            <div style={styles.trustRow}>
              {['✅ Sin costos ocultos', '📋 Asesoría personalizada', '🏆 Financiamiento garantizado'].map(b => (
                <span key={b} style={styles.trustBadge}>{b}</span>
              ))}
            </div>
          )}

          <p style={styles.footer}>© 2026 Residencial Los Quetzales · Todos los derechos reservados</p>
        </div>
      </div>
    </>
  );
}

// ── Field helper ──────────────────────────────────────────────────────────────
function Field({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={styles.label}>{icon} {label} <span style={{ color: '#d4af37' }}>*</span></label>
      <div style={{ position: 'relative' }}>
        <span style={styles.fieldIcon}>{icon}</span>
        {children}
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  pageRoot: {
    minHeight: '100dvh',
    backgroundImage: 'linear-gradient(160deg, rgba(255, 255, 255, 0.55) 0%, rgba(252, 250, 247, 0.75) 100%), url("/Material/1.1.png")',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1.5rem 1rem', position: 'relative', overflow: 'hidden',
    fontFamily: "'Outfit', sans-serif",
  },
  orb1: {
    position: 'fixed', top: '-120px', right: '-120px',
    width: '400px', height: '400px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  orb2: {
    position: 'fixed', bottom: '-80px', left: '-80px',
    width: '320px', height: '320px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(12,26,20,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  contentWrap: {
    width: '100%', maxWidth: '460px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem',
    position: 'relative', zIndex: 1,
  },
  brandHeader: {
    display: 'flex', alignItems: 'center', gap: '1rem',
    marginBottom: '0.25rem',
  },
  logoCircle: {
    width: 56, height: 56, borderRadius: '16px',
    background: '#ffffff',
    border: '1px solid rgba(212,175,55,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(212,175,55,0.15)',
  },
  brandName: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 'clamp(1.15rem, 4vw, 1.35rem)',
    fontWeight: 800, color: '#0C1A14', lineHeight: 1.2,
  },
  brandTagline: {
    fontSize: '0.7rem', color: '#B8911E',
    letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '3px',
    fontWeight: 600
  },
  card: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    borderRadius: '24px', padding: '2rem',
    boxShadow: '0 24px 60px rgba(12,26,20,0.1), 0 0 0 1px rgba(212,175,55,0.2) inset',
    backdropFilter: 'blur(30px)',
  },
  advisorBadge: {
    display: 'flex', alignItems: 'center', gap: '1rem',
    background: 'rgba(255, 255, 255, 0.9)', border: '1px solid rgba(212,175,55,0.2)',
    boxShadow: '0 4px 12px rgba(12,26,20,0.03)',
    borderRadius: '16px', padding: '1rem 1.2rem', marginBottom: '1.25rem',
  },
  advisorAvatar: {
    width: 48, height: 48, borderRadius: '14px',
    background: 'linear-gradient(135deg, #0C1A14 0%, #173628 100%)',
    border: '2px solid rgba(212,175,55,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.3rem', fontWeight: 700, color: '#d4af37',
    flexShrink: 0, boxShadow: '0 4px 12px rgba(12,26,20,0.15)',
  },
  advisorLabel: { fontSize: '0.72rem', color: 'rgba(12,26,20,0.5)', marginBottom: '2px', fontWeight: 500 },
  advisorName: { fontSize: '0.97rem', fontWeight: 700, color: '#0C1A14' },
  advisorRole: { fontSize: '0.72rem', color: '#B8911E', marginTop: '2px', fontWeight: 600 },
  divider: {
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)',
    marginBottom: '1.25rem',
  },
  formTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: '1.45rem',
    fontWeight: 800, color: '#0C1A14', marginBottom: '4px',
  },
  formSubtitle: {
    fontSize: '0.85rem', color: 'rgba(12,26,20,0.6)',
    marginBottom: '1.5rem', lineHeight: 1.5,
  },
  label: {
    fontSize: '0.82rem', fontWeight: 600,
    color: '#0C1A14', fontFamily: "'Outfit', sans-serif",
  },
  fieldIcon: {
    position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
    fontSize: '1rem', pointerEvents: 'none', lineHeight: 1,
  },
  selectArrow: {
    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
    color: '#D4AF37', fontSize: '0.9rem', pointerEvents: 'none',
  },
  privacy: {
    textAlign: 'center', fontSize: '0.72rem',
    color: 'rgba(12,26,20,0.5)', marginTop: '0.25rem',
    fontWeight: 500
  },
  successIcon: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'linear-gradient(135deg, #22c55e, #16a34a)',
    color: '#fff', fontSize: '2rem', fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 1.25rem', boxShadow: '0 8px 32px rgba(34,197,94,0.3)',
  },
  successTitle: {
    fontFamily: "'Playfair Display', serif", fontSize: '1.7rem',
    fontWeight: 800, color: '#0C1A14', marginBottom: '0.75rem',
  },
  successText: {
    fontSize: '0.92rem', color: 'rgba(12,26,20,0.7)',
    lineHeight: 1.6, marginBottom: '1.5rem',
  },
  successBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
    borderRadius: '100px', padding: '8px 18px',
    fontSize: '0.82rem', color: '#16a34a', fontWeight: 600
  },
  trustRow: {
    display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center',
  },
  trustBadge: {
    background: 'rgba(255, 255, 255, 0.8)', border: '1px solid rgba(212,175,55,0.2)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    borderRadius: '100px', padding: '6px 14px',
    fontSize: '0.72rem', color: 'rgba(12,26,20,0.6)', fontWeight: 500
  },
  footer: {
    fontSize: '0.68rem', color: 'rgba(12,26,20,0.4)',
    textAlign: 'center', paddingTop: '0.5rem',
    fontWeight: 500
  },
  loadingWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  spinner: {
    width: 40, height: 40, borderRadius: '50%',
    border: '3px solid rgba(212,175,55,0.2)',
    borderTop: '3px solid #d4af37',
    animation: 'lq-spin 0.9s linear infinite',
  },
};
