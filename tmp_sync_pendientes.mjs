import Papa from 'papaparse';

const SUPABASE_URL = 'https://mxucntphfihiyctxiffs.supabase.co';
const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dWNudHBoZmloaXljdHhpZmZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU5MjQ2OCwiZXhwIjoyMDg4MTY4NDY4fQ.eNbx5Vr_-R1A_PrlDiQjmNBaGOT-O_UlqbY819Za3vI';
const H = { 'apikey': SK, 'Authorization': `Bearer ${SK}`, 'Content-Type': 'application/json' };

const csvText = await (await fetch('https://docs.google.com/spreadsheets/d/1yPbtGw1cPbbo7VDldJO_zCphq0LjJREjfriKGuBs3PI/export?format=csv')).text();

const rows = await new Promise(resolve => {
    Papa.parse(csvText, { header: true, skipEmptyLines: true, complete: r => resolve(r.data) });
});

// Filtrar solo los que tienen "Pendiente" en "Asignado a"
const pendientes = [];
for (const row of rows) {
    const asignado = (row['Asignado a'] || '').trim().toLowerCase();
    if (asignado !== 'pendiente') continue;

    const rawName = row['Nombre y Apellido'] || row['Nombre'];
    if (!rawName) continue;

    const phone = (row['WhatsApp_Limpio'] || '').trim();
    let isoDate = new Date().toISOString().substring(0, 10);
    const dateStr = row['Marca temporal'] || row['Timestamp'] || '';
    if (dateStr) {
        try {
            const parts = dateStr.split(' ')[0].split('/');
            if (parts.length === 3) isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } catch (e) { }
    }
    const idBase = phone || isoDate.substring(0, 10);
    const clientId = `${rawName}_${idBase}`.replace(/[^a-zA-Z0-9_]/g, '');

    pendientes.push({ client_id: clientId, assigned_to: null, assigned_email: 'pendiente' });
}

console.log(`Clientes pendientes encontrados: ${pendientes.length}`);

// Upsert en batches
let ok = 0, fail = 0;
const BATCH = 50;
for (let i = 0; i < pendientes.length; i += BATCH) {
    const batch = pendientes.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/client_overrides`, {
        method: 'POST',
        headers: { ...H, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(batch),
    });
    if (res.ok) { ok += batch.length; process.stdout.write('.'); }
    else { fail += batch.length; console.error('\nError:', (await res.text()).substring(0, 200)); }
}

console.log(`\n✅ Sync pendientes: ${ok} upserted, ${fail} errores.`);
