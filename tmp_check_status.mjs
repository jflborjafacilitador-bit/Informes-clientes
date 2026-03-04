import Papa from 'papaparse';

const csvText = await (await fetch('https://docs.google.com/spreadsheets/d/1yPbtGw1cPbbo7VDldJO_zCphq0LjJREjfriKGuBs3PI/export?format=csv')).text();

Papa.parse(csvText, {
    header: true, skipEmptyLines: true,
    complete: (r) => {
        const statusKey = r.meta.fields.find(f => f.toLowerCase().includes('estado')) || 'Estado';
        console.log('Columna de estado usada:', statusKey);

        const counts = {};
        r.data.forEach(row => {
            const s = (row[statusKey] || '(vacío)').trim();
            counts[s] = (counts[s] || 0) + 1;
        });

        console.log('\n=== ESTADOS EN EL EXCEL ===');
        Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
            console.log(`  "${k}" → ${v}`);
        });
    }
});
