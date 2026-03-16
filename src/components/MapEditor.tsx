import { useState, useRef, useEffect, type MouseEvent } from 'react';
import { Save, Trash2, Edit3, X, Check, Eye, Move, Calculator } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
    DISPONIBLE: 'rgba(34, 197, 94, 0.35)', // Softer green
    EN_PROCESO: 'rgba(245, 158, 11, 0.35)', // Softer yellow
    VENDIDA: 'rgba(239, 68, 68, 0.35)'     // Softer red
};

const BORDER_COLORS: Record<EstatusManual, string> = {
    DISPONIBLE: 'rgba(34, 197, 94, 0.8)',
    EN_PROCESO: 'rgba(245, 158, 11, 0.8)',
    VENDIDA: 'rgba(239, 68, 68, 0.8)'
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
    const [clickedZone, setClickedZone] = useState<string | null>(null);
    const [showVersionsFor, setShowVersionsFor] = useState<string | null>(null);
    const [selectedZone, setSelectedZone] = useState<string | null>(null);
    const [editMza, setEditMza] = useState('');
    const [editCasa, setEditCasa] = useState('');

    const navigate = useNavigate();

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

    // Draggable Panel State
    const [panelOffset, setPanelOffset] = useState({ x: 0, y: 0 });
    const panelDragStart = useRef<{x: number, y: number} | null>(null);

    const startPanelDrag = (e: React.PointerEvent) => {
        panelDragStart.current = { x: e.clientX - panelOffset.x, y: e.clientY - panelOffset.y };
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const doPanelDrag = (e: React.PointerEvent) => {
        if (panelDragStart.current) {
            setPanelOffset({
                x: e.clientX - panelDragStart.current.x,
                y: e.clientY - panelDragStart.current.y
            });
        }
    };
    const endPanelDrag = (e: React.PointerEvent) => {
        panelDragStart.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

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
            
            // Si hay alineación global pendiente sin aplicar, aplícala al array antes de guardar.
            let zonesToSave = zones;
            if (globalOffsetX !== 0 || globalOffsetY !== 0 || globalScaleX !== 1 || globalScaleY !== 1 || globalSkewX !== 0 || globalSkewY !== 0) {
                const radX = (globalSkewX * Math.PI) / 180;
                const radY = (globalSkewY * Math.PI) / 180;
                zonesToSave = zones.map(z => ({
                    ...z,
                    points: z.points.map(p => {
                        const px = p.x * globalScaleX;
                        const py = p.y * globalScaleY;
                        return {
                            x: px + py * Math.tan(radX) + globalOffsetX,
                            y: py + px * Math.tan(radY) + globalOffsetY
                        };
                    })
                }));
                // Restablecer localmente
                setZones(zonesToSave);
                setGlobalOffsetX(0);
                setGlobalOffsetY(0);
                setGlobalScaleX(1);
                setGlobalScaleY(1);
                setGlobalSkewX(0);
                setGlobalSkewY(0);
            }

            await saveMapLayout(condominio, imageUrl, w, h, zonesToSave);
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
                            onClick={() => { setMode('view'); setIsDrawing(false); setSelectedZone(null); setClickedZone(null); setShowVersionsFor(null); }}
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
                                            // Fallback ultra-seguro: Crear forzosamente los 64 lotes asumiendo que existen del 1 al 64 en Manzana 2
                                            const lotesTotales = 64;
                                            const newZones: MapZone[] = [];
                                            
                                            let row = 0; let col = 0;
                                            for (let i = 1; i <= lotesTotales; i++) {
                                                const casaStr = i.toString();
                                                // Solo agregar si no existe ya un polígono para esta casa
                                                if (!zones.find(z => z.casa === casaStr)) {
                                                    const bx = 5 + (col * 3);
                                                    const by = 5 + (row * 3);
                                                    col++; if (col >= 20) { col = 0; row++; }
                                                    
                                                    newZones.push({
                                                        id: `auto_mza2_${casaStr}_${Date.now()}`,
                                                        mza: '2',
                                                        casa: casaStr,
                                                        points: [{x: bx, y: by}, {x: bx+2, y: by}, {x: bx+2, y: by+2}, {x: bx, y: by+2}]
                                                    });
                                                }
                                            }
                                            
                                            if (newZones.length > 0) {
                                                setZones([...zones, ...newZones]);
                                                alert(`¡Listo! Se forzó la creación de los ${newZones.length} polígonos faltantes (Casas 1 al 64). Acomódalos y presiona "Guardar en BD".`);
                                            } else {
                                                alert("Todas las 64 casas de Manzana 2 ya tienen polígono asignado.");
                                            }
                                        }}>⚡ Auto-generar Lotes Mza 2</button>
                                    )}
                                    <button className="base-button" style={{ background: '#ef4444', color: '#fff' }} onClick={() => {
                                        if (window.confirm('🚨 ¿Estás seguro de eliminar TODOS los lotes de esta manzana? Esta acción no se puede deshacer una vez que guardes en BD.')) {
                                            setZones([]);
                                            setSelectedZone(null);
                                        }
                                    }}>
                                        <Trash2 size={16} /> Borrar Todos
                                    </button>
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
                            <input type="range" min="0.1" max="10" step="0.01" value={globalScaleX} onChange={e => setGlobalScaleX(Number(e.target.value))} style={{ width: '100%' }} />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '0.8rem', color: '#22c55e', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Estirar Alto ({(globalScaleY*100).toFixed(0)}%)</span>
                            </label>
                            <input type="range" min="0.1" max="10" step="0.01" value={globalScaleY} onChange={e => setGlobalScaleY(Number(e.target.value))} style={{ width: '100%' }} />
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
                    
                    {/* Pinned or Hovered Tooltip */}
                    {mode === 'view' && (clickedZone || hoveredZone) ? (() => {
                        const activeId = clickedZone || hoveredZone;
                        const activeZoneData = zones.find(z => z.id === activeId);
                        const activeStatus = activeZoneData ? getZoneStatus(activeZoneData) : null;
                        const activeItem = activeZoneData ? itemsData.get(`${activeZoneData.mza}||${activeZoneData.casa}`) : null;

                        if (!activeZoneData || !activeStatus) return null;

                        return (
                            <div style={{
                                position: 'absolute', top: 20, right: 20,
                                background: 'rgba(10, 15, 13, 0.95)', backdropFilter: 'blur(10px)',
                                border: `1px solid ${BORDER_COLORS[activeStatus]}`,
                                padding: '16px', borderRadius: '12px', color: 'white', zIndex: 10,
                                boxShadow: clickedZone ? '0 10px 40px rgba(0,0,0,0.8)' : '0 10px 40px rgba(0,0,0,0.6)', 
                                minWidth: '240px',
                                pointerEvents: 'auto' // Important so buttons inside work
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Mza {activeZoneData.mza} | {activeZoneData.casa}</span>
                                        <span style={{ 
                                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', width: 'fit-content', marginTop: '4px',
                                            background: COLORS[activeStatus], color: activeStatus === 'DISPONIBLE' ? 'white' : 'black'
                                        }}>
                                            {activeStatus.replace('_', ' ')}
                                        </span>
                                    </div>
                                    {clickedZone && (
                                        <button onClick={() => setClickedZone(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}>
                                            <X size={18} />
                                        </button>
                                    )}
                                </div>
                                
                                {activeItem ? (
                                    <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Prototipo:</span> <span style={{ color: 'white' }}>{activeItem.prototipo}</span></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Terreno:</span> <span style={{ color: 'white' }}>{activeItem.m2Terreno}</span></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Construcción:</span> <span style={{ color: 'white' }}>{activeItem.m2Construccion}</span></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>DTU:</span> <span style={{ color: activeItem.dtu === 'Si' ? '#22c55e' : 'white' }}>{activeItem.dtu === 'Si' ? '✓ Listo' : activeItem.fechaDtu}</span></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Escrituración:</span> <span style={{ color: activeItem.fechaEscrituracion.toUpperCase() === 'INMEDIATA' ? '#f59e0b' : 'white' }}>{activeItem.fechaEscrituracion}</span></div>
                                        
                                        {clickedZone && activeStatus === 'DISPONIBLE' && (
                                            showVersionsFor === activeId ? (
                                                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary-accent)', marginBottom: '4px', textAlign: 'center', fontWeight: 'bold' }}>SELECCIONA LA VERSIÓN:</div>
                                                    {['AUSTERA', 'EQUIPADA', 'AUSTERA ELITE', 'EQUIPADA ELITE'].map(v => (
                                                        <button 
                                                            key={v}
                                                            className="base-button" 
                                                            style={{ background: 'rgba(34,197,94,0.1)', color: 'white', border: '1px solid var(--primary-accent)', width: '100%', justifyContent: 'center', fontSize: '0.8rem', padding: '6px' }}
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                navigate(`/calculadora?manzana=${activeZoneData.mza}&modelo=${activeItem.prototipo}&version=${v}`);
                                                            }}
                                                        >
                                                            {v}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <button 
                                                    className="base-button" 
                                                    style={{ marginTop: '12px', background: 'var(--primary-accent)', color: '#000', width: '100%', justifyContent: 'center' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowVersionsFor(activeId);
                                                    }}
                                                >
                                                    <Calculator size={16} /> Calcular
                                                </button>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '6px' }}>Propiedad agotada o no disponible en lista.</div>
                                )}
                            </div>
                        );
                    })() : null}

                    <TransformWrapper
                        initialScale={0.9}
                        minScale={0.1}
                        maxScale={8}
                        centerOnInit={true}
                        wheel={{ step: 0.1, disabled: mode !== 'view' }}
                        panning={{ disabled: mode !== 'view', velocityDisabled: true }}
                        pinch={{ disabled: mode !== 'view' }}
                        doubleClick={{ disabled: true }}
                    >
                        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
                            <div style={{ 
                                position: 'relative', 
                                width: '100%', 
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transformOrigin: 'center'
                            }}>
                                <div style={{ 
                                    position: 'relative', 
                                    width: `${w}px`, 
                                    height: `${h}px`,
                                    maxWidth: '100%',
                                    maxHeight: '100%'
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
                                                    } else if (mode === 'view') {
                                                        if (status !== 'VENDIDA') {
                                                            if (clickedZone === zone.id) {
                                                                setClickedZone(null); // toggle off
                                                                setShowVersionsFor(null);
                                                            } else {
                                                                setClickedZone(zone.id);
                                                                setShowVersionsFor(null);
                                                            }
                                                            
                                                            // Opcional callback al padre
                                                            if (onHouseClick) onHouseClick(zone.mza, zone.casa);
                                                        }
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
                            </div>
                        </TransformComponent>
                    </TransformWrapper>
                </div>
                
                {(mode === 'edit' || mode === 'drag') && selectedZone && (
                     <div className="glass-panel" style={{ width: '280px', flexShrink: 0, padding: '20px', position: 'absolute', right: '10px', top: '10px', zIndex: 10, transform: `translate(${panelOffset.x}px, ${panelOffset.y}px)`, transition: panelDragStart.current ? 'none' : 'transform 0.1s ease-out' }}>
                         <div 
                              style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center', cursor: 'grab', padding: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', userSelect: 'none' }}
                              onPointerDown={startPanelDrag}
                              onPointerMove={doPanelDrag}
                              onPointerUp={endPanelDrag}
                              onPointerCancel={endPanelDrag}
                         >
                              <h3 style={{ margin: 0, fontSize: '1.1rem', pointerEvents: 'none' }}>Asignar Lote</h3>
                              <button onPointerDown={e => e.stopPropagation()} onClick={() => setSelectedZone(null)} className="icon-btn" style={{ padding: '2px', cursor: 'pointer' }}><X size={18}/></button>
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
