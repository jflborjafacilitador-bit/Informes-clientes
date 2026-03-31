const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
envContent.split('\n').forEach(line => {
  const m = line.match(/^VITE_SUPABASE_URL=(.*)/);
  if (m) supabaseUrl = m[1].replace(/["']/g,'').trim();
  const m2 = line.match(/^VITE_SUPABASE_ANON_KEY=(.*)/);
  if (m2) supabaseKey = m2[1].replace(/["']/g,'').trim();
});

const wf = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));

// 1. Desconectar la ruta verdadera del IF `¿IA Encendida?` hacia `AI Agent`
if (wf.connections['¿IA Encendida?']) {
    wf.connections['¿IA Encendida?'] = {};
}

// 2. Add HTTP CRM Register (Supabase)
wf.nodes.push({
  "parameters": {
    "method": "POST",
    "url": `${supabaseUrl}/rest/v1/rpc/register_client_from_ai`,
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "apikey", "value": supabaseKey },
        { "name": "Authorization", "value": `Bearer ${supabaseKey}` }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"p_phone\": \"{{ $('Webhook Evolution WhatsApp').first()?.json?.body?.data?.key?.remoteJid?.split('@')[0] }}\",\n  \"p_name\": \"{{ $('Webhook Evolution WhatsApp').first()?.json?.body?.data?.pushName || 'Prospecto WhatsApp' }}\",\n  \"p_instance\": \"{{ $('Webhook Evolution WhatsApp').first()?.json?.body?.instance }}\"\n}",
    "options": {}
  },
  "id": "node-register-crm",
  "name": "Registrar Cliente CRM",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.1,
  "position": [950, 380]
});

// Remove duplicates by name
wf.nodes = wf.nodes.filter((n, i, self) => i === self.findIndex(t => t.name === n.name));

// Rewrite connections from IF to new Node, and then to AI Agent
wf.connections['¿IA Encendida?'] = {
  "main": [ [ { "node": "Registrar Cliente CRM", "type": "main", "index": 0 } ] ]
};

wf.connections['Registrar Cliente CRM'] = {
  "main": [ [ { "node": "AI Agent", "type": "main", "index": 0 } ] ]
};

fs.writeFileSync('wf_live.json', JSON.stringify(wf, null, 2), 'utf8');
console.log("wf_live.json patched with CRM Sync node!");
