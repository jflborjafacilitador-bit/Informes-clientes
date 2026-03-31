import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envStr = fs.readFileSync('.env.local', 'utf8');

function getEnv(key) {
  const match = envStr.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : null;
}

const url = getEnv('VITE_SUPABASE_URL');
// Intentar usar service role key si existe, si no fallar a anon key
let key = getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY');
if (!key) {
  console.log("No SERVICE ROLE KEY found! Using ANON KEY (will fail SELECT).");
  key = getEnv('VITE_SUPABASE_ANON_KEY');
}

const s = createClient(url, key);

async function check() {
  const { data, error } = await s.from('clients').select('*');
  console.log('Total clients:', data ? data.length : 0);
  if (error) console.log('Error:', error);
}

check();
