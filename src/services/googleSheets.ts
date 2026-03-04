import Papa from 'papaparse';

export interface ClientData {
    id: string;
    name: string;
    phone: string;        // WhatsApp_Limpio del Excel
    segment: string;
    budget: string;
    date: string;
    rowIndex: number;     // Posición en el CSV: 0 = más antiguo, N = más reciente
    status: string;
    sheet_assigned?: string;
    assigned_to?: string;
    assigned_email?: string;
    budget_range?: string;
}

// Hoja principal: Copia de LISTA_LIMPIA_WHATSAPP (gid=1438030816)
// Columnas: Nombre | WhatsApp_Limpio | Estado del Lead | Asignado a | Notas
const csvUrl = 'https://docs.google.com/spreadsheets/d/1yPbtGw1cPbbo7VDldJO_zCphq0LjJREjfriKGuBs3PI/export?format=csv&gid=1438030816';

export const fetchClientsFromSheet = (): Promise<ClientData[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as any[];
                console.log(`CSV cargado: ${rows.length} filas encontradas.`);

                const mappedData: ClientData[] = rows
                    .filter(r => r['Nombre'] || r['Nombre y Apellido'])
                    .map((row, idx) => {
                        // Nombre: columna A de la hoja
                        const rawName = (row['Nombre'] || row['Nombre y Apellido'] || 'Sin Nombre').trim();

                        // Teléfono: columna B "WhatsApp_Limpio" → clave de identificación real
                        const phone = (row['WhatsApp_Limpio'] || row['Teléfono'] || '').trim();

                        // Fecha: no existe en esta hoja, se usa fallback
                        let isoDate = '1970-01-01';
                        const dateStr = row['Marca temporal'] || row['Timestamp'] || '';
                        if (dateStr) {
                            try {
                                const parts = dateStr.split(' ')[0].split('/');
                                if (parts.length === 3) isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                            } catch (e) { }
                        }

                        // ID predecible y estable: Nombre + Teléfono (ambos son la clave real)
                        const idBase = phone || rawName;
                        const generatedId = `${rawName}_${idBase}`.replace(/[^a-zA-Z0-9_]/g, '');

                        // Estado del Lead → mapeado a los estados del sistema
                        const estadoRaw = (row['Estado del Lead'] || row['Estado'] || 'Nuevo').trim();
                        const estadosValidos = ['Nuevo', 'No responde', 'Numero sin Whatsapp', 'Reprogramo', 'Citado', 'En seguimiento', 'No esta interesado', 'Repetido', 'Presupuesto insuficiente', 'Activo', 'En espera'];
                        const estadoOriginal = estadosValidos.includes(estadoRaw) ? estadoRaw : 'Nuevo';

                        // Segmento: puede venir de "¿En qué casa estás interesado?" o "Segmento"
                        // Si la hoja no lo tiene, se muestra vacío (se puede editar desde el app)
                        const segment = (row['¿En qué casa estás interesado?'] || row['Segmento'] || '').trim();

                        return {
                            id: generatedId,
                            name: rawName,
                            phone,
                            segment,
                            budget: (row['¿Cual seria tu forma de pago?'] || row['Presupuesto'] || '').trim(),
                            date: isoDate,
                            rowIndex: idx,   // posición real en el CSV
                            status: estadoOriginal,
                            sheet_assigned: (() => {
                                const raw = (row['Asignado a'] || '').trim().toLowerCase();
                                const sinAsignar = ['', 'ninguno', 'n/a', 'ninguno'];
                                return sinAsignar.includes(raw) ? undefined : (row['Asignado a'] || '').trim();
                            })(),
                        };
                    });

                resolve(mappedData);
            },
            error: (error) => {
                console.error('Error fetching CSV:', error);
                reject(error);
            }
        });
    });
};
