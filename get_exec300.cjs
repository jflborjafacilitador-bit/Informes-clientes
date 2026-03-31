const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
let n8nUrl = '', n8nKey = '';
envContent.split('\n').forEach(line => {
  const m = line.match(/^VITE_N8N_BASE_URL=(.*)/);
  if (m) n8nUrl = m[1].replace(/["']/g,'').trim();
  const m2 = line.match(/^VITE_N8N_API_KEY=(.*)/);
  if (m2) n8nKey = m2[1].replace(/["']/g,'').trim();
});

fetch(n8nUrl + '/api/v1/executions/300?includeData=true', {
  headers: { 'X-N8N-API-KEY': n8nKey }
})
.then(r => r.json())
.then(data => {
  const nodeData = data.data.resultData.runData['Verificar IA Activada DB'];
  fs.writeFileSync('exec300_checkdb.json', JSON.stringify(nodeData, null, 2), 'utf8');
})
.catch(console.error);
