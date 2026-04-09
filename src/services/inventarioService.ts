import * as xlsx from 'xlsx';

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

const EXCEL_URL = '/Inventario/Inventario 9-04-26.xlsx';

export const fetchInventario = async (): Promise<InventarioItem[]> => {
    try {
        const response = await fetch(EXCEL_URL);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = xlsx.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Obtenemos los datos de la hoja como un arreglo 2D
        const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        const items: InventarioItem[] = rows
            .filter(row => {
                const mza = String(row[1] || '').trim();
                const cond = String(row[3] || '').trim().toUpperCase();
                return (
                    mza !== '' &&
                    !isNaN(Number(mza)) &&
                    (cond.includes('TUCAN') || cond.includes('AVE') || cond.includes('PARAISO'))
                );
            })
            .map(row => ({
                mza: String(row[1] || '').trim(),
                casa: String(row[2] || '').trim(),
                condominio: String(row[3] || '').trim(),
                prototipo: String(row[4] || '').trim(),
                dtu: String(row[5] || '').trim(),
                fechaDtu: String(row[6] || '').trim(),
                m2Construccion: String(row[7] || '').trim(),
                m2Terreno: String(row[8] || '').trim(),
                m2Adicional: String(row[9] || '').trim(),
                excedente: String(row[10] || '').trim(),
                esquina: String(row[11] || '').trim(),
                esquemaVenta: String(row[12] || '').trim(),
                estatus: String(row[13] || '').trim().toUpperCase(),
                fechaEscrituracion: String(row[14] || '').trim(),
            }));

        console.log(`Inventario cargado: ${items.length} casas encontradas desde Excel.`);
        return items;
    } catch (error) {
        console.error('Error al cargar inventario:', error);
        throw error;
    }
};
