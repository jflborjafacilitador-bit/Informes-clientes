import { useState, useEffect } from 'react';
import { RefreshCw, Plus, Minus, PlusCircle, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

interface CateringItem {
    id: string;
    nombre: string;
    emoji: string;
    cantidad: number;
    unidad: string;
    updated_at: string;
    updated_by: string | null;
}

function getColor(cantidad: number) {
    if (cantidad >= 10) return { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' };
    if (cantidad >= 5) return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' };
    return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' };
}

export default function Catering() {
    const { role, session } = useAuth();
    const [items, setItems] = useState<CateringItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [newItem, setNewItem] = useState({ nombre: '', emoji: '🍶', cantidad: 0 });
    const canManage = role === 'super_admin' || role === 'gerente';

    const load = async () => {
        setLoading(true);
        const { data } = await supabase.from('catering_items').select('*').order('nombre');
        if (data) setItems(data);
        setLoading(false);
    };

    useEffect(() => {
        load();
        // Realtime
        const channel = supabase.channel('catering_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'catering_items' }, load)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const adjust = async (item: CateringItem, delta: number) => {
        const newQty = Math.max(0, item.cantidad + delta);
        await supabase.from('catering_items').update({
            cantidad: newQty,
            updated_at: new Date().toISOString(),
            updated_by: session?.user?.email || null,
        }).eq('id', item.id);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, cantidad: newQty } : i));
    };

    const handleAdd = async () => {
        if (!newItem.nombre.trim()) return;
        await supabase.from('catering_items').insert({
            nombre: newItem.nombre.trim(),
            emoji: newItem.emoji || '🍶',
            cantidad: newItem.cantidad,
            updated_by: session?.user?.email || null,
        });
        setNewItem({ nombre: '', emoji: '🍶', cantidad: 0 });
        setShowNew(false);
    };

    const handleDelete = async (id: string) => {
        await supabase.from('catering_items').delete().eq('id', id);
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const inputStyle: React.CSSProperties = {
        padding: '8px 12px', borderRadius: '8px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)',
        color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem',
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', margin: 0 }}>
                        Catering <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>& Bebidas</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Control de inventario del refrigerador en tiempo real.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={load} disabled={loading} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
                        borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-glass)',
                        color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                        <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Actualizar
                    </button>
                    {canManage && (
                        <button onClick={() => setShowNew(v => !v)} style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
                            borderRadius: '8px', background: 'rgba(34,197,94,0.1)', border: '1px solid var(--primary-accent)',
                            color: 'var(--primary-accent)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600',
                        }}>
                            <PlusCircle size={16} /> {showNew ? 'Cancelar' : 'Agregar producto'}
                        </button>
                    )}
                </div>
            </div>

            {/* Formulario nuevo producto */}
            {showNew && canManage && (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 14px' }}>Nuevo producto</h3>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <input placeholder="Emoji" value={newItem.emoji} onChange={e => setNewItem(p => ({ ...p, emoji: e.target.value }))}
                            style={{ ...inputStyle, width: '60px', textAlign: 'center', fontSize: '1.3rem' }} />
                        <input placeholder="Nombre (ej. Jugo)" value={newItem.nombre} onChange={e => setNewItem(p => ({ ...p, nombre: e.target.value }))}
                            style={{ ...inputStyle, flex: 1, minWidth: '140px' }} />
                        <input type="number" min={0} placeholder="Cantidad inicial" value={newItem.cantidad}
                            onChange={e => setNewItem(p => ({ ...p, cantidad: Number(e.target.value) }))}
                            style={{ ...inputStyle, width: '140px' }} />
                        <button onClick={handleAdd} style={{
                            padding: '9px 20px', borderRadius: '8px', background: 'var(--primary-accent)',
                            border: 'none', color: '#000', fontWeight: '700', cursor: 'pointer',
                        }}>Agregar</button>
                    </div>
                </div>
            )}

            {/* Tarjetas de productos */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
                    Cargando inventario...
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                    {items.map(item => {
                        const clr = getColor(item.cantidad);
                        return (
                            <div key={item.id} className="glass-panel" style={{ padding: '28px 24px', position: 'relative', border: `1px solid ${clr.border}`, background: clr.bg }}>
                                {canManage && (
                                    <button onClick={() => handleDelete(item.id)} title="Eliminar" style={{
                                        position: 'absolute', top: '12px', right: '12px',
                                        background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                        cursor: 'pointer', opacity: 0.5, padding: '4px',
                                    }}
                                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>
                                        <Trash2 size={14} />
                                    </button>
                                )}

                                {/* Emoji + nombre */}
                                <div style={{ fontSize: '3rem', marginBottom: '8px', lineHeight: 1 }}>{item.emoji}</div>
                                <p style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: '600' }}>{item.nombre}</p>
                                <p style={{ margin: '0 0 20px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    {item.updated_by ? `Actualizado por ${item.updated_by.split('@')[0]}` : 'Sin modificar'}
                                </p>

                                {/* Cantidad */}
                                <div style={{ fontSize: '3.5rem', fontWeight: '800', color: clr.color, lineHeight: 1, marginBottom: '20px' }}
                                    className="glow-text">
                                    {item.cantidad}
                                    <span style={{ fontSize: '1rem', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '6px' }}>pzas</span>
                                </div>

                                {/* Controles */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button onClick={() => adjust(item, -10)} style={btnCtrl('#ef4444')}>−10</button>
                                    <button onClick={() => adjust(item, -1)} style={btnCtrl('#ef4444')}>
                                        <Minus size={16} />
                                    </button>
                                    <button onClick={() => adjust(item, 1)} style={{ ...btnCtrl('#22c55e'), marginLeft: 'auto' }}>
                                        <Plus size={16} />
                                    </button>
                                    <button onClick={() => adjust(item, 10)} style={btnCtrl('#22c55e')}>+10</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

function btnCtrl(color: string): React.CSSProperties {
    return {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '7px 12px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700',
        background: `${color}18`, border: `1px solid ${color}44`, color,
        cursor: 'pointer', minWidth: '40px',
    };
}
