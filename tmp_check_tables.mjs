import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mxucntphfihiyctxiffs.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dWNudHBoZmloaXljdHhpZmZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU5MjQ2OCwiZXhwIjoyMDg4MTY4NDY4fQ.eNbx5Vr_-R1A_PrlDiQjmNBaGOT-O_UlqbY819Za3vI';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkTables() {
    // Attempt to list tables or just run a query
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

checkTables();
