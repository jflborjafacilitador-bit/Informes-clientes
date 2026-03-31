const fs = require('fs');
const headers = { apikey: '429683C4C977415CAAFCCE10F7D57E11' };
const url = 'https://n8n-prueba1-evolution-api.exigs1.easypanel.host';

async function check() {
  const r = await fetch(url + '/instance/fetchInstances', { headers });
  const instances = await r.json();
  const res = [];
  
  for (const inst of instances) {
    const hookReq = await fetch(url + `/webhook/find/${inst.name || inst.instanceName}`, { headers });
    const hookJson = await hookReq.json();
    res.push({
      instanceName: inst.name || inst.instanceName,
      webhook: hookJson
    });
  }
  fs.writeFileSync('webhook_dump.json', JSON.stringify(res, null, 2));
}
check();
