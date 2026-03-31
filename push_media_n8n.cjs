const fs = require('fs');

const apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2YxZDc1OC1hN2FmLTRhZjctOGNiZS1hYjE3MDhiZjZiM2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Nzc1ODY5fQ.cqJogn3Ry2s2087tLADI0UFSzjBX1Lw6t4drV3ekNXI";
const wId = "iJkJqQsNI6u4BXu6"; 
const baseUrl = "https://n8n-prueba1-n8n.exigs1.easypanel.host/api/v1/workflows";

async function req(path, method, bodyObj = null) {
  const opts = {
    method,
    headers: { "X-N8N-API-KEY": apikey, "Content-Type": "application/json" }
  };
  if (bodyObj) opts.body = JSON.stringify(bodyObj);
  
  const res = await fetch(`${baseUrl}${path}`, opts);
  if (!res.ok) {
    console.log(`HTTP ${res.status} on ${method} ${path}`);
  }
  return await res.json();
}

async function run() {
  const w = JSON.parse(fs.readFileSync('wf_multimedia.json', 'utf8'));
  
  const putPayload = {
    name: w.name,
    nodes: w.nodes,
    connections: w.connections,
    settings: w.settings
  };

  console.log("Subiendo a n8n...");
  const putData = await req(`/${wId}`, "PUT", putPayload);
  
  if (putData.id) {
    console.log("UPDATE EXITOSO. ID:", putData.id);
  } else {
    console.error("ERROR DE UPDATE:", putData);
  }
}

run().catch(console.error);
