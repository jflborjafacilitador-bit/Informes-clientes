import { useState, useRef, useEffect, type MouseEvent } from 'react';
import { Save, Trash2, Edit3, X, Check, Eye, Move } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { fetchMapLayout, saveMapLayout, type MapLayout, type MapZone } from '../services/mapLayoutsService';
import type { EstatusManual } from '../services/inventarioEstatusService';
import { useAuth } from '../contexts/AuthContext';

interface MapEditorProps {
    condominio: string; // e.g. "Manzana 3"
    imageUrl: string; 
    houseStatuses: Map<string, EstatusManual>; 
    itemsData: Map<string, any>; 
    onHouseClick?: (mza: string, casa: string) => void;
}

const COLORS: Record<EstatusManual, string> = {
    DISPONIBLE: 'rgba(34, 197, 94, 0.65)',
    EN_PROCESO: 'rgba(245, 158, 11, 0.65)',
    VENDIDA: 'rgba(239, 68, 68, 0.65)'
};

const BORDER_COLORS: Record<EstatusManual, string> = {
    DISPONIBLE: 'rgba(34, 197, 94, 1)',
    EN_PROCESO: 'rgba(245, 158, 11, 1)',
    VENDIDA: 'rgba(239, 68, 68, 1)'
};

export default function MapEditor({ condominio, imageUrl, houseStatuses, itemsData, onHouseClick }: MapEditorProps) {
    const { role } = useAuth();
    // Allow super_admin, admin, master to see the toolbar
    const isAdmin = role === 'admin' || role === 'master' || role === 'super_admin';
    
    // mode: view = interactuar normal, align = mover todo el mapa, edit = dibujar lote por lote, drag = mover individuales
    const [mode, setMode] = useState<'view' | 'align' | 'edit' | 'drag'>('view');
    
    const [layout, setLayout] = useState<MapLayout | null>(null);
    const [zones, setZones] = useState<MapZone[]>([]);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState<{x: number, y: number}[]>([]);
    const [hoveredZone, setHoveredZone] = useState<string | null>(null);
    const [selectedZone, setSelectedZone] = useState<string | null>(null);
    const [editMza, setEditMza] = useState('');
    const [editCasa, setEditCasa] = useState('');

    const [isSaving, setIsSaving] = useState(false);
    
    // Individual Drag States
    const [dragZoneId, setDragZoneId] = useState<string | null>(null);
    const [dragStartPt, setDragStartPt] = useState<{x: number, y: number} | null>(null);
    const [dragOriginalPoints, setDragOriginalPoints] = useState<{x: number, y: number}[] | null>(null);
    const [snapLines, setSnapLines] = useState<{x?: number, y?: number}[]>([]);
    
    // Global Alignment states
    const [globalOffsetX, setGlobalOffsetX] = useState(0); // in percentage
    const [globalOffsetY, setGlobalOffsetY] = useState(0);
    const [globalScaleX, setGlobalScaleX] = useState(1);
    const [globalScaleY, setGlobalScaleY] = useState(1);
    const [globalSkewX, setGlobalSkewX] = useState(0);
    const [globalSkewY, setGlobalSkewY] = useState(0);

    const svgRef = useRef<SVGSVGElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const load = async () => {
            const data = await fetchMapLayout(condominio);
            if (data) {
                setLayout(data);
                setZones(data.zones || []);
            } else {
                setLayout(null);
                setZones([]);
            }
        };
        load();
    }, [condominio]);

    const handleImageLoad = () => {
        if (!layout && imgRef.current) {
            setLayout({
                id: '',
                condominio,
                image_url: imageUrl,
                width: imgRef.current.naturalWidth,
                height: imgRef.current.naturalHeight,
                zones: []
            });
        }
    };

    const getCoordinates = (e: MouseEvent<SVGElement | HTMLDivElement>) => {
        if (!svgRef.current) return null;
        const pt = svgRef.current.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
        const width = layout?.width || imgRef.current?.naturalWidth || 1000;
        const height = layout?.height || imgRef.current?.naturalHeight || 1000;
        return {
            x: (svgP.x / width) * 100,
            y: (svgP.y / height) * 100
        };
    };

    const handleSvgClick = (e: MouseEvent<SVGSVGElement>) => {
        if (mode !== 'edit' || !isDrawing) return;
        const coords = getCoordinates(e);
        if (coords) setCurrentPoints([...currentPoints, coords]);
    };

    const handleSvgMouseMove = (e: MouseEvent<SVGSVGElement>) => {
        if (mode === 'view') {
           // Tooltip pos is handled natively now
        } else if (mode === 'drag' && dragZoneId && dragStartPt && dragOriginalPoints) {
            const currentPt = getCoordinates(e);
            if (currentPt) {
                let deltaX = currentPt.x - dragStartPt.x;
                let deltaY = currentPt.y - dragStartPt.y;

                // --- Snapping Logic ---
                const SNAP_THRESHOLD = 0.5; // percentage diff
                const activeZoneEdges = dragOriginalPoints.map(p => ({ x: p.x + deltaX, y: p.y + deltaY }));
                
                const newSnapLines: {x?: number, y?: number}[] = [];
                let snappedX = false;
                let snappedY = false;

                // Check all OTHER zones
                zones.forEach(z => {
                    if (z.id === dragZoneId) return;
                    z.points.forEach(targetPt => {
                        activeZoneEdges.forEach(activePt => {
                            if (!snappedX && Math.abs(activePt.x - targetPt.x) < SNAP_THRESHOLD) {
                                deltaX += (targetPt.x - activePt.x);
                                newSnapLines.push({ x: targetPt.x });
                                snappedX = true;
                            }
                            if (!snappedY && Math.abs(activePt.y - targetPt.y) < SNAP_THRESHOLD) {
                                deltaY += (targetPt.y - activePt.y);
                                newSnapLines.push({ y: targetPt.y });
                                snappedY = true;
                            }
                        });
                    });
                });

                setSnapLines(newSnapLines);
                // ----------------------

                setZones(zones.map(z => z.id === dragZoneId ? {
                    ...z,
                    points: dragOriginalPoints.map(p => ({ x: p.x + deltaX, y: p.y + deltaY }))
                } : z));
            }
        }
    };

    const handleSvgMouseUp = () => {
        if (dragZoneId) {
            setDragZoneId(null);
            setDragStartPt(null);
            setDragOriginalPoints(null);
            setSnapLines([]);
        }
    };

    // Keyboard Nudging (Arrow Keys)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (mode !== 'drag' || !selectedZone) return;
            
            // Prevent scrolling when using arrows
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
            }

            const shiftAmount = e.shiftKey ? 0.5 : 0.05; // Base shift amount in percentage
            
            setZones(prevZones => prevZones.map(z => {
                if (z.id !== selectedZone) return z;
                
                let dx = 0; let dy = 0;
                if (e.key === 'ArrowUp') dy = -shiftAmount;
                if (e.key === 'ArrowDown') dy = shiftAmount;
                if (e.key === 'ArrowLeft') dx = -shiftAmount;
                if (e.key === 'ArrowRight') dx = shiftAmount;
                
                if (dx === 0 && dy === 0) return z; // Unrelated key
                
                return {
                    ...z,
                    points: z.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
                };
            }));
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mode, selectedZone]);

    const finishDrawing = () => {
        if (currentPoints.length < 3) {
            alert('Dibuja al menos 3 puntos.');
            return;
        }
        setIsDrawing(false);
        const newId = Date.now().toString();
        const newZone: MapZone = {
            id: newId,
            mza: condominio.replace(/\D/g, ''),
            casa: `Lote ${zones.length + 1}`,
            points: currentPoints
        };
        setZones([...zones, newZone]);
        setCurrentPoints([]);
        setSelectedZone(newId);
        setEditMza(newZone.mza);
        setEditCasa(newZone.casa);
    };

    const rotateSelectedZone = (deg: number) => {
        if (!selectedZone) return;
        const rad = (deg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        
        setZones(zones.map(z => {
            if (z.id !== selectedZone) return z;
            
            let cx = 0, cy = 0;
            z.points.forEach(p => { cx += p.x; cy += p.y; });
            cx /= z.points.length;
            cy /= z.points.length;
            
            return {
                ...z,
                points: z.points.map(p => {
                    const dx = p.x - cx;
                    const dy = p.y - cy;
                    return {
                        x: cx + dx * cos - dy * sin,
                        y: cy + dx * sin + dy * cos
                    };
                })
            };
        }));
    };

    const scaleSelectedZone = (scaleX: number, scaleY: number) => {
        if (!selectedZone) return;
        
        setZones(zones.map(z => {
            if (z.id !== selectedZone) return z;
            
            let cx = 0, cy = 0;
            z.points.forEach(p => { cx += p.x; cy += p.y; });
            cx /= z.points.length;
            cy /= z.points.length;
            
            return {
                ...z,
                points: z.points.map(p => ({
                    x: cx + (p.x - cx) * scaleX,
                    y: cy + (p.y - cy) * scaleY
                }))
            };
        }));
    };

    const handleSaveZoneAttrs = () => {
        if (!selectedZone) return;
        setZones(zones.map(z => z.id === selectedZone ? { ...z, mza: editMza, casa: editCasa } : z));
        setSelectedZone(null);
    };

    const handleDeleteZone = (id: string) => {
        if (window.confirm('¿Eliminar este lote?')) {
            setZones(zones.filter(z => z.id !== id));
            setSelectedZone(null);
        }
    };

    const applyGlobalAlignment = () => {
        const radX = (globalSkewX * Math.PI) / 180;
        const radY = (globalSkewY * Math.PI) / 180;

        const newZones = zones.map(z => ({
            ...z,
            points: z.points.map(p => {
                // Apply Scale, then Skew, then Translate
                const px = p.x * globalScaleX;
                const py = p.y * globalScaleY;
                return {
                    x: px + py * Math.tan(radX) + globalOffsetX,
                    y: py + px * Math.tan(radY) + globalOffsetY
                };
            })
        }));
        setZones(newZones);
        
        // Reset controls
        setGlobalOffsetX(0);
        setGlobalOffsetY(0);
        setGlobalScaleX(1);
        setGlobalScaleY(1);
        setGlobalSkewX(0);
        setGlobalSkewY(0);
        alert('Alineación aplicada a la memoria (ahora presiona Guardar Mapa).');
    };

    const handleSaveLayout = async () => {
        if (!layout && !imgRef.current) return;
        setIsSaving(true);
        try {
            const w = layout?.width || imgRef.current?.naturalWidth || 1000;
            const h = layout?.height || imgRef.current?.naturalHeight || 1000;
            await saveMapLayout(condominio, imageUrl, w, h, zones);
            alert('¡Mapa guardado con éxito!');
        } catch {
            alert('Error guardando mapa.');
        } finally {
            setIsSaving(false);
        }
    };

    const w = layout?.width || imgRef.current?.naturalWidth || 1000;
    const h = layout?.height || imgRef.current?.naturalHeight || 1000;

    const pointsToSvgStr = (points: {x: number, y: number}[]) => 
        points.map(p => `${(p.x * w) / 100},${(p.y * h) / 100}`).join(' ');

    const getZoneStatus = (z: MapZone): EstatusManual => {
        const key = `${z.mza}||${z.casa}`;
        if (!itemsData.has(key)) return 'VENDIDA';
        return houseStatuses.get(key) || 'DISPONIBLE';
    };

    const hoveredZoneData = hoveredZone ? zones.find(z => z.id === hoveredZone) : null;
    const hoveredStatus = hoveredZoneData ? getZoneStatus(hoveredZoneData) : null;
    const hoveredItem = hoveredZoneData ? itemsData.get(`${hoveredZoneData.mza}||${hoveredZoneData.casa}`) : null;

    const activeZone = selectedZone ? zones.find(z => z.id === selectedZone) : null;
    let selectedW = 0, selectedH = 0;
    if (activeZone && activeZone.points.length > 0) {
        const xs = activeZone.points.map(p => p.x);
        const ys = activeZone.points.map(p => p.y);
        selectedW = Math.max(...xs) - Math.min(...xs);
        selectedH = Math.max(...ys) - Math.min(...ys);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', height: '100%', position: 'relative' }}>
            
            {isAdmin && (
                <div className="glass-panel" style={{ padding: '12px 20px', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', zIndex: 10 }}>
                    <div style={{ fontWeight: 'bold', marginRight: 'auto' }}>
                        Admin Mapa: {condominio}
                    </div>
                    
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', gap: '4px' }}>
                        <button 
                            className="ghost-button" 
                            style={{ background: mode === 'view' ? 'var(--primary-accent)' : 'transparent', color: mode === 'view' ? '#000' : '#fff' }}
                            onClick={() => { setMode('view'); setIsDrawing(false); setSelectedZone(null); }}
                        >
                            <Eye size={16} /> Navegar
                        </button>
                        <button 
                            className="ghost-button" 
                            style={{ background: mode === 'align' ? 'var(--primary-accent)' : 'transparent', color: mode === 'align' ? '#000' : '#fff' }}
                            onClick={() => { setMode('align'); setIsDrawing(false); setSelectedZone(null); }}
                        >
                            <Move size={16} /> Alineación Global
                        </button>
                        <button 
                            className="ghost-button" 
                            style={{ background: mode === 'drag' ? 'var(--primary-accent)' : 'transparent', color: mode === 'drag' ? '#000' : '#fff' }}
                            onClick={() => { setMode('drag'); setIsDrawing(false); setSelectedZone(null); }}
                        >
                            <Move size={16} /> Mover Uno x Uno
                        </button>
                        <button 
                            className="ghost-button"
                            style={{ background: mode === 'edit' ? 'var(--primary-accent)' : 'transparent', color: mode === 'edit' ? '#000' : '#fff' }}
                            onClick={() => { setMode('edit'); setIsDrawing(false); setSelectedZone(null); }}
                        >
                            <Edit3 size={16} /> Dibujar Nuevo
                        </button>
                    </div>

                    {mode === 'edit' && (
                        <>
                            {isDrawing ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="base-button" style={{ background: '#22c55e', color: '#000' }} onClick={finishDrawing}>
                                        <Check size={16}/> Comprar/Cerrar Polígono
                                    </button>
                                    <button className="base-button" style={{ background: '#ef4444', color: '#fff' }} onClick={() => setIsDrawing(false)}>
                                        <X size={16}/> Cancelar
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="base-button" onClick={() => { setIsDrawing(true); setCurrentPoints([]); setSelectedZone(null); }}>
                                        Dibujar Nuevo Lote
                                    </button>
                                    {condominio === 'Manzana 2' && (
                                        <button className="base-button" style={{ background: '#f59e0b', color: '#000' }} onClick={() => {
                                            const newCasas = Array.from(itemsData.values())
                                                .filter(item => item.mza === '2' && !zones.find(z => z.casa === item.casa))
                                                .sort((a, b) => Number(a.casa) - Number(b.casa));
                                            
                                            let row = 0; let col = 0;
                                            const newZones = newCasas.map(item => {
                                                const bx = 10 + (col * 5);
                                                const by = 10 + (row * 5);
                                                col++; if (col >= 15) { col = 0; row++; }
                                                return {
                                                    id: `auto_mza2_${item.casa}_${Date.now()}`,
                                                    mza: item.mza,
                                                    casa: item.casa,
                                                    points: [{x: bx, y: by}, {x: bx+3, y: by}, {x: bx+3, y: by+3}, {x: bx, y: by+3}]
                                                };
                                            });
                                            if (newZones.length > 0) {
                                                setZones([...zones, ...newZones]);
                                                alert(`Mágicamente se crearon ${newZones.length} polígonos. Presiona "Guardar en BD".`);
                                            } else {
                                                alert("Todas las casas ya tienen polígono asignado.");
                                            }
                                        }}>⚡ Auto-generar Lotes Mza 2</button>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {mode !== 'view' && (
                        <button className="base-button" disabled={isSaving} onClick={handleSaveLayout} style={{ background: '#00f0ff', color: '#000' }}>
                            <Save size={16} /> {isSaving ? 'Guardando...' : 'Guardar en BD'}
                        </button>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', height: '100%', position: 'relative' }}>
                
                {mode === 'align' && (
                    <div className="glass-panel" style={{ width: '320px', flexShrink: 0, padding: '20px', zIndex: 10 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem' }}>Alineación Global</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            Mueve los deslizadores de forma sutil para cuadrar todos los lotes generados al mismo tiempo encima de la imagen del plano.
                        </p>
                        
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#00f0ff', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Mover Horizontal ({globalOffsetX.toFixed(1)}%)</span>
                            </label>
                            <input type="range" min="-50" max="50" step="0.1" value={globalOffsetX} onChange={e => setGlobalOffsetX(Number(e.target.value))} style={{ width: '100%' }} />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#00f0ff', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Mover Vertical ({globalOffsetY.toFixed(1)}%)</span>
                            </label>
                            <input type="range" min="-50" max="50" step="0.1" value={globalOffsetY} onChange={e => setGlobalOffsetY(Number(e.target.value))} style={{ width: '100%' }} />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#22c55e', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Estirar Ancho ({(globalScaleX*100).toFixed(0)}%)</span>
                            </label>
                            <input type="range" min="0.5" max="2" step="0.01" value={globalScaleX} onChange={e => setGlobalScaleX(Number(e.target.value))} style={{ width: '100%' }} />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#22c55e', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Estirar Alto ({(globalScaleY*100).toFixed(0)}%)</span>
                            </label>
                            <input type="range" min="0.5" max="2" step="0.01" value={globalScaleY} onChange={e => setGlobalScaleY(Number(e.target.value))} style={{ width: '100%' }} />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#f59e0b', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Inclinar X ({globalSkewX}°)</span>
                            </label>
                            <input type="range" min="-45" max="45" step="0.5" value={globalSkewX} onChange={e => setGlobalSkewX(Number(e.target.value))} style={{ width: '100%' }} />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#f59e0b', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Inclinar Y ({globalSkewY}°)</span>
                            </label>
                            <input type="range" min="-45" max="45" step="0.5" value={globalSkewY} onChange={e => setGlobalSkewY(Number(e.target.value))} style={{ width: '100%' }} />
                        </div>
                        
                        <button className="base-button" style={{ width: '100%' }} onClick={applyGlobalAlignment}>
                            Aplicar Cambios Matemáticos
                        </button>
                    </div>
                )}

                {/* React Zoom Pan Pinch Wrap */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#e0e0e0', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
                    
                    {mode === 'view' && hoveredZoneData && hoveredStatus && (
                        <div style={{
                            position: 'absolute', top: 20, right: 20,
                            background: 'rgba(10, 15, 13, 0.95)', backdropFilter: 'blur(10px)',
                            border: `1px solid ${BORDER_COLORS[hoveredStatus]}`,
                            padding: '16px', borderRadius: '12px', color: 'white', zIndex: 10,
                            boxShadow: '0 10px 40px rgba(0,0,0,0.6)', pointerEvents: 'none', minWidth: '240px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Mza {hoveredZoneData.mza} | {hoveredZoneData.casa}</span>
                                <span style={{ 
                                    padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold',
                                    background: COLORS[hoveredStatus], color: hoveredStatus === 'DISPONIBLE' ? 'white' : 'black'
                                }}>
                                    {hoveredStatus.replace('_', ' ')}
                                </span>
                            </div>
                            
                            {hoveredItem ? (
                                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Prototipo:</span> <span style={{ color: 'white' }}>{hoveredItem.prototipo}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Terreno:</span> <span style={{ color: 'white' }}>{hoveredItem.m2Terreno}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Construcción:</span> <span style={{ color: 'white' }}>{hoveredItem.m2Construccion}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>DTU:</span> <span style={{ color: hoveredItem.dtu === 'Si' ? '#22c55e' : 'white' }}>{hoveredItem.dtu === 'Si' ? '✓ Listo' : hoveredItem.fechaDtu}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Escrituración:</span> <span style={{ color: hoveredItem.fechaEscrituracion.toUpperCase() === 'INMEDIATA' ? '#f59e0b' : 'white' }}>{hoveredItem.fechaEscrituracion}</span></div>
                                </div>
                            ) : (
                                <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '6px' }}>Propiedad agotada o no disponible en lista.</div>
                            )}
                        </div>
                    )}

                    <TransformWrapper
                        initialScale={1}
                        minScale={0.2}
                        maxScale={5}
                        centerOnInit={true}
                        disabled={mode === 'edit' || mode === 'drag'} // Disable panning while drawing/dragging
                        wheel={{ disabled: false }}
                        panning={{ disabled: mode === 'edit' || mode === 'drag', velocityDisabled: true }}
                    >
                        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                            <div style={{ 
                                position: 'relative', 
                                width: `${w}px`, 
                                height: `${h}px`,
                                transformOrigin: 'top left'
                            }}>
                                <img 
                                    ref={imgRef}
                                    src={imageUrl} 
                                    alt={`Plano ${condominio}`} 
                                    onLoad={handleImageLoad}
                                    style={{ 
                                        display: 'block', pointerEvents: 'none', 
                                        width: '100%', height: '100%', objectFit: 'contain'
                                    }} 
                                />
                                
                                <svg 
                                    ref={svgRef}
                                    viewBox={`0 0 ${w} ${h}`}
                                    style={{
                                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                        transform: `translate(${globalOffsetX}%, ${globalOffsetY}%) scale(${globalScaleX}, ${globalScaleY}) skew(${globalSkewX}deg, ${globalSkewY}deg)`,
                                        transformOrigin: '0 0'
                                    }}
                                    onClick={handleSvgClick}
                                    onMouseMove={handleSvgMouseMove}
                                    onMouseUp={handleSvgMouseUp}
                                    onMouseLeave={() => { setHoveredZone(null); handleSvgMouseUp(); }}
                                >
                                    {zones.map((zone) => {
                                        const status = getZoneStatus(zone);
                                        const isHovered = hoveredZone === zone.id;
                                        const isSelected = selectedZone === zone.id;
                                        
                                        return (
                                            <polygon
                                                key={zone.id}
                                                points={pointsToSvgStr(zone.points)}
                                                fill={mode === 'view' ? (isHovered && status !== 'VENDIDA' ? COLORS[status] : COLORS[status].replace(/0\.65\)$/, '0.35)')) : (isSelected ? 'rgba(0,240,255,0.4)' : 'rgba(255,255,255,0.2)')}
                                                stroke={mode === 'view' ? BORDER_COLORS[status] : (isSelected ? '#00f0ff' : '#000')}
                                                strokeWidth={mode === 'view' ? (isHovered ? 4 : 2) : 1}
                                                strokeDasharray={(mode === 'edit' || mode === 'drag') ? "4 2" : "none"}
                                                style={{ cursor: mode === 'view' && status !== 'VENDIDA' ? 'pointer' : ((mode === 'edit' || mode === 'drag') ? 'pointer' : 'default') }}
                                                onMouseEnter={() => setHoveredZone(zone.id)}
                                                onMouseDown={(e) => {
                                                    if (mode === 'drag') {
                                                        e.stopPropagation();
                                                        const coords = getCoordinates(e);
                                                        if (coords) {
                                                            setDragZoneId(zone.id);
                                                            setDragStartPt(coords);
                                                            setDragOriginalPoints(zone.points);
                                                            setSelectedZone(zone.id);
                                                        }
                                                    }
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (mode === 'edit') {
                                                        setSelectedZone(zone.id);
                                                        setEditMza(zone.mza);
                                                        setEditCasa(zone.casa);
                                                    } else if (mode === 'drag') {
                                                        setSelectedZone(zone.id);
                                                        setEditMza(zone.mza);
                                                        setEditCasa(zone.casa);
                                                    } else if (onHouseClick && status !== 'VENDIDA') {
                                                        onHouseClick(zone.mza, zone.casa);
                                                    }
                                                }}
                                            />
                                        )
                                    })}

                                    {isDrawing && currentPoints.length > 0 && (
                                        <polyline points={pointsToSvgStr(currentPoints)} fill="none" stroke="#00f0ff" strokeWidth={3} strokeDasharray="4 2" />
                                    )}
                                    {isDrawing && currentPoints.map((pt, i) => (
                                        <circle key={i} cx={(pt.x * w) / 100} cy={(pt.y * h) / 100} r={4} fill="#fff" stroke="#00f0ff" strokeWidth={2} />
                                    ))}

                                    {/* Snap Lines Overlay */}
                                    {snapLines.map((line, i) => {
                                        if (line.x !== undefined) {
                                            return <line key={`snap-x-${i}`} x1={(line.x * w) / 100} y1="0" x2={(line.x * w) / 100} y2={h} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" />;
                                        }
                                        if (line.y !== undefined) {
                                            return <line key={`snap-y-${i}`} x1="0" y1={(line.y * h) / 100} x2={w} y2={(line.y * h) / 100} stroke="#f59e0b" strokeWidth="1" strokeDasharray="4 4" />;
                                        }
                                        return null;
                                    })}
                                </svg>
                            </div>
                        </TransformComponent>
                    </TransformWrapper>
                </div>
                
                {(mode === 'edit' || mode === 'drag') && selectedZone && (
                     <div className="glass-panel" style={{ width: '280px', flexShrink: 0, padding: '20px', position: 'absolute', right: '10px', top: '10px', zIndex: 10 }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Asignar Lote</h3>
                              <button onClick={() => setSelectedZone(null)} className="icon-btn"><X size={18}/></button>
                         </div>
                         
                         {mode === 'drag' && (
                             <>
                                 <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                                     <button className="base-button" style={{flex: 1, padding: '4px', fontSize: '0.75rem'}} onClick={() => rotateSelectedZone(-5)}>↺ -5°</button>
                                     <button className="base-button" style={{flex: 1, padding: '4px', fontSize: '0.75rem'}} onClick={() => rotateSelectedZone(5)}>↻ +5°</button>
                                     <button className="base-button" style={{flex: 1, padding: '4px', fontSize: '0.75rem'}} onClick={() => rotateSelectedZone(90)}>Rotar 90°</button>
                                 </div>
                                 <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                                     <button className="base-button" style={{flex: 1, padding: '4px', fontSize: '0.75rem'}} onClick={() => scaleSelectedZone(1.05, 1)}>↔ +Ancho</button>
                                     <button className="base-button" style={{flex: 1, padding: '4px', fontSize: '0.75rem'}} onClick={() => scaleSelectedZone(0.95, 1)}>&gt;&lt; -Ancho</button>
                                 </div>
                                 <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                                     <button className="base-button" style={{flex: 1, padding: '4px', fontSize: '0.75rem'}} onClick={() => scaleSelectedZone(1, 1.05)}>↕ +Alto</button>
                                     <button className="base-button" style={{flex: 1, padding: '4px', fontSize: '0.75rem'}} onClick={() => scaleSelectedZone(1, 0.95)}>v^ -Alto</button>
                                 </div>
                                 
                                 <div style={{ fontSize: '0.75rem', color: '#a0aec0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
                                     <span>W: {(selectedW * w / 100).toFixed(1)}px</span>
                                     <span>H: {(selectedH * h / 100).toFixed(1)}px</span>
                                 </div>
                                 
                                 <div style={{ fontSize: '0.75rem', color: '#00f0ff', marginBottom: '16px', textAlign: 'center', background: 'rgba(0,240,255,0.1)', padding: '6px', borderRadius: '4px' }}>
                                     💡 <b>Tip:</b> Usa las <b>Flechas del teclado</b> para mover el lote con precisión. (Shift + Flechas para mover más rápido)
                                 </div>
                             </>
                         )}

                         <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mza BD (Ej: 3)</label>
                         <input className="input-field" value={editMza} onChange={e => setEditMza(e.target.value)} style={{ width: '100%', marginBottom: '12px' }} />
                         <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Casa BD (Ej: 15)</label>
                         <input className="input-field" value={editCasa} onChange={e => setEditCasa(e.target.value)} style={{ width: '100%', marginBottom: '16px' }} />
                         <button className="base-button" style={{ width: '100%', marginBottom: '8px' }} onClick={handleSaveZoneAttrs}>Guardar Asignación</button>
                         <button className="ghost-button" style={{ width: '100%', color: '#ef4444', justifyContent: 'center' }} onClick={() => handleDeleteZone(selectedZone)}><Trash2 size={16} /> Eliminar Lote</button>
                     </div>
                )}
            </div>
        </div>
    );
}
