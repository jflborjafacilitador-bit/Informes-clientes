import Papa from 'papaparse';

const SUPABASE_URL = 'https://mxucntphfihiyctxiffs.supabase.co';
const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dWNudHBoZmloaXljdHhpZmZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU5MjQ2OCwiZXhwIjoyMDg4MTY4NDY4fQ.eNbx5Vr_-R1A_PrlDiQjmNBaGOT-O_UlqbY819Za3vI';
const H = { 'apikey': SK, 'Authorization': `Bearer ${SK}`, 'Content-Type': 'application/json' };

// Mapeo de nombres del Excel a emails de Supabase
const NAME_TO_EMAIL = {
    'marlon': 'marlon@losquetzales.com',
    'luima': 'luima@losquetzales.com',
    'luis toledo': 'ltoledo@losquetzales.com',
    'luis borja': 'lborja@losquetzales.com',
};

// 1. Leer profiles de Supabase para obtener IDs
const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,email,role`, { headers: H });
const profiles = await profRes.json();
console.log('Profiles cargados:', profiles.length);

// Crear mapa email → {id, email}
const emailToUser = {};
profiles.forEach(p => { emailToUser[p.email.toLowerCase()] = p; });

// Resolver nombre del Excel a usuario de Supabase
function resolveAsesor(name) {
    if (!name) return null;
    const n = name.trim().toLowerCase();
    if (n === '' || n === 'ninguno' || n === 'pendiente' || n === 'sin asignar') return null;
    const email = NAME_TO_EMAIL[n];
    if (!email) { console.warn(`  ⚠️ Nombre no mapeado: "${name}"`); return null; }
    return emailToUser[email] || null;
}

// 2. Leer CSV de Google Sheets
const csvUrl = 'https://docs.google.com/spreadsheets/d/1yPbtGw1cPbbo7VDldJO_zCphq0LjJREjfriKGuBs3PI/export?format=csv';
const csvText = await (await fetch(csvUrl)).text();

const rows = await new Promise(resolve => {
    Papa.parse(csvText, { header: true, skipEmptyLines: true, complete: r => resolve(r.data) });
});
console.log(`CSV leído: ${rows.length} filas`);

// 3. Construir overrides de asignación
const overrides = [];
for (const row of rows) {
    const rawName = row['Nombre y Apellido'] || row['Nombre'];
    if (!rawName) continue;

    const phone = row['WhatsApp_Limpio'] || row['Teléfono'] || '';
    let dateStr = row['Marca temporal'] || row['Timestamp'] || '';
    let isoDate = new Date().toISOString().substring(0, 10);
    if (dateStr) {
        try {
            const parts = dateStr.split(' ')[0].split('/');
            if (parts.length === 3) isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } catch (e) { }
    }
    const idBase = phone ? phone : isoDate.substring(0, 10);
    const clientId = `${rawName}_${idBase}`.replace(/[^a-zA-Z0-9_]/g, '');

    const asignadoA = row['Asignado a'] || '';
    const asesor = resolveAsesor(asignadoA);
    if (!asesor) continue; // Sin asignación válida, skip

    overrides.push({
        client_id: clientId,
        assigned_to: asesor.id,
        assigned_email: asesor.email,
    });
}

console.log(`Overrides a sincronizar: ${overrides.length}`);

// 4. Upsert en batch de 50
let ok = 0, fail = 0;
const BATCH = 50;
for (let i = 0; i < overrides.length; i += BATCH) {
    const batch = overrides.slice(i, i + BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/client_overrides`, {
        method: 'POST',
        headers: { ...H, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(batch),
    });
    if (res.ok) { ok += batch.length; process.stdout.write('.'); }
    else { fail += batch.length; const err = await res.text(); console.error(`\nBatch error:`, err.substring(0, 200)); }
}

console.log(`\n✅ Sync completado: ${ok} asignaciones upserted, ${fail} errores.`);
