import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log("Attempting insert...");
  const { data, error } = await supabase.from('clients').insert([{
    name: 'Prueba Landing AI',
    email: 'pepito@test.com',
    phone: '5215555555555',
    origen: 'landing_propia',
    asesor_id: '5ada3635-c38d-4ba6-af62-a5eac552086c',
    status: 'Lead'
  }]).select();
  console.log("Data:", data);
  console.log("Error:", error);
}
check();
