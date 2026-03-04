const SUPABASE_URL = 'https://mxucntphfihiyctxiffs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dWNudHBoZmloaXljdHhpZmZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU5MjQ2OCwiZXhwIjoyMDg4MTY4NDY4fQ.eNbx5Vr_-R1A_PrlDiQjmNBaGOT-O_UlqbY819Za3vI';
const H = { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

// Ver usuarios en auth
const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=20`, { headers: H });
const authData = await authRes.json();
console.log('\n=== AUTH USERS ===');
(authData.users || []).forEach(u => console.log(u.email, u.id));

// Ver profiles
const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, { headers: H });
const profData = await profRes.json();
console.log('\n=== PROFILES ===');
profData.forEach(p => console.log(p.email, p.role, p.id));
