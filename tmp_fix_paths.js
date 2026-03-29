import fs from 'fs';

const n8nUrl = "https://n8n-prueba1-n8n.exigs1.easypanel.host";
const n8nKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2YxZDc1OC1hN2FmLTRhZjctOGNiZS1hYjE3MDhiZjZiM2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Nzc1ODY5fQ.cqJogn3Ry2s2087tLADI0UFSzjBX1Lw6t4drV3ekNXI";

async function run() {
  const headers = { "X-N8N-API-KEY": n8nKey, "Accept": "application/json", "Content-Type": "application/json" };
  try {
    const workflowId = "i9p2X6BTtwQSKlrH";
    const res = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, { headers });
    let workflowInfo = await res.json();

    // Reemplazar globalmente las expresiones de json
    let wfStr = JSON.stringify(workflowInfo);
    // 1. Array index standard
    wfStr = wfStr.replace(/\.data\.messages\[0\]\./g, ".data.");
    // 2. Array index opcional
    wfStr = wfStr.replace(/\.data\?\.messages\?\.\[0\]\?\./g, ".data?.");
    
    workflowInfo = JSON.parse(wfStr);

    const resUpd = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        name: workflowInfo.name,
        nodes: workflowInfo.nodes,
        connections: workflowInfo.connections,
        settings: workflowInfo.settings
      })
    });
    
    const updResult = await resUpd.text();
    console.log("Update status:", resUpd.status);
    console.log("Update resultado:", updResult);
    fs.writeFileSync('workflow_fixed.json', JSON.stringify(workflowInfo, null, 2));

  } catch(e) {
    console.log("Error general:", e.message);
  }
}
run();
