const https = require('https');

const API_KEY = 'n8n_api_43bd3db21f92e92c2dfc8debb5b780373ab1a3a69a23c34e3fb4b9538fa';
const WORKFLOW_ID = 'iJkJqQsNI6u4BXu6';
const SERVER_URL = 'https://n8n-prueba1-n8n.exigs1.easypanel.host';

const options = {
    hostname: 'n8n-prueba1-n8n.exigs1.easypanel.host',
    path: `/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=5`,
    method: 'GET',
    headers: {
        'X-N8N-API-KEY': API_KEY,
        'Accept': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(data);
            console.log("Last 5 executions:");
            if (parsed.data) {
                parsed.data.forEach(ex => {
                    console.log(`- ID: ${ex.id}, Status: ${ex.status}, Start: ${new Date(ex.startedAt).toISOString()}, WaitTill: ${ex.waitTill ? new Date(ex.waitTill).toISOString() : 'none'}`);
                });
            } else {
                console.log(data);
            }
        } catch (e) {
            console.log("Error parsing:", e);
        }
    });
});
req.on('error', e => console.log('HTTP error:', e));
req.end();
