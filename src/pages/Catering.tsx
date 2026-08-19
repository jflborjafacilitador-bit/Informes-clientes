import { useState, useEffect } from 'react';
import { RefreshCw, Plus, Minus, PlusCircle, Trash2, Download } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import * as xlsx from 'xlsx';

interface CateringItem {
    id: string;
    nombre: string;
    emoji: string;
    cantidad: number; // Total stock
    unidad: string;   // Stores Refrigerator stock as a string
    updated_at: string;
    updated_by: string | null;
}

const CATEGORY_EMOJIS: Record<string, string> = {
    AGUAS: '💧',
    JUGOS: '🧃',
    REFRESCOS: '🥤',
    CERVEZAS: '🍺',
    OTROS: '📦',
};

const PRODUCTOS_PREDEFINIDOS = [
    { nombre: 'AGUAS MEMBERS MARK DE 500 ML', emoji: '💧', cantidad: 74, unidad: '44' },
    { nombre: 'AGUAS MEMBERS MARK DE 355 ML', emoji: '💧', cantidad: 69, unidad: '39' },
    { nombre: 'JUGOS JUMEX (200 ML)', emoji: '🧃', cantidad: 2, unidad: '2' },
    { nombre: 'JUGOS BOING (125ML)', emoji: '🧃', cantidad: 0, unidad: '0' },
    { nombre: 'COCA COLA (325 ML)', emoji: '🥤', cantidad: 0, unidad: '0' },
    { nombre: 'CHAPARRITA', emoji: '🥤', cantidad: 0, unidad: '0' },
    { nombre: 'CERVEZA CARTABLANCA', emoji: '🍺', cantidad: 3, unidad: '3' },
    { nombre: 'CERVEZA BARRILITO', emoji: '🍺', cantidad: 0, unidad: '0' },
    { nombre: 'CERVEZA MODELO', emoji: '🍺', cantidad: 0, unidad: '0' },
    { nombre: 'CERVEZA CORONA', emoji: '🍺', cantidad: 36, unidad: '16' },
    { nombre: 'CERVEZA VICTORIA', emoji: '🍺', cantidad: 27, unidad: '17' }
];

function getCategory(nombre: string): string {
    const n = nombre.toUpperCase();
    if (n.includes('AGUA')) return 'AGUAS';
    if (n.includes('JUGO') || n.includes('BOING')) return 'JUGOS';
    if (n.includes('COCA') || n.includes('CHAPARRITA') || n.includes('REFRESCO')) return 'REFRESCOS';
    if (n.includes('CERVEZA')) return 'CERVEZAS';
    return 'OTROS';
}

function getStatusBadge(total: number) {
    if (total >= 10) {
        return { label: 'SUFICIENTE', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' };
    }
    return { label: 'SOLICITUD DE MATERIAL', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)' };
}

export default function Catering() {
    const { role, session, isReadonly } = useAuth();
    const [items, setItems] = useState<CateringItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [newItem, setNewItem] = useState({ nombre: '', emoji: '🍶', almacen: 0, refrigerador: 0 });
    const [descargando, setDescargando] = useState(false);
    
    const canManage = !isReadonly && (role === 'super_admin' || role === 'gerente');
    const canAdjust = !isReadonly;

    const load = async () => {
        setLoading(true);
        const { data } = await supabase.from('catering_items').select('*').order('nombre');
        if (data) setItems(data);
        setLoading(false);
    };

    useEffect(() => {
        load();
        const channel = supabase.channel('catering_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'catering_items' }, load)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const adjust = async (item: CateringItem, type: 'almacen' | 'refrigerador', delta: number) => {
        let currentAlmacen = item.cantidad - (parseInt(item.unidad) || 0);
        let currentRefrigerador = parseInt(item.unidad) || 0;

        if (type === 'almacen') {
            currentAlmacen = Math.max(0, currentAlmacen + delta);
        } else {
            currentRefrigerador = Math.max(0, currentRefrigerador + delta);
        }

        const newTotal = currentAlmacen + currentRefrigerador;
        const newUnidad = String(currentRefrigerador);

        const { error } = await supabase.from('catering_items').update({
            cantidad: newTotal,
            unidad: newUnidad,
            updated_at: new Date().toISOString(),
            updated_by: session?.user?.email || null,
        }).eq('id', item.id);

        if (!error) {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, cantidad: newTotal, unidad: newUnidad } : i));
            
            if (session?.user?.id) {
                const actionText = type === 'almacen' 
                    ? `Ajustó Almacén de ${item.nombre}: ${currentAlmacen - delta} → ${currentAlmacen} pzas`
                    : `Ajustó Refri de ${item.nombre}: ${currentRefrigerador - delta} → ${currentRefrigerador} pzas`;
                
                supabase.from('profiles').update({
                    last_action: actionText,
                }).eq('id', session.user.id).then(() => { });
            }
        }
    };

    const handleAdd = async () => {
        if (!newItem.nombre.trim()) return;
        const total = newItem.almacen + newItem.refrigerador;
        await supabase.from('catering_items').insert({
            nombre: newItem.nombre.trim(),
            emoji: newItem.emoji || '🍶',
            cantidad: total,
            unidad: String(newItem.refrigerador),
            updated_by: session?.user?.email || null,
        });
        setNewItem({ nombre: '', emoji: '🍶', almacen: 0, refrigerador: 0 });
        setShowNew(false);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('¿Estás seguro de eliminar este producto del inventario?')) {
            await supabase.from('catering_items').delete().eq('id', id);
            setItems(prev => prev.filter(i => i.id !== id));
        }
    };

    const handleInicializar = async () => {
        if (window.confirm('⚠️ ATENCIÓN: Esto eliminará todos los registros actuales de catering y restablecerá el catálogo con los 11 productos estándar oficiales (Victoria, Corona, etc.). ¿Deseas continuar?')) {
            setLoading(true);
            try {
                // Delete all current items
                const { error: delError } = await supabase
                    .from('catering_items')
                    .delete()
                    .neq('id', '00000000-0000-0000-0000-000000000000');
                    
                if (delError) throw delError;

                // Insert the predefined items
                const inserts = PRODUCTOS_PREDEFINIDOS.map(p => ({
                    nombre: p.nombre,
                    emoji: p.emoji,
                    cantidad: p.cantidad,
                    unidad: p.unidad,
                    updated_by: session?.user?.email || null,
                }));
                
                const { error: insError } = await supabase.from('catering_items').insert(inserts);
                if (insError) throw insError;
                
                await load();
                alert('Catálogo de catering restablecido con éxito.');
            } catch (error: any) {
                console.error('Error al inicializar catálogo:', error);
                alert(`No se pudo inicializar el catálogo: ${error.message || error}`);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleDescargarReporte = async () => {
        setDescargando(true);
        try {
            const response = await fetch('/Inventario/FORMATO INVENTARIO CATERING.xlsx');
            const arrayBuffer = await response.arrayBuffer();
            const workbook = xlsx.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const itemRowMap: Record<string, number> = {
                'AGUAS MEMBERS MARK DE 500 ML': 68,
                'AGUAS MEMBERS MARK DE 355 ML': 69,
                'JUGOS JUMEX (200 ML)': 70,
                'JUGOS BOING (125ML)': 71,
                'COCA COLA (325 ML)': 72,
                'CERVEZA CARTABLANCA': 73,
                'CERVEZA BARRILITO': 74,
                'CERVEZA MODELO': 75,
                'CERVEZA CORONA': 76,
                'CERVEZA VICTORIA': 77,
                'CHAPARRITA': 78
            };

            // Creamos un nuevo objeto para la hoja que contendrá SOLO catering
            const newWorksheet: any = {};

            // 1. Copiar filas de cabecera (Filas 1 y 2 en Excel)
            for (let col = 0; col < 26; col++) {
                const colLetter = String.fromCharCode(65 + col);
                const cell1 = colLetter + '1';
                const cell2 = colLetter + '2';
                if (worksheet[cell1]) newWorksheet[cell1] = { ...worksheet[cell1] };
                if (worksheet[cell2]) newWorksheet[cell2] = { ...worksheet[cell2] };
            }

            // 2. Copiar fila del banner de CATERING (Fila 67 en Excel -> Fila 3 en el nuevo)
            for (let col = 0; col < 26; col++) {
                const colLetter = String.fromCharCode(65 + col);
                const cellOld = colLetter + '67';
                const cellNew = colLetter + '3';
                if (worksheet[cellOld]) newWorksheet[cellNew] = { ...worksheet[cellOld] };
            }

            // 3. Copiar las filas de los productos (Filas 68 a 78 -> Filas 4 a 14) actualizando cantidades y observaciones
            const startNewRow = 4;
            Object.entries(itemRowMap).forEach(([itemName, oldRow], index) => {
                const newRow = startNewRow + index;

                // Copiar celdas y estilos originales
                for (let col = 0; col < 26; col++) {
                    const colLetter = String.fromCharCode(65 + col);
                    const cellOld = colLetter + oldRow;
                    const cellNew = colLetter + newRow;
                    if (worksheet[cellOld]) {
                        newWorksheet[cellNew] = { ...worksheet[cellOld] };
                    }
                }

                // Buscar el valor en nuestros items cargados de Supabase
                const cleanName = itemName.trim().replace(/\s+/g, ' ');
                const dbItem = items.find(
                    i => i.nombre.trim().replace(/\s+/g, ' ').toUpperCase() === cleanName.toUpperCase()
                );

                if (dbItem) {
                    // Columna C: Piezas
                    const cellRefC = 'C' + newRow;
                    const isCervezaTrad = cleanName.includes('CERVEZA CORONA') || cleanName.includes('CERVEZA VICTORIA');
                    const suffix = isCervezaTrad ? '' : (dbItem.cantidad === 1 ? ' pza' : ' pzas');
                    const textValue = isCervezaTrad ? dbItem.cantidad : `${dbItem.cantidad}${suffix}`;

                    newWorksheet[cellRefC] = { 
                        t: isCervezaTrad ? 'n' : 's', 
                        v: textValue 
                    };

                    // Columna D: Observaciones
                    const cellRefD = 'D' + newRow;
                    newWorksheet[cellRefD] = { 
                        t: 's', 
                        v: dbItem.cantidad < 10 ? 'SOLICITUD DE MATERIAL' : '' 
                    };
                }
            });

            // Establecer el rango de la hoja resultante a las primeras 14 filas
            newWorksheet['!ref'] = 'A1:H14';

            // Copiar los merges que pertenecen a la cabecera
            if (worksheet['!merges']) {
                newWorksheet['!merges'] = worksheet['!merges'].filter((m: any) => m.s.r < 2 && m.e.r < 2);
            }

            // Copiar anchos de columnas
            if (worksheet['!cols']) {
                newWorksheet['!cols'] = [ ...worksheet['!cols'] ];
            }

            // Reemplazar la hoja en el libro de trabajo
            workbook.Sheets[sheetName] = newWorksheet;

            // Escribir y descargar el archivo modificado
            const wbytes = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbytes], { type: 'application/octet-stream' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fechaStr = new Date().toLocaleDateString('es-MX', {day: '2-digit', month: '2-digit', year: 'numeric'}).replace(/\//g, '-');
            a.download = `Inventario_Catering_${fechaStr}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generando reporte Excel:', error);
            alert('Hubo un error al generar el reporte Excel.');
        } finally {
            setDescargando(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        padding: '8px 12px', borderRadius: '8px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-glass)',
        color: 'var(--text-main)', outline: 'none', fontFamily: 'inherit', fontSize: '0.9rem',
    };

    const categories = ['AGUAS', 'JUGOS', 'REFRESCOS', 'CERVEZAS', 'OTROS'];

    return (
        <div style={{ paddingBottom: '30px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '2.2rem', margin: 0 }}>
                        Catering <span className="glow-text" style={{ color: 'var(--primary-accent)' }}>& Bebidas</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Control doble de inventario (Almacén vs. Refrigerador) en tiempo real.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={load} disabled={loading} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
                        borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-glass)',
                        color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                        <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                        Actualizar
                    </button>
                    {items.length > 0 && (
                        <button onClick={handleDescargarReporte} disabled={descargando} style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
                            borderRadius: '8px', background: 'rgba(56,189,248,0.1)', border: '1px solid #0284c7',
                            color: '#38bdf8', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600',
                        }}>
                            <Download size={16} style={{ marginRight: '4px' }} />
                            {descargando ? 'Generando...' : 'Descargar reporte'}
                        </button>
                    )}
                    {canManage && (
                        <button onClick={handleInicializar} disabled={loading} style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px',
                            borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
                            color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontWeight: '600',
                        }}>
                            Restablecer Catálogo
                        </button>
                    )}
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
                        <input type="number" min={0} placeholder="Cantidad Almacén" value={newItem.almacen}
                            onChange={e => setNewItem(p => ({ ...p, almacen: Number(e.target.value) }))}
                            style={{ ...inputStyle, width: '150px' }} />
                        <input type="number" min={0} placeholder="Cantidad Refrigerador" value={newItem.refrigerador}
                            onChange={e => setNewItem(p => ({ ...p, refrigerador: Number(e.target.value) }))}
                            style={{ ...inputStyle, width: '170px' }} />
                        <button onClick={handleAdd} style={{
                            padding: '9px 20px', borderRadius: '8px', background: 'var(--primary-accent)',
                            border: 'none', color: '#000', fontWeight: '700', cursor: 'pointer',
                        }}>Agregar</button>
                    </div>
                </div>
            )}

            {/* Renderizado de items */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
                    Cargando inventario...
                </div>
            ) : items.length === 0 ? (
                <div className="glass-panel animate-fade-in" style={{ padding: '40px', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 10px' }}>Inventario vacío</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>No hay bebidas registradas en la base de datos de Catering.</p>
                    {canManage && (
                        <button onClick={handleInicializar} style={{
                            padding: '10px 24px', borderRadius: '8px', background: 'var(--primary-accent)',
                            border: 'none', color: '#000', fontWeight: '700', cursor: 'pointer', fontSize: '0.95rem'
                        }}>
                            Inicializar Catálogo Estándar (11 productos)
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {categories.map(cat => {
                        const categoryItems = items.filter(item => getCategory(item.nombre) === cat);
                        if (categoryItems.length === 0) return null;
                        const catTotal = categoryItems.reduce((acc, item) => acc + item.cantidad, 0);

                        return (
                            <div key={cat} className="glass-panel animate-fade-in" style={{ padding: '24px', borderRadius: '16px' }}>
                                {/* Categoría Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                                    <h2 style={{ fontSize: '1.25rem', color: 'var(--primary-accent)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '1.4rem' }}>{CATEGORY_EMOJIS[cat]}</span> {cat}
                                    </h2>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Existencia total: <strong style={{ color: 'var(--text-main)', fontSize: '1rem' }}>{catTotal}</strong> piezas
                                    </span>
                                </div>

                                {/* Items de la Categoría */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                                    {categoryItems.map(item => {
                                        const almacen = item.cantidad - (parseInt(item.unidad) || 0);
                                        const refrigerador = parseInt(item.unidad) || 0;
                                        const st = getStatusBadge(item.cantidad);

                                        return (
                                            <div key={item.id} style={{
                                                padding: '16px', borderRadius: '12px',
                                                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-glass)',
                                                position: 'relative', display: 'flex', flexDirection: 'column', gap: '12px',
                                            }}>
                                                {/* Delete Button */}
                                                {canManage && (
                                                    <button onClick={() => handleDelete(item.id)} title="Eliminar" style={{
                                                        position: 'absolute', top: '12px', right: '12px',
                                                        background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                                        cursor: 'pointer', opacity: 0.4, padding: '4px',
                                                    }}
                                                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}

                                                {/* Info */}
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    <div style={{ fontSize: '2.2rem', lineHeight: 1 }}>{item.emoji}</div>
                                                    <div>
                                                        <p style={{ margin: 0, fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-main)', paddingRight: '16px' }}>
                                                            {item.nombre}
                                                        </p>
                                                        <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                                            {item.updated_by ? `Por: ${item.updated_by.split('@')[0]}` : 'Sin modificar'}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Stocks (Almacén vs Refrigerador) */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px' }}>
                                                    {/* Almacén */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>📦 Almacén:</span>
                                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                            {canAdjust ? (
                                                                <>
                                                                    <button onClick={() => adjust(item, 'almacen', -1)} style={btnCtrl('#ef4444')} disabled={almacen <= 0}>
                                                                        <Minus size={11} />
                                                                    </button>
                                                                    <span style={{ fontSize: '0.9rem', fontWeight: '700', width: '24px', textAlign: 'center' }}>{almacen}</span>
                                                                    <button onClick={() => adjust(item, 'almacen', 1)} style={btnCtrl('#22c55e')}>
                                                                        <Plus size={11} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{almacen}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Refrigerador */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>❄️ Refri:</span>
                                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                            {canAdjust ? (
                                                                <>
                                                                    <button onClick={() => adjust(item, 'refrigerador', -1)} style={btnCtrl('#ef4444')} disabled={refrigerador <= 0}>
                                                                        <Minus size={11} />
                                                                    </button>
                                                                    <span style={{ fontSize: '0.9rem', fontWeight: '700', width: '24px', textAlign: 'center' }}>{refrigerador}</span>
                                                                    <button onClick={() => adjust(item, 'refrigerador', 1)} style={btnCtrl('#22c55e')}>
                                                                        <Plus size={11} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{refrigerador}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Total Existencia y Estatus */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-glass)', paddingTop: '10px', marginTop: '4px' }}>
                                                    <div>
                                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Existencia</span>
                                                        <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>{item.cantidad}</span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '3px' }}>pzas</span>
                                                    </div>
                                                    <span style={{
                                                        padding: '3px 8px', borderRadius: '4px', fontSize: '0.64rem', fontWeight: '800',
                                                        color: st.color, background: st.bg, border: `1px solid ${st.border}`
                                                    }}>
                                                        {st.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
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
        padding: '3px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700',
        background: `${color}15`, border: `1px solid ${color}35`, color,
        cursor: 'pointer', minWidth: '22px', height: '22px',
    };
}
