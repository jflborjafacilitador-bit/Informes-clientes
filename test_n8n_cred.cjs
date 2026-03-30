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
const deepseekApiKey = envVars['VITE_DEEPSEEK_API_KEY'];

const n8nUrl = n8nBaseUrl.endsWith('/') ? n8nBaseUrl.slice(0, -1) : n8nBaseUrl;

async function test() {
    let credRes = await fetch(`${n8nUrl}/api/v1/credentials`, {
        method: 'POST',
        headers: {
            'X-N8N-API-KEY': n8nApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            name: "DeepSeek AutoCredential",
            type: "openAiApi",
            nodesAccess: [{ nodeType: "@n8n/n8n-nodes-langchain.lmChatOpenAi", date: new Date().toISOString() }],
            data: {
                apiKey: deepseekApiKey,
                header: false,
                organizationId: ""
            }
        })
    });

    const status = credRes.status;
    const text = await credRes.text();
    console.log(`STATUS: ${status}`);
    console.log(`BODY: ${text}`);
}

test();
