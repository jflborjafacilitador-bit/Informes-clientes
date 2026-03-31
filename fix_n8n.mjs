import fs from 'fs';

const apiUrl = "https://n8n-prueba1-n8n.exigs1.easypanel.host/api/v1";
const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2YxZDc1OC1hN2FmLTRhZjctOGNiZS1hYjE3MDhiZjZiM2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Nzc1ODY5fQ.cqJogn3Ry2s2087tLADI0UFSzjBX1Lw6t4drV3ekNXI";
const headers = {
  "X-N8N-API-KEY": apiKey,
  "Content-Type": "application/json"
};

async function run() {
  const req = await fetch(`${apiUrl}/workflows/iJkJqQsNI6u4BXu6`, { headers });
  const w = await req.json();

  const payload = {
    name: w.name,
    nodes: w.nodes.map(n => {
      if (n.type === "n8n-nodes-base.webhook") {
         if (!n.webhookId) {
             n.webhookId = "w-" + Math.random().toString(36).substr(2, 9);
             console.log("Added webhookId to node", n.name, n.webhookId);
         }
      }
      return n;
    }),
    connections: w.connections,
    settings: w.settings
  };

  const putReq = await fetch(`${apiUrl}/workflows/iJkJqQsNI6u4BXu6`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload)
  });
  console.log("PUT status:", putReq.status, await putReq.text());

  const deact = await fetch(`${apiUrl}/workflows/iJkJqQsNI6u4BXu6/deactivate`, { method: "POST", headers });
  console.log("DEACTIVATE status:", deact.status);

  const act = await fetch(`${apiUrl}/workflows/iJkJqQsNI6u4BXu6/activate`, { method: "POST", headers });
  console.log("ACTIVATE status:", act.status);

  const testWH = await fetch("https://n8n-prueba1-n8n.exigs1.easypanel.host/webhook/whatsapp-agent", { method: "POST", body: "{}" });
  console.log("WEBHOOK status:", testWH.status, await testWH.text());
}

run();
