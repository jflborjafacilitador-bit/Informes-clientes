const Papa = require('papaparse');
const fs = require('fs');

async function testParse() {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/1yPbtGw1cPbbo7VDldJO_zCphq0LjJREjfriKGuBs3PI/export?format=csv';
    const response = await fetch(csvUrl);
    const text = await response.text();

    Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
            console.log("Headers detectados:", results.meta.fields);
            console.log("Primera fila:", results.data[0]);

            const rows = results.data;
            const mappedData = rows.filter(r => r['Nombre y Apellido'] || r['Nombre']).map((row) => {
                const rawName = row['Nombre y Apellido'] || row['Nombre'] || 'Sin Nombre';
                return rawName;
            });
            console.log("Nombres mapeados (primeros 3):", mappedData.slice(0, 3));
            console.log("Total filtrados:", mappedData.length);
        }
    });
}

testParse();
