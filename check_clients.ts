import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClients() {
  const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Recent Clients:", data);
  console.log("Error:", error);
}

checkClients();
