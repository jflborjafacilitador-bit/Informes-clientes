const Papa = require("papaparse");

async function run() {
    const res = await fetch('https://docs.google.com/spreadsheets/d/1yPbtGw1cPbbo7VDldJO_zCphq0LjJREjfriKGuBs3PI/export?format=csv');
    const text = await res.text();
    Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: function (result) {
            console.log(result.meta.fields);
            console.log(result.data[0]);
        }
    });
}

run();
