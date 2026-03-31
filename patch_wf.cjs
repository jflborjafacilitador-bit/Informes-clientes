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

// Delete existing connections from WhatsApp webhook to AI Agent
if (wf.connections['Webhook Evolution WhatsApp']) {
    wf.connections['Webhook Evolution WhatsApp'] = {};
}

// 1. Add IF Webhook Source (Anti-Loop)
wf.nodes.push({
  "parameters": {
    "conditions": {
      "boolean": [
        {
          "value1": "={{ $json.body.data.key.fromMe }}",
          "value2": false
        }
      ]
    }
  },
  "id": "node-if-webhook-source",
  "name": "Ignorar Mensajes de IA",
  "type": "n8n-nodes-base.if",
  "typeVersion": 1,
  "position": [400, 400]
});

// 2. Add HTTP Check AI DB (Supabase)
wf.nodes.push({
  "parameters": {
    "method": "POST",
    "url": `${supabaseUrl}/rest/v1/rpc/is_ai_enabled`,
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "apikey", "value": supabaseKey },
        { "name": "Authorization", "value": `Bearer ${supabaseKey}` }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"p_instance_name\": \"{{ $('Webhook Evolution WhatsApp').first()?.json?.body?.instance }}\"\n}",
    "options": {}
  },
  "id": "node-check-ai",
  "name": "Verificar IA Activada DB",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.1,
  "position": [600, 380]
});

// 3. Add IF AI Active
wf.nodes.push({
  "parameters": {
    "conditions": {
      "boolean": [
        {
          "value1": "={{ $json.enabled }}",
          "value2": true
        }
      ]
    }
  },
  "id": "node-if-ai-active",
  "name": "¿IA Encendida?",
  "type": "n8n-nodes-base.if",
  "typeVersion": 1,
  "position": [800, 380]
});

// Remove existing definitions if running multiple times
wf.nodes = wf.nodes.filter((n, i, self) => i === self.findIndex(t => t.name === n.name));

// Rewire everything
wf.connections['Webhook Evolution WhatsApp'] = {
  "main": [ [ { "node": "Ignorar Mensajes de IA", "type": "main", "index": 0 } ] ]
};

wf.connections['Ignorar Mensajes de IA'] = {
  "main": [ [ { "node": "Verificar IA Activada DB", "type": "main", "index": 0 } ] ]
};

wf.connections['Verificar IA Activada DB'] = {
  "main": [ [ { "node": "¿IA Encendida?", "type": "main", "index": 0 } ] ]
};

// "IA Encendida? == true" connects to AI Agent
wf.connections['¿IA Encendida?'] = {
  "main": [ [ { "node": "AI Agent", "type": "main", "index": 0 } ] ]
};

// Move AI Agent visually further to the right
const aiAgentNode = wf.nodes.find(n => n.name === 'AI Agent');
if (aiAgentNode) { aiAgentNode.position = [1100, 200]; }
const sendNode = wf.nodes.find(n => n.name === 'Send WhatsApp via Evolution API');
if (sendNode) { sendNode.position = [1400, 200]; }

// Set memory visual connections correctly
const deepseek = wf.nodes.find(n => n.name === 'DeepSeek API');
if (deepseek) { deepseek.position = [1100, 400]; }
const mem = wf.nodes.find(n => n.name === 'Window Buffer Memory');
if (mem) { mem.position = [1250, 400]; }

fs.writeFileSync('wf_live.json', JSON.stringify(wf, null, 2), 'utf8');
console.log("wf_live.json correctly patched with loop prevention and DB checking!");
