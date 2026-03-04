import { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setErrorMsg('Correo o contraseña incorrectos.');
            setLoading(false);
        } else {
            navigate('/');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            position: 'relative'
        }}>
            {/* Background Decorators */}
            <div className="gradient-blob" style={{
                top: '-10%', left: '-10%', width: '600px', height: '600px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)'
            }}></div>
            <div className="gradient-blob" style={{
                bottom: '-10%', right: '-10%', width: '500px', height: '500px',
                backgroundColor: 'rgba(249, 115, 22, 0.1)'
            }}></div>

            <div className="glass-panel" style={{
                width: '100%', maxWidth: '420px', padding: '40px',
                position: 'relative', zIndex: 1, textAlign: 'center'
            }}>

                <div style={{ width: '80px', height: '80px', margin: '0 auto 20px auto' }}>
                    <img src="/Logo 1.1 sin fondo.png" alt="Los Quetzales Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>

                <h2 style={{ fontSize: '1.8rem', margin: '0 0 10px 0' }} className="glow-text">
                    Los Quetzales
                </h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '0.9rem' }}>
                    Ingresa tus credenciales para administrar los registros.
                </p>

                {errorMsg && (
                    <div style={{
                        padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)',
                        borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Correo Electrónico</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@losquetzales.com"
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                background: 'rgba(0,0,0, 0.2)', border: '1px solid var(--border-glass)',
                                color: '#fff', outline: 'none', transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary-accent)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-glass)'}
                        />
                    </div>

                    <div style={{ textAlign: 'left' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Contraseña</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px',
                                background: 'rgba(0,0,0, 0.2)', border: '1px solid var(--border-glass)',
                                color: '#fff', outline: 'none', transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--secondary-accent)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-glass)'}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '14px', borderRadius: '8px', border: 'none',
                            background: 'linear-gradient(135deg, var(--primary-accent), var(--secondary-accent))',
                            color: '#fff', fontWeight: 'bold', fontSize: '1rem', marginTop: '10px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            boxShadow: '0 0 15px rgba(34, 197, 94, 0.3)',
                            transition: 'transform 0.1s'
                        }}
                        onMouseDown={(e) => { if (!loading) e.currentTarget.style.transform = 'scale(0.98)'; }}
                        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        {loading ? 'Ingresando...' : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
}
