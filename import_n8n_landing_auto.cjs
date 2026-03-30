const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envLocal.split('\n').forEach(line => {
    line = line.replace(/\r/g, '');
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
        envVars[key.trim()] = values.join('=').trim();
    }
});

const n8nBaseUrl = envVars['VITE_N8N_BASE_URL'];
const n8nApiKey = envVars['VITE_N8N_API_KEY'];
const deepseekApiKey = envVars['VITE_DEEPSEEK_API_KEY'];
const evoUrl = envVars['VITE_EVOLUTION_API_URL'];
const evoKey = envVars['VITE_EVOLUTION_API_KEY'];

if (!n8nBaseUrl || !n8nApiKey) {
    console.error('No n8n credentials found in .env.local');
    process.exit(1);
}

const n8nUrl = n8nBaseUrl.endsWith('/') ? n8nBaseUrl.slice(0, -1) : n8nBaseUrl;

async function setup() {
    try {
        let credentialId = "tu-credencial-id-aqui";
        
        let credRes = await fetch(`${n8nUrl}/api/v1/credentials`, {
            method: 'POST',
            headers: {
                'X-N8N-API-KEY': n8nApiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                name: "DeepSeek API (Auto Injected " + Date.now() + ")",
                type: "openAiApi",
                nodesAccess: [{ nodeType: "@n8n/n8n-nodes-langchain.lmChatOpenAi", date: new Date().toISOString() }],
                data: {
                    apiKey: deepseekApiKey,
                    header: false,
                    organizationId: ""
                }
            })
        });

        if (credRes.ok) {
            const credData = await credRes.json();
            credentialId = credData.id;
            console.log(`Created DeepSeek Credential: ${credentialId}`);
        } else {
             console.log(`Could not create credential, status: ${credRes.status}. Error: await credRes.text()`);
             const err = await credRes.text();
             console.log(err);
        }

        // 2. Read workflow and replace placeholders
        let workflowJson = fs.readFileSync('n8n_landing_agent.json', 'utf8');
        workflowJson = workflowJson.replace("tu-credencial-id-aqui", credentialId);
        workflowJson = workflowJson.replace("TU-GLOBAL-API-KEY-EVOLUTION", evoKey);
        workflowJson = workflowJson.replace("http://TU-URL-EVOLUTION-API", evoUrl);
        
        // Update workflow name because we are creating a newly configured one
        const workflowData = JSON.parse(workflowJson);
        workflowData.name = "Landing Page AI Agent (DeepSeek Auto-Configurado)";

        // 3. Upload new workflow
        const response = await fetch(`${n8nUrl}/api/v1/workflows`, {
            method: 'POST',
            headers: {
                'X-N8N-API-KEY': n8nApiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(workflowData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to import workflow. HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log(`Workflow successfully created with ID: ${data.id}`);
        console.log(`Please go to your N8N dashboard to activate it and get the Webhook URL.`);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
setup();
