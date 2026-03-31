const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync('.env.local', 'utf8');
let n8nUrl = '', n8nKey = '';
envContent.split('\n').forEach(line => {
  const m = line.match(/^VITE_N8N_BASE_URL=(.*)/);
  if (m) n8nUrl = m[1].replace(/["']/g,'').trim();
  const m2 = line.match(/^VITE_N8N_API_KEY=(.*)/);
  if (m2) n8nKey = m2[1].replace(/["']/g,'').trim();
});

const headers = {
  'Accept': 'application/json',
  'X-N8N-API-KEY': n8nKey,
  'Content-Type': 'application/json'
};

async function run() {
  try {
    const r = await fetch(n8nUrl + '/api/v1/workflows/iJkJqQsNI6u4BXu6', { headers });
    const wf = await r.json();
    
    // Fix the node
    const sendNode = wf.nodes.find(n => n.name === 'Send WhatsApp via Evolution API');
    if (sendNode) {
        sendNode.parameters.url = "={{ 'https://n8n-prueba1-evolution-api.exigs1.easypanel.host/message/sendText/' + ($('Webhook Evolution WhatsApp').first().json.body?.instance || $('Webhook Landing Page').first().json.body?.whatsapp_instance_name) }}";
        
        if (sendNode.parameters.bodyParameters && sendNode.parameters.bodyParameters.parameters) {
            const numberParam = sendNode.parameters.bodyParameters.parameters.find(p => p.name === 'number');
            if (numberParam) {
                numberParam.value = "={{ $('Webhook Evolution WhatsApp').first().json.body?.data?.key?.remoteJid?.replace('@s.whatsapp.net', '') || $('Webhook Landing Page').first().json.body?.telefono }}";
            }
        }
        console.log("Patched node!");
    } else {
        console.log("Node not found!");
    }
    
    // Upload it
    const finalRes = await fetch(n8nUrl + '/api/v1/workflows/iJkJqQsNI6u4BXu6', {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: wf.name,
        nodes: wf.nodes,
        connections: wf.connections,
        settings: wf.settings,
        staticData: wf.staticData
      })
    });
    
    if (!finalRes.ok) {
        console.error("Upload Error:", await finalRes.text());
        return;
    }
    
    // Activate
    await fetch(n8nUrl + '/api/v1/workflows/iJkJqQsNI6u4BXu6/activate', { method: 'POST', headers });
    console.log("✅ LIVE WORKFLOW FIXED AND ACTIVATED!");
  } catch(e) {
    console.log(e);
  }
}
run();
