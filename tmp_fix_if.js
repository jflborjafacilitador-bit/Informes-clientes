import fs from 'fs';

const n8nUrl = "https://n8n-prueba1-n8n.exigs1.easypanel.host";
const n8nKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2YxZDc1OC1hN2FmLTRhZjctOGNiZS1hYjE3MDhiZjZiM2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Nzc1ODY5fQ.cqJogn3Ry2s2087tLADI0UFSzjBX1Lw6t4drV3ekNXI";

async function run() {
  const headers = { "X-N8N-API-KEY": n8nKey, "Accept": "application/json", "Content-Type": "application/json" };
  try {
    // Tomar el workflow actual
    const workflowId = "i9p2X6BTtwQSKlrH";
    const res = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, { headers });
    const workflowInfo = await res.json();
    
    // Buscar nodo IF
    const ifNode = workflowInfo.nodes.find(n => n.name === 'Es Nuevo Mensaje');
    if (ifNode) {
      ifNode.parameters.conditions = {
        "string": [
          {
            "value1": "={{$json.body.event}}",
            "operation": "equal",
            "value2": "messages.upsert"
          },
          {
            "value1": "={{String($json.body.data?.messages?.[0]?.key?.fromMe)}}",
            "operation": "equal",
            "value2": "false"
          }
        ]
      };
      // Eliminar el array boolean para evitar problemas de tipos de n8n
      delete ifNode.parameters.conditions.boolean;
    }

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
    const updResult = await resUpd.text(); // Tomar texto por si falla
    console.log("Update status:", resUpd.status);
    console.log("Update resultado (texto):", updResult);
    fs.writeFileSync('workflow_fixed.json', JSON.stringify(workflowInfo, null, 2));

  } catch(e) {
    console.log("Error general:", e.message);
  }
}
run();
