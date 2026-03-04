import Papa from 'papaparse';

export interface ClientData {
    id: string; // ID artificial basado en Nombre y Fecha para conciliar con Supabase
    name: string;
    segment: string;
    budget: string;
    date: string;
    status: string;
    assigned_to?: string; // Vendrá de Supabase
    assigned_email?: string; // Vendrá de Supabase
}

const csvUrl = 'https://docs.google.com/spreadsheets/d/1yPbtGw1cPbbo7VDldJO_zCphq0LjJREjfriKGuBs3PI/export?format=csv';

export const fetchClientsFromSheet = (): Promise<ClientData[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(csvUrl, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as any[];
                console.log("Filas crudas devueltas por el CSV:", rows.slice(0, 3));

                const mappedData: ClientData[] = rows.filter(r => r['Nombre y Apellido'] || r['Nombre']).map((row) => {
                    const rawName = row['Nombre y Apellido'] || row['Nombre'] || 'Sin Nombre';
                    const phone = row['WhatsApp_Limpio'] || row['Teléfono'] || '';

                    let dateStr = row['Marca temporal'] || row['Timestamp'] || '';
                    let isoDate = new Date().toISOString();
                    if (dateStr) {
                        try {
                            const parts = dateStr.split(" ")[0].split('/');
                            if (parts.length === 3) isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                        } catch (e) { }
                    }

                    // Creamos un ID predecible para que Supabase lo reconozca aunque reiniciemos
                    const idBase = phone ? phone : isoDate.substring(0, 10);
                    const generatedId = `${rawName}_${idBase}`.replace(/[^a-zA-Z0-9_]/g, '');

                    // Estado a u otras variantes
                    const statusKey = Object.keys(row).find(k => k.toLowerCase().includes('estado')) || 'Estado';
                    let estadoOriginal = row[statusKey] || 'Nuevo';

                    const estadosValidos = ['Nuevo', 'No responde', 'Numero sin Whatsapp', 'Reprogramo', 'Citado', 'En seguimiento', 'No esta interesado', 'Repetido', 'Presupuesto insuficiente', 'Activo', 'En espera'];
                    if (!estadosValidos.includes(estadoOriginal)) estadoOriginal = 'Nuevo';

                    return {
                        id: generatedId,
                        name: rawName,
                        segment: row['¿En qué casa estás interesado?'] || row['Segmento'] || 'General',
                        budget: row['¿Cual seria tu forma de pago?'] || row['Presupuesto'] || '$0',
                        date: isoDate,
                        status: estadoOriginal
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
