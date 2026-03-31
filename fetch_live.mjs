import fs from 'fs';

const N8N_HOST = 'https://n8n-prueba1-n8n.exigs1.easypanel.host/api/v1';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2YxZDc1OC1hN2FmLTRhZjctOGNiZS1hYjE3MDhiZjZiM2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Nzc1ODY5fQ.cqJogn3Ry2s2087tLADI0UFSzjBX1Lw6t4drV3ekNXI';

async function fetchWorkflows() {
  const r = await fetch(N8N_HOST + '/workflows', {
    headers: { 'X-N8N-API-KEY': API_KEY }
  });
  const data = await r.json();
  console.log('Workflows:', data.data.map(w => ({ id: w.id, name: w.name, active: w.active })));
  
  const targetId = data.data[0].id;
  const wr = await fetch(N8N_HOST + `/workflows/${targetId}`, {
    headers: { 'X-N8N-API-KEY': API_KEY }
  });
  const wdata = await wr.json();
  fs.writeFileSync('wf_live.json', JSON.stringify(wdata, null, 2));
}

fetchWorkflows();
