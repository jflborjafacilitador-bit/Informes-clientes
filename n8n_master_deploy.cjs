const fs = require('fs');
const path = require('path');

// 1. Cargar .env.local manualmente para evitar dependencias
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
const deepseekApiKey = envData.VITE_DEEPSEEK_API_KEY;
const evolutionApiUrl = envData.VITE_EVOLUTION_API_URL?.replace(/\/$/, '');
const evolutionApiKey = envData.VITE_EVOLUTION_API_KEY;

if (!n8nBaseUrl || !n8nApiKey || !deepseekApiKey || !evolutionApiUrl || !evolutionApiKey) {
  console.error("❌ Faltan variables de entorno (N8N, DeepSeek o Evolution) en .env.local.");
  process.exit(1);
}

const headers = {
  'Accept': 'application/json',
  'X-N8N-API-KEY': n8nApiKey,
  'Content-Type': 'application/json'
};

async function createDeepSeekCredential() {
  const checkRes = await fetch(`${n8nBaseUrl}/api/v1/credentials`, { headers });
  if (checkRes.ok) {
    const json = await checkRes.json();
    const existing = json.data.find(c => c.name === "DeepSeek API - Master");
    if (existing) {
      console.log(`✅ Credencial DeepSeek ya existe con ID: ${existing.id}`);
      return existing.id;
    }
  }

  console.log("Creando credencial DeepSeek (OpenAI API)...");
  const res = await fetch(`${n8nBaseUrl}/api/v1/credentials`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: "DeepSeek API - Master",
      type: "openAiApi",
      data: {
        apiKey: deepseekApiKey,
        header: false,
        organizationId: ""
      }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("❌ Error creando credencial DeepSeek:", err);
    throw new Error(err);
  }
  const data = await res.json();
  console.log(`✅ Credencial creada! ID: ${data.id}`);
  return data.id;
}

async function cleanUpOldWorkflows() {
  console.log("Buscando workflows antiguos para limpiar...");
  const res = await fetch(`${n8nBaseUrl}/api/v1/workflows`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch workflows: ${await res.text()}`);
  }
  const json = await res.json();
  
  // Borrar workflows anteriores
  const keywords = ["landing", "whatsapp", "quetzales", "deepseek"];
  
  for (const wf of json.data) {
    const nameLower = wf.name.toLowerCase();
    const isTarget = keywords.some(k => nameLower.includes(k));
    
    if (isTarget && nameLower !== "quetzales ai master ecosystem") {
      console.log(`\t🗑️ Borrando workflow previo: "${wf.name}" (ID: ${wf.id})...`);
      const delRes = await fetch(`${n8nBaseUrl}/api/v1/workflows/${wf.id}`, {
        method: 'DELETE',
        headers
      });
      if (!delRes.ok) console.error(`\t❌ Fallo al borrar ${wf.id}:`, await delRes.text());
    }
  }
}

async function deployMasterWorkflow(credId) {
  const jsonPath = path.join(__dirname, 'n8n_master_agent.json');
  const wfContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Inyectar credencial DeepSeek
  for (const node of wfContent.nodes) {
    if (node.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi') {
      if (!node.credentials) node.credentials = {};
      node.credentials.openAiApi = {
        id: credId,
        name: "DeepSeek API - Master"
      };
    }
    
    // Inyectar URL y API KEY de Evolution API en el nodo HTTP Request final
    if (node.name === 'Send WhatsApp via Evolution API') {
        node.parameters.url = node.parameters.url.replace('http://TU-URL-EVOLUTION-API', evolutionApiUrl);
        node.parameters.headerParameters.parameters[0].value = evolutionApiKey;
    }
  }

  // Comprobar si ya existe el Master Ecosystem
  const checkRes = await fetch(`${n8nBaseUrl}/api/v1/workflows`, { headers });
  let existingId = null;
  if (checkRes.ok) {
    const list = await checkRes.json();
    const existing = list.data.find(w => w.name === wfContent.name);
    if (existing) existingId = existing.id;
  }

  let finalRes;
  if (existingId) {
    console.log(`Actualizando Master Workflow existente (ID: ${existingId})...`);
    finalRes = await fetch(`${n8nBaseUrl}/api/v1/workflows/${existingId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...wfContent
      })
    });
  } else {
    console.log("Importando nuevo Master Workflow...");
    finalRes = await fetch(`${n8nBaseUrl}/api/v1/workflows`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...wfContent
      })
    });
  }

  if (!finalRes.ok) {
    const err = await finalRes.text();
    console.error("❌ Error desplegando workflow:", err);
    throw new Error(err);
  }

  const data = await finalRes.json();
  console.log(`✅ ¡Master Ecosystem Desplegado y Activo! ID: ${data.id}`);
  
  console.log("\n🚀 WEBHOOKS EN VIVO GLOBALES:");
  console.log(`Landing Page: ${n8nBaseUrl}/webhook/landing-agent`);
  console.log(`WhatsApp Live: ${n8nBaseUrl}/webhook/whatsapp-agent`);
}

async function run() {
  try {
    const credId = await createDeepSeekCredential();
    await cleanUpOldWorkflows();
    await deployMasterWorkflow(credId);
    console.log("\n✨ Despliegue completado con éxito. Todo fue centralizado.");
  } catch(e) {
    console.error("❌ Abortando despliegue por errores:", e);
  }
}

run();
