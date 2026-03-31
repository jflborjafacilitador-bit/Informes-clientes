const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let url='', key='';
env.split('\n').forEach(line => {
  const m1 = line.match(/^VITE_SUPABASE_URL=(.*)/);
  if (m1) url = m1[1].replace(/["']/g,'').trim();
  const m2 = line.match(/^VITE_SUPABASE_ANON_KEY=(.*)/);
  if (m2) key = m2[1].replace(/["']/g,'').trim();
});

async function check() {
  const res = await fetch(`${url}/rest/v1/clients?origen=eq.landing_propia&select=*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data = await res.json();
  console.log("CLIENTS:", data);
}
check();
