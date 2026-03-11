import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';

const files = [
    { key: 'calc_completas', path: './public/Material para calculadoras/CALCULADORAS CORRECTAS COMPLETAS.xlsx' },
    { key: 'calc_mz3', path: './public/Material para calculadoras/CALCULADORAS MZ 3.xlsx' },
    { key: 'precios_2026', path: './public/Material para calculadoras/Precios nuevos 2026.xlsx' },
];

const result = {};

for (const { key, path } of files) {
    result[key] = {};
    try {
        const buf = readFileSync(path);
        const wb = XLSX.read(buf, { type: 'buffer' });
        for (const name of wb.SheetNames) {
            const ws = wb.Sheets[name];
            result[key][name] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        }
    } catch (e) {
        result[key]['_error'] = e.message;
    }
}

writeFileSync('./tmp_excel_data.json', JSON.stringify(result, null, 2), 'utf8');
console.log('Listo: tmp_excel_data.json');
