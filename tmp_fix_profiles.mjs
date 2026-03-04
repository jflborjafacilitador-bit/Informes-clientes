const SUPABASE_URL = 'https://mxucntphfihiyctxiffs.supabase.co';
const SK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dWNudHBoZmloaXljdHhpZmZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU5MjQ2OCwiZXhwIjoyMDg4MTY4NDY4fQ.eNbx5Vr_-R1A_PrlDiQjmNBaGOT-O_UlqbY819Za3vI';
const H = { 'apikey': SK, 'Authorization': `Bearer ${SK}`, 'Content-Type': 'application/json' };

// 1. Listar todos los auth users
const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=50`, { headers: H });
const authJson = await authRes.json();
const authUsers = authJson.users || [];
console.log('\n=== AUTH USERS ENCONTRADOS ===');
authUsers.forEach(u => console.log(`  ${u.email} | ${u.id}`));

// 2. Listar profiles actuales
const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,email,role`, { headers: H });
const profiles = await profRes.json();
console.log('\n=== PROFILES ACTUALES ===');
profiles.forEach(p => console.log(`  ${p.email} | ${p.role}`));

// 3. Emails que necesitamos
const needed = [
    { email: 'marlon@losquetzales.com', role: 'asesor' },
    { email: 'luima@losquetzales.com', role: 'asesor' },
    { email: 'ltoledo@losquetzales.com', role: 'asesor' },
    { email: 'lborja@losquetzales.com', role: 'asesor' },
    { email: 'sandra.rosas@losquetzales.com', role: 'asesor' }, // temporal: asesor evita constraint
];

console.log('\n=== ARREGLANDO PROFILES FALTANTES ===');
for (const target of needed) {
    const authUser = authUsers.find(u => u.email === target.email);
    if (!authUser) { console.log(`  SKIP (no en auth): ${target.email}`); continue; }

    const alreadyHasProfile = profiles.find(p => p.id === authUser.id);
    if (alreadyHasProfile) {
        console.log(`  YA EXISTE: ${target.email} (${alreadyHasProfile.role})`);
        continue;
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...H, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ id: authUser.id, email: target.email, role: target.role }),
    });
    if (r.ok) {
        console.log(`  OK: ${target.email} -> role=${target.role}`);
    } else {
        const err = await r.text();
        console.log(`  FAIL: ${target.email} -> ${err}`);
    }
}
console.log('\n=== DONE ===');
console.log('NOTA: Sandra quedara como asesor temporalmente.');
console.log('Para cambiarla a gerente ejecuta en Supabase SQL Editor:');
console.log("ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;");
console.log("ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin','gerente','asesor','readonly'));");
console.log("UPDATE profiles SET role='gerente' WHERE email='sandra.rosas@losquetzales.com';");
