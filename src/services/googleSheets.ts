import Papa from 'papaparse';

export interface ClientData {
    id: string;
    name: string;
    phone: string;
    email: string;           // Nuevo campo — columna C del Google Sheet
    segment: string;
    budget: string;
    date: string;
    rowIndex: number;        // Posición en el CSV (0 = más antiguo)
    status: string;
    sheet_assigned?: string; // Asesor Asignado del Sheet (email completo o 'pendiente')
    assigned_to?: string;    // UUID del asesor en Supabase (override)
    assigned_email?: string; // Email del asesor en Supabase (override)
    budget_range?: string;
    discarded_from_asesor?: string; // Email del asesor anterior al descartar (preservado tras reactivar)
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN DEL NUEVO GOOGLE SHEET
// Sheet ID: 1Pp1zo3tI7lEyskM0ew95I9wI1PEU7q0d5XCSD3HfuwA
// Columnas: Nombre | Teléfono | Email | Estado | Asesor Asignado | Financiamiento | Origen
// ─────────────────────────────────────────────────────────────────────────────
const SHEET_ID = '1Pp1zo3tI7lEyskM0ew95I9wI1PEU7q0d5XCSD3HfuwA';
const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

// URL del Apps Script para write-back (bidireccional)
// Instala sheets-sync.gs en el Google Sheet y pega la URL aquí:
// (Mientras esté vacío, los cambios solo se guardan en Supabase)
export let APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqbYfI49tn0Ix136JtV8d2esVkRd_uP4F7HraryVfgMrOrs0i_SzDCXTIq4bxcR5Ko/exec';

// Estados válidos del sistema CRM
const ESTADOS_VALIDOS = [
    'Nuevo', 'No responde', 'Numero sin Whatsapp', 'Reprogramo',
    'Citado', 'En seguimiento', 'No esta interesado', 'Repetido',
    'Presupuesto insuficiente', 'Activo', 'En espera'
];

// Valores que significan "sin asignar" en la columna Asesor Asignado
const SIN_ASIGNAR_VALUES = new Set(['', 'sin asignar', 'ninguno', 'n/a', 'none']);

export const fetchClientsFromSheet = (): Promise<ClientData[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as any[];
                console.log(`[Sheet] CSV cargado: ${rows.length} filas encontradas.`);

                const mappedData: ClientData[] = rows
                    .filter(r => (r['Nombre'] || '').trim() || (r['Teléfono'] || '').trim())
                    .map((row, idx) => {
                        const rawName = (row['Nombre'] || 'Sin Nombre').trim();
                        const phone   = (row['Teléfono'] || '').trim();
                        const email   = (row['Email'] || '').trim();

                        // ID estable: Nombre + Teléfono (igual que antes para no romper overrides)
                        const idBase = phone || rawName;
                        const generatedId = `${rawName}_${idBase}`.replace(/[^a-zA-Z0-9_]/g, '');

                        // Estado: mapear al enum del sistema
                        const estadoRaw = (row['Estado'] || 'Nuevo').trim();
                        const estadoOriginal = ESTADOS_VALIDOS.includes(estadoRaw) ? estadoRaw : 'Nuevo';

                        // Asesor Asignado: en el nuevo Sheet llega como email completo o 'pendiente'
                        const asesorRaw = (row['Asesor Asignado'] || '').trim();
                        const sheetAssigned = SIN_ASIGNAR_VALUES.has(asesorRaw.toLowerCase())
                            ? undefined
                            : asesorRaw;

                        return {
                            id: generatedId,
                            name: rawName,
                            phone,
                            email,
                            segment: (row['Financiamiento'] || '').trim(),
                            budget: '',
                            date: '1970-01-01',
                            rowIndex: idx,
                            status: estadoOriginal,
                            sheet_assigned: sheetAssigned,
                        };
                    });

                console.log(`[Sheet] ${mappedData.length} clientes cargados correctamente.`);
                resolve(mappedData);
            },
            error: (error) => {
                console.error('[Sheet] Error al cargar CSV:', error);
                reject(error);
            }
        });
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// WRITE-BACK: actualizar el Google Sheet cuando cambian estado o asignación
// Usa el Apps Script instalado en el Sheet (ver sheets-sync.gs)
// ─────────────────────────────────────────────────────────────────────────────
export const updateSheetRow = (
    phone: string,
    updates: { status?: string; assigned?: string }
): void => {
    if (!APPS_SCRIPT_URL || !phone) return;

    const params = new URLSearchParams({ action: 'update', phone });
    if (updates.status !== undefined)   params.append('status', updates.status);
    if (updates.assigned !== undefined) params.append('assigned', updates.assigned);

    // Fire-and-forget: no bloqueamos la UI si falla
    fetch(`${APPS_SCRIPT_URL}?${params.toString()}`)
        .then(r => r.json())
        .then(data => {
            if (!data.success) {
                console.warn('[Sheet write-back] No actualizado:', data.error);
            }
        })
        .catch(err => {
            console.warn('[Sheet write-back] Request fallida:', err);
        });
};
