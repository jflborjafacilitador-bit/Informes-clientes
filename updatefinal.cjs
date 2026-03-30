const apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2YxZDc1OC1hN2FmLTRhZjctOGNiZS1hYjE3MDhiZjZiM2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Nzc1ODY5fQ.cqJogn3Ry2s2087tLADI0UFSzjBX1Lw6t4drV3ekNXI";
async function run() {
  const url = "https://n8n-prueba1-n8n.exigs1.easypanel.host/api/v1/workflows/oghw8BC3dUj9pZC1";
  const res = await fetch(url, { headers: { "X-N8N-API-KEY": apikey } });
  const wf = await res.json();
  const node = wf.nodes.find(n => n.name === "Enviar WhatsApp");
  
  // Utilizar sintaxis EXACTA de n8n JSON parseado.
  node.parameters.jsonBody = "={\n  \"number\": \"{{$json.phone}}\",\n  \"options\": {\n    \"delay\": 1500,\n    \"presence\": \"composing\"\n  },\n  \"text\": \"{{$json.responseText}}\"\n}";
  
  const put = await fetch(url, { method: "PUT", headers: { "X-N8N-API-KEY": apikey, "Content-Type": "application/json" }, body: JSON.stringify(wf) });
  console.log("UPDATE STATUS", put.status, await put.text());
}
run().catch(console.error);
