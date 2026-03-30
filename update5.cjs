const http = require('https');
const apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1Y2YxZDc1OC1hN2FmLTRhZjctOGNiZS1hYjE3MDhiZjZiM2QiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzc0Nzc1ODY5fQ.cqJogn3Ry2s2087tLADI0UFSzjBX1Lw6t4drV3ekNXI";

const getW = () => new Promise(r => {
  http.get({hostname: "n8n-prueba1-n8n.exigs1.easypanel.host", path: "/api/v1/workflows/oghw8BC3dUj9pZC1", headers: {"X-N8N-API-KEY":apikey}}, res=>{
    let d=""; res.on("data", c=>d+=c); res.on("end", ()=>r(JSON.parse(d)));
  });
});

const putW = (w) => new Promise((r, j) => {
  const req = http.request({
    hostname: "n8n-prueba1-n8n.exigs1.easypanel.host", 
    path: "/api/v1/workflows/oghw8BC3dUj9pZC1", 
    method: "PUT", 
    headers: {"X-N8N-API-KEY":apikey, "Content-Type":"application/json"}
  }, res=>{
    let d=""; res.on("data", c=>d+=c); res.on("end", ()=>{
      console.log("STATUS:", res.statusCode);
      console.log("RESPONSE DATA:", d);
      r();
    });
  });
  req.on("error", (e) => console.error("REQ ERR:", e));
  
  // Clone w, remove readonly fields just in case
  const p = { ...w };
  delete p.id;
  delete p.createdAt;
  delete p.updatedAt;
  
  req.write(JSON.stringify(p));
  req.end();
});

(async () => {
  const w = await getW();
  const n = w.nodes.find(n => n.name === "Enviar WhatsApp");
  if(n) {
    n.parameters.jsonBody = "={{ { number: $json.phone, text: $json.responseText } }}";
  }
  await putW(w);
})().catch(console.error);
