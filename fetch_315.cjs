const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
let n8nUrl = '', n8nKey = '';
envContent.split('\n').forEach(line => {
  const m = line.match(/^VITE_N8N_BASE_URL=(.*)/);
  if (m) n8nUrl = m[1].replace(/["']/g,'').trim();
  const m2 = line.match(/^VITE_N8N_API_KEY=(.*)/);
  if (m2) n8nKey = m2[1].replace(/["']/g,'').trim();
});

fetch(n8nUrl + '/api/v1/executions/315?includeData=true', {
  headers: { 'X-N8N-API-KEY': n8nKey }
})
.then(r => r.json())
.then(data => {
  fs.writeFileSync('exec_315.json', JSON.stringify(data, null, 2), 'utf8');
  const d = data;
  const runData = d.data.resultData.runData;
  const sendNode = runData['Send WhatsApp via Evolution API'][0];
  console.log("Error:", sendNode.error);
  console.log("Executed URL:", sendNode.data.main[0]?.[0]?.json?.url || JSON.stringify(sendNode.data.main)); 
})
.catch(console.error);
