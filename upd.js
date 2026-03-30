const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2YxZDc1OC1hN2FmLTRhZjctOGNiZS1hYjE3MDhiZjZiM2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Nzc1ODY5fQ.cqJogn3Ry2s2087tLADI0UFSzjBX1Lw6t4drV3ekNXI';
const wId = 'oghw8BC3dUj9pZC1';
const url = `https://n8n-prueba1-n8n.exigs1.easypanel.host/api/v1/workflows/${wId}`;

const res = await fetch(url, { headers: { 'X-N8N-API-KEY': apikey } });
const wf = await res.json();

const n = wf.nodes.find(n => n.name === 'Enviar WhatsApp');
n.parameters.jsonBody = "={{ { number: $json.phone, options: { delay: 1500, presence: 'composing' }, text: $json.responseText } }}";

console.log("Subiendo al servidor...");

// Filtrar las propiedades
const bodyData = { 
  name: wf.name, 
  nodes: wf.nodes, 
  connections: wf.connections, 
  settings: wf.settings,
  meta: wf.meta,
  tags: wf.tags
};

const put = await fetch(url, { 
  method: 'PUT', 
  headers: { 'X-N8N-API-KEY': apikey, 'Content-Type': 'application/json' }, 
  body: JSON.stringify(bodyData) 
});

console.log(" STATUS:", put.status);
console.log(" RAW:", await put.text());
