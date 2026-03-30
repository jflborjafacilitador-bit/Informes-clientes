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

const n8nUrl = n8nBaseUrl.endsWith('/') ? n8nBaseUrl.slice(0, -1) : n8nBaseUrl;

async function test() {
    let credRes = await fetch(`${n8nUrl}/api/v1/credentials`, {
        method: 'GET',
        headers: {
            'X-N8N-API-KEY': n8nApiKey,
            'Accept': 'application/json'
        }
    });

    const status = credRes.status;
    const json = await credRes.json();
    console.log(`STATUS: ${status}`);
    console.log(`BODY:`, JSON.stringify(json, null, 2));
}

test();
