import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
const apikey = env.match(/VITE_N8N_API_KEY=(.*)/)[1];
const base = env.match(/VITE_N8N_BASE_URL=(.*)/)[1];

async function run() {
  const r = await fetch(`${base}/api/v1/executions?limit=5`, {
    headers: { 'X-N8N-API-KEY': apikey }
  });
  const data = await r.json();
  const execs = data.data || [];
  for (const exec of execs) {
    console.log(`\n=== Exec ${exec.id} [${exec.status}] [${exec.mode}] ===`);
    const r2 = await fetch(`${base}/api/v1/executions/${exec.id}`, { headers: { 'X-N8N-API-KEY': apikey } });
    const d2 = await r2.json();
    if (d2.data && d2.data.resultData && d2.data.resultData.runData) {
      const nodes = Object.keys(d2.data.resultData.runData);
      console.log('Nodes executed:', nodes.join(', '));
      // check webhook
      const hookNode = d2.data.resultData.runData['Webhook Landing Page'] || d2.data.resultData.runData['Webhook Evolution WhatsApp'];
      if (hookNode) {
        console.log('Trigger:', hookNode[0]?.data?.main?.[0]?.[0]?.json?.body);
      }
      const err = d2.data.resultData.error;
      if (err) console.log('Error:', err.message);
    }
  }
}
run();
