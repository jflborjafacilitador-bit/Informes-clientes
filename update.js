const apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2YxZDc1OC1hN2FmLTRhZjctOGNiZS1hYjE3MDhiZjZiM2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Nzc1ODY5fQ.cqJogn3Ry2s2087tLADI0UFSzjBX1Lw6t4drV3ekNXI";
const wId = "oghw8BC3dUj9pZC1";

async function run() {
  const url = `https://n8n-prueba1-n8n.exigs1.easypanel.host/api/v1/workflows/${wId}`;
  const getRes = await fetch(url, { headers: { "X-N8N-API-KEY": apikey } });
  const w = await getRes.json();
  
  const n = w.nodes.find(n => n.name === "Enviar WhatsApp");
  n.parameters.jsonBody = "={{ JSON.stringify({ number: $json.phone, options: { delay: 1500, presence: 'composing' }, text: $json.responseText }) }}";
  
  console.log("Subiendo...");
  const putRes = await fetch(url, {
    method: "PUT",
    headers: { "X-N8N-API-KEY": apikey, "Content-Type": "application/json" },
    body: JSON.stringify(w)
  });
  
  const putData = await putRes.json();
  console.log("RES:", putData.id ? putData.id : putData);
}

run().catch(console.error);
