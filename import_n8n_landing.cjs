const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envLocal.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
        envVars[key.trim()] = values.join('=').trim();
    }
});

const n8nBaseUrl = envVars['VITE_N8N_BASE_URL'];
const n8nApiKey = envVars['VITE_N8N_API_KEY'];

if (!n8nBaseUrl || !n8nApiKey) {
    console.error('No n8n credentials found in .env.local');
    process.exit(1);
}

const n8nUrl = n8nBaseUrl.endsWith('/') ? n8nBaseUrl.slice(0, -1) : n8nBaseUrl;

async function importWorkflow() {
    try {
        const workflowJson = fs.readFileSync('n8n_landing_agent.json', 'utf8');
        const workflowData = JSON.parse(workflowJson);

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

importWorkflow();
