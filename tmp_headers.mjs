import Papa from 'papaparse';

const res = await fetch('https://docs.google.com/spreadsheets/d/1yPbtGw1cPbbo7VDldJO_zCphq0LjJREjfriKGuBs3PI/export?format=csv');
const text = await res.text();

Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    complete: (r) => {
        console.log('=== HEADERS ===');
        r.meta.fields.forEach(f => console.log(' -', f));
        console.log('\n=== PRIMERA FILA ===');
        console.log(JSON.stringify(r.data[0], null, 2));
        console.log('\n=== SEGUNDA FILA ===');
        console.log(JSON.stringify(r.data[1], null, 2));
    }
});
