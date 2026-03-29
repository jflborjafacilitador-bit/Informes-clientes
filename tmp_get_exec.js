import fs from 'fs';

const n8nUrl = "https://n8n-prueba1-n8n.exigs1.easypanel.host";
const n8nKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2YxZDc1OC1hN2FmLTRhZjctOGNiZS1hYjE3MDhiZjZiM2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Nzc1ODY5fQ.cqJogn3Ry2s2087tLADI0UFSzjBX1Lw6t4drV3ekNXI";

async function run() {
  const headers = { "X-N8N-API-KEY": n8nKey, "Accept": "application/json" };
  try {
    const res = await fetch(`${n8nUrl}/api/v1/executions?limit=1`, { headers });
    const data = await res.json();
    const lastId = data.data[0].id;
    console.log("Última ejecución:", lastId, "Status:", data.data[0].status);
    
    // Ver los execution data de verdad
    const resDet = await fetch(`${n8nUrl}/api/v1/executions/${lastId}?includeData=true`, { headers });
    const dataDet = await resDet.json();
    fs.writeFileSync('dump.json', JSON.stringify(dataDet, null, 2));
    console.log("Dump Data true escrito.");
  } catch(e) {
    console.log("Error general:", e.message);
  }
}
run();
