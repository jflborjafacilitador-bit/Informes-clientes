const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
let n8nUrl = '', n8nKey = '';
envContent.split('\n').forEach(line => {
  const m = line.match(/^VITE_N8N_BASE_URL=(.*)/);
  if (m) n8nUrl = m[1].replace(/["']/g,'').trim();
  const m2 = line.match(/^VITE_N8N_API_KEY=(.*)/);
  if (m2) n8nKey = m2[1].replace(/["']/g,'').trim();
});

fetch(n8nUrl + '/api/v1/executions?limit=10&includeData=true', {
  headers: { 'X-N8N-API-KEY': n8nKey }
})
.then(r => r.json())
.then(data => {
  const ex = data.data.map(e => {
    let instance = 'unknown';
    let fromMe = 'unknown';
    let text = 'unknown';
    let event = 'unknown';
    let lastNode = e.data.resultData.lastNodeExecuted;
    let err = e.data.resultData.error ? e.data.resultData.error.message : null;
    try {
      const whData = e.data.resultData.runData['Webhook Evolution WhatsApp'][0].data.main[0][0].json.body;
      instance = whData.instance;
      event = whData.event;
      fromMe = whData.data.key.fromMe;
      text = whData.data.message.conversation || whData.data.message.extendedTextMessage?.text;
    } catch(e) {}
    
    return { id: e.id, status: e.status, instance, event, fromMe, text, lastNode, error: err };
  });
  console.log(JSON.stringify(ex, null, 2));
})
.catch(console.error);
