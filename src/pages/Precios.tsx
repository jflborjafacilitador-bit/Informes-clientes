import { Tag, Download } from 'lucide-react';
import { PRECIOS } from '../data/precios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useState } from 'react';

// ── Paleta del logo Quetzalez ─────────────────────────────
// Verde bosque: #1e6b12 | Verde lima: #8dc820 | Naranja: #e87c00

const fmt = (n: number) =>
    n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });

async function descargarPDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });

    // Colores marca Quetzalez
    const verdeOscuro: [number, number, number] = [30, 107, 18];    // #1e6b12
    const verdeMedia: [number, number, number]  = [141, 200, 32];   // #8dc820
    const naranja: [number, number, number]     = [232, 124, 0];    // #e87c00
    const blanco: [number, number, number]      = [255, 255, 255];
    const crema: [number, number, number]       = [252, 251, 246];
    const texto: [number, number, number]       = [30, 31, 26];

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const fecha = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

    // ── Fondo crema ───────────────────────────────────────
    doc.setFillColor(...crema);
    doc.rect(0, 0, pageW, pageH, 'F');

    // ── Header verde oscuro ───────────────────────────────
    doc.setFillColor(...verdeOscuro);
    doc.rect(0, 0, pageW, 44, 'F');

    // Línea naranja decorativa bajo el header
    doc.setFillColor(...naranja);
    doc.rect(0, 42, pageW, 2.5, 'F');

    // ── Logo embebido desde /public ───────────────────────
    try {
        const resp = await fetch('/Logo 1.1 sin fondo.png');
        const blob = await resp.blob();
        const b64: string = await new Promise((res) => {
            const reader = new FileReader();
            reader.onloadend = () => res(reader.result as string);
            reader.readAsDataURL(blob);
        });
        // Logo en esquina derecha — ajustado para que quepa en el header
        doc.addImage(b64, 'PNG', pageW - 46, 1, 42, 40);
    } catch {
        // Continúa sin logo si falla la carga
    }

    // ── Textos del header ─────────────────────────────────
    doc.setTextColor(...blanco);
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text('LISTA DE PRECIOS BASE', 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 235, 180);
    doc.text('Residencial Los Quetzales', 14, 25);
    doc.text('Tarifario oficial — confidencial', 14, 31);

    doc.setFontSize(8);
    doc.setTextColor(180, 220, 160);
    doc.text(fecha, 14, 38);

    // ── Tablas por manzana ────────────────────────────────
    let startY = 54;

    Object.keys(PRECIOS).forEach((manzana) => {
        const rows = PRECIOS[manzana];

        // Encabezado de sección con verde lima
        doc.setFillColor(...verdeMedia);
        doc.roundedRect(12, startY - 6, pageW - 24, 11, 2, 2, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...verdeOscuro);
        doc.text(manzana.toUpperCase(), 18, startY + 1.5);

        startY += 8;

        autoTable(doc, {
            startY,
            head: [['Modelo', 'Versión', 'Precio Base', 'Valor Avalúo']],
            body: rows.map(r => [
                r.modelo,
                r.version,
                fmt(r.precio),
                r.avaluo ? fmt(r.avaluo) : '—',
            ]),
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: { top: 3.5, bottom: 3.5, left: 6, right: 6 },
                textColor: texto,
                lineColor: [210, 230, 195],
                lineWidth: 0.25,
                font: 'helvetica',
            },
            headStyles: {
                fillColor: verdeOscuro,
                textColor: blanco,
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 9,
            },
            columnStyles: {
                0: { cellWidth: 58 },
                1: { cellWidth: 58 },
                2: { halign: 'right', fontStyle: 'bold', textColor: [30, 107, 18] },
                3: { halign: 'right', textColor: [130, 90, 0] },
            },
            alternateRowStyles: { fillColor: [240, 250, 230] },
            margin: { left: 12, right: 12 },
        });

        // @ts-ignore — jspdf-autotable extiende el objeto
        startY = (doc as any).lastAutoTable.finalY + 14;

        // Separador naranja entre manzanas
        if (startY < pageH - 30) {
            doc.setDrawColor(...naranja);
            doc.setLineWidth(0.4);
            doc.line(12, startY - 7, pageW - 12, startY - 7);
        }
    });

    // ── Footer ────────────────────────────────────────────
    doc.setFillColor(...verdeOscuro);
    doc.rect(0, pageH - 13, pageW, 13, 'F');

    doc.setFillColor(...naranja);
    doc.rect(0, pageH - 13, pageW, 1.8, 'F');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 235, 180);
    doc.text(
        'Los precios incluyen IVA. Sujetos a cambios sin previo aviso.',
        pageW / 2, pageH - 6,
        { align: 'center' }
    );
    doc.setTextColor(160, 210, 140);
    doc.text('Residencial Los Quetzales', 14, pageH - 6);
    doc.text(fecha, pageW - 14, pageH - 6, { align: 'right' });

    // ── Guardar ───────────────────────────────────────────
    doc.save(`Lista_Precios_Quetzales_${fecha.replace(/ /g, '_')}.pdf`);
}

// ─────────────────────────────────────────────────────────
export default function Precios() {
    const [descargando, setDescargando] = useState(false);

    const handleDescargar = async () => {
        setDescargando(true);
        await descargarPDF();
        setDescargando(false);
    };

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '10px' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 42, height: 42, borderRadius: 10,
                            background: 'rgba(56,189,248,0.1)',
                            border: '1px solid var(--border-glass)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Tag size={20} color="#38bdf8" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }} className="glow-text">
                                Lista de Precios Base
                            </h1>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                                Tarifario para Residencial Los Quetzales
                            </p>
                        </div>
                    </div>

                    {/* Botón descargar PDF */}
                    <button
                        id="btn-descargar-pdf"
                        onClick={handleDescargar}
                        disabled={descargando}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 20px',
                            borderRadius: 10,
                            border: '1px solid rgba(56,189,248,0.35)',
                            background: descargando
                                ? 'rgba(56,189,248,0.05)'
                                : 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(14,165,233,0.1) 100%)',
                            color: '#38bdf8',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            cursor: descargando ? 'wait' : 'pointer',
                            transition: 'all 0.25s ease',
                            backdropFilter: 'blur(8px)',
                            whiteSpace: 'nowrap',
                            opacity: descargando ? 0.7 : 1,
                        }}
                        onMouseEnter={e => {
                            if (!descargando) {
                                (e.currentTarget as HTMLButtonElement).style.background =
                                    'linear-gradient(135deg, rgba(56,189,248,0.28) 0%, rgba(14,165,233,0.2) 100%)';
                                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.6)';
                                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
                                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(56,189,248,0.2)';
                            }
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background =
                                'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(14,165,233,0.1) 100%)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(56,189,248,0.35)';
                            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                        }}
                    >
                        <Download size={16} />
                        {descargando ? 'Generando…' : 'Descargar PDF'}
                    </button>
                </div>

                {/* Tablas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {Object.keys(PRECIOS).map(manzana => (
                        <div key={manzana} className="glass-panel animate-fade-in" style={{ padding: '1.5rem', borderRadius: 16 }}>
                            <h2 style={{
                                fontSize: '1.2rem', color: 'var(--primary-accent)', fontWeight: 600,
                                marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem',
                            }}>
                                {manzana}
                            </h2>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                                    <thead>
                                        <tr style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <th style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-glass)' }}>Modelo</th>
                                            <th style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-glass)' }}>Versión</th>
                                            <th style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-glass)', textAlign: 'right' }}>Precio Base</th>
                                            <th style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-glass)', textAlign: 'right' }}>Valor Avalúo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {PRECIOS[manzana].map((item, index) => (
                                            <tr key={index} style={{ borderBottom: index < PRECIOS[manzana].length - 1 ? '1px solid var(--ghost-bg)' : 'none', transition: 'background 0.2s' }}>
                                                <td style={{ padding: '12px 16px', color: 'var(--text-main)', fontWeight: 500 }}>{item.modelo}</td>
                                                <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{item.version}</td>
                                                <td style={{ padding: '12px 16px', color: 'var(--primary-accent)', textAlign: 'right', fontWeight: 600 }}>{fmt(item.precio)}</td>
                                                <td style={{ padding: '12px 16px', color: 'var(--text-main)', textAlign: 'right' }}>{item.avaluo ? fmt(item.avaluo) : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
