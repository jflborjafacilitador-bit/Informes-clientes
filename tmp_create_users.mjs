const SUPABASE_URL = 'https://mxucntphfihiyctxiffs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dWNudHBoZmloaXljdHhpZmZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU5MjQ2OCwiZXhwIjoyMDg4MTY4NDY4fQ.eNbx5Vr_-R1A_PrlDiQjmNBaGOT-O_UlqbY819Za3vI';

const HEADERS = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
};

const USERS = [
    { email: 'marlon@losquetzales.com', password: 'Quetzales#M24', role: 'asesor' },
    { email: 'luima@losquetzales.com', password: 'Quetzales#L24', role: 'asesor' },
    { email: 'ltoledo@losquetzales.com', password: 'Quetzales#T24', role: 'asesor' },
    { email: 'lborja@losquetzales.com', password: 'Quetzales#B24', role: 'asesor' },
    { email: 'sandra.rosas@losquetzales.com', password: 'Gerente#SR24', role: 'gerente' },
];

async function createUser(u) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ email: u.email, password: u.password, email_confirm: true }),
    });
    const data = await res.json();
    if (!res.ok) {
        console.error(`FAIL ${u.email}:`, JSON.stringify(data));
        return;
    }
    const userId = data.id;
    console.log(`OK auth: ${u.email} -> ${userId}`);

    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: 'POST',
        headers: { ...HEADERS, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ id: userId, email: u.email, role: u.role }),
    });
    if (!profileRes.ok) {
        const err = await profileRes.text();
        console.error(`FAIL profile ${u.email}:`, err);
    } else {
        console.log(`OK profile: ${u.email} role=${u.role}`);
    }
}

for (const u of USERS) {
    await createUser(u);
}
console.log('DONE');
