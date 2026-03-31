const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
let envData = {};
if (fs.existsSync(envPath)) {
  const fileContent = fs.readFileSync(envPath, 'utf8');
  fileContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      envData[match[1]] = val;
    }
  });
}

const n8nBaseUrl = envData.VITE_N8N_BASE_URL?.replace(/\/$/, '');
const n8nApiKey = envData.VITE_N8N_API_KEY;

const headers = {
  'Accept': 'application/json',
  'X-N8N-API-KEY': n8nApiKey,
  'Content-Type': 'application/json'
};

async function run() {
  try {
    const wfContent = JSON.parse(fs.readFileSync('wf_live.json', 'utf8'));
    
    // add webhook logic
    wfContent.nodes.forEach(n => {
       if (n.name === 'Webhook Landing Page') {
           n.webhookId = 'landing-agent';
       } else if (n.name === 'Webhook Evolution WhatsApp') {
           n.webhookId = 'whatsapp-agent';
       }
    });

    const payload = {
      name: wfContent.name,
      nodes: wfContent.nodes,
      connections: wfContent.connections,
      settings: wfContent.settings,
      staticData: wfContent.staticData
    };

    const finalRes = await fetch(`${n8nBaseUrl}/api/v1/workflows/iJkJqQsNI6u4BXu6`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });
    
    if (!finalRes.ok) {
        console.error("Error Details:", await finalRes.text());
        throw new Error("Failed to upload");
    }

    // Activate the workflow properly
    const actRes = await fetch(`${n8nBaseUrl}/api/v1/workflows/iJkJqQsNI6u4BXu6/activate`, {
      method: 'POST',
      headers
    });
    
    if (!actRes.ok) {
        console.error("Activate error:", await actRes.text());
    } else {
        console.log("✅ Workflow activated!");
    }

    console.log("✅ Successfully updated live n8n workflow.");
  } catch(e) {
    console.error(e);
  }
}

run();
