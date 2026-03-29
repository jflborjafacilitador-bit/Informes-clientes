const fs = require('fs');

async function fix() {
  const n8nUrl = 'https://n8n-prueba1-n8n.exigs1.easypanel.host';
  const n8nKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2YxZDc1OC1hN2FmLTRhZjctOGNiZS1hYjE3MDhiZjZiM2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Nzc1ODY5fQ.cqJogn3Ry2s2087tLADI0UFSzjBX1Lw6t4drV3ekNXI';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14dWNudHBoZmloaXljdHhpZmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTI0NjgsImV4cCI6MjA4ODE2ODQ2OH0.O8laFOL5q-J5f5qIAN1TenRa2Ax2U53XIxR-VOw4LZY';
  const workflowId = 'i9p2X6BTtwQSKlrH';

  // Obtener JSON actual real
  const getRes = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
    headers: { 'X-N8N-API-KEY': n8nKey }
  });
  const data = await getRes.json();
  
  if (!data.id) {
    console.log("Error finding workflow");
    return;
  }
  
  // Buscar httpRequest y arreglar apikey y Auth
  let nodes = data.nodes;
  let changed = 0;
  for (let n of nodes) {
    // Todos los request que vayan a Supabase (Instance Context, Update Context)
    if (n.type === 'n8n-nodes-base.httpRequest') {
       if (n.parameters.url && n.parameters.url.includes('supabase.co')) {
          let headers = n.parameters.headerParameters?.parameters;
          if (headers) {
             for (let h of headers) {
                if (h.name === 'apikey') {
                   h.value = supabaseKey;
                   changed++;
                }
                if (h.name === 'Authorization' || h.name === 'authorization') {
                   h.value = 'Bearer ' + supabaseKey;
                   changed++;
                }
             }
          }
       }
    }
  }
  
  console.log(`Updated ${changed} headers.`);
  
  // Escribir local por si acaso
  fs.writeFileSync('workflow_fixed.json', JSON.stringify(data, null, 2));

  // Actualizar N8N
  const putRes = await fetch(`${n8nUrl}/api/v1/workflows/${workflowId}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': n8nKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
       name: data.name,
       nodes: data.nodes,
       connections: data.connections,
       settings: data.settings
    })
  });
  
  if (putRes.ok) {
    console.log("Workflow SUCCESSFULY updated with valid Supabase Auth Keys!!!");
  } else {
    console.log("Error:", await putRes.text());
  }
}

fix();
