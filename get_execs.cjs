const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
let n8nUrl = '', n8nKey = '';
envContent.split('\n').forEach(line => {
  const m = line.match(/^VITE_N8N_BASE_URL=(.*)/);
  if (m) n8nUrl = m[1].replace(/["']/g,'').trim();
  const m2 = line.match(/^VITE_N8N_API_KEY=(.*)/);
  if (m2) n8nKey = m2[1].replace(/["']/g,'').trim();
});

fetch(n8nUrl + '/api/v1/executions?limit=1&includeData=true', {
  headers: { 'X-N8N-API-KEY': n8nKey }
})
.then(r => r.json())
.then(data => {
  fs.writeFileSync('n8n_exec_debug.json', JSON.stringify(data, null, 2));
  console.log('Saved to n8n_exec_debug.json');
})
.catch(console.error);
