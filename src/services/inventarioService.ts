import Papa from 'papaparse';

export interface InventarioItem {
    mza: string;
    casa: string;
    condominio: string;
    prototipo: string;
    dtu: string;
    fechaDtu: string;
    m2Construccion: string;
    m2Terreno: string;
    m2Adicional: string;
    excedente: string;
    esquina: string;
    esquemaVenta: string;
    estatus: string; // "DISPONIBLE" | "NO DISPONIBLE" | ...
    fechaEscrituracion: string;
}

// La hoja exportada como CSV tiene filas decorativas al inicio.
// Los datos reales comienzan cuando la columna B (índice 1) tiene un número de manzana.
const CSV_URL =
    'https://docs.google.com/spreadsheets/d/1R6Qx34NT-_An1gs5qjMCcxPRmc5Ns1gp/export?format=csv';

export const fetchInventario = (): Promise<InventarioItem[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(CSV_URL, {
            download: true,
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data as string[][];

                const items: InventarioItem[] = rows
                    .filter(row => {
                        // La fila válida tiene un número en col B (índice 1) y un nombre de condominio en col D (índice 3)
                        const mza = (row[1] || '').trim();
                        const cond = (row[3] || '').trim().toUpperCase();
                        return (
                            mza !== '' &&
                            !isNaN(Number(mza)) &&
                            (cond.includes('TUCAN') || cond.includes('AVE') || cond.includes('PARAISO'))
                        );
                    })
                    .map(row => ({
                        mza: (row[1] || '').trim(),
                        casa: (row[2] || '').trim(),
                        condominio: (row[3] || '').trim(),
                        prototipo: (row[4] || '').trim(),
                        dtu: (row[5] || '').trim(),
                        fechaDtu: (row[6] || '').trim(),
                        m2Construccion: (row[7] || '').trim(),
                        m2Terreno: (row[8] || '').trim(),
                        m2Adicional: (row[9] || '').trim(),
                        excedente: (row[10] || '').trim(),
                        esquina: (row[11] || '').trim(),
                        esquemaVenta: (row[12] || '').trim(),
                        estatus: (row[13] || '').trim().toUpperCase(),
                        fechaEscrituracion: (row[14] || '').trim(),
                    }));

                console.log(`Inventario cargado: ${items.length} casas encontradas.`);
                resolve(items);
            },
            error: (error) => {
                console.error('Error al cargar inventario:', error);
                reject(error);
            },
        });
    });
};
