import React, { useState } from 'react';
import { X, UserPlus, Phone, Mail, DollarSign, Target } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

interface NewClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    existingPhones: string[];
}

export default function NewClientModal({ isOpen, onClose, onSuccess, existingPhones }: NewClientModalProps) {
    const { session } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        budget: '',
        segment: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // 1. Validar que el teléfono no esté vacío y tenga formato correcto
        const phoneClean = formData.phone.replace(/\D/g, '');
        if (phoneClean.length < 10) {
            setError('El número de teléfono debe tener al menos 10 dígitos.');
            setLoading(false);
            return;
        }

        // 2. Validación Anti-Duplicados estricta local
        if (existingPhones.includes(phoneClean)) {
            setError('Este teléfono ya está registrado en el sistema. Probablemente pertenezca a otra campaña o compañero.');
            setLoading(false);
            return;
        }

        try {
            // Intentar guardado final
            const { error: insertError } = await supabase.from('clients').insert([{
                name: formData.name,
                phone: phoneClean,
                email: formData.email,
                presupuesto: formData.budget,
                tipo_financiamiento: formData.segment,
                origen: 'propio',
                asesor_id: session?.user?.id,
                status: 'Nuevo'
            }]);

            if (insertError) {
                // Validación Anti-Duplicados base de datos (porcelana)
                if (insertError.code === '23505' || insertError.message.includes('unique')) {
                    setError('Este correo o teléfono ya existe en la base de datos global.');
                } else {
                    setError(insertError.message);
                }
                throw insertError;
            }

            // Registrar log de actividad
            await supabase.from('profiles').update({
                last_seen: new Date().toISOString(),
                last_action: `Registró cliente propio: ${formData.name}`
            }).eq('id', session?.user?.id);

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Error al guardar el cliente:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
        }}>
            <div className="glass-panel" style={{
                background: 'var(--bg-panel)', padding: '32px', borderRadius: '16px',
                width: '100%', maxWidth: '500px',
                border: '1px solid var(--border-glass)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', background: 'rgba(0,240,255,0.1)', borderRadius: '8px' }}>
                            <UserPlus size={24} style={{ color: 'var(--primary-accent)' }} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Registrar Contacto Manual</h2>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div style={{
                        padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', marginBottom: '20px', fontSize: '0.9rem'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Nombre Completo *</label>
                        <div style={{ position: 'relative' }}>
                            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', paddingLeft: '40px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-main)', fontFamily: 'inherit' }}
                                placeholder="Ej: Juan Pérez" />
                            <UserPlus size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Teléfono (WhatsApp) *</label>
                        <div style={{ position: 'relative' }}>
                            <input type="tel" required value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', paddingLeft: '40px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-main)', fontFamily: 'inherit' }}
                                placeholder="A 10 dígitos, sin espacios" />
                            <Phone size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Correo Electrónico (Opcional)</label>
                        <div style={{ position: 'relative' }}>
                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', paddingLeft: '40px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'var(--text-main)', fontFamily: 'inherit' }}
                                placeholder="juan@correo.com" />
                            <Mail size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Presupuesto (Opcional)</label>
                            <div style={{ position: 'relative' }}>
                                <select value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })}
                                    style={{ appearance: 'none', width: '100%', padding: '10px 14px', paddingLeft: '32px', paddingRight: '32px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: formData.budget ? 'var(--text-main)' : 'var(--text-muted)', fontFamily: 'inherit', cursor: 'pointer' }}>
                                    <option value="" disabled>Selecciona opción...</option>
                                    <option value="Menos de 1.5 mdp">Menos de $1.5 millones MXN</option>
                                    <option value="Entre 1.5 y 2.0 mdp">De $1.5M a $2.0 millones MXN</option>
                                    <option value="Más de 2.0 mdp">Más de $2.0 millones MXN</option>
                                </select>
                                <DollarSign size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                                <span style={{ position: 'absolute', right: '14px', top: '10px', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: '1rem' }}>▾</span>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '8px' }}>Segmento / Crédito</label>
                            <div style={{ position: 'relative' }}>
                                <select value={formData.segment} onChange={e => setFormData({ ...formData, segment: e.target.value })}
                                    style={{ appearance: 'none', width: '100%', padding: '10px 14px', paddingLeft: '32px', paddingRight: '32px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: formData.segment ? 'var(--text-main)' : 'var(--text-muted)', fontFamily: 'inherit', cursor: 'pointer' }}>
                                    <option value="" disabled>¿Cómo planeas pagar?</option>
                                    <option value="INFONAVIT Tradicional">INFONAVIT Tradicional</option>
                                    <option value="FOVISSSTE">FOVISSSTE</option>
                                    <option value="CFE (Contado)">CFE o Contado</option>
                                    <option value="Crédito Bancario">Crédito Bancario</option>
                                    <option value="COFINAVIT">COFINAVIT</option>
                                    <option value="FOVISSSTE + INFONAVIT">FOVISSSTE + INFONAVIT</option>
                                </select>
                                <Target size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-muted)' }} />
                                <span style={{ position: 'absolute', right: '14px', top: '10px', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: '1rem' }}>▾</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} disabled={loading}
                            style={{ padding: '10px 20px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-main)', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading}
                            style={{ padding: '10px 20px', borderRadius: '8px', background: 'var(--primary-accent)', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {loading ? 'Validando...' : 'Registrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
