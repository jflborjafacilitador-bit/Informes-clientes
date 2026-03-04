import Papa from 'papaparse';

const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/1yPbtGw1cPbbo7VDldJO_zCphq0LjJREjfriKGuBs3PI/export?format=csv';

export interface ClientData {
    id: string;
    name: string;
    segment: string;
    status: string;
    date: string;
    budget: string;
}

export const fetchClientsFromSheet = async (): Promise<ClientData[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(GOOGLE_SHEETS_CSV_URL, {
            download: true,
            header: true,
            complete: (results) => {
                // Mapeamos los datos asumiendo que las columnas del excel tengan 
                // nombres reconocibles. Usamos index fallback en caso de no hallar los exactos.
                const data = results.data
                    .filter((row: any) => row && Object.values(row).some(val => val !== '')) // Ignora filas vacías
                    .map((row: any, index: number) => {
                        const getCol = (possibleNames: string[]) => {
                            for (const name of possibleNames) {
                                if (row[name] !== undefined) return row[name];
                            }
                            return '';
                        };

                        return {
                            id: `sheet-id-${index}`,
                            name: getCol(['Nombre', 'Name', 'Cliente', 'Nombre Completo']) || 'Sin Nombre',
                            segment: getCol(['Segmento', 'Segment', 'Tipo']) || 'General',
                            status: getCol(['Estado', 'Status', 'Estatus']) || 'Nuevo',
                            date: getCol(['Fecha', 'Date', 'Registro']) || new Date().toISOString().split('T')[0],
                            budget: getCol(['Presupuesto', 'Budget', 'Capital']) || '$0',
                        };
                    });

                resolve(data);
            },
            error: (error: any) => {
                console.error("Error leyendo Google Sheets", error);
                reject(error);
            }
        });
    });
};
